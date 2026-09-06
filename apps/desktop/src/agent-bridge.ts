/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { mainBridge } from "./main-manager";
import { markSelfWrite } from "./projects";
import { MAIN_CHANNELS } from "./main-channels";
import type { BrowserWindow } from "electron";

import { findMediaSourcePath } from "./agent/transcription";
import { pickLocalAudioTrack, LOCAL_AUDIOS_DIR } from "./agent/audio-picker";
import {
  handleVoiceoverAction,
  handleImageGenAction,
  handleUpscaleAction,
  handleRemoveBgAction,
  handleCaptionsAction,
  type ActionResult,
} from "./agent/ai-actions";
import {
  handleTrimVideo,
  handleZoomEffect,
  handleFadeEffect,
  handleAddText,
  handleColorGrade,
  handleCompositeEffects,
  handleResetOriginal,
} from "./agent/timeline-modifiers";

export { findMediaSourcePath };

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

  // Run asynchronously so UI remains responsive and receives streaming events
  (async () => {
    try {
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

      emitEvent(window, {
        id,
        type: "status",
        statusText: "Antigravity Ultra đang áp dụng lệnh chỉnh sửa...",
      });

      // Process natural language instruction through modular agents
      const result = await processVideoEditPrompt(prompt, currentCode, manifestAssets, currentTime, dir);

      if (result.newCode && result.newCode !== currentCode) {
        emitEvent(window, {
          id,
          type: "status",
          statusText: "Đang cập nhật timeline và render lại canvas...",
        });

        markSelfWrite(dir, "index.tsx");
        await writeFile(indexPath, result.newCode, "utf8");

        mainBridge.emit(window, MAIN_CHANNELS.PROJECTS_CHANGED, {
          dir,
          path: "index.tsx",
        });
      }

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

/**
 * Core Router for user editing prompts.
 */
async function processVideoEditPrompt(
  prompt: string,
  currentCode: string,
  assets: unknown[],
  _currentTime?: number | null,
  dir?: string,
): Promise<ActionResult> {
  const norm = removeDiacritics(prompt);

  // 1. All-in-one / Composite Effects
  if (
    norm.includes("hieu ung") ||
    norm.includes("effect") ||
    norm.includes("lam dep") ||
    norm.includes("sinh dong") ||
    norm.includes("cinematic") ||
    norm.includes("toan dien")
  ) {
    const res = handleCompositeEffects(currentCode);
    if (res) return res;
  }

  // 2. AI Voiceover / Text-to-Speech
  if (
    norm.includes("long tieng") ||
    norm.includes("thuyet minh") ||
    norm.includes("doc van ban") ||
    norm.includes("voiceover") ||
    norm.includes("tts") ||
    norm.includes("giong doc") ||
    norm.includes("doc loi thoai")
  ) {
    const res = await handleVoiceoverAction(prompt, norm, currentCode, dir);
    if (res) return res;
  }

  // 3. Sinh ảnh AI (FLUX.1 Turbo)
  if (
    norm.includes("sinh anh") ||
    norm.includes("tao anh") ||
    norm.includes("ve anh") ||
    norm.includes("tao hinh anh") ||
    norm.includes("generate image") ||
    norm.includes("ai image") ||
    norm.includes("anh ai")
  ) {
    const res = await handleImageGenAction(prompt, norm, currentCode, dir, extractMediaTiming);
    if (res) return res;
  }

  // 4. Auto Captions / Subtitles (Whisper)
  if (norm.includes("phu de") || norm.includes("caption") || norm.includes("sub") || norm.includes("transcribe")) {
    return await handleCaptionsAction(currentCode, assets, dir, extractMediaTiming);
  }

  // 5. Nâng cấp độ nét / Super-resolution (Lanczos + Unsharp)
  if (
    norm.includes("do net") ||
    norm.includes("khu mo") ||
    norm.includes("ro net") ||
    norm.includes("sieu net") ||
    norm.includes("upscale") ||
    norm.includes("sharpen") ||
    norm.includes("chat luong cao")
  ) {
    return await handleUpscaleAction(currentCode, assets, dir);
  }

  // 6. Xóa nền / Phông xanh (Chromakey / Rembg)
  if (
    norm.includes("xoa nen") ||
    norm.includes("tach nen") ||
    norm.includes("xoa phong") ||
    norm.includes("phong xanh") ||
    norm.includes("remove bg") ||
    norm.includes("chromakey")
  ) {
    return await handleRemoveBgAction(currentCode, assets, dir);
  }

  // 7. Nhạc nền (Local Audio Library)
  if (norm.includes("nhac") || norm.includes("music") || norm.includes("audio") || norm.includes("soundtrack")) {
    const isCut = norm.includes("cat") || norm.includes("xoa") || norm.includes("tat");
    if (!isCut) {
      const chosenTrack = await pickLocalAudioTrack(norm);
      let updatedCode = currentCode;

      updatedCode = updatedCode.replace(/import\s*\{\s*generate[\s\S]*?\}\s*from\s*["']@diffusionstudio\/jsx["'];?/g, "");
      updatedCode = updatedCode.replace(/const\s+bgMusic\s*=\s*generate\.audio\([\s\S]*?\);\n?/g, "");
      updatedCode = updatedCode.replace(/<audio\b[\s\S]*?\/>/g, "");

      if (dir) {
        const assetsDir = join(dir, "assets");
        try {
          await mkdir(assetsDir, { recursive: true });
          const audiosDir = existsSync(LOCAL_AUDIOS_DIR) ? LOCAL_AUDIOS_DIR : join(process.cwd(), "assets/audios");
          const sourcePath = join(audiosDir, chosenTrack.filename);
          if (existsSync(sourcePath)) {
            const bytes = await readFile(sourcePath);
            await writeFile(join(assetsDir, "bg_music.mp3"), bytes);
            await writeFile(join(dir, "bg_music.mp3"), bytes);
          }
        } catch (err) {
          console.warn("[agent-bridge] error copying audio:", err);
        }
      }

      const timing = extractMediaTiming(currentCode);
      const audioEnd = timing.end !== undefined ? ` end={${timing.end}}` : "";
      const audioElement = `
        <audio
          src="bg_music.mp3"
          volume={-6}
          start={0}${audioEnd}
          name="${chosenTrack.title.replace(/"/g, "'")}"
        />`;

      if (updatedCode.includes("</scene>")) {
        updatedCode = updatedCode.replace("</scene>", `${audioElement}\n      </scene>`);
      }

      const authorText = chosenTrack.author ? ` — *${chosenTrack.author}*` : "";
      return {
        explanation: `🎵 **Đã thêm nhạc nền từ thư viện cục bộ (Local Assets)!**\n\n- 🎼 **Tác phẩm**: **${chosenTrack.title}**${authorText}\n- 📻 **Thể loại**: **${chosenTrack.style}**\n- 🔊 **Âm lượng**: Tự động đặt **-6dB** để tôn giọng nói và âm thanh gốc.\n- ⚡ **Xử lý cục bộ**: 100% miễn phí, phát offline ngay lập tức, không yêu cầu gói Pro!`,
        newCode: updatedCode,
      };
    }
  }

  // 8. Cắt video (Trimming / Cutting)
  const trimRes = handleTrimVideo(prompt, norm, currentCode);
  if (trimRes) return trimRes;

  // 9. Zoom In keyframes
  if (norm.includes("zoom") || norm.includes("phong to") || norm.includes("canh gan")) {
    const res = handleZoomEffect(currentCode);
    if (res) return res;
  }

  // 10. Fade Out keyframes
  if (norm.includes("fade") || norm.includes("mo dan") || norm.includes("hien dan") || norm.includes("opacity")) {
    const res = handleFadeEffect(currentCode);
    if (res) return res;
  }

  // 11. Chỉnh màu Cinematic
  if (norm.includes("chinh mau") || norm.includes("filter") || norm.includes("mau sac") || norm.includes("color")) {
    const res = handleColorGrade(currentCode);
    if (res) return res;
  }

  // 12. Thêm chữ / Intro Text
  if (norm.includes("chu") || norm.includes("text") || norm.includes("tieu de") || norm.includes("title") || norm.includes("intro")) {
    const res = handleAddText(prompt, currentCode);
    if (res) return res;
  }

  // 13. Khôi phục / Reset ban đầu
  if (norm.includes("hoan tac") || norm.includes("khoi phuc") || norm.includes("ban dau") || norm.includes("reset") || norm.includes("undo")) {
    return handleResetOriginal();
  }

  // Fallback response with helpful guide
  return {
    explanation: `🤖 **Antigravity Ultra** đã tiếp nhận lệnh: *"${prompt}"*.\n\nBạn có thể thử các câu lệnh mẫu như:\n- 🎨 *"Sinh ảnh AI: phong cảnh hoàng hôn 8k"*\n- 🎙️ *"Lồng tiếng cho video: Xin chào bạn..."*\n- 💎 *"Nâng cấp độ nét cho video"*\n- 🪄 *"Xóa nền video phông xanh"*\n- 🎵 *"Thêm nhạc nền phù hợp"*\n- ✂️ *"Cắt giữ lại 0s đến 4s"*\n- 🔍 *"Thêm hiệu ứng zoom in phóng to"*\n- 📝 *"Thêm chữ Intro: Nhanh gọn lẹ"* \n- 🔄 *"Hoàn tác về ban đầu"*`,
    newCode: currentCode,
  };
}
