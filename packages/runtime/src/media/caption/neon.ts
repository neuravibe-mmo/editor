/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { store } from '../../world/store';
import { CaptionAlign, CaptionType, PaintType, FontStyle, TextAlign, TextBaseline, TextCase } from '../../constants';
import { Paint, Color, Caption, TextRange, Shadow, Opacity, Blur, Offset } from '../../traits';
import { renderText } from '../../utils/text';
import { loadWebFont } from '../../fonts/utils';
import { groupBy, findActiveGroup, clearTextRanges, resolveTranscript, setChars } from './utils';
import { placeCaption } from './position';
import { createEntity } from '../../actions/entities';
import { appendChild } from '../../actions/hierarchy';

import type { Entity, World } from 'koota';
import type { Asset } from '@diffusionstudio/assets';
import type { CaptionDecoder, CaptionPresetStyle } from './types';

const WIDTH = 700;
const HEIGHT = 140;
export const NEON_GLOW_COLOR = 0x00F0FF;
export const NEON_ACTIVE_COLOR = 0xFF007F;

export const NEON_TEXT_STYLE = {
	fontFamily: 'Montserrat',
	fontWeight: '800',
	fontStyle: FontStyle.NORMAL,
	fontSize: 66,
	textAlign: TextAlign.CENTER,
	textBaseline: TextBaseline.MIDDLE,
	textCase: TextCase.UPPER,
	leading: 1.1,
	letterSpacing: 2,
} as const satisfies CaptionPresetStyle;

export class NeonCaptionDecoder implements CaptionDecoder {
	public readonly type = CaptionType.NEON;
	public groups: ReturnType<typeof groupBy> = [];
	public ready = false;
	public styled = false;
	public readonly initPromise: Promise<void>;

	private readonly asset: Asset;
	private currentGroupIndex = -1;
	private currentWordIndex = -1;
	private glowShadow1: Entity | null = null;
	private glowShadow2: Entity | null = null;
	private fill: Entity | null = null;
	private range: Entity | null = null;

	constructor(asset: Asset) {
		this.asset = asset;
		this.initPromise = this.init();
	}

	private async init() {
		if (this.ready) return;
		const transcript = await resolveTranscript(this.asset);
		this.groups = groupBy(transcript, { length: 20 });
		this.ready = true;
	}

	public reposition(world: World, entity: Entity): boolean {
		return placeCaption(world, entity, { width: WIDTH, height: HEIGHT, defaultAlign: CaptionAlign.CENTER });
	}

	public applyStyles(world: World, entity: Entity): boolean {
		if (!this.reposition(world, entity)) return false;

		// Broad outer neon glow
		const s1 = createEntity(world);
		s1.add(Shadow);
		s1.add(Color);
		s1.set(Color, { value: NEON_GLOW_COLOR });
		s1.add(Opacity);
		s1.set(Opacity, { value: 0.9 });
		s1.add(Blur);
		s1.set(Blur, { value: 36 });
		s1.add(Offset);
		s1.set(Offset, { x: 0, y: 0 });
		appendChild(world, s1, entity);
		this.glowShadow1 = s1;

		// Tight crisp neon glow
		const s2 = createEntity(world);
		s2.add(Shadow);
		s2.add(Color);
		s2.set(Color, { value: NEON_GLOW_COLOR });
		s2.add(Opacity);
		s2.set(Opacity, { value: 1 });
		s2.add(Blur);
		s2.set(Blur, { value: 12 });
		s2.add(Offset);
		s2.set(Offset, { x: 0, y: 0 });
		appendChild(world, s2, entity);
		this.glowShadow2 = s2;

		loadWebFont(world, NEON_TEXT_STYLE.fontFamily);
		return true;
	}

	public seekTo(world: World, entity: Entity, relativeTime: number): void {
		const groupIndex = findActiveGroup(this.groups, relativeTime);

		if (groupIndex === -1) {
			setChars(world, entity, '');
			clearTextRanges(world, entity);
			this.fill = null;
			this.range = null;
			this.currentGroupIndex = -1;
			this.currentWordIndex = -1;
			return;
		}

		const group = this.groups[groupIndex]!;
		const wordIndex = group.findIndex(word =>
			relativeTime >= word.start && relativeTime <= word.end
		);

		const text = group.map(w => w.text).join(' ');

		if (groupIndex !== this.currentGroupIndex || wordIndex !== this.currentWordIndex) {
			this.currentGroupIndex = groupIndex;
			this.currentWordIndex = wordIndex;
			setChars(world, entity, text);

			clearTextRanges(world, entity);
			this.fill = null;
			this.range = null;

			if (wordIndex !== -1) {
				const start = group.slice(0, wordIndex).map(w => w.text).join(' ').length + (wordIndex > 0 ? 1 : 0);
				const end = start + group[wordIndex]!.text.length;
				const range = createEntity(world);
				range.add(TextRange);
				range.set(TextRange, { start, end });
				range.add(Color);
				range.set(Color, { value: NEON_ACTIVE_COLOR });
				appendChild(world, range, entity);
				this.range = range;

				const fill = createEntity(world);
				fill.add(Paint);
				fill.set(Paint, { value: PaintType.SOLID });
				fill.add(Color);
				fill.set(Color, { value: NEON_ACTIVE_COLOR });
				appendChild(world, fill, range);
				this.fill = fill;
			}
		}
	}

	public draw(world: World, entity: Entity): void {
		const colors = entity.get(Caption)?.colors;
		const glowColor = colors?.[0] ?? NEON_GLOW_COLOR;
		const activeColor = colors?.[1] ?? NEON_ACTIVE_COLOR;

		if (this.glowShadow1) {
			store(world, Color).value[this.glowShadow1.id()] = glowColor;
		}
		if (this.glowShadow2) {
			store(world, Color).value[this.glowShadow2.id()] = glowColor;
		}
		if (this.range) {
			store(world, Color).value[this.range.id()] = activeColor;
		}
		if (this.fill) {
			store(world, Color).value[this.fill.id()] = activeColor;
		}

		renderText(world, entity);
	}

	public dispose(): void {
		this.groups = [];
		this.currentGroupIndex = -1;
		this.currentWordIndex = -1;
	}
}
