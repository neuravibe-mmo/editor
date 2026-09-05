/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createMemo, createSignal, onCleanup, Show } from 'solid-js';
import { useWorld } from '@diffusionstudio/koota-solid';
import { Computed } from '@diffusionstudio/runtime';
import { useTimeline } from '@/context/timeline';
import { useLayout } from '@/context/layout';
import { useDerived } from '@/engine/hooks';
import { Icon } from '@/components/ui/icon';
import {
  DEFAULT_TIMELINE_RESOLUTION,
  getResolution,
  getScrollX,
  getTimelineScene,
  SCROLL_X_SENSITIVITY,
  TIMELINE_PADDING_LEFT,
} from '@/engine/timeline';

export function TimelineScrollbar() {
  const world = useWorld();
  const timeline = useTimeline();
  const { timelineMinimized } = useLayout();

  let trackRef: HTMLDivElement | undefined;
  const [trackWidth, setTrackWidth] = createSignal(600);
  const [dragging, setDragging] = createSignal(false);

  let dragStartX = 0;
  let dragStartScrollX = 0;

  // Measure track width via ref callback so it's measured immediately when mounted
  const setupTrack = (el: HTMLDivElement) => {
    trackRef = el;
    const initialWidth = el.getBoundingClientRect().width;
    if (initialWidth > 0) {
      setTrackWidth(initialWidth);
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setTrackWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  };

  // Sample timeline state reactively on every engine tick
  const viewState = useDerived(() => {
    const scene = getTimelineScene(world);
    if (!scene) return null;

    return {
      resolution: getResolution(world, scene),
      scrollX: getScrollX(world, scene),
      duration: scene.get(Computed)?.duration ?? 0,
    };
  });

  const resolution = createMemo(() => viewState()?.resolution ?? DEFAULT_TIMELINE_RESOLUTION);
  const scrollX = createMemo(() => viewState()?.scrollX ?? 0);
  const duration = createMemo(() => viewState()?.duration ?? 0);

  const viewportFrames = createMemo(() => Math.max(1, trackWidth() / resolution()));

  const totalFrames = createMemo(() => {
    const dur = duration();
    const vp = viewportFrames();
    const curr = scrollX();
    return Math.max(dur + 150, vp, curr + vp + 60);
  });

  const minScrollX = createMemo(() => -TIMELINE_PADDING_LEFT / resolution());
  const maxScrollX = createMemo(() => Math.max(minScrollX(), totalFrames() - viewportFrames()));
  const scrollRange = createMemo(() => Math.max(1, maxScrollX() - minScrollX()));

  const thumbRatio = createMemo(() => {
    const total = totalFrames();
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0.05, viewportFrames() / total));
  });

  const thumbWidth = createMemo(() => {
    const w = trackWidth();
    if (w <= 0) return 40;
    return Math.max(40, Math.round(thumbRatio() * w));
  });

  const scrollRatio = createMemo(() => {
    const range = scrollRange();
    if (range <= 0) return 0;
    return Math.min(1, Math.max(0, (scrollX() - minScrollX()) / range));
  });

  const thumbLeft = createMemo(() => {
    const available = Math.max(0, trackWidth() - thumbWidth());
    return Math.round(scrollRatio() * available);
  });

  const handleThumbPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragStartX = e.clientX;
    dragStartScrollX = scrollX();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleThumbPointerMove = (e: PointerEvent) => {
    if (!dragging()) return;
    e.preventDefault();
    e.stopPropagation();

    const deltaPx = e.clientX - dragStartX;
    const availableTrack = trackWidth() - thumbWidth();
    if (availableTrack <= 0) return;

    const deltaRatio = deltaPx / availableTrack;
    const targetScrollX = dragStartScrollX + deltaRatio * scrollRange();
    timeline.scrollToX(targetScrollX);
  };

  const handleThumbPointerUp = (e: PointerEvent) => {
    if (!dragging()) return;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleTrackPointerDown = (e: PointerEvent) => {
    if (e.target !== trackRef) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = trackRef.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const availableTrack = rect.width - thumbWidth();
    if (availableTrack <= 0) return;

    const targetThumbLeft = Math.min(availableTrack, Math.max(0, clickX - thumbWidth() / 2));
    const targetRatio = targetThumbLeft / availableTrack;
    const targetScrollX = minScrollX() + targetRatio * scrollRange();
    timeline.scrollToX(targetScrollX);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    timeline.scrollXBy((delta * SCROLL_X_SENSITIVITY) / resolution());
  };

  const scrollLeftStep = () => {
    timeline.scrollXBy(-viewportFrames() * 0.25);
  };

  const scrollRightStep = () => {
    timeline.scrollXBy(viewportFrames() * 0.25);
  };

  return (
    <Show when={!timelineMinimized()}>
      <div
        class="h-6 shrink-0 w-full bg-sidebar/95 backdrop-blur-sm border-t border-border-strong flex items-center px-1.5 gap-1.5 select-none"
      >
        {/* Scroll Left button */}
        <button
          type="button"
          class="size-4.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded transition-colors"
          title="Scroll Left"
          onClick={scrollLeftStep}
        >
          <Icon name="chevron-left" class="size-3" />
        </button>

        {/* The Scrollbar Track */}
        <div
          ref={setupTrack}
          class="flex-1 h-3 bg-neutral-900/90 hover:bg-neutral-900 rounded border border-white/10 relative cursor-pointer overflow-hidden flex items-center"
          onPointerDown={handleTrackPointerDown}
          onWheel={handleWheel}
        >
          {/* Draggable Thumb */}
          <div
            class="h-full bg-neutral-500 hover:bg-neutral-400 active:bg-primary rounded cursor-grab active:cursor-grabbing border border-white/20 transition-colors flex items-center justify-center shadow-sm"
            classList={{
              'bg-primary! border-primary/50!': dragging(),
            }}
            style={{
              width: `${thumbWidth()}px`,
              transform: `translateX(${thumbLeft()}px)`,
            }}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            onPointerCancel={handleThumbPointerUp}
          >
            {/* Grip ridges */}
            <div class="flex gap-0.5 items-center pointer-events-none opacity-60">
              <div class="w-0.5 h-1.5 bg-white rounded-full" />
              <div class="w-0.5 h-1.5 bg-white rounded-full" />
              <div class="w-0.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>
        </div>

        {/* Scroll Right button */}
        <button
          type="button"
          class="size-4.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded transition-colors"
          title="Scroll Right"
          onClick={scrollRightStep}
        >
          <Icon name="chevron-right" class="size-3" />
        </button>

        {/* Divider */}
        <div class="h-3 w-px bg-border-strong mx-0.5" />

        {/* Zoom Out */}
        <button
          type="button"
          class="size-4.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded transition-colors"
          title="Zoom Out (Ctrl/Cmd + Wheel Down)"
          onClick={timeline.zoomOut}
        >
          <Icon name="minus" class="size-3" />
        </button>

        {/* Fit to View */}
        <button
          type="button"
          class="px-1.5 h-4 flex items-center justify-center text-[10px] font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded border border-border/40 transition-colors"
          title="Fit Timeline to View"
          onClick={timeline.zoomFit}
        >
          Fit
        </button>

        {/* Zoom In */}
        <button
          type="button"
          class="size-4.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded transition-colors"
          title="Zoom In (Ctrl/Cmd + Wheel Up)"
          onClick={timeline.zoomIn}
        >
          <Icon name="plus-add-small" class="size-3" />
        </button>
      </div>
    </Show>
  );
}
