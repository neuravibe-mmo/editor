/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { existsSync } from "node:fs";
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Helper to find the primary video/audio source path in a project
 */
export async function findMediaSourcePath(
  dir: string,
  assets: unknown[],
): Promise<{ path: string; name: string } | null> {
  if (Array.isArray(assets) && assets.length > 0) {
    for (const item of assets) {
      const a = item as Record<string, unknown>;
      if (a && (a.type === "VIDEO" || a.type === "AUDIO")) {
        if (typeof a.source === "string" && existsSync(a.source)) {
          return { path: a.source, name: typeof a.path === "string" ? a.path : "video" };
        }
        if (typeof a.path === "string") {
          const direct = join(dir, a.path);
          if (existsSync(direct)) {
            return { path: direct, name: a.path };
          }
          const inAssets = join(dir, "assets", a.path);
          if (existsSync(inAssets)) {
            return { path: inAssets, name: a.path };
          }
        }
      }
    }
  }

  try {
    const files = await readdir(dir);
    for (const f of files) {
      if (/\.(mp4|mov|webm|mkv|wav|mp3|m4a|aac)$/i.test(f)) {
        return { path: join(dir, f), name: f };
      }
    }
  } catch {}

  return null;
}

/**
 * Transcribes project media dynamically using local Whisper.cpp and ffmpeg.
 */
export async function transcribeProjectMedia(
  dir: string,
  assets: unknown[],
): Promise<{ srt: string; json?: string; mediaName: string } | null> {
  const found = await findMediaSourcePath(dir, assets);
  if (!found) return null;
  const mediaSourcePath = found.path;
  const mediaName = found.name;

  const whisperBin = existsSync("/opt/homebrew/bin/whisper-cli") ? "/opt/homebrew/bin/whisper-cli" : "whisper-cli";
  const ffmpegBin = existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";
  const modelPath = join(process.env.HOME ?? "", ".cache", "whisper", "ggml-base.bin");

  if (!existsSync(modelPath)) return null;

  const tempId = Date.now();
  const tempWav = `/tmp/ds_ai_${tempId}.wav`;
  const tempPrefix = `/tmp/ds_ai_${tempId}_captions`;

  try {
    await execFileAsync(ffmpegBin, [
      "-i", mediaSourcePath,
      "-vn",
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      tempWav,
      "-y",
    ]);
    await execFileAsync(whisperBin, [
      "-m", modelPath,
      "-f", tempWav,
      "-osrt",
      "-ojf",
      "-of", tempPrefix,
      "-l", "auto",
    ]);

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
              words[words.length - 1].text += clean;
              words[words.length - 1].end = end;
            }
          }
          if (words.length > 0) {
            transcript.push({
              start: words[0].start,
              end: words[words.length - 1].end,
              text: (seg.text || "").trim(),
              words,
            });
          }
        }
        if (transcript.length > 0) {
          jsonText = JSON.stringify(transcript, null, 2);
        }
      } catch (e) {
        console.warn("[transcription] error parsing whisper json:", e);
      }
    }

    if (srtText || jsonText) {
      return { srt: srtText, json: jsonText, mediaName };
    }
  } catch (err) {
    console.error("[transcription] Transcription failed:", err);
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
