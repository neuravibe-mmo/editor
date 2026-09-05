/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { useWorld, useQuery } from "@diffusionstudio/koota-solid";
import {
  Caption,
  AssetId,
  FrameRate,
  getActiveEntity,
  setPlayhead,
  togglePlayback,
  resolveTranscript,
  invalidateCaptionDecoder,
  invalidateAssetFile,
  store,
  Computed,
} from "@diffusionstudio/runtime";
import { useLibrary } from "@/engine/library";
import type { Transcript, TranscriptWord, Asset } from "@diffusionstudio/assets";
import type { Entity } from "koota";

export type CaptionSegment = {
  text: string;
  words: TranscriptWord[];
  start: number;
  end: number;
};

export function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = Math.floor(seconds % 60).toString().padStart(2, "0");
  const cs = Math.floor((seconds % 1) * 100).toString().padStart(2, "0");
  return `${mm}:${ss}:${cs}`;
}

export function useCaptionTranscript() {
  const world = useWorld();
  const library = useLibrary();
  const captionEntities = useQuery(Caption);

  const [segments, setSegments] = createSignal<CaptionSegment[]>([]);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [captionEntity, setCaptionEntity] = createSignal<Entity | null>(null);
  const [isSaving, setIsSaving] = createSignal(false);

  // Poll current playback time
  const timer = setInterval(() => {
    const scene = getActiveEntity(world);
    if (!scene) return;
    const fps = world.get(FrameRate)?.value ?? 30;
    const frames = store(world, Computed).localTime[scene.id()] ?? 0;
    setCurrentTime(frames / fps);
  }, 100);

  onCleanup(() => clearInterval(timer));

  // Find caption entity and load transcript
  const loadTranscript = async () => {
    const entities = captionEntities();
    const entity = entities[0] ?? null;
    if (entity) {
      setCaptionEntity(entity);
    }

    const lib = library();
    if (!lib) return;

    const assets = lib.assets();
    let asset: Asset | undefined;

    // 1. Try finding asset by entity's AssetId
    if (entity) {
      const assetId = entity.get(AssetId)?.value;
      if (assetId) {
        asset = lib.get(assetId) ?? assets.find((a) => a.id === assetId);
      }
    }

    // 2. If not found via entity, search library assets for transcript or captions.json
    if (!asset) {
      asset = assets.find(
        (a) =>
          a.type === "TRANSCRIPT" ||
          a.path === "captions.json" ||
          a.path.endsWith("/captions.json") ||
          a.path.endsWith(".srt") ||
          a.path.endsWith(".vtt")
      );
    }

    // 3. Fallback: try direct lib.get("captions.json")
    if (!asset) {
      asset = lib.get("captions.json") ?? lib.get("/captions.json");
    }

    if (!asset) {
      return;
    }

    try {
      invalidateAssetFile(asset);
      const raw = await resolveTranscript(asset);
      if (raw && raw.length > 0) {
        const parsed: CaptionSegment[] = raw.map((item) => {
          const start = item.words[0]?.start ?? 0;
          const end = item.words.at(-1)?.end ?? start + 2;
          return {
            text: item.text,
            words: item.words,
            start: Number(start.toFixed(2)),
            end: Number(end.toFixed(2)),
          };
        });
        setSegments(parsed);
      }
    } catch (e) {
      console.error("[useCaptionTranscript] failed to load transcript:", e);
    }
  };

  createEffect(() => {
    // Reactive dependencies
    captionEntities();
    const lib = library();
    lib?.assets();

    loadTranscript();
  });

  // Calculate active segment index based on currentTime
  const activeIndex = createMemo(() => {
    const time = currentTime();
    const list = segments();
    for (let i = 0; i < list.length; i++) {
      const seg = list[i]!;
      // Give a tiny tolerance window (0.15s)
      if (time >= seg.start - 0.05 && time <= seg.end + 0.15) {
        return i;
      }
    }
    return -1;
  });

  // Helper to persist updated segments to captions.json and notify runtime
  const saveTranscript = async (nextSegments: CaptionSegment[]) => {
    setSegments(nextSegments);
    const entity = captionEntity() ?? captionEntities()[0] ?? null;

    const lib = library();
    if (!lib) return;

    const assets = lib.assets();
    let asset: Asset | undefined;
    if (entity) {
      const assetId = entity.get(AssetId)?.value;
      if (assetId) {
        asset = lib.get(assetId) ?? assets.find((a) => a.id === assetId);
      }
    }
    if (!asset) {
      asset = assets.find(
        (a) =>
          a.type === "TRANSCRIPT" ||
          a.path === "captions.json" ||
          a.path.endsWith("/captions.json")
      ) ?? lib.get("captions.json");
    }

    if (!asset) {
      console.warn("[useCaptionTranscript] No transcript asset found to save to");
      return;
    }

    setIsSaving(true);
    try {
      const rawData: Transcript = nextSegments.map((s) => ({
        text: s.text,
        words: s.words,
      }));

      const jsonString = JSON.stringify(rawData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });

      // Save to project disk
      await lib.fs.write(asset.source, blob);
      invalidateAssetFile(asset);

      // Invalidate and reload runtime caption decoder
      if (entity) {
        invalidateCaptionDecoder(world, entity);
      }

      // Nudge playhead to force redraw/refresh of current frame
      const scene = getActiveEntity(world);
      if (scene) {
        const curFrames = store(world, Computed).localTime[scene.id()] ?? 0;
        setPlayhead(world, scene, curFrames);
      }
    } catch (e) {
      console.error("[useCaptionTranscript] failed to save transcript:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const seekTo = (seconds: number) => {
    const scene = getActiveEntity(world);
    if (!scene) return;
    const fps = world.get(FrameRate)?.value ?? 30;
    setPlayhead(world, scene, Math.max(0, Math.round(seconds * fps)));
    setCurrentTime(seconds);
  };

  const playSegment = (seg: CaptionSegment) => {
    seekTo(seg.start);
    const scene = getActiveEntity(world);
    if (scene) togglePlayback(world, scene);
  };

  const updateSegmentText = (index: number, newText: string) => {
    const list = [...segments()];
    const seg = list[index];
    if (!seg) return;

    const trimmed = newText.trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const segDuration = Math.max(0.2, seg.end - seg.start);

    let nextWords: TranscriptWord[] = [];
    if (tokens.length > 0) {
      const totalChars = tokens.reduce((acc, t) => acc + t.length, 0) || tokens.length;
      let curStart = seg.start;
      nextWords = tokens.map((token, i) => {
        const dur = (token.length / totalChars) * segDuration;
        const isLast = i === tokens.length - 1;
        const w: TranscriptWord = {
          text: token,
          start: Number(curStart.toFixed(2)),
          end: isLast ? seg.end : Number((curStart + dur).toFixed(2)),
        };
        curStart += dur;
        return w;
      });
    }

    list[index] = {
      ...seg,
      text: newText,
      words: nextWords,
    };

    saveTranscript(list);
  };

  const deleteSegment = (index: number) => {
    const list = segments().filter((_, i) => i !== index);
    saveTranscript(list);
  };

  const splitSegment = (index: number, charOffset: number) => {
    const list = [...segments()];
    const seg = list[index];
    if (!seg) return;

    const text1 = seg.text.slice(0, charOffset).trim();
    const text2 = seg.text.slice(charOffset).trim();
    if (!text1 || !text2) return;

    const midTime = Number(((seg.start + seg.end) / 2).toFixed(2));

    const seg1: CaptionSegment = {
      text: text1,
      start: seg.start,
      end: midTime,
      words: [],
    };
    const seg2: CaptionSegment = {
      text: text2,
      start: midTime,
      end: seg.end,
      words: [],
    };

    const updateWords = (s: CaptionSegment) => {
      const tokens = s.text.split(/\s+/).filter(Boolean);
      const dur = Math.max(0.1, s.end - s.start);
      const totalChars = tokens.reduce((acc, t) => acc + t.length, 0) || tokens.length;
      let cur = s.start;
      s.words = tokens.map((t, i) => {
        const d = (t.length / totalChars) * dur;
        const w = {
          text: t,
          start: Number(cur.toFixed(2)),
          end: i === tokens.length - 1 ? s.end : Number((cur + d).toFixed(2)),
        };
        cur += d;
        return w;
      });
    };

    updateWords(seg1);
    updateWords(seg2);

    list.splice(index, 1, seg1, seg2);
    saveTranscript(list);
  };

  const addSegment = (afterIndex?: number) => {
    const list = [...segments()];
    let start = 0;
    let end = 2.0;

    if (afterIndex !== undefined && list[afterIndex]) {
      start = Number((list[afterIndex]!.end + 0.1).toFixed(2));
      end = Number((start + 2.0).toFixed(2));
    } else if (list.length > 0) {
      start = Number((list.at(-1)!.end + 0.1).toFixed(2));
      end = Number((start + 2.0).toFixed(2));
    }

    const newSeg: CaptionSegment = {
      text: "Nhập lời thoại mới...",
      start,
      end,
      words: [
        { text: "Nhập", start, end: start + 0.6 },
        { text: "lời", start: start + 0.6, end: start + 1.2 },
        { text: "thoại", start: start + 1.2, end: start + 1.6 },
        { text: "mới...", start: start + 1.6, end },
      ],
    };

    if (afterIndex !== undefined) {
      list.splice(afterIndex + 1, 0, newSeg);
    } else {
      list.push(newSeg);
    }

    saveTranscript(list);
  };

  return {
    segments,
    currentTime,
    activeIndex,
    isSaving,
    seekTo,
    playSegment,
    updateSegmentText,
    deleteSegment,
    splitSegment,
    addSegment,
    reload: loadTranscript,
  };
}
