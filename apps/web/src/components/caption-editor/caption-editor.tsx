/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, For, Show, createEffect, onMount } from "solid-js";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useCaptionTranscript, formatTimestamp } from "./use-caption-transcript";
import { CaptionShortcutsDialog } from "./caption-shortcuts-dialog";
import { cx } from "@/lib/cva";

export function CaptionEditor() {
  const {
    segments,
    activeIndex,
    isSaving,
    seekTo,
    playSegment,
    updateSegmentText,
    deleteSegment,
    splitSegment,
    addSegment,
  } = useCaptionTranscript();

  const [showShortcuts, setShowShortcuts] = createSignal(false);
  const [editingIndex, setEditingIndex] = createSignal<number | null>(null);
  let listContainerRef!: HTMLDivElement;
  const itemRefs = new Map<number, HTMLDivElement>();

  // Auto-scroll active segment into view when playing (if not currently focused on an input)
  createEffect(() => {
    const idx = activeIndex();
    if (idx !== -1 && editingIndex() === null) {
      const el = itemRefs.get(idx);
      if (el && listContainerRef) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  });

  const handleKeyDown = (
    e: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
    index: number
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart ?? textarea.value.length;
      splitSegment(index, cursorPos);
    } else if (e.key === "ArrowDown" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      const nextEl = itemRefs.get(index + 1)?.querySelector("textarea");
      if (nextEl) {
        e.preventDefault();
        nextEl.focus();
      }
    } else if (e.key === "ArrowUp" && e.currentTarget.selectionStart === 0) {
      const prevEl = itemRefs.get(index - 1)?.querySelector("textarea");
      if (prevEl) {
        e.preventDefault();
        prevEl.focus();
      }
    }
  };

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div class="flex flex-col h-full overflow-hidden bg-background select-none">
      {/* Top Header */}
      <div class="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0 bg-sidebar/50">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-foreground tracking-tight">Phụ đề</span>
          <Show when={segments().length > 0}>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
              {segments().length}
            </span>
          </Show>
          <Show when={isSaving()}>
            <span class="text-[10px] text-muted-foreground animate-pulse ml-1">Đang lưu...</span>
          </Show>
        </div>

        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="small"
            class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setShowShortcuts(true)}
          >
            <Icon name="keyboard-shortcut" class="size-3.5" />
            <span>Phím tắt</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Thêm phụ đề mới"
            onClick={() => addSegment()}
          >
            <Icon name="plus-add" class="size-4" />
          </Button>
        </div>
      </div>

      {/* Subtitle List */}
      <div
        ref={listContainerRef}
        class="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-border-strong"
      >
        <Show
          when={segments().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-48 text-center px-4">
              <div class="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-2">
                <Icon name="captions" class="size-5" />
              </div>
              <p class="text-xs font-medium text-foreground">Chưa có phụ đề trong video</p>
              <p class="text-[11px] text-muted-foreground mt-1 mb-3">
                Bạn có thể tạo phụ đề bằng AI Chat hoặc thêm thủ công
              </p>
              <Button size="small" variant="secondary" onClick={() => addSegment()}>
                <Icon name="plus-add" class="size-3.5 mr-1" />
                Thêm câu thoại đầu tiên
              </Button>
            </div>
          }
        >
          <For each={segments()}>
            {(segment, index) => {
              const isActive = () => activeIndex() === index();
              return (
                <div
                  ref={(el) => itemRefs.set(index(), el)}
                  class={cx(
                    "rounded-xl transition-all duration-150 p-2.5 flex flex-col gap-1.5 border",
                    isActive()
                      ? "bg-[#07242B]/70 border-[#24D5FF]/60 shadow-[0_0_12px_rgba(36,213,255,0.12)]"
                      : "bg-muted/15 hover:bg-muted/25 border-border/40 hover:border-border/80"
                  )}
                  onClick={() => seekTo(segment.start)}
                >
                  {/* Timestamp & Actions Row */}
                  <div class="flex items-center justify-between text-xs">
                    <span
                      class={cx(
                        "font-mono font-medium tracking-tight text-[11px]",
                        isActive() ? "text-[#24D5FF]" : "text-muted-foreground/80"
                      )}
                    >
                      {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                    </span>

                    <div class="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        class={cx(
                          "w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                          isActive()
                            ? "text-[#24D5FF] hover:bg-[#24D5FF]/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        title="Phát câu này"
                        onClick={() => playSegment(segment)}
                      >
                        <Icon name="controls-play" class="size-3.5" />
                      </button>

                      <button
                        type="button"
                        class="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Xóa câu phụ đề này"
                        onClick={() => deleteSegment(index())}
                      >
                        <Icon name="trash" class="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Editable Subtitle Content */}
                  <div class="relative w-full" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={segment.text}
                      rows={1}
                      ref={(el) => {
                        onMount(() => autoResizeTextarea(el));
                      }}
                      onFocus={() => {
                        setEditingIndex(index());
                        seekTo(segment.start);
                      }}
                      onBlur={(e) => {
                        setEditingIndex(null);
                        const val = e.currentTarget.value;
                        if (val !== segment.text) {
                          updateSegmentText(index(), val);
                        }
                      }}
                      onInput={(e) => {
                        autoResizeTextarea(e.currentTarget);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, index())}
                      class={cx(
                        "w-full resize-none bg-transparent outline-none text-xs leading-relaxed transition-colors p-0 block font-normal",
                        isActive()
                          ? "text-[#E0F7FF] placeholder:text-[#24D5FF]/50"
                          : "text-foreground/90 placeholder:text-muted-foreground"
                      )}
                      placeholder="Nhập nội dung phụ đề..."
                    />
                  </div>
                </div>
              );
            }}
          </For>
        </Show>
      </div>

      {/* Footer / Quick Add */}
      <Show when={segments().length > 0}>
        <div class="p-2 border-t border-border bg-sidebar/30 flex justify-center shrink-0">
          <Button
            variant="ghost"
            size="small"
            class="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-border-strong h-8"
            onClick={() => addSegment()}
          >
            <Icon name="plus-add" class="size-3.5 mr-1.5 text-muted-foreground" />
            <span>Thêm câu phụ đề tiếp theo</span>
          </Button>
        </div>
      </Show>

      {/* Shortcuts Modal */}
      <CaptionShortcutsDialog
        open={showShortcuts()}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
