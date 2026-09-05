/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@solidjs/router";
import { Show, onCleanup, onMount } from "solid-js";
import { isInputTarget } from "@/utils";
import { useEditorApi } from "@/context/dapi";
import { downloadDesktopApp } from "@/lib/desktop-app";
import { generateProjectName } from "@/lib/db";
import { createProject, ensureProjectsRoot } from "@/projects";
import { useLibrary } from "@/engine/library";
import { pickAndImport } from "@/engine/asset-actions";
import { projectRoute } from "@/hooks/use-project-route";
import { toast } from "somoto";
import { useLayout } from "@/context/layout";
import { useWorld } from "@diffusionstudio/koota-solid";
import { zoomBy, zoomTo, zoomToFit } from "@/engine";
import { usePromptInput } from "@/context/prompt-input";
import { Tool, ToolType } from "@diffusionstudio/runtime";
import { FileMenu } from "./file-menu";
import { EditMenu } from "./edit-menu";
import { ViewMenu } from "./view-menu";
import { ToolMenu } from "./tool-menu";

export function ProjectMenu() {
  const navigate = useNavigate();
  const { isDesktop } = useEditorApi();
  const library = useLibrary();
  const layout = useLayout();
  const world = useWorld();
  const { setPromptInputOpen } = usePromptInput();
  const setTool = (value: ToolType) => world.set(Tool, { value });

  const handleOpenDashboard = () => {
    (document.activeElement as HTMLElement)?.blur?.();
    navigate("/?dashboard=projects");
  };

  const handleOpenAccount = () => {
    (document.activeElement as HTMLElement)?.blur?.();
    navigate("/?dashboard=account");
  };

  const handleNewProject = async () => {
    try {
      if (!(await ensureProjectsRoot())) return;
      const created = await createProject(generateProjectName());
      navigate(projectRoute(created.id));
    } catch (e) {
      toast.error("Failed to create project", {
        description: (e as Error).message,
      });
    }
  };

  const handleImportFromComputer = async () => {
    const lib = library();
    if (!lib) {
      toast("No project open");
      return;
    }
    await pickAndImport(lib, "");
  };

  /**
   * Leaving the editor is the app's command rather than the runtime's, so its
   * key is bound here, with the item that offers it.
   */
  const handleShortcut = (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
    if (event.key.toLowerCase() !== "d" || isInputTarget(event)) return;

    event.preventDefault();
    handleOpenDashboard();
  };

  onMount(() => {
    window.addEventListener("keydown", handleShortcut);

    const onGoDashboard = () => handleOpenDashboard();
    const onOpenAccount = () => handleOpenAccount();
    const onNewProject = () => handleNewProject();
    const onImport = () => handleImportFromComputer();
    const onZoomIn = () => zoomBy(world, 1.25);
    const onZoomOut = () => zoomBy(world, 0.8);
    const onZoomReset = () => zoomTo(world, 1);
    const onZoomFit = () => zoomToFit(world);
    const onToggleUI = () => layout.toggleUI();
    const onToggleTimeline = () => layout.toggleTimeline();
    const onToolAi = () => setPromptInputOpen(true);
    const onToolScene = () => setTool(ToolType.SCENE);
    const onToolText = () => setTool(ToolType.TEXT);
    const onToolRect = () => setTool(ToolType.RECT);

    window.addEventListener("vixa:go-dashboard", onGoDashboard);
    window.addEventListener("vixa:open-account", onOpenAccount);
    window.addEventListener("vixa:new-project", onNewProject);
    window.addEventListener("vixa:import", onImport);
    window.addEventListener("vixa:zoom-in", onZoomIn);
    window.addEventListener("vixa:zoom-out", onZoomOut);
    window.addEventListener("vixa:zoom-reset", onZoomReset);
    window.addEventListener("vixa:zoom-fit", onZoomFit);
    window.addEventListener("vixa:toggle-ui", onToggleUI);
    window.addEventListener("vixa:toggle-timeline", onToggleTimeline);
    window.addEventListener("vixa:tool-ai", onToolAi);
    window.addEventListener("vixa:tool-scene", onToolScene);
    window.addEventListener("vixa:tool-text", onToolText);
    window.addEventListener("vixa:tool-rect", onToolRect);

    onCleanup(() => {
      window.removeEventListener("keydown", handleShortcut);
      window.removeEventListener("vixa:go-dashboard", onGoDashboard);
      window.removeEventListener("vixa:open-account", onOpenAccount);
      window.removeEventListener("vixa:new-project", onNewProject);
      window.removeEventListener("vixa:import", onImport);
      window.removeEventListener("vixa:zoom-in", onZoomIn);
      window.removeEventListener("vixa:zoom-out", onZoomOut);
      window.removeEventListener("vixa:zoom-reset", onZoomReset);
      window.removeEventListener("vixa:zoom-fit", onZoomFit);
      window.removeEventListener("vixa:toggle-ui", onToggleUI);
      window.removeEventListener("vixa:toggle-timeline", onToggleTimeline);
      window.removeEventListener("vixa:tool-ai", onToolAi);
      window.removeEventListener("vixa:tool-scene", onToolScene);
      window.removeEventListener("vixa:tool-text", onToolText);
      window.removeEventListener("vixa:tool-rect", onToolRect);
    });
  });

  if (isDesktop) {
    return (
      <button
        type="button"
        onClick={handleOpenDashboard}
        title="Go to dashboard (⇧⌘D)"
        aria-label="Go to dashboard"
        class="flex items-center justify-center size-7 rounded-md text-muted-foreground outline-none focus-ring hover:text-foreground hover:bg-accent/50 transition-colors"
      >
        <Icon name="diffusion-logo" class="size-6" />
      </button>
    );
  }

  return (
    <>
      <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as="button"
          type="button"
          class="flex items-center gap-0 h-7 rounded-md text-muted-foreground outline-none focus-ring hover:text-foreground data-expanded:text-foreground"
        >
          <Icon name="diffusion-logo" class="size-6" />
          <div class="flex items-center justify-center overflow-clip h-6 w-4">
            <Icon name="chevron-down" class="size-6" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent class="w-[196px]">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={handleOpenDashboard}>
                Go to dashboard
                <DropdownMenuShortcut>⇧⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>File</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent class="w-[196px]">
                    <FileMenu />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Edit</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent class="w-[196px]">
                    <EditMenu />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent class="w-[216px]">
                    <ViewMenu />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Tool</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent class="w-[172px]">
                    <ToolMenu />
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={handleOpenAccount}>Account</DropdownMenuItem>
            </DropdownMenuGroup>

            <Show when={!isDesktop}>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  class="gap-1 pl-0 pr-2"
                  onSelect={() => downloadDesktopApp("main_menu")}
                >
                  <span class="grid h-7 w-6 shrink-0 place-items-center overflow-clip">
                    <Icon name="download" class="size-6" />
                  </span>
                  Get desktop app (macOS)
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </Show>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </>
  );
}
