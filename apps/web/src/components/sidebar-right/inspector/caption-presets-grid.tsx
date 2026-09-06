/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, For, Show, createMemo } from "solid-js";
import { cx } from "@/lib/cva";
import {
  CAPCUT_PRESET_OPTIONS,
  CUSTOM_PRESET_OPTIONS,
  DEFAULT_CAPTION_PRESET,
  type CaptionPresetOption,
} from "./caption-types";

type CaptionPresetsGridProps = {
  activePreset: CaptionPresetOption;
  onSelect: (preset: CaptionPresetOption) => void;
};

export function CaptionPresetsGrid(props: CaptionPresetsGridProps) {
  const [filter, setFilter] = createSignal<"all" | "custom" | "capcut">("all");

  const filteredPresets = createMemo(() => {
    const custom = CUSTOM_PRESET_OPTIONS;
    const capcut = CAPCUT_PRESET_OPTIONS;
    if (filter() === "custom") return custom;
    if (filter() === "capcut") return capcut;
    return [...capcut, ...custom];
  });

  const isResetActive = () =>
    props.activePreset.name === "classic" || !props.activePreset.name;

  return (
    <div class="flex flex-col gap-2 w-full select-none">
      {/* Filter Tabs */}
      <div class="flex items-center gap-1 px-1 bg-muted/20 p-1 rounded-lg border border-border/40 text-[11px] overflow-x-auto scrollbar-none">
        <button
          type="button"
          class={cx(
            "px-2 py-1 rounded-md font-medium transition-colors text-center cursor-pointer whitespace-nowrap",
            filter() === "all"
              ? "bg-background text-foreground shadow-xs border border-border-strong"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setFilter("all")}
        >
          Tất cả ({CUSTOM_PRESET_OPTIONS.length + CAPCUT_PRESET_OPTIONS.length})
        </button>
        <button
          type="button"
          class={cx(
            "px-2 py-1 rounded-md font-medium transition-colors text-center cursor-pointer whitespace-nowrap",
            filter() === "custom"
              ? "bg-primary/20 text-primary shadow-xs border border-primary/40 font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setFilter("custom")}
        >
          Preset của bạn ({CUSTOM_PRESET_OPTIONS.length})
        </button>
        <button
          type="button"
          class={cx(
            "px-2 py-1 rounded-md font-medium transition-colors text-center cursor-pointer whitespace-nowrap",
            filter() === "capcut"
              ? "bg-background text-foreground shadow-xs border border-border-strong"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setFilter("capcut")}
        >
          CapCut (45)
        </button>
      </div>

      {/* Grid Container (CapCut 3-column layout) */}
      <div class="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1 py-1 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-border-strong">
        {/* Reset / Default Item */}
        <button
          type="button"
          class={cx(
            "aspect-square rounded-xl flex flex-col items-center justify-center p-1.5 transition-all cursor-pointer relative group",
            isResetActive()
              ? "bg-[#07242B]/80 border-2 border-[#24D5FF] shadow-[0_0_10px_rgba(36,213,255,0.3)]"
              : "bg-muted/15 border border-border/50 hover:border-border-strong hover:bg-muted/30"
          )}
          onClick={() => props.onSelect(DEFAULT_CAPTION_PRESET)}
          title="Mặc định (Không hiệu ứng)"
        >
          <div
            class={cx(
              "size-7 rounded-full flex items-center justify-center mb-1 transition-colors",
              isResetActive()
                ? "text-[#24D5FF] bg-[#24D5FF]/10"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {/* CapCut Circle-Slash Reset SVG */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <span
            class={cx(
              "text-[10px] font-medium tracking-tight truncate max-w-full",
              isResetActive() ? "text-[#24D5FF]" : "text-muted-foreground"
            )}
          >
            Mặc định
          </span>
        </button>

        {/* 45 CapCut Presets Cards */}
        <For each={filteredPresets()}>
          {(preset) => {
            const isActive = () => props.activePreset.name === preset.name;
            return (
              <button
                type="button"
                class={cx(
                  "aspect-square rounded-xl overflow-hidden p-0 relative transition-all duration-150 cursor-pointer group bg-black/60",
                  isActive()
                    ? "border-2 border-[#24D5FF] shadow-[0_0_12px_rgba(36,213,255,0.4)] ring-1 ring-[#24D5FF]"
                    : "border border-border/50 hover:border-border-strong hover:scale-[1.02]"
                )}
                onClick={() => props.onSelect(preset)}
                title={preset.label}
              >
                {/* Thumbnail Image */}
                <img
                  src={preset.thumbnail}
                  alt={preset.label}
                  class="w-full h-full object-cover rounded-lg"
                  loading="lazy"
                  draggable={false}
                />

                {/* Custom Preset Badge */}
                <Show when={preset.category === "custom"}>
                  <div class="absolute top-1 left-1 px-1 py-0.5 rounded-sm bg-primary text-[8px] font-bold text-primary-foreground leading-none shadow-xs uppercase tracking-tighter">
                    <span>GỐC</span>
                  </div>
                </Show>

                {/* Active Checkmark Pill */}
                <Show when={isActive()}>
                  <div class="absolute bottom-1 right-1 size-4 rounded-full bg-[#24D5FF] text-black flex items-center justify-center shadow-xs">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </Show>

                {/* Hover overlay with label preview */}
                <div class="absolute inset-x-0 bottom-0 py-0.5 px-1 bg-black/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-[9px] text-white/90 truncate font-medium">
                    {preset.label}
                  </span>
                </div>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
