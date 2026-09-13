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
	Hidden, ChildOf, Source,
} from '../../traits';
import { tokenizeText, shapeTokens, renderTokens, applyFont } from '../../utils/text';
import { colorToHex, parseColor } from '../../utils/color';
import { loadWebFont } from '../../fonts/utils';
import { groupBy, findActiveGroup, clearTextRanges, resolveTranscript, setChars } from './utils';
import { placeCaption } from './position';
import { createEntity, deleteEntity } from '../../actions/entities';
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
	scale = 1,
) {
	ctx.save();
	const w = rx * 2 * scale;
	const h = ry * 2 * scale;
	const hw = w / 2;
	const hh = h / 2;
	const x0 = cx - hw;
	const x1 = cx + hw;
	const y0 = cy - hh;
	const y1 = cy + hh;

	const n_top = Math.max(Math.floor(w / 22), 5);
	const n_side = Math.max(Math.floor(h / 16), 3);

	ctx.beginPath();
	// 1. Top edge (left to right)
	for (let i = 0; i <= n_top * 2; i++) {
		const t = i / (n_top * 2);
		const x = x0 + t * w;
		const isPeak = i % 2 === 1;
		const hVar = (16 + 8 * Math.sin(i * 1.5 + 0.5)) * scale;
		const y = isPeak ? y0 - hVar : y0 + 2 * scale;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}

	// 2. Right edge (top to bottom)
	for (let i = 1; i <= n_side * 2; i++) {
		const t = i / (n_side * 2);
		const y = y0 + t * h;
		const isPeak = i % 2 === 1;
		const wVar = (18 + 8 * Math.cos(i * 1.8 + 0.3)) * scale;
		const x = isPeak ? x1 + wVar : x1 - 2 * scale;
		ctx.lineTo(x, y);
	}

	// 3. Bottom edge (right to left)
	for (let i = 1; i <= n_top * 2; i++) {
		const t = 1.0 - i / (n_top * 2);
		const x = x0 + t * w;
		const isPeak = i % 2 === 1;
		const hVar = (16 + 8 * Math.cos(i * 1.6 + 0.8)) * scale;
		const y = isPeak ? y1 + hVar : y1 - 2 * scale;
		ctx.lineTo(x, y);
	}

	// 4. Left edge (bottom to top)
	for (let i = 1; i < n_side * 2; i++) {
		const t = 1.0 - i / (n_side * 2);
		const y = y0 + t * h;
		const isPeak = i % 2 === 1;
		const wVar = (18 + 8 * Math.sin(i * 1.9 + 0.4)) * scale;
		const x = isPeak ? x0 - wVar : x0 + 2 * scale;
		ctx.lineTo(x, y);
	}

	ctx.closePath();
	ctx.fillStyle = fillColor;
	ctx.fill();

	if (strokeColor && strokeWidth > 0) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = strokeWidth * scale;
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
	shadow?: { color: string; blur: number; x: number; y: number },
) {
	ctx.save();
	ctx.globalAlpha *= opacity;
	if (shadow) {
		ctx.shadowColor = shadow.color;
		ctx.shadowBlur = shadow.blur;
		ctx.shadowOffsetX = shadow.x;
		ctx.shadowOffsetY = shadow.y;
	}
	ctx.beginPath();
	if (typeof ctx.roundRect === 'function') {
		ctx.roundRect(x, y, width, height, radius);
	} else {
		ctx.rect(x, y, width, height);
	}
	ctx.fillStyle = fillColor;
	ctx.fill();
	if (shadow) {
		ctx.shadowColor = 'transparent';
	}
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
	private config: CapCutPresetConfig;

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
		if (this.config.stroke && !this.config.bubbleCloud) {
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
		if (this.config.shadow && !this.config.bubbleCloud && !this.config.rainbowLetters) {
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
		let wordIndex = group.findIndex(word =>
			relativeTime >= word.start && relativeTime <= word.end
		);
		if (wordIndex === -1 && group.length > 0) {
			const active = group.findIndex((w, i) =>
				relativeTime >= w.start && (i === group.length - 1 || relativeTime < group[i + 1]!.start)
			);
			if (active !== -1) wordIndex = active;
			else if (this.presetKey === 'capcut_04') wordIndex = 0;
		}

		const text = group.map(w => w.text).join(' ');

		if (groupIndex !== this.currentGroupIndex || wordIndex !== this.currentWordIndex) {
			this.currentGroupIndex = groupIndex;
			this.currentWordIndex = wordIndex;
			setChars(world, entity, text);

			clearTextRanges(world, entity);
			this.fill = null;
			this.range = null;

			if (wordIndex !== -1 && this.config.activeTextColor !== undefined && !this.config.rainbowLetters) {
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

				if (this.presetKey === 'capcut_03' || this.presetKey === 'capcut_04' || this.presetKey === 'capcut_07') {
					// Active word inside the tag/banner/burst box should be crisp without dark stroke or shadow
					const hiddenStroke = createEntity(world);
					hiddenStroke.add(Stroke);
					hiddenStroke.add(Hidden);
					appendChild(world, hiddenStroke, range);

					const hiddenShadow = createEntity(world);
					hiddenShadow.add(Shadow);
					hiddenShadow.add(Hidden);
					appendChild(world, hiddenShadow, range);
				}
			}
		}
	}

	public draw(world: World, entity: Entity): void {
		const ctx = world.get(RenderSurface)?.ctx;
		if (!ctx) return;

		this.config = CAPCUT_PRESET_CONFIGS[this.presetKey] ?? this.config;

		// If ready now but was uninitialized during earlier seek, re-seek
		if (this.currentGroupIndex === -1 && this.ready && this.groups.length > 0) {
			this.seekTo(world, entity, this.lastRelativeTime);
		}

		const chars = store(world, Computed).chars[entity.id()] ?? store(world, Chars).value[entity.id()] ?? '';
		if (!chars || !chars.trim()) return;

		const isNeonPreset = (this.presetKey === 'capcut_09' || this.presetKey === 'capcut_10');
		const isNoShadowPreset = (!this.config.shadow || this.config.bubbleCloud || isNeonPreset || !!this.config.rainbowLetters);

		// Proactively remove stale Shadow/Stroke child entities or update them to preset's current style
		if (isNoShadowPreset) {
			if (entity.has(Shadow)) {
				entity.remove(Shadow);
			}
			for (const child of world.query(ChildOf(entity))) {
				if (!child.has(Source) && child.has(Shadow)) {
					deleteEntity(world, child);
				}
				if ((this.config.bubbleCloud || isNeonPreset || this.config.rainbowLetters) && !child.has(Source) && child.has(Stroke)) {
					deleteEntity(world, child);
				}
			}
		} else if (this.config.shadow) {
			for (const child of world.query(ChildOf(entity))) {
				if (!child.has(Source) && child.has(Shadow)) {
					store(world, Color).value[child.id()] = this.config.shadow.color;
					if (child.has(Opacity)) store(world, Opacity).value[child.id()] = this.config.shadow.opacity ?? 1;
					if (child.has(Blur)) store(world, Blur).value[child.id()] = this.config.shadow.blur;
					if (child.has(Offset)) {
						store(world, Offset).x[child.id()] = this.config.shadow.x;
						store(world, Offset).y[child.id()] = this.config.shadow.y;
					}
				}
			}
		}

		// Sync colors if customized via Inspector
		const colors = entity.get(Caption)?.colors;
		const activeColor = colors?.[0] ?? this.config.activeTextColor;
		const baseColor = colors?.[1] ?? this.config.textColor;

		if (this.config.stroke && !this.config.bubbleCloud && !isNeonPreset && !this.config.rainbowLetters) {
			let foundStroke = false;
			for (const child of world.query(ChildOf(entity))) {
				if (!child.has(Source) && child.has(Stroke)) {
					foundStroke = true;
					const parsed = colors?.[2] !== undefined
						? (parseColor(colors[2]) ?? this.config.stroke.color)
						: this.config.stroke.color;
					store(world, Color).value[child.id()] = parsed;
					if (child.has(StrokeStyle)) {
						store(world, StrokeStyle).width[child.id()] = this.config.stroke.width;
					}
				}
			}

			if (!foundStroke) {
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
		}

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
					const isCapcut03 = this.presetKey === 'capcut_03';
					const isCapcut04 = this.presetKey === 'capcut_04';
					const isTagBox = isCapcut03 || isCapcut04 || this.presetKey === 'capcut_07' || bg.type === 'comic_burst';

					// For capcut_03, 04, 07 & comic_burst, use exact token top & bottom to center the box around glyphs
					const glyphHeight = (activeToken.bottom > activeToken.top)
						? (activeToken.bottom - activeToken.top)
						: (activeToken.height > 0 ? activeToken.height : fontSize);
					const tMinY = isTagBox
						? (activeToken.top ?? (activeToken.y - glyphHeight / 2))
						: activeToken.y - (activeToken.height > 0 ? activeToken.height : fontSize) / 2;
					const tMaxY = isTagBox
						? (activeToken.bottom ?? (activeToken.y + glyphHeight / 2))
						: activeToken.y + (activeToken.height > 0 ? activeToken.height : fontSize) / 2;

					if (bg.type === 'comic_burst') {
						let scale = 1;
						if (this.currentGroupIndex >= 0 && this.currentWordIndex >= 0) {
							const activeWordData = this.groups[this.currentGroupIndex]?.[this.currentWordIndex];
							if (activeWordData) {
								const elapsed = this.lastRelativeTime - activeWordData.start;
								const animDuration = 0.16;
								if (elapsed >= 0 && elapsed < animDuration) {
									const progress = elapsed / animDuration;
									scale = 0.82 + 0.36 * Math.sin(progress * Math.PI);
								}
							}
						}

						const cx = (tMinX + tMaxX) / 2;
						const cy = (tMinY + tMaxY) / 2;
						const rx = Math.max((tMaxX - tMinX) / 2 + padX, 48);
						const ry = Math.max((tMaxY - tMinY) / 2 + padY, 32);

						const burstFill = (colors?.[3] !== undefined)
							? (typeof colors[3] === 'string' ? colors[3] : colorToHex(colors[3]))
							: colorToHex(bg.color);
						const burstStroke = (colors?.[2] !== undefined)
							? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
							: (bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : '#000000');

						drawComicBurst(
							ctx,
							cx,
							cy,
							rx,
							ry,
							burstFill,
							burstStroke,
							bg.strokeWidth ?? 5,
							scale,
						);
					} else {
						let scale = 1;
						if (isCapcut04 && this.currentGroupIndex >= 0 && this.currentWordIndex >= 0) {
							const activeWordData = this.groups[this.currentGroupIndex]?.[this.currentWordIndex];
							if (activeWordData) {
								const elapsed = this.lastRelativeTime - activeWordData.start;
								const animDuration = 0.15;
								if (elapsed >= 0 && elapsed < animDuration) {
									const progress = elapsed / animDuration;
									scale = 1 + 0.15 * Math.cos((progress * Math.PI) / 2);
								}
							}
						}

						const cx = (tMinX + tMaxX) / 2;
						const cy = (tMinY + tMaxY) / 2;
						const baseW = Math.max((tMaxX - tMinX) + padX * 2, 40);
						const baseH = Math.max((tMaxY - tMinY) + padY * 2, 30);
						const boxW = baseW * scale;
						const boxH = baseH * scale;
						const boxX = cx - boxW / 2;
						const boxY = cy - boxH / 2;

						const boxBgColor = (isCapcut04 && colors?.[3])
							? (typeof colors[3] === 'string' ? colors[3] : colorToHex(colors[3]))
							: (isCapcut03 && colors?.[2])
							? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
							: colorToHex(bg.color);

						drawRoundedBox(
							ctx,
							boxX,
							boxY,
							boxW,
							boxH,
							bg.type === 'pill' ? boxH / 2 : radius,
							boxBgColor,
							bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : undefined,
							bg.strokeWidth ?? 0,
							bg.opacity ?? 1,
							isCapcut03
								? { color: 'rgba(0, 0, 0, 0.4)', blur: 4, x: 0, y: 2 }
								: undefined,
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
			const dirX = extrude.dirX ?? 0.5;
			const dirY = extrude.dirY ?? 1;
			const extrudeHex = colorToHex(extrude.color);
			const strokeWidth = this.config.stroke?.width ?? 4;

			ctx.save();
			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				applyFont(ctx, world, entity, word.ranges);
				ctx.textAlign = 'start';
				ctx.textBaseline = 'top';

				// 1. Draw solid dark outline at bottom of the extrusion for comic depth
				ctx.strokeStyle = '#000000';
				ctx.lineWidth = strokeWidth + 2;
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				ctx.strokeText(word.chars, word.x + depth * dirX, word.y + depth * dirY);

				// 2. Draw the 3D lime extrusion layers
				ctx.fillStyle = extrudeHex;
				ctx.strokeStyle = extrudeHex;
				ctx.lineWidth = strokeWidth;

				for (let d = depth; d >= 1; d--) {
					ctx.strokeText(word.chars, word.x + d * dirX, word.y + d * dirY);
					ctx.fillText(word.chars, word.x + d * dirX, word.y + d * dirY);
				}
			}
			ctx.restore();
		}

		// 3. Draw Outer Stroke (Dual Outline)
		if (this.config.outerStroke && !this.config.bubbleCloud) {
			const outer = this.config.outerStroke;
			ctx.save();
			for (const word of words) {
				applyFont(ctx, world, entity, word.ranges);
				ctx.textAlign = 'start';
				ctx.textBaseline = 'top';
				ctx.strokeStyle = colorToHex(outer.color);
				ctx.lineWidth = outer.width;
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				ctx.strokeText(word.chars, word.x, word.y);
			}
			ctx.restore();
		}

		// 4. Draw Neon / Ambient Glow Aura (only if not handled by drawAnimatedWords)
		if (this.config.glow && !this.config.animation) {
			const glow = this.config.glow;
			ctx.save();
			ctx.shadowColor = glow.color;
			ctx.shadowBlur = glow.blur;
			ctx.textAlign = 'start';
			ctx.textBaseline = 'top';

			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				const isActive = (wIdx === this.currentWordIndex) || (words.length === 1);
				if (this.presetKey === 'capcut_09' && !isActive) continue;

				applyFont(ctx, world, entity, word.ranges);
				ctx.fillStyle = glow.color;
				ctx.globalAlpha = 0.6;
				ctx.fillText(word.chars, word.x, word.y);
			}
			ctx.restore();
		}

		// 5. Draw Motion Echo Trail (Preset 08 & Echo Styles)
		if (this.config.echoTrail) {
			const echo = this.config.echoTrail;
			const steps = echo.steps ?? 3;
			const baseDistance = echo.distance ?? 30;
			const maxOpacity = echo.opacity ?? 0.52;
			const dirSign = echo.direction === 'left' ? -1 : 1;

			ctx.save();
			ctx.textAlign = 'start';
			ctx.textBaseline = 'top';

			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				const isActive = (wIdx === this.currentWordIndex) || (words.length === 1);
				if (echo.target === 'activeWord' && !isActive) continue;

				applyFont(ctx, world, entity, word.ranges);

				// Dynamic expansion during active word speech
				let dist = baseDistance;
				if (isActive && this.currentGroupIndex >= 0 && this.currentWordIndex >= 0) {
					const activeWordData = this.groups[this.currentGroupIndex]?.[this.currentWordIndex];
					if (activeWordData) {
						const elapsed = Math.max(0, this.lastRelativeTime - activeWordData.start);
						const wordDur = Math.max(0.12, activeWordData.end - activeWordData.start);
						const progress = Math.min(1, elapsed / wordDur);
						dist = baseDistance * (0.8 + 0.35 * Math.sin(progress * Math.PI * 0.5));
					}
				}

				const trailColor = isActive
					? (activeColor !== undefined ? (typeof activeColor === 'string' ? activeColor : colorToHex(activeColor)) : '#EF4444')
					: (echo.color !== undefined ? colorToHex(echo.color) : '#A3A3A3');

				for (let s = steps; s >= 1; s--) {
					const factor = s / steps;
					const offsetX = dist * factor * dirSign;
					const alpha = maxOpacity * (1 - (s - 1) / steps);

					ctx.save();
					ctx.globalAlpha = alpha;

					// Stroke for the ghost echo
					ctx.strokeStyle = '#000000';
					ctx.lineWidth = Math.max(2, (this.config.stroke?.width ?? 4) - 1);
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x + offsetX, word.y);

					// Fill for the ghost echo
					ctx.fillStyle = trailColor;
					ctx.fillText(word.chars, word.x + offsetX, word.y);
					ctx.restore();
				}
			}
			ctx.restore();
		}

		// 6. Final render: Rainbow Candy Letters & Stickers OR Bubble Cloud OR Animated Words OR Standard Text Tokens
		if (this.config.rainbowLetters) {
			const palette = this.config.rainbowLetters.palette.map(c => colorToHex(c));
			const fontSize = this.config.style.fontSize ?? 58;
			const anim = this.config.animation;
			const strokeWidth = this.config.stroke?.width ?? 5.5;

			ctx.save();
			ctx.textAlign = 'start';
			ctx.textBaseline = 'top';

			const activeWordData = (this.currentGroupIndex >= 0 && this.currentWordIndex >= 0)
				? this.groups[this.currentGroupIndex]?.[this.currentWordIndex]
				: null;

			let charCounter = 0;

			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				const isActive = (wIdx === this.currentWordIndex) || (this.currentWordIndex === -1 && words.length === 1);
				const isFuture = (this.currentWordIndex !== -1 && wIdx > this.currentWordIndex);

				applyFont(ctx, world, entity, word.ranges);

				let scale = 1.0;
				let offsetY = 0;

				if (isActive && anim?.scalePop) {
					const maxScale = anim.scalePop;
					let progress = 0.5;
					if (activeWordData) {
						const elapsed = this.lastRelativeTime - activeWordData.start;
						const dur = Math.max(0.12, activeWordData.end - activeWordData.start);
						progress = Math.max(0, Math.min(1, elapsed / dur));
					}
					const pop = Math.sin(progress * Math.PI);
					scale = 1.0 + (maxScale - 1.0) * pop;
					offsetY = -((scale - 1.0) * fontSize * 0.28);
				}

				ctx.save();
				if (isFuture && anim?.dimUpcoming) {
					const dimAlpha = typeof anim.dimUpcoming === 'number' ? anim.dimUpcoming : 0.5;
					ctx.globalAlpha *= dimAlpha;
				}

				const wordCenterX = word.x + word.width / 2;
				const wordCenterY = word.y + (word.height > 0 ? word.height : fontSize) / 2;

				ctx.translate(wordCenterX, wordCenterY + offsetY);
				ctx.scale(scale, scale);
				ctx.translate(-wordCenterX, -wordCenterY);

				// Kinetic lightning stickers around active word (if enabled)
				if (this.config.rainbowLetters.stickers && isActive) {
					const boltSize = Math.max(fontSize * 0.38, 22);
					drawLightningBolt(ctx, word.x - boltSize * 0.7, word.y - boltSize * 0.2, boltSize, -0.25);
					drawLightningBolt(ctx, word.x + word.width + boltSize * 0.7, word.y - boltSize * 0.2, boltSize, 0.25);
					drawLightningBolt(ctx, word.x - boltSize * 0.5, word.y + fontSize * 0.85, boltSize * 0.85, -0.35);
					drawLightningBolt(ctx, word.x + word.width + boltSize * 0.5, word.y + fontSize * 0.85, boltSize * 0.85, 0.35);
				}

				// Draw each character with cyclic rainbow candy gradient and solid outline (NO shadow)
				for (let i = 0; i < word.chars.length; i++) {
					const char = word.chars[i]!;
					const charAdvance = ctx.measureText(word.chars.slice(0, i)).width;
					const charX = word.x + charAdvance;
					const color = palette[charCounter % palette.length]!;
					charCounter++;

					// Ensure no drop shadow is applied
					ctx.shadowColor = 'transparent';
					ctx.shadowBlur = 0;
					ctx.shadowOffsetX = 0;
					ctx.shadowOffsetY = 0;

					// Crisp black outline
					ctx.strokeStyle = '#000000';
					ctx.lineWidth = strokeWidth;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.miterLimit = 2;
					ctx.strokeText(char, charX, word.y);

					// Glossy candy fill
					const charH = word.height > 0 ? word.height : fontSize;
					const grad = ctx.createLinearGradient(charX, word.y, charX, word.y + charH);
					grad.addColorStop(0, '#FFFFFF');
					grad.addColorStop(0.22, color);
					grad.addColorStop(1, color);

					ctx.fillStyle = grad;
					ctx.fillText(char, charX, word.y);
				}

				ctx.restore();
			}
			ctx.restore();
		} else if (this.config.bubbleCloud) {
			this.drawBubbleCloud(ctx, world, entity, words);
		} else if (this.config.animation || this.config.glow) {
			this.drawAnimatedWords(ctx, world, entity, words, activeColor, baseColor, colors);
			if (this.config.royalStars) {
				this.drawRoyalStars(ctx, words);
			}
		} else {
			renderTokens(ctx, world, entity);
			if (this.config.royalStars) {
				this.drawRoyalStars(ctx, words);
			}
		}
	}

	private drawAnimatedWords(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		world: World,
		entity: Entity,
		words: Array<{ chars: string; x: number; y: number; width: number; height: number; ranges: Entity[] }>,
		activeColor: string | number | undefined,
		baseColor: string | number | undefined,
		colors?: Array<string | number>,
	): void {
		const anim = this.config.animation;
		const fontSize = this.config.style.fontSize ?? 54;
		const isNeonPreset = (this.presetKey === 'capcut_09' || this.presetKey === 'capcut_10');

		const activeAccent = (activeColor !== undefined)
			? (typeof activeColor === 'string' ? activeColor : colorToHex(activeColor))
			: (this.config.activeTextColor !== undefined ? colorToHex(this.config.activeTextColor) : '#FF7A00');

		ctx.save();
		ctx.textAlign = 'start';
		ctx.textBaseline = 'top';

		const activeWordData = (this.currentGroupIndex >= 0 && this.currentWordIndex >= 0)
			? this.groups[this.currentGroupIndex]?.[this.currentWordIndex]
			: null;

		for (let wIdx = 0; wIdx < words.length; wIdx++) {
			const word = words[wIdx]!;
			const isActive = (wIdx === this.currentWordIndex) || (this.currentWordIndex === -1 && words.length === 1);
			const isFuture = (this.currentWordIndex !== -1 && wIdx > this.currentWordIndex);

			// Calculate scale & glow pulse
			let scale = 1.0;
			let glowAlpha = 0.85;
			let glowBlur = this.config.glow?.blur ?? 22;

			if (isActive && anim?.scalePop) {
				const maxPop = anim.scalePop ?? 1.32;
				if (activeWordData) {
					const elapsed = Math.max(0, this.lastRelativeTime - activeWordData.start);
					const wordDur = Math.max(0.12, activeWordData.end - activeWordData.start);

					if (elapsed <= wordDur) {
						const popDur = Math.min(0.18, wordDur * 0.45);
						if (elapsed < popDur) {
							// Punchy elastic entrance pop from 1.0 to maxPop (1.32x)
							const p = elapsed / popDur;
							scale = 1.0 + (maxPop - 1.0) * Math.sin(p * Math.PI * 0.75);
						} else {
							// Remains prominently enlarged (1.20x - 1.25x) throughout speech duration
							const remainP = (elapsed - popDur) / Math.max(0.01, wordDur - popDur);
							const resting = 1.0 + (maxPop - 1.0) * 0.65;
							scale = resting + 0.04 * Math.sin(remainP * Math.PI * 2);
						}

						if (anim.glowPulse) {
							const pulseP = (elapsed / 0.25) * Math.PI;
							glowAlpha = 0.75 + 0.25 * Math.sin(pulseP);
							glowBlur = (this.config.glow?.blur ?? 22) * (1 + 0.25 * Math.sin(pulseP));
						}
					} else {
						// Smooth exit settlement back to 1.0 within 0.08s
						const exitElapsed = elapsed - wordDur;
						if (exitElapsed < 0.08) {
							scale = 1.0 + ((maxPop - 1.0) * 0.65) * (1.0 - exitElapsed / 0.08);
						}
					}
				} else {
					scale = 1.22;
				}
			}

			// Word opacity: dim upcoming words if configured (preset 09 keeps crisp 1.0)
			let wordAlpha = 1.0;
			if (isFuture && anim?.dimUpcoming) {
				wordAlpha = typeof anim.dimUpcoming === 'number' ? anim.dimUpcoming : 0.4;
			}

			const cx = word.x + word.width / 2;
			const cy = word.y + (word.height > 0 ? word.height : fontSize) / 2;

			ctx.save();
			if (scale !== 1.0) {
				ctx.translate(cx, cy);
				ctx.scale(scale, scale);
				ctx.translate(-cx, -cy);
			}
			ctx.globalAlpha = wordAlpha;

			applyFont(ctx, world, entity, word.ranges);

			// ── LAYER 1: Ambient Glow Aura ──
			if (this.config.glow) {
				if (isActive) {
					// Active neon glow (Electric Cyan for preset 10, Radiant Orange for preset 09)
					ctx.save();
					ctx.shadowColor = activeAccent;
					ctx.shadowBlur = glowBlur;
					ctx.fillStyle = activeAccent;
					ctx.globalAlpha = wordAlpha * glowAlpha;
					ctx.fillText(word.chars, word.x, word.y);
					// Second pass for intense radiant neon core
					ctx.shadowBlur = glowBlur * 1.6;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (this.presetKey === 'capcut_10') {
					// Radiant Hot Pink Neon Glow for inactive words in Preset 10!
					const pinkColor = (colors?.[1] !== undefined)
						? (typeof colors[1] === 'string' ? colors[1] : colorToHex(colors[1]))
						: '#FF2A85';
					ctx.save();
					ctx.shadowColor = pinkColor;
					ctx.shadowBlur = 18;
					ctx.fillStyle = pinkColor;
					ctx.globalAlpha = 0.85;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.shadowBlur = 28;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (this.presetKey === 'capcut_09') {
					// Soft ambient halo for inactive words in Preset 09
					ctx.save();
					ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
					ctx.shadowBlur = 8;
					ctx.fillStyle = '#FFFFFF';
					ctx.globalAlpha = 0.35;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.restore();
				}
			}

			// ── LAYER 2: Shadow (if preset config defines a drop shadow, skipped for neon presets) ──
			if (this.config.shadow && !this.config.bubbleCloud && !isNeonPreset) {
				ctx.save();
				ctx.shadowColor = colorToHex(this.config.shadow.color);
				ctx.shadowBlur = this.config.shadow.blur;
				ctx.shadowOffsetX = this.config.shadow.x;
				ctx.shadowOffsetY = this.config.shadow.y;
				ctx.fillStyle = colorToHex(this.config.shadow.color);
				ctx.globalAlpha = wordAlpha * (this.config.shadow.opacity ?? 1);
				ctx.fillText(word.chars, word.x, word.y);
				ctx.restore();
			}

			// ── LAYER 3: Stroke (Outline) ──
			const skipStroke = isActive && (this.presetKey === 'capcut_03' || this.presetKey === 'capcut_04' || this.presetKey === 'capcut_07');
			if (!skipStroke) {
				if (isActive && isNeonPreset) {
					// Glowing luminous neon outline around the white core (Cyan for preset 10, Orange for preset 09)
					ctx.save();
					ctx.strokeStyle = activeAccent;
					ctx.lineWidth = 4;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (!isActive && this.presetKey === 'capcut_10') {
					// Radiant Hot Pink Neon Outline for inactive words in Preset 10 (NO black stroke!)
					const pinkColor = (colors?.[1] !== undefined)
						? (typeof colors[1] === 'string' ? colors[1] : colorToHex(colors[1]))
						: '#FF2A85';
					ctx.save();
					ctx.strokeStyle = pinkColor;
					ctx.lineWidth = 3.5;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (this.config.stroke && !this.config.bubbleCloud) {
					// Clean crisp dark stroke on inactive words for other presets
					ctx.save();
					const strokeColorHex = (colors?.[2] !== undefined)
						? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
						: colorToHex(this.config.stroke.color);
					ctx.strokeStyle = strokeColorHex;
					ctx.lineWidth = this.config.stroke.width;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				}
			}

			// ── LAYER 4: Glyph Fill ──
			ctx.save();
			if (isNeonPreset) {
				// Neon presets have a luminous white-hot core for both active and inactive!
				ctx.fillStyle = '#FFFFFF';
				ctx.fillText(word.chars, word.x, word.y);
			} else {
				const wordFill = isActive
					? activeAccent
					: (baseColor !== undefined ? (typeof baseColor === 'string' ? baseColor : colorToHex(baseColor)) : '#FFFFFF');
				ctx.fillStyle = wordFill;
				ctx.fillText(word.chars, word.x, word.y);
			}
			ctx.restore();

			ctx.restore();
		}

		ctx.restore();
	}

	private drawBubbleCloud(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		world: World,
		entity: Entity,
		words: Array<{ chars: string; x: number; y: number; width: number; height: number; ranges: Entity[] }>,
	): void {
		const cfg = this.config.bubbleCloud!;
		const fontSize = this.config.style.fontSize ?? 58;

		// Read Inspector color overrides if user adjusted slots
		const colors = entity.get(Caption)?.colors;
		const activeHighlight = colors?.[0] !== undefined
			? (typeof colors[0] === 'string' ? colors[0] : colorToHex(colors[0]))
			: (this.config.activeTextColor !== undefined ? colorToHex(this.config.activeTextColor) : '#38BDF8');
		const baseLetterColor = colors?.[1] !== undefined
			? (typeof colors[1] === 'string' ? colors[1] : colorToHex(colors[1]))
			: (this.config.textColor !== undefined ? colorToHex(this.config.textColor) : '#BAE6FD');
		const customBorderColor = colors?.[2] !== undefined
			? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
			: undefined;

		const cloudBorderColor = customBorderColor ?? (cfg.cloudBorderColor !== undefined ? colorToHex(cfg.cloudBorderColor) : '#0284C7');
		const cloudBodyColor = cfg.cloudColor !== undefined ? colorToHex(cfg.cloudColor) : '#BAE6FD';
		const innerBorderColor = cfg.innerBorderColor !== undefined ? colorToHex(cfg.innerBorderColor) : '#0369A1';

		ctx.save();
		ctx.textAlign = 'start';
		ctx.textBaseline = 'top';

		// ── LAYER 1: Outer Cloud Silhouette (Deep Sky Blue / Cyan) ──
		ctx.save();
		ctx.strokeStyle = cloudBorderColor;
		ctx.lineWidth = Math.max(fontSize * 0.36, 22);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		for (const word of words) {
			applyFont(ctx, world, entity, word.ranges);
			ctx.strokeText(word.chars, word.x, word.y);
		}
		ctx.restore();

		// ── LAYER 2: Cloud Body (Puffy Ice-Blue Gradient) ──
		ctx.save();
		ctx.lineWidth = Math.max(fontSize * 0.26, 16);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		for (const word of words) {
			applyFont(ctx, world, entity, word.ranges);
			const cloudGrad = ctx.createLinearGradient(word.x, word.y - fontSize * 0.1, word.x, word.y + fontSize * 1.1);
			cloudGrad.addColorStop(0, '#FFFFFF');
			cloudGrad.addColorStop(0.35, '#E0F2FE');
			cloudGrad.addColorStop(1, cloudBodyColor);
			ctx.strokeStyle = cloudGrad;
			ctx.strokeText(word.chars, word.x, word.y);
		}
		ctx.restore();

		// ── LAYER 3: Inner Contour Outline (Deep Marine Blue separating letters from cloud) ──
		ctx.save();
		ctx.strokeStyle = innerBorderColor;
		ctx.lineWidth = Math.max(fontSize * 0.11, 6.5);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		for (const word of words) {
			applyFont(ctx, world, entity, word.ranges);
			ctx.strokeText(word.chars, word.x, word.y);
		}
		ctx.restore();

		// ── LAYER 4: Letter Glyphs with Glossy Candy / Bubble Gradient Fill ──
		ctx.save();
		for (let wIdx = 0; wIdx < words.length; wIdx++) {
			const word = words[wIdx]!;
			applyFont(ctx, world, entity, word.ranges);

			const isActive = (wIdx === this.currentWordIndex) || (this.currentWordIndex === -1 && words.length === 1);
			const bottomColor = isActive ? activeHighlight : baseLetterColor;

			const textGrad = ctx.createLinearGradient(word.x, word.y, word.x, word.y + fontSize);
			textGrad.addColorStop(0, '#FFFFFF');
			textGrad.addColorStop(0.38, '#FFFFFF');
			textGrad.addColorStop(0.72, isActive ? '#BAE6FD' : '#E0F2FE');
			textGrad.addColorStop(1, bottomColor);

			ctx.fillStyle = textGrad;
			ctx.fillText(word.chars, word.x, word.y);
		}
		ctx.restore();

		// ── LAYER 5: Floating Bubble Particles (Bong bóng) ──
		if (cfg.bubbles !== false && words.length > 0) {
			const firstWord = words[0]!;
			const lastWord = words[words.length - 1]!;

			// Left bubble cluster near bottom-left of first word
			this.drawBubble(ctx, firstWord.x - fontSize * 0.28, firstWord.y + fontSize * 0.72, fontSize * 0.11, cloudBorderColor);
			this.drawBubble(ctx, firstWord.x - fontSize * 0.46, firstWord.y + fontSize * 0.44, fontSize * 0.065, cloudBorderColor);

			// Right bubble cluster near bottom-right of last word
			this.drawBubble(ctx, lastWord.x + lastWord.width + fontSize * 0.25, lastWord.y + fontSize * 0.84, fontSize * 0.12, cloudBorderColor);
			this.drawBubble(ctx, lastWord.x + lastWord.width + fontSize * 0.44, lastWord.y + fontSize * 1.04, fontSize * 0.06, cloudBorderColor);

			// Small floating bubble top-right
			this.drawBubble(ctx, lastWord.x + lastWord.width + fontSize * 0.35, lastWord.y + fontSize * 0.35, fontSize * 0.048, cloudBorderColor);
		}

		ctx.restore();
	}

	private drawBubble(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		strokeColor: string,
	): void {
		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);

		const radGrad = ctx.createRadialGradient(
			cx - radius * 0.3,
			cy - radius * 0.3,
			radius * 0.1,
			cx,
			cy,
			radius,
		);
		radGrad.addColorStop(0, '#FFFFFF');
		radGrad.addColorStop(0.5, '#F0F9FF');
		radGrad.addColorStop(1, '#BAE6FD');

		ctx.fillStyle = radGrad;
		ctx.fill();

		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = Math.max(radius * 0.22, 1.5);
		ctx.stroke();

		// Specular glint
		ctx.beginPath();
		ctx.arc(cx - radius * 0.35, cy - radius * 0.35, Math.max(radius * 0.22, 1), 0, Math.PI * 2);
		ctx.fillStyle = '#FFFFFF';
		ctx.fill();

		ctx.restore();
	}

	private drawRoyalStars(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		words: Array<{ chars: string; x: number; y: number; width: number; height: number; ranges: Entity[] }>,
	): void {
		if (!words.length) return;
		const fontSize = this.config.style.fontSize ?? 54;
		const firstWord = words[0]!;

		const minX = Math.min(...words.map(w => w.x));
		const maxX = Math.max(...words.map(w => w.x + w.width));
		const minY = Math.min(...words.map(w => w.y));
		const maxY = Math.max(...words.map(w => w.y + (w.height > 0 ? w.height : fontSize)));
		const textWidth = Math.max(maxX - minX, 100);
		const textHeight = Math.max(maxY - minY, fontSize);

		// Active word (or first word)
		const activeWord = (this.currentWordIndex >= 0 && this.currentWordIndex < words.length)
			? words[this.currentWordIndex]!
			: firstWord;

		ctx.save();

		// 1. Shimmering 4-pointed diamond cross stars (✦)
		const stars = [
			// Big hero star near top-left of the first word
			{ x: minX - fontSize * 0.25, y: minY - fontSize * 0.15, size: fontSize * 0.36, glow: 1.0 },
			// Radiant star near the active word top
			{ x: activeWord.x + activeWord.width * 0.3, y: activeWord.y - fontSize * 0.25, size: fontSize * 0.34, glow: 0.95 },
			// Star above active word right
			{ x: activeWord.x + activeWord.width * 0.85, y: activeWord.y - fontSize * 0.05, size: fontSize * 0.26, glow: 0.85 },
			// Star near bottom-left
			{ x: minX - fontSize * 0.35, y: maxY + fontSize * 0.05, size: fontSize * 0.22, glow: 0.7 },
			// Star near bottom center
			{ x: minX + textWidth * 0.45, y: maxY + fontSize * 0.2, size: fontSize * 0.30, glow: 0.9 },
			// Star near top-right of phrase
			{ x: maxX + fontSize * 0.2, y: minY - fontSize * 0.1, size: fontSize * 0.35, glow: 1.0 },
			// Star near bottom-right
			{ x: maxX + fontSize * 0.3, y: maxY + fontSize * 0.1, size: fontSize * 0.26, glow: 0.75 },
			// Star near active word bottom
			{ x: activeWord.x - fontSize * 0.15, y: activeWord.y + fontSize * 0.9, size: fontSize * 0.22, glow: 0.7 },
		];

		for (const star of stars) {
			this.drawFourPointStar(ctx, star.x, star.y, star.size, star.glow);
		}

		// 2. Shimmering fairy dust particles (glowing circular specks)
		const particles = [
			{ dx: -0.15, dy: -0.05, r: 2.5, alpha: 0.85 },
			{ dx: -0.4, dy: 0.3, r: 2.0, alpha: 0.7 },
			{ dx: -0.2, dy: 0.5, r: 1.5, alpha: 0.6 },
			{ dx: 0.15, dy: -0.2, r: 2.2, alpha: 0.8 },
			{ dx: 0.28, dy: -0.15, r: 1.8, alpha: 0.7 },
			{ dx: 0.5, dy: -0.28, r: 2.8, alpha: 0.9 },
			{ dx: 0.65, dy: -0.1, r: 1.6, alpha: 0.65 },
			{ dx: 0.8, dy: -0.2, r: 2.2, alpha: 0.75 },
			{ dx: 1.1, dy: -0.05, r: 2.0, alpha: 0.7 },
			{ dx: 1.25, dy: 0.2, r: 2.6, alpha: 0.85 },
			{ dx: 1.15, dy: 0.5, r: 1.8, alpha: 0.65 },
			{ dx: 1.3, dy: 0.8, r: 2.2, alpha: 0.75 },
			{ dx: 0.95, dy: 1.15, r: 2.4, alpha: 0.8 },
			{ dx: 0.75, dy: 1.25, r: 1.7, alpha: 0.65 },
			{ dx: 0.55, dy: 1.15, r: 2.5, alpha: 0.85 },
			{ dx: 0.35, dy: 1.2, r: 1.9, alpha: 0.7 },
			{ dx: 0.1, dy: 1.15, r: 2.2, alpha: 0.75 },
			{ dx: -0.1, dy: 1.1, r: 1.5, alpha: 0.6 },
			{ dx: -0.25, dy: 0.95, r: 2.0, alpha: 0.7 },
		];

		for (const p of particles) {
			const px = minX + textWidth * p.dx;
			const py = minY + textHeight * p.dy;
			this.drawStardust(ctx, px, py, p.r, p.alpha);
		}

		ctx.restore();
	}

	private drawFourPointStar(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
		glowAlpha = 0.8,
	): void {
		ctx.save();

		// 1. Soft golden radial bloom behind the star
		const glowRadius = size * 1.6;
		const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
		glowGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * glowAlpha})`);
		glowGrad.addColorStop(0.25, `rgba(253, 230, 138, ${0.7 * glowAlpha})`);
		glowGrad.addColorStop(0.6, `rgba(217, 119, 6, ${0.3 * glowAlpha})`);
		glowGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
		ctx.fillStyle = glowGrad;
		ctx.beginPath();
		ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
		ctx.fill();

		// 2. Crisp 4-pointed diamond star rays (✦)
		const armLength = size;
		const armWidth = size * 0.16;

		ctx.fillStyle = '#FFFFFF';
		ctx.beginPath();
		// Top tip
		ctx.moveTo(cx, cy - armLength);
		// Inner curve to right tip
		ctx.quadraticCurveTo(cx, cy, cx + armLength, cy);
		// Inner curve to bottom tip
		ctx.quadraticCurveTo(cx, cy, cx, cy + armLength);
		// Inner curve to left tip
		ctx.quadraticCurveTo(cx, cy, cx - armLength, cy);
		// Back to top tip
		ctx.quadraticCurveTo(cx, cy, cx, cy - armLength);
		ctx.closePath();
		ctx.fill();

		// Diagonal secondary micro-arms for rich twinkle
		const diagArm = size * 0.45;
		ctx.beginPath();
		ctx.moveTo(cx - diagArm, cy - diagArm);
		ctx.quadraticCurveTo(cx, cy, cx + diagArm, cy - diagArm);
		ctx.quadraticCurveTo(cx, cy, cx + diagArm, cy + diagArm);
		ctx.quadraticCurveTo(cx, cy, cx - diagArm, cy + diagArm);
		ctx.closePath();
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.fill();

		// Bright center diamond core
		ctx.beginPath();
		ctx.arc(cx, cy, armWidth * 0.9, 0, Math.PI * 2);
		ctx.fillStyle = '#FFFFFF';
		ctx.fill();

		ctx.restore();
	}

	private drawStardust(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		alpha = 0.8,
	): void {
		ctx.save();
		const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
		grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
		grad.addColorStop(0.4, `rgba(254, 240, 138, ${alpha * 0.8})`);
		grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	public dispose(): void {
		this.groups = [];
		this.currentGroupIndex = -1;
		this.currentWordIndex = -1;
	}
}
