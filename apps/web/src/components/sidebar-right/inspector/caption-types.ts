/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CAPTION_PRESETS } from "@diffusionstudio/reconciler";
import type { CaptionPreset as CaptionPresetName } from "@diffusionstudio/jsx";
import { CaptionType, CAPCUT_PRESET_CONFIGS } from "@diffusionstudio/runtime";

export type CaptionColorSlot = {
  label: string;
  defaultColor: number;
};

export type CaptionPresetOption = {
  name: CaptionPresetName;
  label: string;
  thumbnail?: string;
  isPro?: boolean;
  category?: "custom" | "capcut";
  slots: CaptionColorSlot[];
};

/** 12 custom & original presets with their dedicated thumbnails */
export const CUSTOM_PRESET_OPTIONS: CaptionPresetOption[] = [
  {
    name: "hormozi",
    label: "Hormozi",
    thumbnail: "/presets/captions/custom_hormozi.png",
    category: "custom",
    slots: [{ label: "Từ nổi bật", defaultColor: 0xFFE500 }],
  },
  {
    name: "comic",
    label: "Comic Pop",
    thumbnail: "/presets/captions/custom_comic.png",
    category: "custom",
    slots: [{ label: "Chữ chính", defaultColor: 0xFFDC28 }],
  },
  {
    name: "karaoke",
    label: "Karaoke",
    thumbnail: "/presets/captions/custom_karaoke.png",
    category: "custom",
    slots: [{ label: "Chạy chữ", defaultColor: 0x24D5FF }],
  },
  {
    name: "neon",
    label: "Neon Glow",
    thumbnail: "/presets/captions/custom_neon.png",
    category: "custom",
    slots: [
      { label: "Ánh sáng Glow", defaultColor: 0xFF007F },
      { label: "Chữ Neon", defaultColor: 0x00F0FF },
    ],
  },
  {
    name: "spotlight",
    label: "Spotlight",
    thumbnail: "/presets/captions/custom_spotlight.png",
    category: "custom",
    slots: [{ label: "Từ nổi bật", defaultColor: 0x24D5FF }],
  },
  {
    name: "oneWord",
    label: "One Word",
    thumbnail: "/presets/captions/custom_oneWord.png",
    category: "custom",
    slots: [],
  },
  {
    name: "cinematic",
    label: "Cinematic",
    thumbnail: "/presets/captions/custom_cinematic.png",
    category: "custom",
    slots: [],
  },
  {
    name: "cascade",
    label: "Cascade",
    thumbnail: "/presets/captions/custom_cascade.png",
    category: "custom",
    slots: [],
  },
  {
    name: "whisper",
    label: "Whisper",
    thumbnail: "/presets/captions/custom_whisper.png",
    category: "custom",
    slots: [],
  },
  {
    name: "paper",
    label: "Paper",
    thumbnail: "/presets/captions/custom_paper.png",
    category: "custom",
    slots: [],
  },
  {
    name: "guinea",
    label: "Guinea",
    thumbnail: "/presets/captions/custom_guinea.png",
    category: "custom",
    slots: [
      { label: "Màu 1", defaultColor: 0xF55353 },
      { label: "Màu 2", defaultColor: 0xFEB139 },
      { label: "Màu 3", defaultColor: 0xF6F54D },
    ],
  },
  {
    name: "stark",
    label: "Stark",
    thumbnail: "/presets/captions/custom_stark.png",
    category: "custom",
    slots: [],
  },
];

/** 45 CapCut presets catalogue built directly from authentic style configurations */
export const CAPCUT_PRESET_OPTIONS: CaptionPresetOption[] = Object.values(CAPCUT_PRESET_CONFIGS).map((config, index) => {
  const slots: CaptionColorSlot[] = [];

  if (config.activeTextColor !== undefined && config.activeTextColor !== config.textColor) {
    slots.push({ label: "Màu nổi bật", defaultColor: config.activeTextColor });
  }
  if (config.textColor !== undefined) {
    slots.push({ label: "Màu chữ", defaultColor: config.textColor });
  }
  if (config.stroke?.color !== undefined) {
    slots.push({ label: "Màu viền", defaultColor: config.stroke.color });
  }
  if (config.background?.color !== undefined) {
    slots.push({ label: "Màu nền", defaultColor: config.background.color });
  }

  return {
    name: config.id as CaptionPresetName,
    label: config.name,
    thumbnail: `/presets/captions/preset_${String(index + 1).padStart(2, "0")}.webp`,
    isPro: false,
    category: "capcut",
    slots,
  };
});

/** The presets, combining default classic, 45 CapCut presets, and custom/original presets */
export const CAPTION_PRESET_OPTIONS: CaptionPresetOption[] = [
  { name: "classic", label: "Mặc định (Classic)", slots: [] },
  ...CAPCUT_PRESET_OPTIONS,
  ...CUSTOM_PRESET_OPTIONS,
];

/** The preset a caption with no `preset` of its own plays. */
export const DEFAULT_CAPTION_PRESET: CaptionPresetOption = CAPTION_PRESET_OPTIONS[0]!;

const BY_TYPE = new Map<CaptionType, CaptionPresetOption>(
  CAPTION_PRESET_OPTIONS.map((option) => [CAPTION_PRESETS[option.name]!, option]),
);

export function captionPresetOption(type: CaptionType | undefined): CaptionPresetOption {
  return (type === undefined ? undefined : BY_TYPE.get(type)) ?? DEFAULT_CAPTION_PRESET;
}
