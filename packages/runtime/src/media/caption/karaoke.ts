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
export const KARAOKE_HIGHLIGHT_COLOR = 0x24D5FF;
export const KARAOKE_BASE_COLOR = 0x888888;

export const KARAOKE_TEXT_STYLE = {
	fontFamily: 'Montserrat',
	fontWeight: '800',
	fontStyle: FontStyle.NORMAL,
	fontSize: 60,
	textAlign: TextAlign.CENTER,
	textBaseline: TextBaseline.MIDDLE,
	textCase: TextCase.ORIGINAL,
	leading: 1.1,
	letterSpacing: undefined,
} as const satisfies CaptionPresetStyle;

export class KaraokeCaptionDecoder implements CaptionDecoder {
	public readonly type = CaptionType.KARAOKE;
	public groups: ReturnType<typeof groupBy> = [];
	public ready = false;
	public styled = false;
	public readonly initPromise: Promise<void>;

	private readonly asset: Asset;
	private currentGroupIndex = -1;
	private currentWordIndex = -1;
	private fill: Entity | null = null;
	private range: Entity | null = null;

	constructor(asset: Asset) {
		this.asset = asset;
		this.initPromise = this.init();
	}

	private async init() {
		if (this.ready) return;
		const transcript = await resolveTranscript(this.asset);
		this.groups = groupBy(transcript, { length: 28 });
		this.ready = true;
	}

	public reposition(world: World, entity: Entity): boolean {
		return placeCaption(world, entity, { width: WIDTH, height: HEIGHT, defaultAlign: CaptionAlign.CENTER });
	}

	public applyStyles(world: World, entity: Entity): boolean {
		if (!this.reposition(world, entity)) return false;

		const shadow = createEntity(world);
		shadow.add(Shadow);
		shadow.add(Color);
		shadow.set(Color, { value: 0x000000 });
		shadow.add(Opacity);
		shadow.set(Opacity, { value: 0.9 });
		shadow.add(Blur);
		shadow.set(Blur, { value: 16 });
		shadow.add(Offset);
		shadow.set(Offset, { x: 0, y: 4 });
		appendChild(world, shadow, entity);

		loadWebFont(world, KARAOKE_TEXT_STYLE.fontFamily);
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
				const end = group.slice(0, wordIndex + 1).map(w => w.text).join(' ').length;
				const range = createEntity(world);
				range.add(TextRange);
				range.set(TextRange, { start: 0, end });
				range.add(Color);
				range.set(Color, { value: KARAOKE_HIGHLIGHT_COLOR });
				appendChild(world, range, entity);
				this.range = range;

				const fill = createEntity(world);
				fill.add(Paint);
				fill.set(Paint, { value: PaintType.SOLID });
				fill.add(Color);
				fill.set(Color, { value: KARAOKE_HIGHLIGHT_COLOR });
				appendChild(world, fill, range);
				this.fill = fill;
			}
		}
	}

	public draw(world: World, entity: Entity): void {
		const highlightColor = entity.get(Caption)?.colors?.[0] ?? KARAOKE_HIGHLIGHT_COLOR;

		if (this.range) {
			store(world, Color).value[this.range.id()] = highlightColor;
		}
		if (this.fill) {
			store(world, Color).value[this.fill.id()] = highlightColor;
		}

		renderText(world, entity);
	}

	public dispose(): void {
		this.groups = [];
		this.currentGroupIndex = -1;
		this.currentWordIndex = -1;
	}
}
