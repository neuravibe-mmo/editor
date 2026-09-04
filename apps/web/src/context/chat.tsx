/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createContext, createEffect, createSignal, onCleanup, useContext, type Accessor, type JSX } from "solid-js";
import { MAIN_CHANNELS } from "@desktop/main-channels";
import { mainBridge } from "@/lib/ipc";
import { useProject } from "@/context/project";
import { useWorld } from "@diffusionstudio/koota-solid";
import { Computed, FrameRate, getActiveEntity } from "@diffusionstudio/runtime";
import { nanoid } from "nanoid";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  statusText?: string;
  isStreaming?: boolean;
  editsApplied?: boolean;
  error?: string;
}

export interface AgentStatusInfo {
  connected: boolean;
  provider: string;
  model: string;
}

interface ChatContextValue {
  messages: Accessor<ChatMessage[]>;
  agentStatus: Accessor<AgentStatusInfo>;
  isBusy: Accessor<boolean>;
  currentStatusText: Accessor<string>;
  sendMessage: (prompt: string) => Promise<void>;
  clearMessages: () => void;
  activeRightTab: Accessor<"inspector" | "chat">;
  setActiveRightTab: (tab: "inspector" | "chat") => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextValue>();

export function ChatProvider(props: { children: JSX.Element }) {
  const project = useProject();
  const world = useWorld();

  const [messages, setMessages] = createSignal<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "👋 Xin chào! Tôi là **Antigravity AI Video Assistant**.\n\nBạn có thể ra lệnh bằng ngôn ngữ tự nhiên để chỉnh sửa video (cắt ghép, thêm keyframe zoom/fade, chèn tiêu đề intro, v.v.). Hãy chọn các thao tác nhanh bên dưới hoặc gõ yêu cầu của bạn!",
      timestamp: Date.now(),
    },
  ]);

  const [agentStatus, setAgentStatus] = createSignal<AgentStatusInfo>({
    connected: true,
    provider: "Antigravity Ultra",
    model: "Gemini 3.7 / Ultra",
  });

  const [isBusy, setIsBusy] = createSignal(false);
  const [currentStatusText, setCurrentStatusText] = createSignal("");
  const [activeRightTab, setActiveRightTab] = createSignal<"inspector" | "chat">("inspector");

  const toggleChat = () => {
    setActiveRightTab(activeRightTab() === "chat" ? "inspector" : "chat");
  };

  // Check agent status on mount if on desktop
  createEffect(() => {
    if (!window.desktop) return;
    mainBridge
      .call(MAIN_CHANNELS.AGENT_STATUS, undefined)
      .then((status) => {
        if (status) setAgentStatus(status);
      })
      .catch((err) => {
        console.warn("[chat] could not fetch agent status:", err);
      });
  });

  // Listen to AGENT_CHAT_EVENT
  createEffect(() => {
    if (!window.desktop) return;

    const stop = mainBridge.handle(MAIN_CHANNELS.AGENT_CHAT_EVENT, (event) => {
      const { id, type, text, statusText, error, editsApplied } = event;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== id) return msg;

          if (type === "status") {
            setCurrentStatusText(statusText || "");
            return { ...msg, statusText };
          }

          if (type === "chunk") {
            return {
              ...msg,
              text: text || msg.text,
              isStreaming: true,
            };
          }

          if (type === "done") {
            setIsBusy(false);
            setCurrentStatusText("");
            return {
              ...msg,
              text: text || msg.text,
              isStreaming: false,
              statusText: undefined,
              editsApplied,
            };
          }

          if (type === "error") {
            setIsBusy(false);
            setCurrentStatusText("");
            return {
              ...msg,
              isStreaming: false,
              statusText: undefined,
              error: error || "Đã xảy ra lỗi không xác định",
            };
          }

          return msg;
        }),
      );
    });

    onCleanup(() => {
      stop();
    });
  });

  // Global keyboard shortcut: Cmd + J to toggle AI Chat
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  const sendMessage = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isBusy()) return;

    const dir = project.dir();
    if (!dir) return;

    const userMsgId = nanoid();
    const assistantMsgId = nanoid();
    const now = Date.now();

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: trimmed,
      timestamp: now,
    };

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      timestamp: now + 1,
      isStreaming: true,
      statusText: "Đang khởi tạo yêu cầu...",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsBusy(true);
    setCurrentStatusText("Đang kết nối Antigravity...");

    try {
      const frameRate = world.get(FrameRate)?.value || 30;
      const active = getActiveEntity(world);
      const currentTime = active ? (active.get(Computed)?.localTime ?? 0) / frameRate : null;

      await mainBridge.call(MAIN_CHANNELS.AGENT_CHAT_SEND, {
        id: assistantMsgId,
        dir,
        prompt: trimmed,
        currentTime,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isStreaming: false,
                statusText: undefined,
                error: `Không thể gửi lệnh: ${errorMsg}`,
              }
            : msg,
        ),
      );
      setIsBusy(false);
      setCurrentStatusText("");
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: "✨ Cuộc trò chuyện đã được làm mới. Hãy cho tôi biết bạn muốn chỉnh sửa gì tiếp theo!",
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        agentStatus,
        isBusy,
        currentStatusText,
        sendMessage,
        clearMessages,
        activeRightTab,
        setActiveRightTab,
        toggleChat,
      }}
    >
      {props.children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return ctx;
}
