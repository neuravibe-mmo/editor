/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Show } from "solid-js";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

type CaptionShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function CaptionShortcutsDialog(props: CaptionShortcutsDialogProps) {
  const shortcuts = [
    { key: "Enter", description: "Tách phụ đề thành 2 câu tại vị trí con trỏ" },
    { key: "Space", description: "Phát / Tạm dừng câu thoại đang chọn" },
    { key: "↑ / ↓", description: "Di chuyển đến câu phụ đề liền trước hoặc liền sau" },
    { key: "Delete", description: "Xóa câu thoại phụ đề đang chọn" },
    { key: "Tab", description: "Chuyển nhanh con trỏ sang ô nhập tiếp theo" },
  ];

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={props.onClose}
      >
        <div
          class="w-full max-w-md bg-dialog border border-border-strong rounded-xl shadow-2xl p-5 flex flex-col gap-4 relative z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center justify-between pb-2 border-b border-border">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-md bg-primary/20 text-primary flex items-center justify-center">
                <Icon name="keyboard-shortcut" class="size-4" />
              </div>
              <h3 class="text-sm font-semibold text-foreground">Phím tắt chỉnh sửa phụ đề</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={props.onClose}
            >
              <Icon name="close-remove" class="size-4" />
            </Button>
          </div>

          <div class="flex flex-col gap-2.5">
            {shortcuts.map((item) => (
              <div class="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 border border-border/50 text-xs">
                <span class="text-muted-foreground">{item.description}</span>
                <kbd class="px-2 py-0.5 rounded bg-background border border-border-strong text-foreground font-mono font-medium text-[11px] shadow-xs">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>

          <div class="pt-2 flex justify-end">
            <Button variant="secondary" size="small" onClick={props.onClose}>
              Đã hiểu
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
}
