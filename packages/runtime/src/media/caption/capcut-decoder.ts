/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { store } from '../../world/store';
import {
	CaptionAlign, CaptionType, PaintType, StrokeCap,
	StrokeJoin,
} from '../../constants';
import {
	Paint, Color, Caption, TextRange, Shadow, Opacity, Blur,
	Offset, Stroke, StrokeStyle, RenderSurface, TextCache, Chars, Computed, TextStyle,
} from '../../traits';
import { tokenizeText, shapeTokens, renderTokens, applyFont } from '../../utils/text';
import { colorToHex } from '../../utils/color';
import { loadWebFont } from '../../fonts/utils';
import { groupBy, findActiveGroup, clearTextRanges, resolveTranscript, setChars } from './utils';
import { placeCaption } from './position';
import { createEntity } from '../../actions/entities';
import { appendChild } from '../../actions/hierarchy';
import { CAPCUT_PRESET_CONFIGS, type CapCutPresetConfig } from './capcut-styles';

import type { Entity, World } from 'koota';
import type { Asset } from '@diffusionstudio/assets';
import type { CaptionDecoder } from './types';

const WIDTH = 700;
const HEIGHT = 140;

function drawComicBurst(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	fillColor: string,
	strokeColor?: string,
	strokeWidth = 0,
) {
	const points = 16;
	const angleStep = (Math.PI * 2) / points;
	ctx.save();
	ctx.beginPath();
	for (let i = 0; i < points; i++) {
		const angle = i * angleStep;
		const isOuter = i % 2 === 0;
		const rFactor = isOuter ? 1.25 : 0.88;
		const px = cx + Math.cos(angle) * (rx * rFactor);
		const py = cy + Math.sin(angle) * (ry * rFactor);
		if (i === 0) {
			ctx.moveTo(px, py);
		} else {
			ctx.lineTo(px, py);
		}
	}
	ctx.closePath();
	ctx.fillStyle = fillColor;
	ctx.fill();
	if (strokeColor && strokeWidth > 0) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = strokeWidth;
		ctx.lineJoin = 'miter';
		ctx.miterLimit = 4;
		ctx.stroke();
	}
	ctx.restore();
}

function drawRoundedBox(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	fillColor: string,
	strokeColor?: string,
	strokeWidth = 0,
	opacity = 1,
) {
	ctx.save();
	ctx.globalAlpha *= opacity;
	ctx.beginPath();
	if (typeof ctx.roundRect === 'function') {
		ctx.roundRect(x, y, width, height, radius);
	} else {
		ctx.rect(x, y, width, height);
	}
	ctx.fillStyle = fillColor;
	ctx.fill();
	if (strokeColor && strokeWidth > 0) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = strokeWidth;
		ctx.lineJoin = 'round';
		ctx.stroke();
	}
	ctx.restore();
}

function drawLightningBolt(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	rotation = 0,
): void {
	ctx.save();
	ctx.translate(x, y);
	if (rotation !== 0) ctx.rotate(rotation);

	ctx.beginPath();
	ctx.moveTo(size * 0.15, -size * 0.6);
	ctx.lineTo(-size * 0.45, -size * 0.05);
	ctx.lineTo(-size * 0.05, -size * 0.05);
	ctx.lineTo(-size * 0.35, size * 0.6);
	ctx.lineTo(size * 0.45, size * 0.05);
	ctx.lineTo(size * 0.05, size * 0.05);
	ctx.closePath();

	ctx.fillStyle = '#FFE500';
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 2.5;
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.fill();

	ctx.restore();
}

export class CapCutCaptionDecoder implements CaptionDecoder {
	public readonly type: CaptionType;
	public groups: ReturnType<typeof groupBy> = [];
	public ready = false;
	public styled = false;
	public readonly initPromise: Promise<void>;

	private readonly asset: Asset;
	private readonly presetKey: string;
	private readonly config: CapCutPresetConfig;

	private currentGroupIndex = -1;
	private currentWordIndex = -1;
	private lastRelativeTime = 0;
	private fill: Entity | null = null;
	private range: Entity | null = null;

	constructor(asset: Asset, presetType: CaptionType) {
		this.asset = asset;
		this.type = presetType;
		const offset = presetType - CaptionType.CAPCUT_01 + 1;
		this.presetKey = `capcut_${String(offset).padStart(2, '0')}`;
		this.config = CAPCUT_PRESET_CONFIGS[this.presetKey] ?? CAPCUT_PRESET_CONFIGS.capcut_01!;
		this.initPromise = this.init();
	}

	private async init() {
		if (this.ready) return;
		const transcript = await resolveTranscript(this.asset);
		this.groups = groupBy(transcript, { length: 16 });
		this.ready = true;
	}

	public reposition(world: World, entity: Entity): boolean {
		return placeCaption(world, entity, { width: WIDTH, height: HEIGHT, defaultAlign: CaptionAlign.CENTER });
	}

	public applyStyles(world: World, entity: Entity): boolean {
		if (!this.reposition(world, entity)) return false;

		// Set text style from preset config
		if (!entity.has(TextStyle)) {
			entity.add(TextStyle);
		}
		entity.set(TextStyle, this.config.style);

		// Set base text color & solid paint on the entity
		if (!entity.has(Color)) {
			entity.add(Color);
		}
		entity.set(Color, { value: this.config.textColor });
		store(world, Color).value[entity.id()] = this.config.textColor;
		if (entity.has(Computed)) {
			store(world, Computed).color[entity.id()] = this.config.textColor;
		}

		if (!entity.has(Paint)) {
			entity.add(Paint);
		}
		entity.set(Paint, { value: PaintType.SOLID });

		// Inner/Main Stroke
		if (this.config.stroke) {
			const stroke = createEntity(world);
			stroke.add(Stroke);
			stroke.add(Paint);
			stroke.set(Paint, { value: PaintType.SOLID });
			stroke.add(Color);
			stroke.set(Color, { value: this.config.stroke.color });
			stroke.add(StrokeStyle);
			stroke.set(StrokeStyle, {
				width: this.config.stroke.width,
				join: StrokeJoin.ROUND,
				cap: StrokeCap.ROUND,
			});
			appendChild(world, stroke, entity);
		}

		// Soft or Hard Shadow
		if (this.config.shadow) {
			const shadow = createEntity(world);
			shadow.add(Shadow);
			shadow.add(Color);
			shadow.set(Color, { value: this.config.shadow.color });
			shadow.add(Opacity);
			shadow.set(Opacity, { value: this.config.shadow.opacity ?? 1 });
			shadow.add(Blur);
			shadow.set(Blur, { value: this.config.shadow.blur });
			shadow.add(Offset);
			shadow.set(Offset, { x: this.config.shadow.x, y: this.config.shadow.y });
			appendChild(world, shadow, entity);
		}

		loadWebFont(world, this.config.style.fontFamily as any);
		return true;
	}

	public seekTo(world: World, entity: Entity, relativeTime: number): void {
		this.lastRelativeTime = relativeTime;

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

			if (wordIndex !== -1 && this.config.activeTextColor !== undefined) {
				const start = group.slice(0, wordIndex).map(w => w.text).join(' ').length + (wordIndex > 0 ? 1 : 0);
				const end = start + group[wordIndex]!.text.length;
				const range = createEntity(world);
				range.add(TextRange);
				range.set(TextRange, { start, end });
				range.add(Color);
				range.set(Color, { value: this.config.activeTextColor });
				appendChild(world, range, entity);
				this.range = range;

				const fill = createEntity(world);
				fill.add(Paint);
				fill.set(Paint, { value: PaintType.SOLID });
				fill.add(Color);
				fill.set(Color, { value: this.config.activeTextColor });
				appendChild(world, fill, range);
				this.fill = fill;
			}
		}
	}

	public draw(world: World, entity: Entity): void {
		const ctx = world.get(RenderSurface)?.ctx;
		if (!ctx) return;

		// If ready now but was uninitialized during earlier seek, re-seek
		if (this.currentGroupIndex === -1 && this.ready && this.groups.length > 0) {
			this.seekTo(world, entity, this.lastRelativeTime);
		}

		const chars = store(world, Computed).chars[entity.id()] ?? store(world, Chars).value[entity.id()] ?? '';
		if (!chars || !chars.trim()) return;

		// Sync colors if customized via Inspector
		const colors = entity.get(Caption)?.colors;
		const activeColor = colors?.[0] ?? this.config.activeTextColor;
		const baseColor = colors?.[1] ?? this.config.textColor;

		store(world, Color).value[entity.id()] = baseColor;
		if (entity.has(Computed)) {
			store(world, Computed).color[entity.id()] = baseColor;
		}

		if (activeColor !== undefined) {
			if (this.range) {
				store(world, Color).value[this.range.id()] = activeColor;
			}
			if (this.fill) {
				store(world, Color).value[this.fill.id()] = activeColor;
			}
		}

		// Tokenize and shape text to get exact bounding box and token positions
		tokenizeText(world, entity);
		shapeTokens(world, entity);

		const lines = store(world, TextCache).tokens[entity.id()];
		if (!lines || !lines.length) return;

		const words = lines.flat().filter(w => w.chars.trim().length > 0);
		if (!words.length) return;

		// 1. Draw Background Shapes (Comic Burst, Box, Pill)
		if (this.config.background) {
			const bg = this.config.background;
			const padX = bg.paddingX ?? 24;
			const padY = bg.paddingY ?? 12;
			const radius = bg.radius ?? 12;
			const fontSize = this.config.style.fontSize ?? 58;

			if (bg.target === 'activeWord') {
				// Only draw behind the currently active spoken word
				const activeToken = (this.currentWordIndex >= 0 && this.currentWordIndex < words.length)
					? words[this.currentWordIndex]
					: null;

				if (activeToken) {
					const tMinX = activeToken.x;
					const tMaxX = activeToken.x + activeToken.width;
					const tMinY = activeToken.y - (activeToken.height > 0 ? activeToken.height : fontSize) / 2;
					const tMaxY = activeToken.y + (activeToken.height > 0 ? activeToken.height : fontSize) / 2;

					if (bg.type === 'comic_burst') {
						const cx = (tMinX + tMaxX) / 2;
						const cy = (tMinY + tMaxY) / 2;
						const rx = Math.max((tMaxX - tMinX) / 2 + padX, 45);
						const ry = Math.max((tMaxY - tMinY) / 2 + padY, 30);
						drawComicBurst(
							ctx,
							cx,
							cy,
							rx,
							ry,
							colorToHex(bg.color),
							bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : undefined,
							bg.strokeWidth ?? 0,
						);
					} else {
						const boxX = tMinX - padX;
						const boxY = tMinY - padY;
						const boxW = Math.max((tMaxX - tMinX) + padX * 2, 40);
						const boxH = Math.max((tMaxY - tMinY) + padY * 2, 30);
						drawRoundedBox(
							ctx,
							boxX,
							boxY,
							boxW,
							boxH,
							bg.type === 'pill' ? boxH / 2 : radius,
							colorToHex(bg.color),
							bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : undefined,
							bg.strokeWidth ?? 0,
							bg.opacity ?? 1,
						);
					}
				}
			} else {
				// target === 'all' (default): draw for all words / all lines
				const minX = Math.min(...words.map(w => w.x));
				const maxX = Math.max(...words.map(w => w.x + w.width));
				const minY = Math.min(...words.map(w => w.y - (w.height > 0 ? w.height : fontSize) / 2));
				const maxY = Math.max(...words.map(w => w.y + (w.height > 0 ? w.height : fontSize) / 2));

				if (bg.type === 'comic_burst') {
					const cx = (minX + maxX) / 2;
					const cy = (minY + maxY) / 2;
					const rx = Math.max((maxX - minX) / 2 + padX, 50);
					const ry = Math.max((maxY - minY) / 2 + padY, 35);
					drawComicBurst(
						ctx,
						cx,
						cy,
						rx,
						ry,
						colorToHex(bg.color),
						bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : undefined,
						bg.strokeWidth ?? 0,
					);
				} else if (bg.type === 'box' || bg.type === 'pill') {
					for (const line of lines) {
						const lineWords = line.filter(w => w.chars.trim().length > 0);
						if (!lineWords.length) continue;
						const lMinX = Math.min(...lineWords.map(w => w.x));
						const lMaxX = Math.max(...lineWords.map(w => w.x + w.width));
						const lMinY = Math.min(...lineWords.map(w => w.y - (w.height > 0 ? w.height : fontSize) / 2));
						const lMaxY = Math.max(...lineWords.map(w => w.y + (w.height > 0 ? w.height : fontSize) / 2));

						const lBoxX = lMinX - padX;
						const lBoxY = lMinY - padY;
						const lBoxW = Math.max((lMaxX - lMinX) + padX * 2, 40);
						const lBoxH = Math.max((lMaxY - lMinY) + padY * 2, 30);

						drawRoundedBox(
							ctx,
							lBoxX,
							lBoxY,
							lBoxW,
							lBoxH,
							bg.type === 'pill' ? lBoxH / 2 : radius,
							colorToHex(bg.color),
							bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : undefined,
							bg.strokeWidth ?? 0,
							bg.opacity ?? 1,
						);
					}
				}
			}
		}

		// 2. Draw 3D Block Extrusion
		if (this.config.extrude3D) {
			const extrude = this.config.extrude3D;
			const depth = extrude.depth;
			const dirX = extrude.dirX ?? 1;
			const dirY = extrude.dirY ?? 1;
			const extrudeHex = colorToHex(extrude.color);

			ctx.save();
			for (const word of words) {
				applyFont(ctx, world, entity, word.ranges);
				ctx.fillStyle = extrudeHex;
				ctx.strokeStyle = extrudeHex;
				ctx.lineWidth = (this.config.stroke?.width ?? 4) + 1;
				ctx.lineJoin = 'round';

				for (let d = depth; d >= 1; d--) {
					ctx.strokeText(word.chars, word.x + d * dirX, word.y + d * dirY);
					ctx.fillText(word.chars, word.x + d * dirX, word.y + d * dirY);
				}
			}
			ctx.restore();
		}

		// 3. Draw Outer Stroke (Dual Outline)
		if (this.config.outerStroke) {
			const outer = this.config.outerStroke;
			ctx.save();
			for (const word of words) {
				applyFont(ctx, world, entity, word.ranges);
				ctx.strokeStyle = colorToHex(outer.color);
				ctx.lineWidth = outer.width;
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				ctx.strokeText(word.chars, word.x, word.y);
			}
			ctx.restore();
		}

		// 4. Draw Neon Glow Aura
		if (this.config.glow) {
			const glow = this.config.glow;
			ctx.save();
			ctx.shadowColor = glow.color;
			ctx.shadowBlur = glow.blur;
			for (const word of words) {
				applyFont(ctx, world, entity, word.ranges);
				ctx.fillStyle = glow.color;
				ctx.fillText(word.chars, word.x, word.y);
			}
			ctx.restore();
		}

		// 5. Final render: Rainbow Candy Letters & Stickers OR Standard Text Tokens
		if (this.config.rainbowLetters) {
			const palette = this.config.rainbowLetters.palette.map(c => colorToHex(c));
			const fontSize = this.config.style.fontSize ?? 58;

			ctx.save();
			ctx.textAlign = 'start';
			ctx.textBaseline = 'top';

			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				applyFont(ctx, world, entity, word.ranges);

				// Kinetic lightning stickers around active word
				if (this.config.rainbowLetters.stickers && (wIdx === this.currentWordIndex || words.length === 1)) {
					const boltSize = Math.max(fontSize * 0.38, 22);
					drawLightningBolt(ctx, word.x - boltSize * 0.7, word.y - boltSize * 0.2, boltSize, -0.25);
					drawLightningBolt(ctx, word.x + word.width + boltSize * 0.7, word.y - boltSize * 0.2, boltSize, 0.25);
					drawLightningBolt(ctx, word.x - boltSize * 0.5, word.y + fontSize * 0.85, boltSize * 0.85, -0.35);
					drawLightningBolt(ctx, word.x + word.width + boltSize * 0.5, word.y + fontSize * 0.85, boltSize * 0.85, 0.35);
				}

				// Draw each character with cyclic rainbow candy gradient and outline
				for (let i = 0; i < word.chars.length; i++) {
					const char = word.chars[i]!;
					const charAdvance = ctx.measureText(word.chars.slice(0, i)).width;
					const charX = word.x + charAdvance;
					const color = palette[i % palette.length]!;

					// Black outline
					ctx.strokeStyle = '#000000';
					ctx.lineWidth = 5;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(char, charX, word.y);

					// Glossy candy fill
					const grad = ctx.createLinearGradient(charX, word.y, charX, word.y + fontSize);
					grad.addColorStop(0, '#FFFFFF');
					grad.addColorStop(0.25, color);
					grad.addColorStop(1, color);

					ctx.fillStyle = grad;
					ctx.fillText(char, charX, word.y);
				}
			}
			ctx.restore();
		} else {
			renderTokens(ctx, world, entity);
		}
	}

	public dispose(): void {
		this.groups = [];
		this.currentGroupIndex = -1;
		this.currentWordIndex = -1;
	}
}
