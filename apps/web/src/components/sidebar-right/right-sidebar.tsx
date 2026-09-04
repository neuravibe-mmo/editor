/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Show } from "solid-js";
import { Inspector } from "./inspector";
import { ChatPanel } from "./chat/chat-panel";
import { SidebarTabs } from "./sidebar-tabs";
import { useChat } from "@/context/chat";

export function RightSidebar() {
  const { activeRightTab } = useChat();

  return (
    <div class="flex flex-col h-full overflow-hidden bg-sidebar">
      <SidebarTabs />
      <div class="flex-1 overflow-hidden">
        <Show when={activeRightTab() === "inspector"}>
          <Inspector />
        </Show>
        <Show when={activeRightTab() === "chat"}>
          <ChatPanel />
        </Show>
      </div>
    </div>
  );
}
