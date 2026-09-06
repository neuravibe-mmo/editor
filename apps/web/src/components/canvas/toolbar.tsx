/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { PromptInput } from "../genai/prompt-input";
import { ActionBar } from "../genai/action-bar";
import { Show } from "solid-js";
import { Tool, ToolType } from "@diffusionstudio/runtime";
import { useWorld } from "@diffusionstudio/koota-solid";
import { useTool, useCameraScale, zoomBy, zoomTo, zoomToFit } from "@/engine";
import { usePromptInput } from "@/context/prompt-input";

export function Toolbar() {
  const world = useWorld();
  const { promptInputOpen, promptInputConfig, openPromptInput, setPromptInputOpen } = usePromptInput();
  const selectedTool = useTool();
  const cameraScale = useCameraScale();
  const zoomPercentage = () => `${Math.round(cameraScale() * 100)}%`;

  const handleToolChange = (tool: ToolType) => {
    world.set(Tool, { value: tool });
  }

  return (
    <>
      <Show when={promptInputOpen()}>
        <PromptInput initialConfig={promptInputConfig()} />
      </Show>
      <Show when={!promptInputOpen()}>
        <ActionBar openPromptInput={openPromptInput} />
      </Show>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl p-1.5 bg-background border border-border-strong flex gap-2 items-center z-10">
        <div class="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              as={Button}
              size="icon-square"
              class={[ToolType.MOVE, ToolType.HAND].includes(selectedTool()) ? 'text-foreground' : 'text-muted-foreground'}
              variant={[ToolType.MOVE, ToolType.HAND].includes(selectedTool()) ? 'default' : 'ghost'}
              onClick={() => handleToolChange(
                selectedTool() === ToolType.HAND ? ToolType.HAND : ToolType.MOVE
              )}
            >
              <Icon name={selectedTool() === ToolType.HAND ? 'hand' : 'move'} />
            </TooltipTrigger>
            <TooltipContent shortcut={selectedTool() === ToolType.HAND ? 'H' : 'V'}>
              {selectedTool() === ToolType.HAND ? 'Hand' : 'Move'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu placement="top-start">
            <Tooltip>
              <TooltipTrigger<typeof DropdownMenuTrigger>
                as={(triggerProps: object) => (
                  <DropdownMenuTrigger<typeof Button>
                    {...triggerProps}
                    as={(buttonProps) => (
                      <Button {...buttonProps} size="icon-select" variant="ghost" class="text-muted-foreground">
                        <Icon name="chevron-down" />
                      </Button>
                    )}
                  />
                )}
              />
              <TooltipContent>Select tool</TooltipContent>
            </Tooltip>
            <DropdownMenuPortal>
              <DropdownMenuContent>
                <DropdownMenuItem class="px-0 pr-2 gap-0.5" onSelect={() => handleToolChange(ToolType.MOVE)}>
                  <div classList={{ "visible": selectedTool() === ToolType.MOVE }} class="invisible">
                    <Icon name="confirm-check" class="text-foreground" />
                  </div>
                  <Icon name="move-small" class="text-foreground" />
                  <span class="min-w-12 mx-1">Move</span>
                  <DropdownMenuShortcut>V</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem class="px-0 pr-2 gap-0.5" onSelect={() => handleToolChange(ToolType.HAND)}>
                  <div classList={{ "visible": selectedTool() === ToolType.HAND }} class="invisible">
                    <Icon name="confirm-check" class="text-foreground" />
                  </div>
                  <Icon name="hand" class="text-foreground" />
                  <span class="min-w-12 mx-1">Hand</span>
                  <DropdownMenuShortcut>H</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
        <Separator orientation="vertical" class="min-h-5" />
        <div class="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              as={Button}
              size="icon-square"
              variant="ghost"
              class="text-muted-foreground hover:text-foreground"
              onClick={() => zoomToFit(world)}
            >
              <Icon name="anchor-align-center" class="size-5" />
            </TooltipTrigger>
            <TooltipContent shortcut="⌘1">Canh giữa & Vừa màn hình (Fit to Screen)</TooltipContent>
          </Tooltip>
          <DropdownMenu placement="top-start">
            <Tooltip>
              <TooltipTrigger<typeof DropdownMenuTrigger>
                as={(triggerProps: object) => (
                  <DropdownMenuTrigger<typeof Button>
                    {...triggerProps}
                    as={(buttonProps) => (
                      <Button
                        {...buttonProps}
                        variant="ghost"
                        class="text-muted-foreground hover:text-foreground text-[11px] font-mono px-1.5 h-8 flex items-center gap-1"
                      >
                        <span>{zoomPercentage()}</span>
                        <Icon name="chevron-down" class="size-3.5" />
                      </Button>
                    )}
                  />
                )}
              />
              <TooltipContent>Tỉ lệ & Vị trí hiển thị</TooltipContent>
            </Tooltip>
            <DropdownMenuPortal>
              <DropdownMenuContent>
                <DropdownMenuItem class="px-2 gap-2" onSelect={() => zoomToFit(world)}>
                  <Icon name="anchor-align-center" class="size-4 text-foreground" />
                  <span class="flex-1">Canh giữa khung hình (Fit)</span>
                  <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem class="px-2 gap-2" onSelect={() => zoomBy(world, 1.25)}>
                  <Icon name="plus-add" class="size-4 text-foreground" />
                  <span class="flex-1">Phóng to (Zoom In)</span>
                  <DropdownMenuShortcut>⌘+</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem class="px-2 gap-2" onSelect={() => zoomBy(world, 0.8)}>
                  <Icon name="minus" class="size-4 text-foreground" />
                  <span class="flex-1">Thu nhỏ (Zoom Out)</span>
                  <DropdownMenuShortcut>⌘-</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem class="px-2 gap-2" onSelect={() => zoomTo(world, 1)}>
                  <span class="flex-1 ml-6">Kích thước chuẩn (100%)</span>
                  <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem class="px-2 gap-2" onSelect={() => zoomTo(world, 0.5)}>
                  <span class="flex-1 ml-6">Kích thước 50%</span>
                </DropdownMenuItem>
                <DropdownMenuItem class="px-2 gap-2" onSelect={() => zoomTo(world, 2)}>
                  <span class="flex-1 ml-6">Kích thước 200%</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        </div>
        <Separator orientation="vertical" class="min-h-5" />
        <Tooltip>
          <TooltipTrigger
            as={Button}
            size="icon-square"
            variant={selectedTool() === ToolType.SCENE ? 'default' : 'ghost'}
            onClick={() => handleToolChange(ToolType.SCENE)}
            class={selectedTool() === ToolType.SCENE ? 'text-foreground' : 'text-muted-foreground'}
          >
            <Icon name="frame" class="size-5" />
          </TooltipTrigger>
          <TooltipContent shortcut="F">Frame</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            as={Button}
            size="icon-square"
            variant={selectedTool() === ToolType.RECT ? 'default' : 'ghost'}
            onClick={() => handleToolChange(ToolType.RECT)}
            class={selectedTool() === ToolType.RECT ? 'text-foreground' : 'text-muted-foreground'}
          >
            <Icon name="tool.rectangle" />
          </TooltipTrigger>
          <TooltipContent shortcut="R">Rectangle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            as={Button}
            size="icon-square"
            variant={selectedTool() === ToolType.TEXT ? 'default' : 'ghost'}
            onClick={() => handleToolChange(ToolType.TEXT)}
            class={selectedTool() === ToolType.TEXT ? 'text-foreground' : 'text-muted-foreground'}
          >
            <Icon name="tool.text" />
          </TooltipTrigger>
          <TooltipContent shortcut="T">Text</TooltipContent>
        </Tooltip>
        <Separator
          orientation="vertical"
          class="data-[orientation=vertical]:h-5 rounded-md"
        />
        <Tooltip>
          <TooltipTrigger
            as={Button}
            size="icon-square"
            class={promptInputOpen() ? 'text-foreground' : 'text-muted-foreground'}
            variant={promptInputOpen() ? 'default' : 'ghost'}
            onClick={() => setPromptInputOpen(!promptInputOpen())}
          >
            <Icon name="ai-generate" class="size-7" />
          </TooltipTrigger>
          <TooltipContent>AI generate</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
