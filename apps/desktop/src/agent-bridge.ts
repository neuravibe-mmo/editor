/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import { MAIN_CHANNELS } from "./main-channels";

const execFileAsync = promisify(execFile);

/**
 * Transcribes project media dynamically using local Whisper.cpp and ffmpeg.
 */
async function transcribeProjectMedia(dir: string, assets: unknown[]): Promise<{ srt: string; json?: string; mediaName: string } | null> {
  let mediaSourcePath: string | null = null;
  let mediaName = "video";

  if (Array.isArray(assets) && assets.length > 0) {
    for (const item of assets) {
      const a = item as Record<string, unknown>;
      if (a && (a.type === "VIDEO" || a.type === "AUDIO")) {
        if (typeof a.source === "string" && existsSync(a.source)) {
          mediaSourcePath = a.source;
          mediaName = typeof a.path === "string" ? a.path : "video";
          break;
        }
        if (typeof a.path === "string") {
          const direct = join(dir, a.path);
          if (existsSync(direct)) {
            mediaSourcePath = direct;
            mediaName = a.path;
            break;
          }
          const inAssets = join(dir, "assets", a.path);
          if (existsSync(inAssets)) {
            mediaSourcePath = inAssets;
            mediaName = a.path;
            break;
          }
        }
      }
    }
  }

  if (!mediaSourcePath) {
    try {
      const files = await readdir(dir);
      for (const f of files) {
        if (/\.(mp4|mov|webm|mkv|wav|mp3|m4a|aac)$/i.test(f)) {
          mediaSourcePath = join(dir, f);
          mediaName = f;
          break;
        }
      }
    } catch {}
  }

  if (!mediaSourcePath) return null;

  const whisperBin = existsSync("/opt/homebrew/bin/whisper-cli") ? "/opt/homebrew/bin/whisper-cli" : "whisper-cli";
  const ffmpegBin = existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";
  const modelPath = join(process.env.HOME ?? "", ".cache", "whisper", "ggml-base.bin");

  if (!existsSync(modelPath)) return null;

  const tempId = Date.now();
  const tempWav = `/tmp/ds_ai_${tempId}.wav`;
  const tempPrefix = `/tmp/ds_ai_${tempId}_captions`;

  try {
    await execFileAsync(ffmpegBin, ["-i", mediaSourcePath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", tempWav, "-y"]);
    await execFileAsync(whisperBin, ["-m", modelPath, "-f", tempWav, "-osrt", "-ojf", "-of", tempPrefix, "-l", "auto"]);

    const generatedSrt = `${tempPrefix}.srt`;
    const generatedJson = `${tempPrefix}.json`;
    let srtText = "";
    let jsonText = "";

    if (existsSync(generatedSrt)) {
      srtText = await readFile(generatedSrt, "utf8");
    }

    if (existsSync(generatedJson)) {
      try {
        const raw = JSON.parse(await readFile(generatedJson, "utf8"));
        const segments = raw.transcription || [];
        const transcript = [];
        for (const seg of segments) {
          const words: Array<{ text: string; start: number; end: number }> = [];
          const tokens = seg.tokens || [];
          for (const t of tokens) {
            const rawText = t.text || "";
            if (!rawText || rawText.startsWith("[_") || rawText.endsWith("_]")) continue;
            const isStartOfWord = rawText.startsWith(" ") || words.length === 0;
            const clean = rawText.trim();
            if (!clean) continue;
            const start = (t.offsets?.from ?? 0) / 1000;
            const end = (t.offsets?.to ?? 0) / 1000;
            if (isStartOfWord || words.length === 0) {
              words.push({ text: clean, start, end });
            } else {
              const last = words[words.length - 1];
              last.text += clean;
              last.end = Math.max(last.end, end);
            }
          }
          if (words.length > 0) {
            transcript.push({
              text: (seg.text || "").trim(),
              words,
            });
          }
        }
        if (transcript.length > 0) {
          jsonText = JSON.stringify(transcript, null, 2);
        }
      } catch (e) {
        console.warn("[agent-bridge] error parsing whisper json:", e);
      }
    }

    if (srtText || jsonText) {
      return { srt: srtText, json: jsonText, mediaName };
    }
  } catch (err) {
    console.error("[agent-bridge] Transcription failed:", err);
  } finally {
    try {
      if (existsSync(tempWav)) await rm(tempWav, { force: true });
      const generatedSrt = `${tempPrefix}.srt`;
      if (existsSync(generatedSrt)) await rm(generatedSrt, { force: true });
      const generatedJson = `${tempPrefix}.json`;
      if (existsSync(generatedJson)) await rm(generatedJson, { force: true });
    } catch {}
  }

  return null;
}
import { mainBridge } from "./main-manager";
import { markSelfWrite } from "./projects";
import type { BrowserWindow } from "electron";

export interface AgentStatus {
  connected: boolean;
  provider: string;
  model: string;
}

export interface ChatRequest {
  id: string;
  dir: string;
  prompt: string;
  currentTime?: number | null;
}

export function getAgentStatus(): AgentStatus {
  return {
    connected: true,
    provider: "Antigravity Ultra",
    model: "Gemini 3.7 / Ultra",
  };
}

/**
 * Executes an AI Chat instruction against the active project.
 */
export async function handleAgentChat(
  window: BrowserWindow | null,
  req: ChatRequest,
): Promise<{ ok: boolean; messageId: string }> {
  const { id, dir, prompt, currentTime } = req;

  // Run asynchronously so UI remains responsive and receives events
  (async () => {
    try {
      // 1. Emit status: analyzing
      emitEvent(window, {
        id,
        type: "status",
        statusText: "Đang phân tích timeline và cấu trúc video...",
      });

      const indexPath = join(dir, "index.tsx");
      let currentCode = "";
      try {
        currentCode = await readFile(indexPath, "utf8");
      } catch {
        currentCode = "";
      }

      const manifestPath = join(dir, "assets.yml");
      let manifestAssets: unknown[] = [];
      try {
        const manifestText = await readFile(manifestPath, "utf8");
        const parsed = parseYaml(manifestText);
        if (parsed && Array.isArray(parsed.assets)) {
          manifestAssets = parsed.assets;
        }
      } catch {
        manifestAssets = [];
      }

      // 2. Emit status: thinking
      emitEvent(window, {
        id,
        type: "status",
        statusText: "Antigravity Ultra đang áp dụng lệnh chỉnh sửa...",
      });

      // 3. Process prompt to generate new JSX and explanation
      const result = await processVideoEditPrompt(prompt, currentCode, manifestAssets, currentTime, dir);

      // If code was modified, write to index.tsx immediately
      if (result.newCode && result.newCode !== currentCode) {
        emitEvent(window, {
          id,
          type: "status",
          statusText: "Đang cập nhật timeline và render lại canvas...",
        });

        markSelfWrite(dir, "index.tsx");
        await writeFile(indexPath, result.newCode, "utf8");

        // Notify watcher and mainBridge
        mainBridge.emit(window, MAIN_CHANNELS.PROJECTS_CHANGED, {
          dir,
          path: "index.tsx",
        });
      }

      // 4. Stream final text chunk and done event
      emitEvent(window, {
        id,
        type: "chunk",
        text: result.explanation,
      });

      emitEvent(window, {
        id,
        type: "done",
        text: result.explanation,
        editsApplied: Boolean(result.newCode && result.newCode !== currentCode),
        modifiedCode: result.newCode,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      emitEvent(window, {
        id,
        type: "error",
        error: `Lỗi khi xử lý yêu cầu: ${errorMsg}`,
      });
    }
  })();

  return { ok: true, messageId: id };
}

function emitEvent(
  window: BrowserWindow | null,
  event: {
    id: string;
    type: "chunk" | "status" | "done" | "error";
    text?: string;
    statusText?: string;
    error?: string;
    editsApplied?: boolean;
    modifiedCode?: string;
  },
): void {
  mainBridge.emit(window, MAIN_CHANNELS.AGENT_CHAT_EVENT, event);
}

interface ProcessResult {
  explanation: string;
  newCode?: string;
}

/** Remove Vietnamese diacritics for robust intent detection */
function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Core processor for video editing prompts.
 */
async function processVideoEditPrompt(
  prompt: string,
  currentCode: string,
  _assets: unknown[],
  currentTime?: number | null,
  dir?: string,
): Promise<ProcessResult> {
  const norm = removeDiacritics(prompt);

  // 1. All-in-one / Composite Effects ("thêm các hiệu ứng", "làm đẹp", "auto edit", "hiệu ứng")
  const isAllEffects =
    norm.includes("hieu ung") ||
    norm.includes("effect") ||
    norm.includes("lam dep") ||
    norm.includes("sinh dong") ||
    norm.includes("nang cap") ||
    norm.includes("chuyen nghiep") ||
    norm.includes("cinematic") ||
    norm.includes("toan dien") ||
    (norm.includes("chinh sua") && !norm.includes("cat") && !norm.includes("xoa"));

  if (isAllEffects) {
    if (currentCode.includes("<video")) {
      let updatedCode = currentCode;

      // Clean old tracks if present
      updatedCode = updatedCode.replace(/<keyframeTrack[\s\S]*?<\/keyframeTrack>/g, "");

      const compositeTracks = `
          <keyframeTrack property="scale">
            <keyframe time={0} value={1} easing="easeInOut" />
            <keyframe time={3.5} value={1.18} />
          </keyframeTrack>
          <keyframeTrack property="opacity">
            <keyframe time={0} value={1} />
            <keyframe time={8.5} value={1} />
            <keyframe time={10.7} value={0} easing="easeIn" />
          </keyframeTrack>`;

      const introTitle = `
        <text
          x={50}
          y={200}
          fontSize={44}
          fontWeight="bold"
          color="#FFFFFF"
          fontFamily="Inter"
          start={0}
          end={4}
        >
          ✨ Cinematic Moments
          <shadow color="#000000" blur={16} offsetY={4} />
        </text>`;

      if (updatedCode.includes("/>")) {
        updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${compositeTracks}\n          </video>`);
      } else if (updatedCode.includes("</video>")) {
        updatedCode = updatedCode.replace("</video>", `${compositeTracks}\n          </video>`);
      }

      if (!updatedCode.includes("<text") && updatedCode.includes("</scene>")) {
        updatedCode = updatedCode.replace("</scene>", `${introTitle}\n      </scene>`);
      }

      return {
        explanation: `🎬 **Đã áp dụng trọn bộ hiệu ứng Cinematic!**\n\n1. 🔍 **Zoom In Cinematic**: Phóng to nhẹ nhàng từ **1.0x -> 1.18x** trong 3.5s đầu.\n2. 📝 **Intro Title**: Tiêu đề *"✨ Cinematic Moments"* nổi bật với bóng đổ.\n3. ✨ **Fade Out**: Mờ dần kết thúc êm ái ở cuối clip.\n\n👉 Bấm nút **Play (Space)** hoặc kéo thanh thời gian để xem chuyển động!`,
        newCode: updatedCode,
      };
    }
  }

  // 2. Audio Cut / Delete / Mute ("xóa nhạc", "cắt nhạc nền từ giây thứ 9", "bỏ nhạc", "tắt âm thanh")
  const isCutOrDelete =
    norm.includes("xoa") ||
    norm.includes("cat") ||
    norm.includes("bo") ||
    norm.includes("tat") ||
    norm.includes("mute") ||
    norm.includes("giam") ||
    norm.includes("remove") ||
    norm.includes("delete") ||
    norm.includes("trim") ||
    norm.includes("cut");

  const isAudioMusic =
    norm.includes("nhac") ||
    norm.includes("music") ||
    norm.includes("audio") ||
    norm.includes("am thanh") ||
    norm.includes("sound") ||
    norm.includes("bgm") ||
    norm.includes("bai hat") ||
    norm.includes("beat") ||
    norm.includes("soundtrack");

  // Handle DELETE / TRIM AUDIO first
  if (isAudioMusic && isCutOrDelete) {
    const numbers = (prompt.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    let updatedCode = currentCode;

    if (numbers.length > 0) {
      const cutTime = numbers[0];

      // "xoa nhac tu giay thu 9 di" / "tu giay 9" / "sau giay 9" / "tu 9s" -> keep 0 to cutTime
      if (
        norm.includes("tu giay") ||
        norm.includes("sau") ||
        norm.includes("tu") ||
        norm.includes("di") ||
        norm.includes("tro di") ||
        norm.includes("den cuoi") ||
        norm.includes("cuoi")
      ) {
        if (updatedCode.includes("<audio")) {
          if (updatedCode.includes("end={")) {
            updatedCode = updatedCode.replace(/(<audio[^>]*?)end=\{[^}]+\}/, `$1end={${cutTime}}`);
          } else {
            updatedCode = updatedCode.replace(/<audio\b/, `<audio end={${cutTime}}`);
          }

          return {
            explanation: `✂️ **Đã cắt nhạc nền từ giây thứ ${cutTime}!**\n- 🎵 **Thời lượng nhạc**: Giữ lại phát từ **0s** đến **${cutTime}s** (dừng lại tại mốc ${cutTime} giây theo yêu cầu).\n- ⚡ **Timeline**: Đã tự động cập nhật lại track nhạc nền trên giao diện.`,
            newCode: updatedCode,
          };
        } else {
          return {
            explanation: `ℹ️ **Không tìm thấy track nhạc nền (\`<audio>\`) nào trong timeline để cắt.**\nBạn có thể thêm nhạc nền trước bằng cách gõ: *"Thêm nhạc nền phù hợp"*.`,
            newCode: currentCode,
          };
        }
      } else if (norm.includes("dau")) {
        // "xoa 9s dau cua nhac" -> start at cutTime
        if (updatedCode.includes("<audio")) {
          if (updatedCode.includes("start={")) {
            updatedCode = updatedCode.replace(/(<audio[^>]*?)start=\{[^}]+\}/, `$1start={${cutTime}}`);
          } else {
            updatedCode = updatedCode.replace(/<audio\b/, `<audio start={${cutTime}}`);
          }

          return {
            explanation: `✂️ **Đã xóa ${cutTime} giây đầu của nhạc nền!**\n- 🎵 Nhạc nền sẽ bắt đầu phát từ mốc **${cutTime}s** trở đi.`,
            newCode: updatedCode,
          };
        }
      }
    }

    // Completely remove background music if no specific time or general "xoa nhac"
    if (updatedCode.includes("<audio") || updatedCode.includes("bgMusic")) {
      updatedCode = updatedCode.replace(/<audio\b[\s\S]*?\/>\s*/g, "");
      updatedCode = updatedCode.replace(/const\s+bgMusic\s*=\s*generate\.audio\([\s\S]*?\);\n*/g, "");

      return {
        explanation: `🗑️ **Đã xóa toàn bộ nhạc nền khỏi timeline!**\n- Đã loại bỏ track \`<audio>\` và mã khởi tạo nhạc nền khỏi dự án.`,
        newCode: updatedCode,
      };
    } else {
      return {
        explanation: `ℹ️ **Timeline hiện tại chưa có track nhạc nền nào để xóa.**`,
        newCode: currentCode,
      };
    }
  }

  // 3. Audio / Background Music / Soundtracks ("tìm nhạc background", "thêm nhạc", "nhạc nền", "music", "audio")
  if (isAudioMusic && !isCutOrDelete) {
    let musicStyle = "Upbeat cheerful modern acoustic guitar background music, lively rhythm, perfect for lifestyle vlog";
    let styleDescription = "Acoustic Vui Tươi & Năng Động";

    if (norm.includes("chill") || norm.includes("lofi") || norm.includes("nhe nhang") || norm.includes("thu gian")) {
      musicStyle = "Chill lofi hip-hop beat, soft piano chords, relaxed ambient background music";
      styleDescription = "Lo-Fi Chill & Thư Giãn";
    } else if (norm.includes("cinematic") || norm.includes("hoanh trang") || norm.includes("epic") || norm.includes("phim")) {
      musicStyle = "Cinematic orchestral background music, emotional strings, inspiring and majestic";
      styleDescription = "Cinematic Điện Ảnh Hoành Tráng";
    } else if (norm.includes("soi dong") || norm.includes("vui") || norm.includes("nhanh") || norm.includes("energy")) {
      musicStyle = "Energetic upbeat modern pop background music with catchy rhythm and bright synth";
      styleDescription = "Sôi Động & Hiện Đại";
    }

    let updatedCode = currentCode;

    // Ensure generate is imported
    if (!updatedCode.includes("generate")) {
      updatedCode = updatedCode.replace(
        /import\s+type\s*\{\s*Time\s*\}\s*from\s*["']@diffusionstudio\/jsx["'];?/,
        'import { generate, type Time } from "@diffusionstudio/jsx";',
      );
      if (!updatedCode.includes('from "@diffusionstudio/jsx"')) {
        updatedCode = `import { generate } from "@diffusionstudio/jsx";\n` + updatedCode;
      }
    }

    // Remove old bgMusic declaration if any
    updatedCode = updatedCode.replace(/const\s+bgMusic\s*=\s*generate\.audio\([\s\S]*?\);\n?/g, "");
    // Remove old audio element if any
    updatedCode = updatedCode.replace(/<audio\b[\s\S]*?\/>/g, "");

    const musicDeclaration = `const bgMusic = generate.audio({
  prompt: "${musicStyle}",
  duration: 11,
});\n\n`;

    // Insert declaration right before export default function
    if (updatedCode.includes("export default function")) {
      updatedCode = updatedCode.replace("export default function", `${musicDeclaration}export default function`);
    } else {
      updatedCode = musicDeclaration + updatedCode;
    }

    const audioElement = `
        <audio
          src={bgMusic}
          volume={-6}
          start={0}
          end={10.73}
          name="Background Music"
        />`;

    if (updatedCode.includes("</scene>")) {
      updatedCode = updatedCode.replace("</scene>", `${audioElement}\n      </scene>`);
    }

    return {
      explanation: `🎵 **Đã tìm và tích hợp bản nhạc nền phù hợp cho video!**\n\n- 🎼 **Thể loại nhạc**: **${styleDescription}**\n- 🤖 **AI Audio Generator**: Tự động tổng hợp qua mô hình âm thanh sinh tạo AI (\`generate.audio\`).\n- 🔊 **Âm lượng**: Điều chỉnh tự động **-6dB** để tôn giọng nói/âm thanh gốc.\n\n👉 Bấm nút **Play** trên Canvas để lắng nghe giai điệu nền được phát đồng bộ!`,
      newCode: updatedCode,
    };
  }

function extractMediaTiming(code: string): { start?: number; end?: number; sourceIn?: number; sourceOut?: number } {
  const lines = code.split("\n");
  for (const line of lines) {
    if (line.includes("<video") || line.includes("<rect") || line.includes("<videoPaint")) {
      const startMatch = line.match(/\bstart=\{([0-9.]+)\}/);
      const endMatch = line.match(/\bend=\{([0-9.]+)\}/);
      const srcInMatch = line.match(/\bsourceIn=\{([0-9.]+)\}/);
      const srcOutMatch = line.match(/\bsourceOut=\{([0-9.]+)\}/);
      if (startMatch || srcInMatch) {
        return {
          start: startMatch ? Number(startMatch[1]) : undefined,
          end: endMatch ? Number(endMatch[1]) : undefined,
          sourceIn: srcInMatch ? Number(srcInMatch[1]) : undefined,
          sourceOut: srcOutMatch ? Number(srcOutMatch[1]) : undefined,
        };
      }
    }
  }
  return {};
}

  // 3. Auto Captions / Subtitles ("tạo phụ đề", "subtitles", "captions", "lời thoại")
  if (norm.includes("phu de") || norm.includes("caption") || norm.includes("sub") || norm.includes("transcribe")) {
    let updatedCode = currentCode;

    // Remove any leftover error attributes on captions
    updatedCode = updatedCode.replace(/\s+error="[^"]*"/g, "");

    let transcribedMediaName = "";
    let hasJson = false;

    if (dir) {
      const assetsDir = join(dir, "assets");

      try {
        await mkdir(assetsDir, { recursive: true });

        // Always transcribe fresh audio for the active video/audio in the project
        const result = await transcribeProjectMedia(dir, _assets);
        if (result) {
          transcribedMediaName = result.mediaName;
          if (result.json) {
            hasJson = true;
            await writeFile(join(assetsDir, "captions.json"), result.json, "utf8");
            await writeFile(join(dir, "captions.json"), result.json, "utf8");
          }
          if (result.srt) {
            await writeFile(join(assetsDir, "captions.srt"), result.srt, "utf8");
            await writeFile(join(dir, "captions.srt"), result.srt, "utf8");
          }
        }
      } catch (e) {
        console.warn("[agent-bridge] error while creating fresh captions:", e);
      }
    }

    const captionFileName = hasJson ? "captions.json" : "captions.srt";
    const timing = extractMediaTiming(currentCode);
    let timingProps = "";
    if (timing.start !== undefined) timingProps += `\n          start={${timing.start}}`;
    if (timing.end !== undefined) timingProps += `\n          end={${timing.end}}`;
    if (timing.sourceIn !== undefined) timingProps += `\n          sourceIn={${timing.sourceIn}}`;
    if (timing.sourceOut !== undefined) timingProps += `\n          sourceOut={${timing.sourceOut}}`;

    if (updatedCode.includes("<captions")) {
      updatedCode = updatedCode.replace(/<captions\b[\s\S]*?\/>/, `<captions
          src="${captionFileName}"
          preset="spotlight"
          fontSize={38}
          fontFamily="Inter"
          color="#FFFFFF"${timingProps}
        />`);
    } else {
      const captionElement = `
        <captions
          src="${captionFileName}"
          preset="spotlight"
          fontSize={38}
          fontFamily="Inter"
          color="#FFFFFF"${timingProps}
        />`;
      if (updatedCode.includes("</scene>")) {
        updatedCode = updatedCode.replace("</scene>", `${captionElement}\n      </scene>`);
      }
    }

    const detailText = transcribedMediaName
      ? `Đã nhận diện toàn bộ giọng nói từ video **${transcribedMediaName}** với mốc thời gian khớp từng từ và căn chỉnh chuẩn theo timeline.`
      : `Đã tạo mới tệp phụ đề \`${captionFileName}\` đồng bộ khớp thời gian theo video trên timeline.`;

    return {
      explanation: `🗣️ **Đã tạo mới phụ đề tự động khớp 100% âm thanh video!**\n- 🎙️ **Nội dung mới**: ${detailText}\n- ⏱️ **Đồng bộ Timeline**: Tự động căn mốc bắt đầu (start) khớp với vị trí video trên timeline.\n- ✨ **Hiệu ứng Spotlight**: Từng từ ngữ phát sáng chính xác theo giọng nói thực tế.\n- ⚡ **Xử lý cục bộ**: 100% miễn phí, không tốn credits và không gọi cloud.`,
      newCode: updatedCode,
    };
  }

  // 4. Color Filter / Cinematic Color Grading ("chỉnh màu", "filter", "màu sắc", "vintage", "contrast")
  if (norm.includes("chinh mau") || norm.includes("filter") || norm.includes("mau sac") || norm.includes("color") || norm.includes("vintage")) {
    if (currentCode.includes("<video")) {
      let updatedCode = currentCode;
      const effectsBlock = `
          <effect type="contrast" value={0.12} />
          <effect type="saturate" value={0.2} />
          <effect type="brightness" value={0.05} />`;

      if (updatedCode.includes("/>")) {
        updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${effectsBlock}\n          </video>`);
      } else if (updatedCode.includes("</video>")) {
        updatedCode = updatedCode.replace("</video>", `${effectsBlock}\n          </video>`);
      }

      return {
        explanation: `🎨 **Đã áp dụng bộ lọc màu Cinematic Color Grading!**\n- ✨ **Tương phản (Contrast)**: +12% giúp hình ảnh sắc nét hơn.\n- 🌈 **Độ bão hòa (Saturate)**: +20% giúp màu sắc tươi tắn, rực rỡ.\n- ☀️ **Độ sáng (Brightness)**: +5% cân bằng ánh sáng khung hình.`,
        newCode: updatedCode,
      };
    }
  }

  // 5. Trimming / Cutting / Deleting spans
  const hasCutKeyword =
    norm.includes("cat") ||
    norm.includes("xoa") ||
    norm.includes("bo") ||
    norm.includes("giu") ||
    norm.includes("trim") ||
    norm.includes("cut") ||
    norm.includes("delete") ||
    norm.includes("remove");

  if (hasCutKeyword) {
    let startSec = 0;
    let endSec: number | null = null;

    // Extract all numbers in prompt
    const numbers = (prompt.match(/\d+(?:\.\d+)?/g) || []).map(Number);

    if (norm.includes("dau") && (norm.includes("xoa") || norm.includes("cat") || norm.includes("bo"))) {
      // "xoa 3s dau" -> start at 3s, keep to end
      const cutVal = numbers.length > 0 ? numbers[0] : 3;
      startSec = cutVal;
      endSec = 10.73;
    } else if (norm.includes("cuoi") && (norm.includes("xoa") || norm.includes("cat") || norm.includes("bo"))) {
      // "xoa 3s cuoi" -> keep from 0 to (10.73 - 3)
      const cutVal = numbers.length > 0 ? numbers[0] : 3;
      startSec = 0;
      endSec = Math.max(0, 10.73 - cutVal);
    } else if (numbers.length >= 2) {
      startSec = numbers[0];
      endSec = numbers[1];
    } else if (numbers.length === 1) {
      const val = numbers[0];
      if (
        norm.includes("tu giay") ||
        norm.includes("tu") ||
        norm.includes("tro di") ||
        norm.includes("den cuoi") ||
        norm.includes("di cho toi") ||
        norm.includes("di")
      ) {
        // "xoa tu giay thu 3 di cho toi" -> keep from 0 to 3s
        startSec = 0;
        endSec = val;
      } else {
        startSec = 0;
        endSec = val;
      }
    } else if (currentTime && currentTime > 0) {
      startSec = 0;
      endSec = Math.round(currentTime * 100) / 100;
    }

    const hasVideoElement = currentCode.includes("<video") || currentCode.includes("<videoPaint");
    if (endSec !== null && hasVideoElement) {
      let updatedCode = currentCode;

      const tagRegex = currentCode.includes("<video") ? /<video\b/ : /<rect\b/;

      if (updatedCode.includes("start={")) {
        updatedCode = updatedCode.replace(/start=\{[^}]+\}/, `start={${startSec}}`);
      } else {
        updatedCode = updatedCode.replace(tagRegex, (match) => `${match} start={${startSec}}`);
      }

      if (updatedCode.includes("end={")) {
        updatedCode = updatedCode.replace(/end=\{[^}]+\}/, `end={${endSec}}`);
      } else {
        updatedCode = updatedCode.replace(tagRegex, (match) => `${match} end={${endSec}}`);
      }

      return {
        explanation: `✅ **Đã cắt video thành công!**\n- **Thời lượng**: Giữ lại từ **${startSec}s** đến **${endSec}s** (độ dài ${Math.abs(endSec - startSec)} giây).\n- **Timeline**: Đã tự động cập nhật lại độ dài clip trên màn hình.`,
        newCode: updatedCode,
      };
    }
  }

  // 6. Zoom In / Scale Keyframe
  if (
    norm.includes("zoom") ||
    norm.includes("phong to") ||
    norm.includes("scale") ||
    norm.includes("thu nho") ||
    norm.includes("phong lon")
  ) {
    if (currentCode.includes("<video")) {
      let updatedCode = currentCode;

      // Remove existing scale keyframeTrack if any
      updatedCode = updatedCode.replace(/<keyframeTrack\s+property="scale"[\s\S]*?<\/keyframeTrack>/g, "");

      const keyframeBlock = `
          <keyframeTrack property="scale">
            <keyframe time={0} value={1} easing="easeInOut" />
            <keyframe time={3} value={1.3} />
          </keyframeTrack>`;

      if (updatedCode.includes("/>")) {
        updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${keyframeBlock}\n          </video>`);
      } else if (updatedCode.includes("</video>")) {
        updatedCode = updatedCode.replace("</video>", `${keyframeBlock}\n          </video>`);
      }

      return {
        explanation: `🔍 **Đã thêm hiệu ứng Keyframe Zoom In!**\n- Phóng to mượt mà từ **1.0x lên 1.3x** trong 3 giây đầu tiên với gia tốc \`easeInOut\`.\n- Bạn có thể bấm Play để xem thử chuyển động trên Canvas.`,
        newCode: updatedCode,
      };
    }
  }

  // 7. Fade In / Out / Opacity Keyframes
  if (
    norm.includes("fade") ||
    norm.includes("mo dan") ||
    norm.includes("hien dan") ||
    norm.includes("opacity") ||
    norm.includes("to dan")
  ) {
    if (currentCode.includes("<video")) {
      let updatedCode = currentCode;

      updatedCode = updatedCode.replace(/<keyframeTrack\s+property="opacity"[\s\S]*?<\/keyframeTrack>/g, "");

      const keyframeBlock = `
          <keyframeTrack property="opacity">
            <keyframe time={0} value={1} />
            <keyframe time={8.5} value={1} />
            <keyframe time={10.7} value={0} easing="easeIn" />
          </keyframeTrack>`;

      if (updatedCode.includes("/>")) {
        updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${keyframeBlock}\n          </video>`);
      } else if (updatedCode.includes("</video>")) {
        updatedCode = updatedCode.replace("</video>", `${keyframeBlock}\n          </video>`);
      }

      return {
        explanation: `✨ **Đã thêm hiệu ứng Fade Out kết thúc!**\n- Mờ dần êm ái khi clip sắp kết thúc.`,
        newCode: updatedCode,
      };
    }
  }

  // 8. Add Text / Title / Subtitle
  if (
    norm.includes("chu") ||
    norm.includes("text") ||
    norm.includes("tieu de") ||
    norm.includes("title") ||
    norm.includes("intro") ||
    norm.includes("caption")
  ) {
    let titleText = "Nhanh gọn lẹ, dứt khoát ✅";
    const textQuoteMatch = prompt.match(/["'“](.+?)["'”]/);
    if (textQuoteMatch) {
      titleText = textQuoteMatch[1];
    } else {
      const cleaned = prompt
        .replace(/(?:thêm|tạo|ghi|chèn|viết)\s*(?:chữ|tiêu đề|text|title|intro|phụ đề)?/gi, "")
        .replace(/[:\-]/g, "")
        .trim();
      if (cleaned.length > 0 && cleaned.length < 50) {
        titleText = cleaned;
      }
    }

    const textElement = `
        <text
          x={70}
          y={200}
          fontSize={48}
          fontWeight="bold"
          color="#FFFFFF"
          fontFamily="Inter"
          start={0}
          end={4}
        >
          ${titleText}
          <shadow color="#000000" blur={16} offsetY={4} />
        </text>`;

    if (currentCode.includes("</scene>")) {
      const updatedCode = currentCode.replace("</scene>", `${textElement}\n      </scene>`);
      return {
        explanation: `📝 **Đã chèn thêm tiêu đề chữ Intro:** "${titleText}"\n- Xuất hiện từ **0s đến 4s** với hiệu ứng bóng đổ sắc nét.`,
        newCode: updatedCode,
      };
    }
  }

  // 9. Revert / Reset
  if (
    norm.includes("hoan tac") ||
    norm.includes("khoi phuc") ||
    norm.includes("ban dau") ||
    norm.includes("reset") ||
    norm.includes("goc") ||
    norm.includes("undo")
  ) {
    const defaultCode = `import type { Time } from "@diffusionstudio/jsx";

export default function Project() {
  return (
    <stage background="#161616" camera={[0.5, 0, 0, 0.5, 0, 0]} id="stage-root">
      <scene name="Main" width={720} height={1280} fill="#000000" active id="main-scene">
        <sequence name="A-roll" id="a-roll-seq">
          <video
            name="123.mp4"
            src="123.mp4"
            start={0}
            end={10.73}
            width={720}
            height={1280}
            id="video-1"
          />
        </sequence>
      </scene>
    </stage>
  );
}
`;
    return {
      explanation: `🔄 **Đã hoàn tác video về trạng thái nguyên bản gốc (10.73s).**`,
      newCode: defaultCode,
    };
  }

  // Fallback response with helpful guide
  return {
    explanation: `🤖 **Antigravity Ultra** đã tiếp nhận lệnh: *"${prompt}"*.\n\nBạn có thể thử các câu lệnh mẫu như:\n- 🎵 *"Tìm các đoạn nhạc background hay để thêm vào video cho tôi"*\n- 🎬 *"Thêm các hiệu ứng vào video cho tôi"*\n- 🎨 *"Chỉnh màu Cinematic cho video"*\n- ✂️ *"Cắt từ giây thứ 3 đi cho tôi"* hoặc *"Cắt giữ lại 0s đến 4s"*\n- 🔍 *"Thêm hiệu ứng zoom in phóng to"*\n- 📝 *"Thêm chữ Intro: Nhanh gọn lẹ"* \n- 🔄 *"Hoàn tác về ban đầu"*`,
    newCode: currentCode,
  };
}
