/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const LOCAL_AUDIOS_DIR = "/Users/hoangkien/Project/editor/assets/audios";

export interface LocalAudioTrack {
  filename: string;
  title: string;
  author?: string;
  style: string;
}

/**
 * Selects an appropriate local audio track based on normalized user intent.
 */
export async function pickLocalAudioTrack(norm: string): Promise<LocalAudioTrack> {
  const audiosDir = existsSync(LOCAL_AUDIOS_DIR)
    ? LOCAL_AUDIOS_DIR
    : join(process.cwd(), "assets/audios");

  try {
    const jsonPath = join(audiosDir, "tiktok_music.json");
    if (existsSync(jsonPath)) {
      const list: Array<{ id: number | string; type?: string; musicTitle?: string; musicAuthor?: string }> = JSON.parse(
        await readFile(jsonPath, "utf8"),
      );
      const availableFiles = new Set(await readdir(audiosDir));
      const validTracks = list.filter((item) => availableFiles.has(`${item.id}.mp3`));

      if (validTracks.length > 0) {
        let pool = validTracks;
        let style = "Acoustic / Giai điệu nhẹ nhàng";

        if (
          norm.includes("chill") ||
          norm.includes("lofi") ||
          norm.includes("nhe nhang") ||
          norm.includes("thu gian") ||
          norm.includes("slow")
        ) {
          const instrum = pool.filter((t) => t.type === "INSTRUM");
          if (instrum.length > 0) pool = instrum;
          style = "Lo-Fi Chill & Thư Giãn";
        } else if (
          norm.includes("vui") ||
          norm.includes("soi dong") ||
          norm.includes("nhanh") ||
          norm.includes("remix") ||
          norm.includes("pop")
        ) {
          const upbeat = pool.filter((t) => (t.musicTitle || "").toLowerCase().includes("remix") || t.type === "VOCAL");
          if (upbeat.length > 0) pool = upbeat;
          style = "Sôi Động & Hiện Đại";
        } else {
          const instrum = pool.filter((t) => t.type === "INSTRUM");
          if (instrum.length > 0) pool = instrum;
          style = "Nhạc nền không lời (Instrumental)";
        }

        const chosen = pool[Math.floor(Math.random() * pool.length)];
        return {
          filename: `${chosen.id}.mp3`,
          title: chosen.musicTitle || "Bản nhạc nền",
          author: chosen.musicAuthor,
          style,
        };
      }
    }
  } catch (err) {
    console.warn("[audio-picker] error loading local audios:", err);
  }

  // Fallback: pick any available mp3 from audiosDir
  try {
    const allFiles = (await readdir(audiosDir)).filter((f) => f.endsWith(".mp3"));
    if (allFiles.length > 0) {
      const chosenFile = allFiles[Math.floor(Math.random() * allFiles.length)];
      return {
        filename: chosenFile,
        title: chosenFile.replace(".mp3", ""),
        style: "Nhạc nền tuyển chọn",
      };
    }
  } catch {}

  return {
    filename: "bg_music.mp3",
    title: "Nhạc nền",
    style: "Giai điệu nhẹ nhàng",
  };
}
