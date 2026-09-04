/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Icon } from "@/components/ui/icon";
import { useChat } from "@/context/chat";

export function SidebarTabs() {
  const { activeRightTab, setActiveRightTab } = useChat();

  return (
    <div
      class="h-10 px-2 border-b border-border bg-sidebar shrink-0 flex items-center gap-1 relative z-30"
      style="-webkit-app-region: no-drag;"
    >
      <button
        type="button"
        class="flex-1 h-7.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all relative z-30 cursor-pointer"
        style="-webkit-app-region: no-drag;"
        classList={{
          "bg-background text-foreground shadow-xs border border-border-strong":
            activeRightTab() === "inspector",
          "text-muted-foreground hover:text-foreground hover:bg-muted/30":
            activeRightTab() !== "inspector",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setActiveRightTab("inspector");
        }}
      >
        <Icon name="settings" class="w-3.5 h-3.5" />
        <span>Inspector</span>
      </button>

      <button
        type="button"
        class="flex-1 h-7.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all relative z-30 cursor-pointer"
        style="-webkit-app-region: no-drag;"
        classList={{
          "bg-background text-foreground shadow-xs border border-border-strong":
            activeRightTab() === "chat",
          "text-muted-foreground hover:text-foreground hover:bg-muted/30":
            activeRightTab() !== "chat",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setActiveRightTab("chat");
        }}
      >
        <Icon name="ai-generate" class="w-3.5 h-3.5 text-emerald-400" />
        <span>AI Chat</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </button>
    </div>
  );
}
