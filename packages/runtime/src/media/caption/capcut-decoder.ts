/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { store } from '../../world/store';
import {
	CaptionAlign, CaptionType, FontStyle, PaintType, StrokeCap,
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

	// Electric golden aura glow
	ctx.shadowColor = 'rgba(255, 230, 0, 0.85)';
	ctx.shadowBlur = 10;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;

	ctx.beginPath();
	ctx.moveTo(size * 0.15, -size * 0.6);
	ctx.lineTo(-size * 0.45, -size * 0.05);
	ctx.lineTo(-size * 0.05, -size * 0.05);
	ctx.lineTo(-size * 0.35, size * 0.6);
	ctx.lineTo(size * 0.45, size * 0.05);
	ctx.lineTo(size * 0.05, size * 0.05);
	ctx.closePath();

	// Electric yellow gradient fill
	const grad = ctx.createLinearGradient(0, -size * 0.6, 0, size * 0.6);
	grad.addColorStop(0, '#FFFDE7');
	grad.addColorStop(0.3, '#FFE600');
	grad.addColorStop(1, '#FFA000');
	ctx.fillStyle = grad;

	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 2.4;
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.fill();

	// White spark core highlight
	ctx.beginPath();
	ctx.moveTo(size * 0.05, -size * 0.4);
	ctx.lineTo(-size * 0.18, 0);
	ctx.lineTo(size * 0.12, size * 0.2);
	ctx.strokeStyle = '#FFFFFF';
	ctx.lineWidth = 1.4;
	ctx.stroke();

	ctx.restore();
}

function drawElectricSpark(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color = '#FFFFFF',
	shadowColor = '#00F2FF',
): void {
	ctx.save();
	ctx.translate(x, y);
	ctx.shadowColor = shadowColor;
	ctx.shadowBlur = 10;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;

	// 4-point diamond star spark
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.quadraticCurveTo(0, 0, size, 0);
	ctx.quadraticCurveTo(0, 0, 0, size);
	ctx.quadraticCurveTo(0, 0, -size, 0);
	ctx.quadraticCurveTo(0, 0, 0, -size);
	ctx.closePath();

	ctx.fillStyle = color;
	ctx.strokeStyle = shadowColor;
	ctx.lineWidth = 1.2;
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

function drawElectricLightningCrackles(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	time: number,
	neonColor = '#00F2FF',
): void {
	ctx.save();
	const t = time * 22;
	const j1 = Math.sin(t * 1.5) * 4;
	const j2 = Math.cos(t * 2.2) * 4.5;
	const j3 = Math.sin(t * 2.9) * 3.8;

	const topY = y - height * 0.82;
	const midY = y - height * 0.45;
	const botY = y + height * 0.04;

	// Jagged arc across the upper crest of the active word
	const pts1 = [
		{ x: x - 8, y: topY + 4 + j1 },
		{ x: x + width * 0.28, y: topY - 7 + j2 },
		{ x: x + width * 0.54, y: topY + 6 + j3 },
		{ x: x + width * 0.78, y: topY - 8 + j1 },
		{ x: x + width + 10, y: topY + 2 + j2 },
	];

	// Secondary branch along the lower right
	const pts2 = [
		{ x: x + width * 0.62, y: botY - 8 },
		{ x: x + width * 0.84, y: botY + 8 + j2 },
		{ x: x + width + 12, y: botY - 2 + j1 },
	];

	const drawPath = (pts: Array<{ x: number; y: number }>) => {
		ctx.beginPath();
		ctx.moveTo(pts[0]!.x, pts[0]!.y);
		for (let i = 1; i < pts.length; i++) {
			ctx.lineTo(pts[i]!.x, pts[i]!.y);
		}
	};

	// Pass 1: Outer radiant neon electric glow
	ctx.save();
	ctx.shadowColor = neonColor;
	ctx.shadowBlur = 14;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.strokeStyle = neonColor;
	ctx.lineWidth = 3.5;
	ctx.lineJoin = 'miter';
	ctx.lineCap = 'round';
	drawPath(pts1);
	ctx.stroke();
	drawPath(pts2);
	ctx.stroke();
	ctx.restore();

	// Pass 2: White-hot crackle core
	ctx.save();
	ctx.strokeStyle = '#FFFFFF';
	ctx.lineWidth = 1.4;
	ctx.lineJoin = 'miter';
	ctx.lineCap = 'round';
	drawPath(pts1);
	ctx.stroke();
	drawPath(pts2);
	ctx.stroke();
	ctx.restore();

	// Flanking luminous diamond plasma sparks
	const sparkSize = Math.max(height * 0.16, 7);
	drawElectricSpark(ctx, x - 12, midY + j1, sparkSize, '#FFFFFF', neonColor);
	drawElectricSpark(ctx, x + width + 14, midY + j2, sparkSize * 0.9, '#FFFFFF', neonColor);
	drawElectricSpark(ctx, x + width * 0.48, topY - 10 + j3, sparkSize * 0.75, '#FFFFFF', neonColor);

	ctx.restore();
}

function drawConfettiSprinkle(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	cx: number,
	cy: number,
	radius: number,
	color: string,
): void {
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = Math.max(radius * 0.35, 1.6);
	ctx.fill();
	ctx.stroke();

	// White gloss reflection dot
	ctx.beginPath();
	ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.28, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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

		const isNeonPreset = (this.presetKey === 'capcut_09' || this.presetKey === 'capcut_10' || this.presetKey === 'capcut_13' || this.presetKey === 'capcut_16');

		// Inner/Main Stroke
		if (this.config.stroke && !this.config.bubbleCloud && !isNeonPreset && !this.config.rainbowLetters) {
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
		if (this.config.shadow && !this.config.bubbleCloud && !this.config.rainbowLetters && !isNeonPreset) {
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

			const isCustomPaintPreset = (this.presetKey === 'capcut_09' || this.presetKey === 'capcut_10' || this.presetKey === 'capcut_13' || this.presetKey === 'capcut_16' || this.presetKey === 'capcut_17' || this.presetKey === 'capcut_18' || this.presetKey === 'capcut_19' || !!this.config.rainbowLetters || !!this.config.animation || this.config.activeTextColor !== undefined);
			if (wordIndex !== -1 && this.config.activeTextColor !== undefined && !isCustomPaintPreset) {
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

		// Ensure font & style synchronization with preset (including fontSize)
		if (!entity.has(TextStyle)) {
			entity.add(TextStyle);
		}
		const curFamily = store(world, TextStyle).fontFamily[entity.id()];
		const curSize = store(world, TextStyle).fontSize[entity.id()];
		const curWeight = store(world, TextStyle).fontWeight[entity.id()];
		const curStyle = store(world, TextStyle).fontStyle[entity.id()];
		const curLetterSpacing = store(world, TextStyle).letterSpacing[entity.id()];
		const targetSize = this.config.style.fontSize ?? 58;
		const targetWeight = this.config.style.fontWeight ?? '900';
		const targetStyle = this.config.style.fontStyle ?? FontStyle.NORMAL;
		const targetLetterSpacing = this.config.style.letterSpacing ?? 0;

		if (curFamily !== this.config.style.fontFamily || curSize !== targetSize || curWeight !== targetWeight || curStyle !== targetStyle || curLetterSpacing !== targetLetterSpacing) {
			entity.set(TextStyle, {
				...this.config.style,
				fontSize: targetSize,
				fontWeight: targetWeight,
				fontStyle: targetStyle,
				letterSpacing: targetLetterSpacing,
			});
			store(world, TextStyle).fontSize[entity.id()] = targetSize;
			store(world, TextStyle).fontFamily[entity.id()] = this.config.style.fontFamily;
			store(world, TextStyle).fontWeight[entity.id()] = targetWeight;
			store(world, TextStyle).fontStyle[entity.id()] = targetStyle;
			store(world, TextStyle).letterSpacing[entity.id()] = targetLetterSpacing;
			loadWebFont(world, this.config.style.fontFamily as any);
		}

		// If ready now but was uninitialized during earlier seek, re-seek
		if (this.currentGroupIndex === -1 && this.ready && this.groups.length > 0) {
			this.seekTo(world, entity, this.lastRelativeTime);
		}

		const chars = store(world, Computed).chars[entity.id()] ?? store(world, Chars).value[entity.id()] ?? '';
		if (!chars || !chars.trim()) return;

		const isNeonPreset = (this.presetKey === 'capcut_09' || this.presetKey === 'capcut_10' || this.presetKey === 'capcut_13' || this.presetKey === 'capcut_16');
		const isCustomDecorationPreset = (isNeonPreset || this.presetKey === 'capcut_17' || this.presetKey === 'capcut_18' || !!this.config.bubbleCloud || !!this.config.rainbowLetters);
		const isNoShadowPreset = (!this.config.shadow || isCustomDecorationPreset);

		// Proactively remove stale Shadow/Stroke child entities or update them to preset's current style
		if (isNoShadowPreset) {
			if (entity.has(Shadow)) {
				entity.remove(Shadow);
			}
			for (const child of world.query(ChildOf(entity))) {
				if (child.has(Shadow)) {
					child.remove(Shadow);
					child.add(Hidden);
					if (!child.has(Source)) {
						deleteEntity(world, child);
					}
				}
				if (isCustomDecorationPreset && child.has(Stroke)) {
					child.remove(Stroke);
					child.add(Hidden);
					if (!child.has(Source)) {
						deleteEntity(world, child);
					}
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

		// Ensure preset's typography is applied to entity before text layout
		if (this.config.style) {
			const currentStyle = entity.get(TextStyle);
			const needsUpdate =
				!currentStyle ||
				currentStyle.fontFamily !== this.config.style.fontFamily ||
				currentStyle.fontWeight !== this.config.style.fontWeight ||
				currentStyle.fontSize !== this.config.style.fontSize ||
				currentStyle.letterSpacing !== this.config.style.letterSpacing ||
				currentStyle.textCase !== this.config.style.textCase;

			if (needsUpdate) {
				entity.set(TextStyle, {
					...currentStyle,
					...this.config.style,
				});
				loadWebFont(
					world,
					this.config.style.fontFamily as any,
					this.config.style.fontStyle,
					this.config.style.fontWeight,
				);
			}
		}

		// Tokenize and shape text to get exact bounding box and token positions
		tokenizeText(world, entity);
		shapeTokens(world, entity);

		const lines = store(world, TextCache).tokens[entity.id()];
		if (!lines || !lines.length) return;

		const words = lines.flat().filter(w => w.chars.trim().length > 0);
		if (!words.length) return;

		// ── Phrase Entrance Motion Animation (Chuyển động khi xuất hiện phụ đề) ──
		const activeGroup = (this.currentGroupIndex >= 0 && this.currentGroupIndex < this.groups.length)
			? this.groups[this.currentGroupIndex]
			: null;

		let entranceScale = 1.0;
		let entranceOffsetY = 0;
		let entranceAlpha = 1.0;

		const animConfig = this.config.animation;
		const entranceType = animConfig?.entrance ?? 'bounce';
		const entranceDuration = animConfig?.entranceDuration ?? 0.24;

		if (entranceType !== 'none' && activeGroup && activeGroup.length > 0) {
			const groupStart = activeGroup[0]!.start;
			const elapsed = this.lastRelativeTime - groupStart;

			if (elapsed >= 0 && elapsed < entranceDuration) {
				const p = elapsed / entranceDuration;
				if (entranceType === 'bounce' || entranceType === 'pop') {
					// Spring overshoot curve (ease-out-back)
					const s = 1.6;
					const p1 = p - 1;
					const spring = 1 + (s + 1) * (p1 * p1 * p1) + s * (p1 * p1);
					entranceScale = 0.78 + 0.22 * spring;
					entranceOffsetY = (1 - Math.min(1.06, spring)) * 14;
				} else if (entranceType === 'slide_up') {
					const ease = 1 - Math.pow(1 - p, 3);
					entranceOffsetY = (1 - ease) * 20;
				} else if (entranceType === 'fade') {
					entranceScale = 0.95 + 0.05 * p;
				}
				entranceAlpha = Math.min(1.0, elapsed / 0.08);
			}
		}

		const hasEntranceTransform = (entranceScale !== 1.0 || entranceOffsetY !== 0 || entranceAlpha !== 1.0);

		if (hasEntranceTransform) {
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;
			const fontSize = this.config.style.fontSize ?? 58;
			for (const w of words) {
				minX = Math.min(minX, w.x);
				maxX = Math.max(maxX, w.x + w.width);
				minY = Math.min(minY, w.y);
				maxY = Math.max(maxY, w.y + (w.height > 0 ? w.height : fontSize));
			}
			const phraseCx = (minX + maxX) / 2;
			const phraseCy = (minY + maxY) / 2;

			ctx.save();
			ctx.translate(phraseCx, phraseCy + entranceOffsetY);
			ctx.scale(entranceScale, entranceScale);
			ctx.translate(-phraseCx, -phraseCy);
			ctx.globalAlpha *= entranceAlpha;
		}

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
					const isCapcut26 = this.presetKey === 'capcut_26';
					const isCapcut28 = this.presetKey === 'capcut_28';
					const isTagBox = isCapcut03 || isCapcut04 || this.presetKey === 'capcut_07' || this.presetKey === 'capcut_25' || isCapcut26 || isCapcut28 || bg.type === 'comic_burst';

					// For capcut_03, 04, 07, 26 & comic_burst, use exact token top & bottom to center the box around glyphs
					const glyphHeight = (activeToken.bottom > activeToken.top)
						? (activeToken.bottom - activeToken.top)
						: (activeToken.height > 0 ? activeToken.height : fontSize);
					const tMinY = isTagBox
						? (activeToken.top ?? (activeToken.y - glyphHeight / 2))
						: activeToken.y - (activeToken.height > 0 ? activeToken.height : fontSize) / 2;
					const tMaxY = isTagBox
						? (activeToken.bottom ?? (activeToken.y + glyphHeight / 2))
						: activeToken.y + (activeToken.height > 0 ? activeToken.height : fontSize) / 2;

					if (isCapcut26) {
						// Alternating Comic Highlights for CapCut Preset 26:
						// - Even active words (0, 2, 4...): Yellow Rectangular Tag Box with Red Text (matches preset thumbnail 'The Quick')
						// - Odd active words (1, 3, 5...): Yellow Comic Spiky Burst with Black Text (matches 'Brown', 'Jumps', 'Lazy Dog')
						const isOdd = (this.currentWordIndex % 2 !== 0);
						const burstFill = (colors?.[3] !== undefined)
							? (typeof colors[3] === 'string' ? colors[3] : colorToHex(colors[3]))
							: colorToHex(bg.color);
						const burstStroke = (colors?.[2] !== undefined)
							? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
							: (bg.strokeColor !== undefined ? colorToHex(bg.strokeColor) : '#000000');

						let scale = 1;
						if (this.currentGroupIndex >= 0 && this.currentWordIndex >= 0) {
							const activeWordData = this.groups[this.currentGroupIndex]?.[this.currentWordIndex];
							if (activeWordData) {
								const elapsed = this.lastRelativeTime - activeWordData.start;
								const animDuration = 0.16;
								if (elapsed >= 0 && elapsed < animDuration) {
									const progress = elapsed / animDuration;
									scale = 0.84 + 0.32 * Math.sin(progress * Math.PI);
								}
							}
						}

						const cx = (tMinX + tMaxX) / 2;
						const cy = (tMinY + tMaxY) / 2;

						if (isOdd) {
							// Comic Spiky Burst for odd active words
							const rx = Math.max((tMaxX - tMinX) / 2 + padX, 48);
							const ry = Math.max((tMaxY - tMinY) / 2 + padY, 32);
							drawComicBurst(
								ctx,
								cx,
								cy,
								rx,
								ry,
								burstFill,
								burstStroke,
								bg.strokeWidth ?? 4.5,
								scale,
							);
						} else {
							// Rectangular Tag Box for even active words
							const baseW = Math.max((tMaxX - tMinX) + 24, 40);
							const baseH = Math.max((tMaxY - tMinY) + 14, 30);
							const boxW = baseW * scale;
							const boxH = baseH * scale;
							drawRoundedBox(
								ctx,
								cx - boxW / 2,
								cy - boxH / 2,
								boxW,
								boxH,
								4,
								burstFill,
								burstStroke,
								2.5,
								1,
							);
						}
					} else if (bg.type === 'comic_burst') {
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
						if ((isCapcut04 || isCapcut28) && this.currentGroupIndex >= 0 && this.currentWordIndex >= 0) {
							const activeWordData = this.groups[this.currentGroupIndex]?.[this.currentWordIndex];
							if (activeWordData) {
								const elapsed = this.lastRelativeTime - activeWordData.start;
								const animDuration = isCapcut28 ? 0.18 : 0.15;
								if (elapsed >= 0 && elapsed < animDuration) {
									const progress = elapsed / animDuration;
									scale = isCapcut28
										? (1 + 0.18 * Math.sin(progress * Math.PI))
										: (1 + 0.15 * Math.cos((progress * Math.PI) / 2));
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
							: (isCapcut28 && colors?.[0])
							? (typeof colors[0] === 'string' ? colors[0] : colorToHex(colors[0]))
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
							isCapcut03 || isCapcut28
								? { color: isCapcut28 ? 'rgba(69, 10, 10, 0.6)' : 'rgba(0, 0, 0, 0.4)', blur: 4, x: 0, y: isCapcut28 ? 3 : 2 }
								: undefined,
						);

						if (isCapcut28) {
							this.drawBloodBoxDrips(ctx, boxX, boxY, boxW, boxH, boxBgColor);
						}
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

		// 6. Final render: Rainbow Candy Letters & Stickers / Confetti OR Bubble Cloud OR Animated Words OR Standard Text Tokens
		if (this.config.rainbowLetters) {
			const cfgRainbow = this.config.rainbowLetters;
			const isTargetActiveOnly = cfgRainbow.target === 'activeWord';

			// Read Inspector custom colors if user adjusted slots
			const customActiveColor = colors?.[0] !== undefined
				? (typeof colors[0] === 'string' ? colors[0] : colorToHex(colors[0]))
				: undefined;
			const baseLetterColor = colors?.[1] !== undefined
				? (typeof colors[1] === 'string' ? colors[1] : colorToHex(colors[1]))
				: (this.config.textColor !== undefined ? colorToHex(this.config.textColor) : '#FFFFFF');
			const customStrokeColor = colors?.[2] !== undefined
				? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
				: (this.config.stroke?.color !== undefined ? colorToHex(this.config.stroke.color) : '#000000');

			const rawPalette = cfgRainbow.palette.map(c => colorToHex(c));
			const palette = customActiveColor ? [customActiveColor, ...rawPalette.filter(c => c !== customActiveColor)] : rawPalette;

			const fontSize = this.config.style.fontSize ?? 56;
			const anim = this.config.animation;
			const strokeWidth = this.config.stroke?.width ?? 4.5;

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
				const shouldRainbow = isTargetActiveOnly ? isActive : true;

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
					offsetY = -((scale - 1.0) * fontSize * 0.22);
				}

				ctx.save();
				if (isFuture && anim?.dimUpcoming) {
					const dimAlpha = typeof anim.dimUpcoming === 'number' ? anim.dimUpcoming : 0.5;
					ctx.globalAlpha *= dimAlpha;
				}

				const wordCenterX = word.x + word.width / 2;
				const wordCenterY = word.y;

				ctx.translate(wordCenterX, wordCenterY + offsetY);
				ctx.scale(scale, scale);
				ctx.translate(-wordCenterX, -wordCenterY);

				if (this.config.style.fontStyle === FontStyle.ITALIC) {
					const midY = word.y + (word.height > 0 ? word.height : fontSize) / 2;
					ctx.translate(wordCenterX, midY);
					ctx.transform(1, 0, -0.22, 1, 0, 0);
					ctx.translate(-wordCenterX, -midY);
				}

				// 1. Radiant neon glow aura pass (Preset 12)
				if (this.config.glow && shouldRainbow) {
					for (let i = 0; i < word.chars.length; i++) {
						const char = word.chars[i]!;
						const charAdvance = ctx.measureText(word.chars.slice(0, i)).width;
						const charX = word.x + charAdvance;
						const color = palette[(charCounter + i) % palette.length]!;

						ctx.save();
						ctx.shadowColor = color;
						ctx.shadowBlur = Math.min(this.config.glow.blur ?? 20, 24);
						ctx.shadowOffsetX = 0;
						ctx.shadowOffsetY = 0;
						ctx.fillStyle = color;
						ctx.fillText(char, charX, word.y);
						ctx.restore();
					}
				}

				// 2. Kinetic lightning & spark meme stickers (Preset 12)
				if (cfgRainbow.stickers && isActive) {
					const boltSize = Math.max(fontSize * 0.44, 24);
					const sparkSize = boltSize * 0.42;
					let pulse = 1.0;
					if (activeWordData) {
						const elapsed = this.lastRelativeTime - activeWordData.start;
						const dur = Math.max(0.12, activeWordData.end - activeWordData.start);
						const progress = Math.max(0, Math.min(1, elapsed / dur));
						pulse = 0.88 + 0.28 * Math.sin(progress * Math.PI);
					}

					drawLightningBolt(ctx, word.x + word.width + boltSize * 0.6, word.y - boltSize * 0.25, boltSize * pulse, 0.28);
					drawLightningBolt(ctx, word.x - boltSize * 0.6, word.y + fontSize * 0.82, boltSize * 0.9 * pulse, -0.32);
					drawElectricSpark(ctx, word.x - boltSize * 0.35, word.y - boltSize * 0.15, sparkSize * pulse);
					drawElectricSpark(ctx, word.x + word.width + boltSize * 0.45, word.y + fontSize * 0.92, sparkSize * pulse);
				}

				// 3. Floating festive candy confetti sprinkles (Preset 15)
				if (cfgRainbow.confetti && isActive) {
					const dotR = Math.max(fontSize * 0.08, 4.5);
					let pulse = 1.0;
					if (activeWordData) {
						const elapsed = Math.max(0, this.lastRelativeTime - activeWordData.start);
						const dur = Math.max(0.12, activeWordData.end - activeWordData.start);
						const progress = Math.max(0, Math.min(1, elapsed / dur));
						pulse = 0.92 + 0.25 * Math.sin(progress * Math.PI);
					}

					const wLeft = word.x;
					const wRight = word.x + word.width;
					const cy = word.y;

					drawConfettiSprinkle(ctx, wLeft - dotR * 1.5, cy - fontSize * 0.22, dotR * pulse, '#FACC15');
					drawConfettiSprinkle(ctx, wLeft + word.width * 0.35, cy - fontSize * 0.52, dotR * 0.85 * pulse, '#FF4B5C');
					drawConfettiSprinkle(ctx, wRight + dotR * 1.4, cy - fontSize * 0.15, dotR * 1.05 * pulse, '#38BDF8');
					drawConfettiSprinkle(ctx, wLeft + word.width * 0.18, cy + fontSize * 0.50, dotR * 0.9 * pulse, '#FACC15');
					drawConfettiSprinkle(ctx, wLeft + word.width * 0.65, cy + fontSize * 0.52, dotR * 0.95 * pulse, '#4ADE80');
					drawConfettiSprinkle(ctx, wRight + dotR * 0.9, cy + fontSize * 0.38, dotR * 0.8 * pulse, '#FB7185');
				}

				// 4. Solid black comic offset shadow (Preset 15)
				if (this.config.shadow) {
					const shX = this.config.shadow.x ?? 2;
					const shY = this.config.shadow.y ?? 3;
					const shColor = colorToHex(this.config.shadow.color);
					ctx.fillStyle = shColor;
					for (let i = 0; i < word.chars.length; i++) {
						const char = word.chars[i]!;
						const charAdvance = ctx.measureText(word.chars.slice(0, i)).width;
						ctx.fillText(char, word.x + charAdvance + shX, word.y + shY);
					}
				}

				// 5. Draw text stroke & candy fill
				ctx.shadowColor = 'transparent';
				ctx.shadowBlur = 0;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 0;

				for (let i = 0; i < word.chars.length; i++) {
					const char = word.chars[i]!;
					const charAdvance = ctx.measureText(word.chars.slice(0, i)).width;
					const charX = word.x + charAdvance;
					const charColor = shouldRainbow ? palette[charCounter % palette.length]! : baseLetterColor;
					if (shouldRainbow) charCounter++;

					// Crisp outline
					ctx.strokeStyle = customStrokeColor;
					ctx.lineWidth = strokeWidth;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.miterLimit = 2;
					ctx.strokeText(char, charX, word.y);

					// Fill: candy gradient for rainbow, or solid color for base
					if (shouldRainbow) {
						const charH = word.height > 0 ? word.height : fontSize;
						const grad = ctx.createLinearGradient(charX, word.y, charX, word.y + charH);
						grad.addColorStop(0, '#FFFFFF');
						grad.addColorStop(0.28, charColor);
						grad.addColorStop(1, charColor);
						ctx.fillStyle = grad;
					} else {
						ctx.fillStyle = charColor;
					}
					ctx.fillText(char, charX, word.y);
				}

				ctx.restore();
			}
			ctx.restore();
		} else if (this.config.bubbleCloud) {
			this.drawBubbleCloud(ctx, world, entity, words);
		} else if (this.config.animation || this.config.glow || this.config.tilt || this.config.activeTextColor !== undefined) {
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

		if (hasEntranceTransform) {
			ctx.restore();
		}
	}

	private drawAnimatedWords(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		world: World,
		entity: Entity,
		words: Array<{ chars: string; x: number; y: number; width: number; height: number; top?: number; bottom?: number; ranges: Entity[] }>,
		activeColor: string | number | undefined,
		baseColor: string | number | undefined,
		colors?: Array<string | number>,
	): void {
		const anim = this.config.animation;
		const fontSize = this.config.style.fontSize ?? 84;
		const isNeonPreset = (this.presetKey === 'capcut_09' || this.presetKey === 'capcut_10' || this.presetKey === 'capcut_13' || this.presetKey === 'capcut_16');

		const activeAccent = (activeColor !== undefined)
			? (typeof activeColor === 'string' ? activeColor : colorToHex(activeColor))
			: (this.config.activeTextColor !== undefined
				? colorToHex(this.config.activeTextColor)
				: (this.config.textColor !== undefined ? colorToHex(this.config.textColor) : '#FFFFFF'));

		ctx.save();
		ctx.textAlign = 'start';
		ctx.textBaseline = 'top';

		// Tilt / rotate whole phrase if configured
		const tilt = this.config.tilt ?? (this.presetKey === 'capcut_18' ? 8.4 : 0);
		if (tilt !== 0) {
			let minX = Infinity;
			let maxX = -Infinity;
			let minY = Infinity;
			let maxY = -Infinity;
			for (const w of words) {
				minX = Math.min(minX, w.x);
				maxX = Math.max(maxX, w.x + w.width);
				minY = Math.min(minY, w.y);
				maxY = Math.max(maxY, w.y + (w.height > 0 ? w.height : fontSize));
			}
			const phraseCenterX = (minX + maxX) / 2;
			const phraseCenterY = (minY + maxY) / 2;
			ctx.translate(phraseCenterX, phraseCenterY);
			ctx.rotate((tilt * Math.PI) / 180);
			ctx.translate(-phraseCenterX, -phraseCenterY);
		}

		const activeWordData = (this.currentGroupIndex >= 0 && this.currentWordIndex >= 0)
			? this.groups[this.currentGroupIndex]?.[this.currentWordIndex]
			: null;

		const activeWIdx = (this.currentWordIndex >= 0 && this.currentWordIndex < words.length)
			? this.currentWordIndex
			: 0;

		for (let wIdx = 0; wIdx < words.length; wIdx++) {
			const word = words[wIdx]!;
			const isActive = (wIdx === activeWIdx);
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

			// Synthetic forward italic slant on canvas for italic presets
			const isItalic = this.config.style.fontStyle === FontStyle.ITALIC || this.presetKey === 'capcut_18';
			if (isItalic) {
				ctx.translate(cx, cy);
				ctx.transform(1, 0, -0.22, 1, 0, 0);
				ctx.translate(-cx, -cy);
			}

			applyFont(ctx, world, entity, word.ranges);

			if (this.presetKey === 'capcut_27') {
				if (!isActive) {
					// Inactive words in CapCut Preset 27 are rendered with elegant Italic styling
					if (!ctx.font.includes('italic')) {
						ctx.font = 'italic ' + ctx.font;
					}
				} else {
					// Active word is prominent upright bold display
					ctx.font = ctx.font.replace(/\bitalic\s*/g, '');
				}
			}

			// Determine hollow state for Preset 24 (Chữ Rỗng Phá Cách / Hollow Outline)
			const isHollowPreset24 = (this.presetKey === 'capcut_24' || !!this.config.hollowEffect) && (
				words.length === 1
					? true
					: words.length === 2
						? wIdx === 1
						: (wIdx % 2 === 1 || (wIdx === 2 && words.length >= 3 && words.length <= 5))
			);

			// ── LAYER 1: Ambient Glow Aura ──
			if (this.config.glow) {
				if (this.presetKey === 'capcut_16') {
					// Intense Billowing 360-degree Electric Cyan Neon Bloom Aura
					const cyanColor = isActive
						? activeAccent
						: ((colors?.[2] !== undefined)
							? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
							: '#00F2FF');
					const baseBlur = isActive ? 26 : 18;
					const auraWidth = isActive ? 12 : 9;

					ctx.save();
					ctx.shadowColor = cyanColor;
					ctx.shadowBlur = baseBlur;
					ctx.strokeStyle = cyanColor;
					ctx.lineWidth = auraWidth;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.globalAlpha = isActive ? (wordAlpha * glowAlpha) : (wordAlpha * 0.9);
					ctx.strokeText(word.chars, word.x, word.y);

					// Second pass: deep diffuse bloom
					ctx.shadowBlur = baseBlur * 1.8;
					ctx.lineWidth = auraWidth * 0.7;
					ctx.strokeText(word.chars, word.x, word.y);

					// Third pass: core radiance
					ctx.fillStyle = cyanColor;
					ctx.shadowBlur = baseBlur;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (isActive) {
					// Active neon or golden aura glow
					ctx.save();
					const glowColor = (this.config.glow?.color !== undefined) ? this.config.glow.color : activeAccent;
					ctx.shadowColor = glowColor;
					ctx.shadowBlur = glowBlur;
					ctx.fillStyle = glowColor;
					ctx.globalAlpha = wordAlpha * glowAlpha;
					ctx.fillText(word.chars, word.x, word.y);
					// Second pass for intense radiant core
					ctx.shadowBlur = glowBlur * 1.6;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (this.presetKey === 'capcut_10' || this.presetKey === 'capcut_13') {
					// Radiant Hot Pink Neon Glow for inactive words in Preset 10 & Preset 13!
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
				} else if (this.presetKey === 'capcut_23') {
					// Soft electric cyan halo glow ONLY for active word in Preset 23 (Băng Giá Bắc Cực)
					if (isActive) {
						ctx.save();
						const cyanAura = activeAccent || '#38BDF8';
						ctx.shadowColor = cyanAura;
						ctx.shadowBlur = glowBlur * 1.3;
						ctx.fillStyle = cyanAura;
						ctx.globalAlpha = wordAlpha * glowAlpha * 0.75;
						ctx.fillText(word.chars, word.x, word.y);
						ctx.shadowBlur = glowBlur * 0.65;
						ctx.fillText(word.chars, word.x, word.y);
						ctx.restore();
					}
				} else if (this.presetKey === 'capcut_27') {
					// Luminous electric cyan/ice aura ONLY for active word in Preset 27 (Bạc Kim Ánh Băng)
					if (isActive) {
						ctx.save();
						const cyanAura = (colors?.[0] !== undefined)
							? (typeof colors[0] === 'string' ? colors[0] : colorToHex(colors[0]))
							: '#00F2FF';
						ctx.shadowColor = cyanAura;
						ctx.shadowBlur = glowBlur * 1.4;
						ctx.fillStyle = cyanAura;
						ctx.globalAlpha = wordAlpha * glowAlpha * 0.85;
						ctx.fillText(word.chars, word.x, word.y);
						ctx.shadowBlur = glowBlur * 0.7;
						ctx.fillText(word.chars, word.x, word.y);
						ctx.restore();
					}
				} else if (this.presetKey === 'capcut_24' && isActive) {
					// Clean pure white radiance bloom on active word in Preset 24
					ctx.save();
					ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
					ctx.shadowBlur = 10;
					ctx.strokeStyle = '#FFFFFF';
					ctx.lineWidth = isHollowPreset24 ? 4.5 : 3.0;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (this.config.glow) {
					// Soft ambient aura for other glow presets (e.g. Preset 21 Hoàng Kim Lấp Lánh)
					ctx.save();
					ctx.shadowColor = this.config.glow.color;
					ctx.shadowBlur = Math.round(glowBlur * 0.7);
					ctx.fillStyle = this.config.glow.color;
					ctx.globalAlpha = wordAlpha * 0.45;
					ctx.fillText(word.chars, word.x, word.y);
					ctx.restore();
				}
			}

			// ── LAYER 2: Shadow & 3D Extrusion (skipped for neon presets) ──
			if (this.presetKey === 'capcut_23' || this.presetKey === 'capcut_27') {
				// Solid crisp 3D bevel base in dark midnight navy (downward 1px..4px, NO fuzzy blur!)
				ctx.save();
				const bevelColor = (colors?.[2] !== undefined)
					? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
					: (this.presetKey === 'capcut_27' ? '#082F49' : '#071524');
				ctx.fillStyle = bevelColor;
				ctx.strokeStyle = bevelColor;
				ctx.lineWidth = (this.config.stroke?.width ?? 5.0);
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				for (let dy = 1; dy <= (isActive ? 4 : 2); dy++) {
					ctx.strokeText(word.chars, word.x, word.y + dy);
					ctx.fillText(word.chars, word.x, word.y + dy);
				}
				ctx.restore();
			} else if (this.presetKey === 'capcut_24') {
				// Crisp black silhouette drop shadow (+2px, +3px) for Preset 24
				ctx.save();
				ctx.fillStyle = '#000000';
				ctx.strokeStyle = '#000000';
				ctx.lineWidth = isHollowPreset24 ? 7.0 : 5.0;
				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				ctx.strokeText(word.chars, word.x + 2, word.y + 3);
				if (!isHollowPreset24) {
					ctx.fillText(word.chars, word.x + 2, word.y + 3);
				}
				ctx.restore();
			} else if (this.config.shadow && !this.config.bubbleCloud && !isNeonPreset && !(this.presetKey === 'capcut_25' && isActive)) {
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
			const skipStroke = isActive && (
				this.presetKey === 'capcut_03' ||
				this.presetKey === 'capcut_04' ||
				this.presetKey === 'capcut_07' ||
				this.presetKey === 'capcut_25' ||
				(this.presetKey === 'capcut_26' && this.currentWordIndex % 2 === 0)
			);
			if (!skipStroke) {
				if (this.presetKey === 'capcut_16') {
					// Brilliant crisp Electric Cyan neon outline
					const strokeColor = isActive
						? activeAccent
						: ((colors?.[2] !== undefined)
							? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
							: '#00F2FF');
					ctx.save();
					ctx.strokeStyle = strokeColor;
					ctx.lineWidth = isActive ? 5.8 : 5.0;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.globalAlpha = 1.0;
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (isActive && isNeonPreset) {
					// Glowing luminous neon outline around the core (Cyan for preset 10, Orange for preset 09)
					ctx.save();
					ctx.strokeStyle = activeAccent;
					ctx.lineWidth = this.config.stroke?.width ?? 4.5;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				} else if (!isActive && (this.presetKey === 'capcut_10' || this.presetKey === 'capcut_13')) {
					// Radiant Hot Pink Neon Outline for inactive words in Preset 10 & 13 (NO black stroke!)
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
				} else if (this.presetKey === 'capcut_24' || this.config.hollowEffect) {
					ctx.save();
					if (isHollowPreset24) {
						// Outer black backing stroke so white outline is readable over any background
						ctx.strokeStyle = '#000000';
						ctx.lineWidth = 6.5;
						ctx.lineJoin = 'round';
						ctx.lineCap = 'round';
						ctx.strokeText(word.chars, word.x, word.y);

						// Inner crisp white hollow outline
						ctx.strokeStyle = '#FFFFFF';
						ctx.lineWidth = isActive ? 4.8 : 4.0;
						ctx.lineJoin = 'round';
						ctx.lineCap = 'round';
						if (isActive) {
							ctx.shadowColor = '#FFFFFF';
							ctx.shadowBlur = 6;
						}
						ctx.strokeText(word.chars, word.x, word.y);
					} else {
						// Solid word: Crisp dark stroke around white text
						ctx.strokeStyle = '#000000';
						ctx.lineWidth = 5.0;
						ctx.lineJoin = 'round';
						ctx.lineCap = 'round';
						ctx.strokeText(word.chars, word.x, word.y);
					}
					ctx.restore();
				} else if (this.config.stroke && !this.config.bubbleCloud) {
					// Clean crisp dark stroke on inactive words for other presets
					ctx.save();
					const strokeColorHex = (colors?.[2] !== undefined)
						? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
						: colorToHex(this.config.stroke.color);
					ctx.strokeStyle = strokeColorHex;
					ctx.lineWidth = (this.presetKey === 'capcut_23' && isActive)
						? (this.config.stroke.width + 0.6)
						: this.config.stroke.width;
					ctx.lineJoin = 'round';
					ctx.lineCap = 'round';
					ctx.strokeText(word.chars, word.x, word.y);
					ctx.restore();
				}
			}

			// ── LAYER 4: Glyph Fill ──
			ctx.save();
			if (this.presetKey === 'capcut_16') {
				// Preset 16 has a deep midnight / pitch black core inside the vibrant neon stroke!
				const darkFill = (colors?.[1] !== undefined)
					? (typeof colors[1] === 'string' ? colors[1] : colorToHex(colors[1]))
					: (this.config.textColor !== undefined ? colorToHex(this.config.textColor) : '#040810');
				ctx.fillStyle = darkFill;
				ctx.fillText(word.chars, word.x, word.y);
			} else if (isNeonPreset) {
				// Neon presets have a luminous white-hot core for both active and inactive!
				ctx.fillStyle = '#FFFFFF';
				ctx.fillText(word.chars, word.x, word.y);
			} else if (this.presetKey === 'capcut_21') {
				// Rich metallic gold gradient for Preset 21 (Hoàng Kim Lấp Lánh)
				const wordH = word.height > 0 ? word.height : fontSize;
				const grad = ctx.createLinearGradient(word.x, word.y, word.x, word.y + wordH);
				if (isActive) {
					grad.addColorStop(0, '#FFFFFF');
					grad.addColorStop(0.28, '#FEF08A');
					grad.addColorStop(1, '#F59E0B');
				} else {
					grad.addColorStop(0, '#FEF08A');
					grad.addColorStop(0.35, '#FACC15');
					grad.addColorStop(1, '#D97706');
				}
				ctx.fillStyle = grad;
				ctx.fillText(word.chars, word.x, word.y);
			} else if (this.presetKey === 'capcut_23') {
				// Arctic Ice Glacier Gradient for Preset 23 (Băng Giá Bắc Cực)
				const wordH = word.height > 0 ? word.height : fontSize;
				const grad = ctx.createLinearGradient(word.x, word.y, word.x, word.y + wordH);
				if (isActive) {
					// Brilliant ice cyan crystal: pure frosted white top -> electric cyan -> deep arctic azure
					const cAccent = activeAccent || '#38BDF8';
					grad.addColorStop(0, '#FFFFFF');
					grad.addColorStop(0.18, '#E0F7FF');
					grad.addColorStop(0.48, cAccent);
					grad.addColorStop(0.82, '#0284C7');
					grad.addColorStop(1, '#0369A1');
				} else {
					// Frosted white sheen: pure white -> soft ice white -> crisp ice cyan-white
					const cBase = (baseColor !== undefined)
						? (typeof baseColor === 'string' ? baseColor : colorToHex(baseColor))
						: '#F0F9FF';
					grad.addColorStop(0, '#FFFFFF');
					grad.addColorStop(0.40, cBase);
					grad.addColorStop(1, '#C7E9FF');
				}
				ctx.fillStyle = grad;
				ctx.fillText(word.chars, word.x, word.y);
			} else if (this.presetKey === 'capcut_24' || this.config.hollowEffect) {
				if (!isHollowPreset24) {
					// Pure crisp solid white fill for non-hollow words
					ctx.fillStyle = '#FFFFFF';
					if (isActive) {
						ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
						ctx.shadowBlur = 6;
					}
					ctx.fillText(word.chars, word.x, word.y);
				}
				// Hollow words skip fill to preserve the transparent/cutout center!
			} else if (this.presetKey === 'capcut_26' && isActive) {
				// CapCut Preset 26 (Comic Vàng Nổ Gai / Comic Alternating):
				// Even active words (0, 2, 4...) -> Vibrant Comic Red text inside Yellow Tag Box
				// Odd active words (1, 3, 5...)  -> Deep Comic Ink Black text inside Yellow Spiky Burst
				const isOdd = (this.currentWordIndex % 2 !== 0);
				const redAccent = (activeColor !== undefined)
					? (typeof activeColor === 'string' ? activeColor : colorToHex(activeColor))
					: (this.config.activeTextColor !== undefined ? colorToHex(this.config.activeTextColor) : '#EF4444');
				ctx.fillStyle = isOdd ? '#000000' : redAccent;
				ctx.fillText(word.chars, word.x, word.y);
			} else if (this.presetKey === 'capcut_27') {
				// Metallic Chrome Holographic Gradient for Preset 27 (Bạc Kim Ánh Băng)
				const wordH = word.height > 0 ? word.height : fontSize;
				const grad = ctx.createLinearGradient(word.x, word.y, word.x, word.y + wordH);
				if (isActive) {
					// Luminous Holographic Chrome: Iridescent Lavender top -> Pure White Chrome Sheen -> Electric Ice Cyan
					const cAccent = (activeColor !== undefined)
						? (typeof activeColor === 'string' ? activeColor : colorToHex(activeColor))
						: '#38BDF8';
					grad.addColorStop(0, '#C4B5FD');
					grad.addColorStop(0.22, '#EDE9FE');
					grad.addColorStop(0.44, '#FFFFFF');
					grad.addColorStop(0.68, '#7DD3FC');
					grad.addColorStop(0.88, cAccent);
					grad.addColorStop(1, '#0284C7');
				} else {
					// Inactive words: Clean frosted white metallic sheen
					const cBase = (baseColor !== undefined)
						? (typeof baseColor === 'string' ? baseColor : colorToHex(baseColor))
						: '#FFFFFF';
					grad.addColorStop(0, '#FFFFFF');
					grad.addColorStop(0.70, cBase);
					grad.addColorStop(1, '#E2E8F0');
				}
				ctx.fillStyle = grad;
				ctx.fillText(word.chars, word.x, word.y);
			} else if (this.presetKey === 'capcut_28') {
				// Splatter Crimson Distress (Vết Loang Máu Đỏ):
				// Active word inside Crimson Highlight Box: White text with black outline
				// Inactive words: Bone White text with black outline
				const boneWhite = (baseColor !== undefined)
					? (typeof baseColor === 'string' ? baseColor : colorToHex(baseColor))
					: '#FFFFFF';
				ctx.fillStyle = boneWhite;
				ctx.fillText(word.chars, word.x, word.y);
			} else {
				const wordFill = isActive
					? activeAccent
					: (baseColor !== undefined ? (typeof baseColor === 'string' ? baseColor : colorToHex(baseColor)) : '#FFFFFF');
				ctx.fillStyle = wordFill;
				ctx.fillText(word.chars, word.x, word.y);
			}
			ctx.restore();

			// ── LAYER 5b: Electric Lightning Crackles & Sparks for Preset 16 ──
			if (this.config.lightningElectric && isActive) {
				const elapsed = activeWordData ? Math.max(0, this.lastRelativeTime - activeWordData.start) : 0;
				drawElectricLightningCrackles(
					ctx,
					word.x,
					word.y,
					word.width,
					word.height > 0 ? word.height : fontSize,
					elapsed,
					activeAccent,
				);
			}

			// ── LAYER 5c: Crimson Blood Splatters & Drips for Preset 28 (Vết Loang Máu Đỏ) ──
			if (this.presetKey === 'capcut_28') {
				this.drawBloodSplatter(ctx, word, isActive, colors);
			}

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
		if (words.length === 0) return;

		const cfg = this.config.bubbleCloud!;
		const fontSize = this.config.style.fontSize ?? 54;
		const isCuteBadge = this.presetKey === 'capcut_14';

		// Read Inspector color overrides if user adjusted slots
		const colors = entity.get(Caption)?.colors;
		const activeHighlight = colors?.[0] !== undefined
			? (typeof colors[0] === 'string' ? colors[0] : colorToHex(colors[0]))
			: (this.config.activeTextColor !== undefined ? colorToHex(this.config.activeTextColor) : '#FFFFFF');
		const baseLetterColor = colors?.[1] !== undefined
			? (typeof colors[1] === 'string' ? colors[1] : colorToHex(colors[1]))
			: (this.config.textColor !== undefined ? colorToHex(this.config.textColor) : (isCuteBadge ? '#FFFFFF' : '#BAE6FD'));
		const customBorderColor = colors?.[2] !== undefined
			? (typeof colors[2] === 'string' ? colors[2] : colorToHex(colors[2]))
			: undefined;

		const cloudBorderColor = customBorderColor ?? (cfg.cloudBorderColor !== undefined ? colorToHex(cfg.cloudBorderColor) : (isCuteBadge ? '#FFFFFF' : '#0284C7'));
		const cloudBodyColor = cfg.cloudColor !== undefined ? colorToHex(cfg.cloudColor) : (isCuteBadge ? '#4695D8' : '#BAE6FD');
		const innerBorderColor = cfg.innerBorderColor !== undefined ? colorToHex(cfg.innerBorderColor) : (isCuteBadge ? '#3B82F6' : '#0369A1');

		ctx.save();
		ctx.textAlign = 'start';
		ctx.textBaseline = 'top';

		// Ensure NO drop shadow interference
		ctx.shadowColor = 'transparent';
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		const activeWordData = (this.currentGroupIndex >= 0 && this.currentWordIndex >= 0)
			? this.groups[this.currentGroupIndex]?.[this.currentWordIndex]
			: null;

		if (isCuteBadge) {
			// ── PRESET 14: Authentic Pastel Sky-Blue Cloud Badge ──
			const glyphHalfHeight = fontSize * 0.40;
			const wordTops = words.map(w => {
				const t = (w as any).top;
				return (typeof t === 'number' && !isNaN(t) && t !== 0) ? t : (w.y - glyphHalfHeight);
			});
			const wordBottoms = words.map(w => {
				const b = (w as any).bottom;
				return (typeof b === 'number' && !isNaN(b) && b !== 0) ? b : (w.y + glyphHalfHeight);
			});

			const minX = Math.min(...words.map(w => w.x));
			const maxX = Math.max(...words.map(w => w.x + w.width));
			const textTop = Math.min(...wordTops);
			const textBottom = Math.max(...wordBottoms);
			const textHeight = Math.max(textBottom - textTop, fontSize * 0.7);

			// Balanced padding: perfectly equal top & bottom spacing so 1 line is centered with zero bottom void
			const padX = Math.max(fontSize * 0.46, 26);
			const padY = Math.max(fontSize * 0.42, 22);

			const boxX = minX - padX;
			const boxY = textTop - padY;
			const boxW = (maxX - minX) + padX * 2;
			const boxH = textHeight + padY * 2;
			const radius = Math.min(boxH * 0.38, 22);
			const borderWidth = 5;
			const puffRadius = Math.max(boxH * 0.25, 13);

			// Build list of cloud puff circles along all 4 edges for a true organic cloud silhouette
			const puffs: Array<{ x: number; y: number; r: number }> = [];
			const countX = Math.max(3, Math.round(boxW / (puffRadius * 1.5)));
			for (let i = 0; i <= countX; i++) {
				const px = boxX + (i / countX) * boxW;
				puffs.push({ x: px, y: boxY + 2, r: puffRadius * (0.85 + 0.15 * Math.sin(i * 1.8)) });
				puffs.push({ x: px, y: boxY + boxH - 2, r: puffRadius * (0.85 + 0.15 * Math.cos(i * 1.8)) });
			}
			const countY = Math.max(1, Math.round(boxH / (puffRadius * 1.6)));
			for (let i = 0; i <= countY; i++) {
				const py = boxY + (i / countY) * boxH;
				puffs.push({ x: boxX + 2, y: py, r: puffRadius * 0.9 });
				puffs.push({ x: boxX + boxW - 2, y: py, r: puffRadius * 0.9 });
			}

			// 1. Outer White Cloud Silhouette with Soft Diffused Shadow
			ctx.save();
			ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
			ctx.shadowBlur = 10;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 4;

			ctx.fillStyle = cloudBorderColor;
			ctx.beginPath();
			ctx.roundRect(boxX - borderWidth, boxY - borderWidth, boxW + borderWidth * 2, boxH + borderWidth * 2, radius + borderWidth);
			for (const p of puffs) {
				ctx.moveTo(p.x + p.r + borderWidth, p.y);
				ctx.arc(p.x, p.y, p.r + borderWidth, 0, Math.PI * 2);
			}
			ctx.fill();
			ctx.restore();

			// 2. Inner Sky-Blue Cloud Body
			ctx.save();
			const cloudGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
			cloudGrad.addColorStop(0, '#5BA4ED');
			cloudGrad.addColorStop(0.45, cloudBodyColor);
			cloudGrad.addColorStop(1, '#3880C4');
			ctx.fillStyle = cloudGrad;
			ctx.beginPath();
			ctx.roundRect(boxX, boxY, boxW, boxH, radius);
			for (const p of puffs) {
				ctx.moveTo(p.x + p.r, p.y);
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
			}
			ctx.fill();
			ctx.restore();

			// 3. Crisp Pure White Text Fill with thick rounded joins
			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				const isActive = (wIdx === this.currentWordIndex) || (this.currentWordIndex === -1 && words.length === 1);
				const wordColor = isActive ? activeHighlight : baseLetterColor;

				ctx.save();
				let scale = 1.0;
				if (isActive && this.config.animation?.scalePop) {
					const maxPop = this.config.animation.scalePop;
					let progress = 0.5;
					if (activeWordData) {
						const elapsed = Math.max(0, this.lastRelativeTime - activeWordData.start);
						const dur = Math.max(0.12, activeWordData.end - activeWordData.start);
						progress = Math.max(0, Math.min(1, elapsed / dur));
					}
					scale = 1.0 + (maxPop - 1.0) * Math.sin(progress * Math.PI);
				}

				if (scale !== 1.0) {
					const cx = word.x + word.width / 2;
					const cy = word.y;
					ctx.translate(cx, cy);
					ctx.scale(scale, scale);
					ctx.translate(-cx, -cy);
				}

				applyFont(ctx, world, entity, word.ranges);

				ctx.lineJoin = 'round';
				ctx.lineCap = 'round';
				ctx.strokeStyle = wordColor;
				ctx.lineWidth = 2.5;
				ctx.strokeText(word.chars, word.x, word.y);
				ctx.fillStyle = wordColor;
				ctx.fillText(word.chars, word.x, word.y);
				ctx.restore();
			}

			// 4. Floating Pink Sakura Blossom Petals & Sparkle Stars
			if (cfg.bubbles !== false) {
				this.drawSakuraFlower(ctx, boxX - 4, boxY + 10, Math.max(fontSize * 0.38, 20));
				this.drawSakuraFlower(ctx, boxX + boxW + 6, boxY + boxH - 10, Math.max(fontSize * 0.42, 22));

				this.drawSparkleStar(ctx, boxX + boxW - 12, boxY - 8, Math.max(fontSize * 0.18, 9));
				this.drawSparkleStar(ctx, boxX + 20, boxY + boxH + 10, Math.max(fontSize * 0.15, 8));
			}
		} else {
			// ── PRESET 05: Classic Bong Bóng Mây Xanh ──
			// Layer 1: Outer Cloud Silhouette
			ctx.save();
			ctx.strokeStyle = cloudBorderColor;
			ctx.lineWidth = Math.max(fontSize * 0.36, 24);
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			for (const word of words) {
				applyFont(ctx, world, entity, word.ranges);
				ctx.strokeText(word.chars, word.x, word.y);
			}
			ctx.restore();

			// Layer 2: Cloud Body Gradient
			ctx.save();
			ctx.lineWidth = Math.max(fontSize * 0.26, 18);
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

			// Layer 3: Inner Contour Outline
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

			// Layer 4: Letter Glyphs
			for (let wIdx = 0; wIdx < words.length; wIdx++) {
				const word = words[wIdx]!;
				const isActive = (wIdx === this.currentWordIndex) || (this.currentWordIndex === -1 && words.length === 1);
				const bottomColor = isActive ? activeHighlight : baseLetterColor;

				ctx.save();
				let scale = 1.0;
				if (isActive && this.config.animation?.scalePop) {
					const maxPop = this.config.animation.scalePop;
					let progress = 0.5;
					if (activeWordData) {
						const elapsed = Math.max(0, this.lastRelativeTime - activeWordData.start);
						const dur = Math.max(0.12, activeWordData.end - activeWordData.start);
						progress = Math.max(0, Math.min(1, elapsed / dur));
					}
					scale = 1.0 + (maxPop - 1.0) * Math.sin(progress * Math.PI);
				}

				if (scale !== 1.0) {
					const cx = word.x + word.width / 2;
					const cy = word.y + (word.height > 0 ? word.height : fontSize) / 2;
					ctx.translate(cx, cy);
					ctx.scale(scale, scale);
					ctx.translate(-cx, -cy);
				}

				applyFont(ctx, world, entity, word.ranges);

				const textGrad = ctx.createLinearGradient(word.x, word.y, word.x, word.y + fontSize);
				textGrad.addColorStop(0, '#FFFFFF');
				textGrad.addColorStop(0.35, '#FFFFFF');
				textGrad.addColorStop(0.70, isActive ? '#BAE6FD' : '#E0F2FE');
				textGrad.addColorStop(1, bottomColor);

				ctx.fillStyle = textGrad;
				ctx.fillText(word.chars, word.x, word.y);
				ctx.restore();
			}

			// Layer 5: Floating Bubbles
			if (cfg.bubbles !== false && words.length > 0) {
				const firstWord = words[0]!;
				const lastWord = words[words.length - 1]!;
				this.drawBubble(ctx, firstWord.x - fontSize * 0.28, firstWord.y + fontSize * 0.72, fontSize * 0.11, cloudBorderColor, false);
				this.drawBubble(ctx, firstWord.x - fontSize * 0.46, firstWord.y + fontSize * 0.44, fontSize * 0.065, cloudBorderColor, false);
				this.drawBubble(ctx, lastWord.x + lastWord.width + fontSize * 0.25, lastWord.y + fontSize * 0.84, fontSize * 0.12, cloudBorderColor, false);
				this.drawBubble(ctx, lastWord.x + lastWord.width + fontSize * 0.44, lastWord.y + fontSize * 1.04, fontSize * 0.06, cloudBorderColor, false);
			}
		}

		ctx.restore();
	}

	private drawSakuraFlower(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
	): void {
		ctx.save();
		ctx.translate(cx, cy);

		// 5 soft pink sakura petals
		ctx.fillStyle = '#FF85A2';
		for (let i = 0; i < 5; i++) {
			const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
			const px = Math.cos(angle) * size * 0.52;
			const py = Math.sin(angle) * size * 0.52;
			ctx.beginPath();
			ctx.arc(px, py, size * 0.36, 0, Math.PI * 2);
			ctx.fill();
		}

		// Flower center pistil (soft pastel yellow)
		ctx.beginPath();
		ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
		ctx.fillStyle = '#FEF08A';
		ctx.fill();

		ctx.beginPath();
		ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2);
		ctx.fillStyle = '#F59E0B';
		ctx.fill();

		ctx.restore();
	}

	private drawSparkleStar(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		cx: number,
		cy: number,
		size: number,
	): void {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.fillStyle = '#FFFFFF';
		ctx.beginPath();
		ctx.moveTo(0, -size);
		ctx.quadraticCurveTo(0, 0, size, 0);
		ctx.quadraticCurveTo(0, 0, 0, size);
		ctx.quadraticCurveTo(0, 0, -size, 0);
		ctx.quadraticCurveTo(0, 0, 0, -size);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	private drawBubble(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		strokeColor: string,
		isPink = false,
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
		radGrad.addColorStop(0.5, isPink ? '#FDF2F8' : '#F0F9FF');
		radGrad.addColorStop(1, isPink ? '#FBCFE8' : '#BAE6FD');

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

		// 1. Radial bloom behind the star (Golden for preset 21, Ice Cyan for preset 27)
		const glowRadius = size * 1.6;
		const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
		const isPreset27 = this.presetKey === 'capcut_27';
		if (isPreset27) {
			glowGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * glowAlpha})`);
			glowGrad.addColorStop(0.25, `rgba(186, 230, 253, ${0.8 * glowAlpha})`);
			glowGrad.addColorStop(0.6, `rgba(0, 242, 255, ${0.4 * glowAlpha})`);
			glowGrad.addColorStop(1, 'rgba(0, 242, 255, 0)');
		} else {
			glowGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * glowAlpha})`);
			glowGrad.addColorStop(0.25, `rgba(253, 230, 138, ${0.7 * glowAlpha})`);
			glowGrad.addColorStop(0.6, `rgba(217, 119, 6, ${0.3 * glowAlpha})`);
			glowGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
		}
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
		ctx.fillStyle = isPreset27 ? 'rgba(224, 242, 254, 0.95)' : 'rgba(255, 255, 255, 0.9)';
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
		const isPreset27 = this.presetKey === 'capcut_27';
		if (isPreset27) {
			grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
			grad.addColorStop(0.4, `rgba(186, 230, 253, ${alpha * 0.85})`);
			grad.addColorStop(1, 'rgba(0, 242, 255, 0)');
		} else {
			grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
			grad.addColorStop(0.4, `rgba(254, 240, 138, ${alpha * 0.8})`);
			grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
		}
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

	private drawBloodBoxDrips(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		bx: number,
		by: number,
		bw: number,
		bh: number,
		crimsonColor = '#DC2626',
	): void {
		ctx.save();
		const bloodDark = '#450A0A';
		const bloodBright = '#EF4444';

		let seed = (Math.abs(this.currentWordIndex) * 997 + 101) | 0;
		const rnd = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return Math.abs(seed) / 233280;
		};

		// 1. Drips flowing downwards from bottom edge of active box
		const numDrips = 5;
		const dripInterval = bw / (numDrips + 1);
		for (let d = 0; d < numDrips; d++) {
			const dx = bx + dripInterval * (d + 1) + (rnd() - 0.5) * (dripInterval * 0.4);
			const dripLen = bh * 0.35 + rnd() * (bh * 0.45);
			const dripW = Math.max(1, 3.2 + rnd() * 1.8);
			const dy1 = by + bh;
			const dy2 = dy1 + dripLen;

			// Dark shadow
			ctx.strokeStyle = bloodDark;
			ctx.lineWidth = dripW + 1.2;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(dx + 1, dy1);
			ctx.lineTo(dx + 1, dy2 + 1);
			ctx.stroke();

			// Crimson trail
			ctx.strokeStyle = crimsonColor;
			ctx.lineWidth = dripW;
			ctx.beginPath();
			ctx.moveTo(dx, dy1);
			ctx.lineTo(dx, dy2);
			ctx.stroke();

			// Droplet bulb
			const r = Math.max(0.5, dripW * 0.85);
			ctx.fillStyle = bloodBright;
			ctx.beginPath();
			ctx.arc(dx, dy2, r, 0, Math.PI * 2);
			ctx.fill();
		}

		// 2. Blood splatter droplets around the active box
		const numDrops = 14;
		for (let s = 0; s < numDrops; s++) {
			const sx = bx + (rnd() - 0.1) * (bw * 1.2);
			const sy = by + (rnd() - 0.15) * (bh * 1.3);
			if (sx > bx + 6 && sx < bx + bw - 6 && sy > by + 6 && sy < by + bh - 6) {
				continue;
			}
			const sRad = Math.max(0.5, 1.2 + rnd() * 2.2);
			const dropColor = rnd() > 0.4 ? crimsonColor : bloodDark;

			ctx.fillStyle = bloodDark;
			ctx.beginPath();
			ctx.arc(sx + 0.8, sy + 0.8, sRad, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = rnd() > 0.5 ? bloodBright : dropColor;
			ctx.beginPath();
			ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}

	private drawBloodSplatter(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		word: { chars: string; x: number; y: number; width: number; height: number; top?: number; bottom?: number },
		isActive: boolean,
		colors?: Array<string | number>,
	): void {
		const fontSize = this.config.style.fontSize ?? 58;
		const h = word.height > 0 ? word.height : fontSize;
		const w = word.width;
		const x = word.x;
		const y = word.y;

		let seed = 1337;
		for (let i = 0; i < word.chars.length; i++) {
			seed = ((seed << 5) - seed + word.chars.charCodeAt(i)) | 0;
		}
		if (isActive) seed = (seed + 9999) | 0;
		seed = Math.abs(seed) + 1;
		const rnd = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return Math.abs(seed) / 233280;
		};

		const bloodDark = '#450A0A';
		const bloodMid = (colors?.[0] !== undefined)
			? (typeof colors[0] === 'string' ? colors[0] : colorToHex(colors[0]))
			: '#DC2626';
		const bloodBright = '#EF4444';

		ctx.save();

		if (!isActive) {
			// 1. Blood Drips flowing downwards from bottom of glyphs
			const numDrips = Math.max(2, Math.min(4, Math.floor(word.chars.length * 0.7)));
			for (let d = 0; d < numDrips; d++) {
				const dx = (0.15 + (d / numDrips) * 0.7 + (rnd() - 0.5) * 0.1) * w;
				const dripLen = h * 0.18 + rnd() * (h * 0.28);
				const dripW = Math.max(1, 1.6 + rnd() * 1.2);
				const dX = x + dx;
				const dY1 = y + h * 0.88;
				const dY2 = dY1 + dripLen;

				// Drip Shadow
				ctx.strokeStyle = bloodDark;
				ctx.lineWidth = dripW + 1.2;
				ctx.lineCap = 'round';
				ctx.beginPath();
				ctx.moveTo(dX + 1, dY1);
				ctx.lineTo(dX + 1, dY2 + 1);
				ctx.stroke();

				// Drip Trail
				ctx.strokeStyle = bloodMid;
				ctx.lineWidth = dripW;
				ctx.beginPath();
				ctx.moveTo(dX, dY1);
				ctx.lineTo(dX, dY2);
				ctx.stroke();

				// Droplet tear bulb
				const r = Math.max(0.5, dripW * 0.85);
				ctx.fillStyle = bloodBright;
				ctx.beginPath();
				ctx.arc(dX, dY2, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// 2. Blood Splatter Droplets across and around glyphs
		const numDrops = isActive ? 8 : 6;
		for (let s = 0; s < numDrops; s++) {
			const sx = x + (rnd() - 0.1) * (w * 1.2);
			const sy = y + (rnd() - 0.15) * (h * 1.3);
			const sRad = Math.max(0.5, isActive ? (1.0 + rnd() * 2.0) : (0.8 + rnd() * 1.6));
			const dropColor = (rnd() > 0.4) ? bloodMid : bloodDark;

			// Droplet shadow
			ctx.fillStyle = bloodDark;
			ctx.beginPath();
			ctx.arc(sx + 0.8, sy + 0.8, sRad, 0, Math.PI * 2);
			ctx.fill();

			// Droplet core
			ctx.fillStyle = (rnd() > 0.5) ? bloodBright : dropColor;
			ctx.beginPath();
			ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}

	public dispose(): void {
		this.groups = [];
		this.currentGroupIndex = -1;
		this.currentWordIndex = -1;
	}
}
