/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CaptionAlign, CaptionType, PaintType, FontStyle, StrokeCap, StrokeJoin, TextAlign, TextBaseline, TextCase } from '../../constants';
import { Paint, Color, Shadow, Opacity, Blur, Offset, Stroke, StrokeStyle } from '../../traits';
import { renderText } from '../../utils/text';
import { loadWebFont } from '../../fonts/utils';
import { findActiveGroup, resolveTranscript, setChars } from './utils';
import { placeCaption } from './position';
import { createEntity } from '../../actions/entities';
import { appendChild } from '../../actions/hierarchy';

import type { Entity, World } from 'koota';
import type { Asset, WordGroup } from '@diffusionstudio/assets';
import type { CaptionDecoder, CaptionPresetStyle } from './types';

const WIDTH = 600;
const HEIGHT = 140;

export const ONE_WORD_TEXT_STYLE = {
	fontFamily: 'Montserrat',
	fontWeight: '900',
	fontStyle: FontStyle.NORMAL,
	fontSize: 84,
	textAlign: TextAlign.CENTER,
	textBaseline: TextBaseline.MIDDLE,
	textCase: TextCase.UPPER,
	leading: 1,
	letterSpacing: 2,
} as const satisfies CaptionPresetStyle;

export class OneWordCaptionDecoder implements CaptionDecoder {
	public readonly type = CaptionType.ONE_WORD;
	public groups: WordGroup[] = [];
	public ready = false;
	public styled = false;
	public readonly initPromise: Promise<void>;

	private readonly asset: Asset;
	private currentGroupIndex = -1;

	constructor(asset: Asset) {
		this.asset = asset;
		this.initPromise = this.init();
	}

	private async init() {
		if (this.ready) return;
		const transcript = await resolveTranscript(this.asset);
		this.groups = transcript.flatMap(segment => segment.words.map(w => [w]));
		this.ready = true;
	}

	public reposition(world: World, entity: Entity): boolean {
		return placeCaption(world, entity, { width: WIDTH, height: HEIGHT, defaultAlign: CaptionAlign.CENTER });
	}

	public applyStyles(world: World, entity: Entity): boolean {
		if (!this.reposition(world, entity)) return false;

		const stroke = createEntity(world);
		stroke.add(Stroke);
		stroke.add(Paint);
		stroke.set(Paint, { value: PaintType.SOLID });
		stroke.add(Color);
		stroke.set(Color, { value: 0x000000 });
		stroke.add(StrokeStyle);
		stroke.set(StrokeStyle, { width: 6, join: StrokeJoin.ROUND, cap: StrokeCap.ROUND });
		appendChild(world, stroke, entity);

		const shadow = createEntity(world);
		shadow.add(Shadow);
		shadow.add(Color);
		shadow.set(Color, { value: 0x000000 });
		shadow.add(Opacity);
		shadow.set(Opacity, { value: 1 });
		shadow.add(Blur);
		shadow.set(Blur, { value: 20 });
		shadow.add(Offset);
		shadow.set(Offset, { x: 0, y: 6 });
		appendChild(world, shadow, entity);

		loadWebFont(world, ONE_WORD_TEXT_STYLE.fontFamily);
		return true;
	}

	public seekTo(world: World, entity: Entity, relativeTime: number): void {
		const groupIndex = findActiveGroup(this.groups, relativeTime);

		if (groupIndex === -1) {
			setChars(world, entity, '');
			this.currentGroupIndex = -1;
			return;
		}

		const group = this.groups[groupIndex]!;

		if (groupIndex !== this.currentGroupIndex) {
			this.currentGroupIndex = groupIndex;
			setChars(world, entity, group[0]?.text ?? '');
		}
	}

	public draw(world: World, entity: Entity): void {
		renderText(world, entity);
	}

	public dispose(): void {
		this.groups = [];
		this.currentGroupIndex = -1;
	}
}
