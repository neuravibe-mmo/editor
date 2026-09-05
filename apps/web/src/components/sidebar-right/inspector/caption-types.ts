/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CAPTION_PRESETS } from "@diffusionstudio/reconciler";
import type { CaptionPreset as CaptionPresetName } from "@diffusionstudio/jsx";
import type { CaptionType } from "@diffusionstudio/runtime";

export type CaptionColorSlot = {
  label: string;
  defaultColor: number;
};

export type CaptionPresetOption = {
  name: CaptionPresetName;
  label: string;
  thumbnail?: string;
  isPro?: boolean;
  slots: CaptionColorSlot[];
};

/** 45 CapCut presets catalogue */
export const CAPCUT_PRESET_OPTIONS: CaptionPresetOption[] = [
  {
    name: "capcut_01",
    label: "Hormozi Vàng (PRO)",
    thumbnail: "/presets/captions/preset_01.webp",
    isPro: true,
    slots: [{"label":"Highlight","defaultColor":16770304}],
  },
  {
    name: "capcut_02",
    label: "Chữ Trắng Tinh Tế (PRO)",
    thumbnail: "/presets/captions/preset_02.webp",
    isPro: true,
    slots: [],
  },
  {
    name: "capcut_03",
    label: "Hộp Tím Nổi Bật (PRO)",
    thumbnail: "/presets/captions/preset_03.webp",
    isPro: true,
    slots: [],
  },
  {
    name: "capcut_04",
    label: "Comic Lime Pop",
    thumbnail: "/presets/captions/preset_04.webp",
    isPro: false,
    slots: [{"label":"Active Word","defaultColor":16777215}],
  },
  {
    name: "capcut_05",
    label: "Trắng Viền Đen Đậm",
    thumbnail: "/presets/captions/preset_05.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_06",
    label: "Chữ Đổ Bóng 3D",
    thumbnail: "/presets/captions/preset_06.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_07",
    label: "Vàng Cam Nổi Bật",
    thumbnail: "/presets/captions/preset_07.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":16753920}],
  },
  {
    name: "capcut_08",
    label: "Viền Đỏ Năng Động",
    thumbnail: "/presets/captions/preset_08.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_09",
    label: "Hộp Đỏ Bo Góc",
    thumbnail: "/presets/captions/preset_09.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_10",
    label: "Chữ Xanh Neon",
    thumbnail: "/presets/captions/preset_10.webp",
    isPro: false,
    slots: [{"label":"Glow","defaultColor":61695},{"label":"Active Word","defaultColor":16711807}],
  },
  {
    name: "capcut_11",
    label: "Hộp Đen Trong Suốt",
    thumbnail: "/presets/captions/preset_11.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_12",
    label: "Chữ Vàng Nghệ Thuật",
    thumbnail: "/presets/captions/preset_12.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":16766720}],
  },
  {
    name: "capcut_13",
    label: "Karaoke Xanh Lơ",
    thumbnail: "/presets/captions/preset_13.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":54527}],
  },
  {
    name: "capcut_14",
    label: "Hộp Trắng Chữ Đen",
    thumbnail: "/presets/captions/preset_14.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_15",
    label: "Vàng Chanh Hiện Đại",
    thumbnail: "/presets/captions/preset_15.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":13434624}],
  },
  {
    name: "capcut_16",
    label: "Cam Gradient Rực Rỡ",
    thumbnail: "/presets/captions/preset_16.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_17",
    label: "Tím Mộng Mơ",
    thumbnail: "/presets/captions/preset_17.webp",
    isPro: false,
    slots: [{"label":"Glow","defaultColor":14725375}],
  },
  {
    name: "capcut_18",
    label: "Đỏ Bordeaux Cổ Điển",
    thumbnail: "/presets/captions/preset_18.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_19",
    label: "Xanh Dương Thể Thao",
    thumbnail: "/presets/captions/preset_19.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_20",
    label: "Hộp Xanh Lá Pastel",
    thumbnail: "/presets/captions/preset_20.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_21",
    label: "Chữ Hồng Nữ Tính",
    thumbnail: "/presets/captions/preset_21.webp",
    isPro: false,
    slots: [{"label":"Glow","defaultColor":16738740}],
  },
  {
    name: "capcut_22",
    label: "Gradient Hoàng Hôn",
    thumbnail: "/presets/captions/preset_22.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_23",
    label: "Đen Trắng Tối Giản",
    thumbnail: "/presets/captions/preset_23.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_24",
    label: "Xanh Lục Bảo",
    thumbnail: "/presets/captions/preset_24.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":65416}],
  },
  {
    name: "capcut_25",
    label: "Đổ Bóng Kép Hiện Đại",
    thumbnail: "/presets/captions/preset_25.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_26",
    label: "Viền Kép Bắt Mắt",
    thumbnail: "/presets/captions/preset_26.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_27",
    label: "Vàng Đồng Sang Trọng",
    thumbnail: "/presets/captions/preset_27.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_28",
    label: "Xanh Biển Tươi Mát",
    thumbnail: "/presets/captions/preset_28.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":58879}],
  },
  {
    name: "capcut_29",
    label: "Hộp Hồng Dễ Thương",
    thumbnail: "/presets/captions/preset_29.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_30",
    label: "Retro 80s Vàng Xanh",
    thumbnail: "/presets/captions/preset_30.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_31",
    label: "Chữ Xám Khói Hiện Đại",
    thumbnail: "/presets/captions/preset_31.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_32",
    label: "Viền Neon Hồng Tím",
    thumbnail: "/presets/captions/preset_32.webp",
    isPro: false,
    slots: [{"label":"Glow","defaultColor":16711850}],
  },
  {
    name: "capcut_33",
    label: "Đổ Bóng Xuyên Thấu",
    thumbnail: "/presets/captions/preset_33.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_34",
    label: "Chữ Đỏ Viền Trắng",
    thumbnail: "/presets/captions/preset_34.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_35",
    label: "Hộp Vàng Tươi Mới",
    thumbnail: "/presets/captions/preset_35.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_36",
    label: "Xanh Ngọc Cyberpunk",
    thumbnail: "/presets/captions/preset_36.webp",
    isPro: false,
    slots: [{"label":"Glow","defaultColor":65535}],
  },
  {
    name: "capcut_37",
    label: "Trắng Đổ Bóng Sâu",
    thumbnail: "/presets/captions/preset_37.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_38",
    label: "Chữ Viền Bút Chì",
    thumbnail: "/presets/captions/preset_38.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_39",
    label: "Hộp Xanh Mint",
    thumbnail: "/presets/captions/preset_39.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_40",
    label: "Cam Đất Vintage",
    thumbnail: "/presets/captions/preset_40.webp",
    isPro: false,
    slots: [{"label":"Highlight","defaultColor":14711391}],
  },
  {
    name: "capcut_41",
    label: "Tím Neon Sâu Lắng",
    thumbnail: "/presets/captions/preset_41.webp",
    isPro: false,
    slots: [{"label":"Glow","defaultColor":12539372}],
  },
  {
    name: "capcut_42",
    label: "Chữ Viền Vàng Kim",
    thumbnail: "/presets/captions/preset_42.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_43",
    label: "Đỏ Đô Quyến Rũ",
    thumbnail: "/presets/captions/preset_43.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_44",
    label: "Hộp Đen Chữ Vàng",
    thumbnail: "/presets/captions/preset_44.webp",
    isPro: false,
    slots: [],
  },
  {
    name: "capcut_45",
    label: "Chữ Trắng Viền Xanh",
    thumbnail: "/presets/captions/preset_45.webp",
    isPro: false,
    slots: [],
  },
];

/** The presets, combining classic presets and 45 CapCut presets */
export const CAPTION_PRESET_OPTIONS: CaptionPresetOption[] = [
  { name: "classic", label: "Mặc định (Classic)", slots: [] },
  ...CAPCUT_PRESET_OPTIONS,
  { name: "hormozi", label: "Hormozi (MrBeast)", slots: [{ label: "Highlight", defaultColor: 0xFFE500 }] },
  { name: "comic", label: "Comic Pop", slots: [{ label: "Active Word", defaultColor: 0xFFFFFF }] },
  { name: "karaoke", label: "Karaoke", slots: [{ label: "Highlight", defaultColor: 0x24D5FF }] },
  { name: "neon", label: "Neon Glow", slots: [{ label: "Glow", defaultColor: 0x00F0FF }, { label: "Active Word", defaultColor: 0xFF007F }] },
  { name: "spotlight", label: "Spotlight", slots: [{ label: "Highlight", defaultColor: 0x24D5FF }] },
  { name: "oneWord", label: "One Word", slots: [] },
  { name: "cinematic", label: "Cinematic", slots: [] },
  { name: "cascade", label: "Cascade", slots: [] },
  { name: "whisper", label: "Whisper", slots: [] },
  { name: "paper", label: "Paper", slots: [] },
  { name: "guinea", label: "Guinea", slots: [{ label: "Color 1", defaultColor: 0xF55353 }, { label: "Color 2", defaultColor: 0xFEB139 }, { label: "Color 3", defaultColor: 0xF6F54D }] },
  { name: "stark", label: "Stark", slots: [] },
];

/** The preset a caption with no `preset` of its own plays. */
export const DEFAULT_CAPTION_PRESET: CaptionPresetOption = CAPTION_PRESET_OPTIONS[0]!;

const BY_TYPE = new Map<CaptionType, CaptionPresetOption>(
  CAPTION_PRESET_OPTIONS.map((option) => [CAPTION_PRESETS[option.name]!, option]),
);

export function captionPresetOption(type: CaptionType | undefined): CaptionPresetOption {
  return (type === undefined ? undefined : BY_TYPE.get(type)) ?? DEFAULT_CAPTION_PRESET;
}
