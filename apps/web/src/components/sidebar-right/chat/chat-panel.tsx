/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { For, Show, createEffect, createSignal } from "solid-js";
import { useChat } from "@/context/chat";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useExport } from "@/context/export";
import { useWorld } from "@diffusionstudio/koota-solid";
import { getActiveEntity } from "@diffusionstudio/runtime";
import { getDefaultExportTemplate } from "@/components/sidebar-right/inspector/export-templates";
import { toast } from "somoto";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function ChatPanel() {
  const {
    messages,
    agentStatus,
    isBusy,
    currentStatusText,
    sendMessage,
    clearMessages,
  } = useChat();

  const world = useWorld();
  const { exportScene } = useExport();

  const handleExport = async () => {
    const scene = getActiveEntity(world);
    if (!scene) {
      toast("Không tìm thấy cảnh (Scene) để xuất video");
      return;
    }
    await exportScene(scene, getDefaultExportTemplate());
  };

  const [inputVal, setInputVal] = createSignal("");
  let messagesEndRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;

  // Auto-scroll on new messages or streaming
  createEffect(() => {
    messages();
    currentStatusText();
    setTimeout(() => {
      messagesEndRef?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  });

  const handleSend = () => {
    const text = inputVal().trim();
    if (!text || isBusy()) return;

    if (
      text.toLowerCase().includes("xuat video") ||
      text.toLowerCase().includes("xuất video") ||
      text.toLowerCase().includes("export") ||
      text.toLowerCase().includes("render")
    ) {
      setInputVal("");
      if (textareaRef) textareaRef.style.height = "auto";
      handleExport();
      return;
    }

    setInputVal("");
    if (textareaRef) textareaRef.style.height = "auto";
    sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    setInputVal(e.currentTarget.value);
    e.currentTarget.style.height = "auto";
    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
  };

  const quickActions = [
    { label: "🚀 Xuất video", action: handleExport },
    { label: "🎨 Sinh ảnh AI", prompt: "Sinh ảnh AI: một phong cảnh thiên nhiên tuyệt đẹp hùng vĩ lúc hoàng hôn, 8k siêu thực" },
    { label: "🎙️ Lồng tiếng AI", prompt: "Lồng tiếng cho video: Xin chào bạn, chào mừng bạn đã đến với video hôm nay!" },
    { label: "💎 Nâng cấp độ nét", prompt: "Nâng cấp độ nét và khử mờ cho video" },
    { label: "🪄 Xóa nền / Phông xanh", prompt: "Xóa nền cho video/ảnh của tôi" },
    { label: "🎵 Thêm nhạc nền", prompt: "Tìm các đoạn nhạc background hay để thêm vào video cho tôi" },
    { label: "🎬 Hiệu ứng", prompt: "Thêm các hiệu ứng vào video cho tôi" },
    { label: "✂️ Cắt 0s - 4s", prompt: "Cắt video giữ lại từ 0s đến 4s" },
    { label: "🔍 Zoom In", prompt: "Thêm hiệu ứng keyframe zoom in phóng to video" },
    { label: "🔄 Khôi phục", prompt: "Khôi phục video về trạng thái ban đầu" },
  ];

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Simple markdown renderer for bold, code blocks, lists
    const lines = text.split("\n");
    return (
      <For each={lines}>
        {(line) => {
          if (!line.trim()) return <div class="h-1.5" />;
          
          // Format bold text **...** and inline code `...`
          const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
          return (
            <p class="leading-relaxed mb-1 last:mb-0">
              <For each={parts}>
                {(part) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong class="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
                  }
                  if (part.startsWith("`") && part.endsWith("`")) {
                    return <code class="px-1.5 py-0.5 rounded bg-muted/60 text-primary text-xs font-mono">{part.slice(1, -1)}</code>;
                  }
                  return <span>{part}</span>;
                }}
              </For>
            </p>
          );
        }}
      </For>
    );
  };

  return (
    <div class="flex flex-col h-full bg-sidebar select-none overflow-hidden border-l border-border">
      {/* Header */}
      <div class="h-11 px-3 border-b border-border flex items-center justify-between shrink-0 bg-background/50 backdrop-blur">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
            {agentStatus().provider}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-square"
            class="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={clearMessages}
            title="Đoạn chat mới"
          >
            <Icon name="plus-add" class="size-4" />
          </Button>
        </div>
      </div>

      {/* Action Toolbar / Dropdown Menu */}
      <div class="px-2.5 py-1.5 border-b border-border/50 bg-background/30 flex items-center gap-2 shrink-0">
        {/* Quick Launch Dropdown */}
        <DropdownMenu placement="bottom-start">
          <DropdownMenuTrigger
            as={Button}
            variant="outline"
            size="sm"
            class="h-7 text-[11px] gap-1.5 px-2.5 bg-muted/40 hover:bg-muted font-medium border-border/80 text-foreground shadow-xs"
            disabled={isBusy()}
          >
            <Icon name="sparkles" class="size-3.5 text-primary" />
            <span>Công cụ AI & Tác vụ</span>
            <Icon name="chevron-down" class="size-3 text-muted-foreground ml-0.5" />
          </DropdownMenuTrigger>

          <DropdownMenuContent class="w-56 bg-popover/95 backdrop-blur-md border-border p-1 shadow-xl z-50">
            <For each={quickActions}>
              {(action, index) => (
                <>
                  <Show when={index() === 1 || index() === 5 || index() === 7}>
                    <DropdownMenuSeparator class="my-1 bg-border/50" />
                  </Show>
                  <DropdownMenuItem
                    class="h-8 text-xs px-2.5 gap-2 cursor-pointer hover:bg-primary/15 hover:text-primary rounded-md transition-colors"
                    onSelect={() => {
                      if (action.action) {
                        action.action();
                      } else if (action.prompt) {
                        sendMessage(action.prompt);
                      }
                    }}
                  >
                    <span class="text-sm shrink-0">{action.label.split(" ")[0]}</span>
                    <span class="truncate font-medium">{action.label.split(" ").slice(1).join(" ")}</span>
                  </DropdownMenuItem>
                </>
              )}
            </For>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Message Feed */}
      <div class="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 text-xs text-foreground">
        <For each={messages()}>
          {(msg) => (
            <div
              class="flex flex-col"
              classList={{
                "items-end": msg.role === "user",
                "items-start": msg.role === "assistant",
              }}
            >
              <div
                class="max-w-[92%] rounded-xl px-3 py-2 text-xs"
                classList={{
                  "bg-primary text-primary-foreground font-medium rounded-br-xs shadow-sm":
                    msg.role === "user",
                  "bg-background/80 border border-border-strong text-foreground rounded-bl-xs shadow-sm":
                    msg.role === "assistant",
                }}
              >
                <Show when={msg.text}>{renderFormattedText(msg.text)}</Show>

                {/* Status Indicator inside bubble */}
                <Show when={msg.statusText}>
                  <div class="flex items-center gap-1.5 text-muted-foreground mt-1 text-[11px] animate-pulse font-mono">
                    <div class="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span>{msg.statusText}</span>
                  </div>
                </Show>

                {/* Edits applied badge */}
                <Show when={msg.editsApplied}>
                  <div class="mt-2 pt-1.5 border-t border-border/40 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <span>⚡ Đã áp dụng thay đổi vào timeline</span>
                  </div>
                </Show>

                {/* Error badge */}
                <Show when={msg.error}>
                  <div class="mt-1 text-[11px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                    ⚠️ {msg.error}
                  </div>
                </Show>
              </div>
            </div>
          )}
        </For>

        {/* Global busy loader */}
        <Show when={isBusy() && currentStatusText()}>
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/40 border border-border/40 text-muted-foreground text-[11px]">
            <div class="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span class="font-mono">{currentStatusText()}</span>
          </div>
        </Show>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div class="p-2.5 border-t border-border bg-background/50 backdrop-blur shrink-0">
        <div class="relative flex items-end rounded-xl bg-background border border-border-strong focus-within:border-primary/80 transition-colors p-1.5 shadow-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputVal()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Nhập lệnh chỉnh sửa video... (Enter)"
            class="flex-1 max-h-28 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 resize-none outline-none px-2 py-1 leading-relaxed"
            disabled={isBusy()}
          />
          <Button
            size="icon-square"
            variant="default"
            class="rounded-lg shrink-0 h-7 w-7 text-primary-foreground disabled:opacity-40"
            disabled={!inputVal().trim() || isBusy()}
            onClick={handleSend}
            title="Gửi (Enter)"
          >
            <Icon name="arrow-right" class="w-3.5 h-3.5" />
          </Button>
        </div>
        <div class="flex items-center justify-between px-1 mt-1.5 text-[10px] text-muted-foreground/60">
          <span>Cmd + J: Bật/tắt AI</span>
          <span>Shift + Enter: Xuống dòng</span>
        </div>
      </div>
    </div>
  );
}
