/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CaptionType } from '../../constants';
import { AssetId, Caption, ChildOf, Paint, Shadow, Source, Stroke, TextRange, CaptionDecoderHandle } from '../../traits';
import { getAsset, invalidateAssetFile } from '../../actions/assets';
import { deleteEntity } from '../../actions/entities';
import { ClassicCaptionDecoder, CLASSIC_TEXT_STYLE } from './classic';
import { CascadeCaptionDecoder, CASCADE_TEXT_STYLE } from './cascade';
import { SpotlightCaptionDecoder, SPOTLIGHT_TEXT_STYLE } from './spotlight';
import { WhisperCaptionDecoder, WHISPER_TEXT_STYLE } from './whisper';
import { PaperCaptionDecoder, PAPER_TEXT_STYLE } from './paper';
import { GuineaCaptionDecoder, GUINEA_TEXT_STYLE } from './guinea';
import { StarkCaptionDecoder, STARK_TEXT_STYLE } from './stark';
import { HormoziCaptionDecoder, HORMOZI_TEXT_STYLE } from './hormozi';
import { KaraokeCaptionDecoder, KARAOKE_TEXT_STYLE, KARAOKE_BASE_COLOR } from './karaoke';
import { OneWordCaptionDecoder, ONE_WORD_TEXT_STYLE } from './one-word';
import { NeonCaptionDecoder, NEON_TEXT_STYLE } from './neon';
import { ComicCaptionDecoder, COMIC_TEXT_STYLE, COMIC_BASE_COLOR } from './comic';
import { CinematicCaptionDecoder, CINEMATIC_TEXT_STYLE } from './cinematic';

import type { Entity, World } from 'koota';
import type { Asset } from '@diffusionstudio/assets';
import type { CaptionDecoder, CaptionPresetStyle } from './types';

export type { CaptionDecoder, CaptionPresetStyle } from './types';
export { ClassicCaptionDecoder, CLASSIC_PRESET_WIDTH, CLASSIC_PRESET_HEIGHT } from './classic';
export { CascadeCaptionDecoder } from './cascade';
export { SpotlightCaptionDecoder } from './spotlight';
export { WhisperCaptionDecoder } from './whisper';
export { PaperCaptionDecoder } from './paper';
export { GuineaCaptionDecoder } from './guinea';
export { StarkCaptionDecoder } from './stark';
export { HormoziCaptionDecoder } from './hormozi';
export { KaraokeCaptionDecoder } from './karaoke';
export { OneWordCaptionDecoder } from './one-word';
export { NeonCaptionDecoder } from './neon';
export { ComicCaptionDecoder } from './comic';
export { CinematicCaptionDecoder } from './cinematic';
export * from './position';
export * from './subtitles';
export * from './utils';

/**
 * Each preset's base TextStyle, keyed by type. The document writes these onto
 * a `<captions>` entity when the preset is (re)applied, then re-runs the
 * element's authored style props over them — so the preset is the base coat
 * and everything the file says overwrites it.
 */
export const CAPTION_PRESET_STYLES: Record<CaptionType, CaptionPresetStyle> = {
	[CaptionType.CLASSIC]: CLASSIC_TEXT_STYLE,
	[CaptionType.CASCADE]: CASCADE_TEXT_STYLE,
	[CaptionType.SPOTLIGHT]: SPOTLIGHT_TEXT_STYLE,
	[CaptionType.WHISPER]: WHISPER_TEXT_STYLE,
	[CaptionType.PAPER]: PAPER_TEXT_STYLE,
	[CaptionType.GUINEA]: GUINEA_TEXT_STYLE,
	[CaptionType.STARK]: STARK_TEXT_STYLE,
	[CaptionType.HORMOZI]: HORMOZI_TEXT_STYLE,
	[CaptionType.KARAOKE]: KARAOKE_TEXT_STYLE,
	[CaptionType.ONE_WORD]: ONE_WORD_TEXT_STYLE,
	[CaptionType.NEON]: NEON_TEXT_STYLE,
	[CaptionType.COMIC]: COMIC_TEXT_STYLE,
	[CaptionType.CINEMATIC]: CINEMATIC_TEXT_STYLE,
} as Record<CaptionType, CaptionPresetStyle>;

const CAPCUT_STYLES_MAP: CaptionPresetStyle[] = [
	HORMOZI_TEXT_STYLE, CLASSIC_TEXT_STYLE, PAPER_TEXT_STYLE, COMIC_TEXT_STYLE, COMIC_TEXT_STYLE,
	COMIC_TEXT_STYLE, HORMOZI_TEXT_STYLE, COMIC_TEXT_STYLE, PAPER_TEXT_STYLE, NEON_TEXT_STYLE,
	PAPER_TEXT_STYLE, HORMOZI_TEXT_STYLE, KARAOKE_TEXT_STYLE, PAPER_TEXT_STYLE, HORMOZI_TEXT_STYLE,
	COMIC_TEXT_STYLE, NEON_TEXT_STYLE, CLASSIC_TEXT_STYLE, SPOTLIGHT_TEXT_STYLE, PAPER_TEXT_STYLE,
	NEON_TEXT_STYLE, COMIC_TEXT_STYLE, CLASSIC_TEXT_STYLE, HORMOZI_TEXT_STYLE, COMIC_TEXT_STYLE,
	COMIC_TEXT_STYLE, CLASSIC_TEXT_STYLE, KARAOKE_TEXT_STYLE, PAPER_TEXT_STYLE, COMIC_TEXT_STYLE,
	CLASSIC_TEXT_STYLE, NEON_TEXT_STYLE, COMIC_TEXT_STYLE, COMIC_TEXT_STYLE, PAPER_TEXT_STYLE,
	NEON_TEXT_STYLE, CLASSIC_TEXT_STYLE, COMIC_TEXT_STYLE, PAPER_TEXT_STYLE, HORMOZI_TEXT_STYLE,
	NEON_TEXT_STYLE, COMIC_TEXT_STYLE, CLASSIC_TEXT_STYLE, PAPER_TEXT_STYLE, COMIC_TEXT_STYLE,
];

const CAPCUT_FILLS_MAP: (number | undefined)[] = [
	0xFFFFFF, 0xFFFFFF, 0xFFFFFF, COMIC_BASE_COLOR, 0xFFFFFF,
	0xFFE500, 0xFFA500, 0xFF3366, 0xFFFFFF, 0xFFFFFF,
	0xFFFFFF, 0xFFD700, KARAOKE_BASE_COLOR, 0x000000, 0xCCFF00,
	0xFF7700, 0xE0B0FF, 0xCC2222, 0x00D4FF, 0xFFFFFF,
	0xFF69B4, 0xFF5500, 0xFFFFFF, 0x00FF88, 0xFFFFFF,
	0xFFEE00, 0xE5C158, 0x00E5FF, 0xFFFFFF, 0xFFFF00,
	0xDDDDDD, 0xFF00AA, 0xFFFFFF, 0xFF2222, 0x000000,
	0x00FFFF, 0xFFFFFF, 0xEEEEEE, 0xFFFFFF, 0xE07A5F,
	0xBF55EC, 0xFFD700, 0x990000, 0xFFD700, 0x00BBFF,
];

const CAPCUT_DECODERS_MAP: (new (asset: Asset) => CaptionDecoder)[] = [
	HormoziCaptionDecoder, ClassicCaptionDecoder, PaperCaptionDecoder, ComicCaptionDecoder, ComicCaptionDecoder,
	ComicCaptionDecoder, HormoziCaptionDecoder, ComicCaptionDecoder, PaperCaptionDecoder, NeonCaptionDecoder,
	PaperCaptionDecoder, HormoziCaptionDecoder, KaraokeCaptionDecoder, PaperCaptionDecoder, HormoziCaptionDecoder,
	ComicCaptionDecoder, NeonCaptionDecoder, ClassicCaptionDecoder, SpotlightCaptionDecoder, PaperCaptionDecoder,
	NeonCaptionDecoder, ComicCaptionDecoder, ClassicCaptionDecoder, HormoziCaptionDecoder, ComicCaptionDecoder,
	ComicCaptionDecoder, ClassicCaptionDecoder, KaraokeCaptionDecoder, PaperCaptionDecoder, ComicCaptionDecoder,
	ClassicCaptionDecoder, NeonCaptionDecoder, ComicCaptionDecoder, ComicCaptionDecoder, PaperCaptionDecoder,
	NeonCaptionDecoder, ClassicCaptionDecoder, ComicCaptionDecoder, PaperCaptionDecoder, HormoziCaptionDecoder,
	NeonCaptionDecoder, ComicCaptionDecoder, ClassicCaptionDecoder, PaperCaptionDecoder, ComicCaptionDecoder,
];

// Populate 45 CapCut presets into styles and fills
for (let i = CaptionType.CAPCUT_01; i <= CaptionType.CAPCUT_45; i++) {
	const offset = i - CaptionType.CAPCUT_01;
	CAPTION_PRESET_STYLES[i] = CAPCUT_STYLES_MAP[offset] ?? CLASSIC_TEXT_STYLE;
}

/**
 * Each preset's intrinsic base fill: the Color the document seeds the
 * element with, drawn beneath its paint children, which the authored `fill`
 * prop overwrites — so a recolored caption survives a reload. Stark has
 * none: its base coat is a DIFFERENCE-blend fill child its decoder makes,
 * which an intrinsic solid cannot express.
 */
export const CAPTION_PRESET_FILLS: Record<CaptionType, number | undefined> = {
	[CaptionType.CLASSIC]: 0xFFFFFF,
	[CaptionType.CASCADE]: 0xFFFFFF,
	[CaptionType.SPOTLIGHT]: 0xFFFFFF,
	[CaptionType.WHISPER]: 0xFFFFFF,
	[CaptionType.PAPER]: 0xFFFFFF,
	[CaptionType.GUINEA]: 0xFFFFFF,
	[CaptionType.STARK]: undefined,
	[CaptionType.HORMOZI]: 0xFFFFFF,
	[CaptionType.KARAOKE]: KARAOKE_BASE_COLOR,
	[CaptionType.ONE_WORD]: 0xFFFFFF,
	[CaptionType.NEON]: 0xFFFFFF,
	[CaptionType.COMIC]: COMIC_BASE_COLOR,
	[CaptionType.CINEMATIC]: 0xFFFFFF,
} as Record<CaptionType, number | undefined>;

for (let i = CaptionType.CAPCUT_01; i <= CaptionType.CAPCUT_45; i++) {
	const offset = i - CaptionType.CAPCUT_01;
	CAPTION_PRESET_FILLS[i] = CAPCUT_FILLS_MAP[offset];
}

function createCaptionDecoder(type: CaptionType, asset: Asset): CaptionDecoder {
	if (type >= CaptionType.CAPCUT_01 && type <= CaptionType.CAPCUT_45) {
		const offset = type - CaptionType.CAPCUT_01;
		const DecoderClass = CAPCUT_DECODERS_MAP[offset] ?? ClassicCaptionDecoder;
		const decoder = new DecoderClass(asset);
		Object.defineProperty(decoder, 'type', { value: type, writable: false });
		return decoder;
	}

	switch (type) {
		case CaptionType.CLASSIC:
			return new ClassicCaptionDecoder(asset);
		case CaptionType.CASCADE:
			return new CascadeCaptionDecoder(asset);
		case CaptionType.SPOTLIGHT:
			return new SpotlightCaptionDecoder(asset);
		case CaptionType.WHISPER:
			return new WhisperCaptionDecoder(asset);
		case CaptionType.PAPER:
			return new PaperCaptionDecoder(asset);
		case CaptionType.GUINEA:
			return new GuineaCaptionDecoder(asset);
		case CaptionType.STARK:
			return new StarkCaptionDecoder(asset);
		case CaptionType.HORMOZI:
			return new HormoziCaptionDecoder(asset);
		case CaptionType.KARAOKE:
			return new KaraokeCaptionDecoder(asset);
		case CaptionType.ONE_WORD:
			return new OneWordCaptionDecoder(asset);
		case CaptionType.NEON:
			return new NeonCaptionDecoder(asset);
		case CaptionType.COMIC:
			return new ComicCaptionDecoder(asset);
		case CaptionType.CINEMATIC:
			return new CinematicCaptionDecoder(asset);
		default:
			return new ClassicCaptionDecoder(asset);
	}
}

/**
 * Drops what the last preset authored onto the entity: the paints and shadows
 * it draws with and whatever text ranges it left behind, so the next preset's
 * fills don't stack on them. The TextStyle stays — it is the document's, which
 * rewrites it from CAPTION_PRESET_STYLES (plus the authored overrides)
 * whenever the preset prop changes. Animations and keyframe tracks are the
 * file's and stay.
 */
function clearPresetStyling(world: World, entity: Entity): void {
	for (const child of world.query(ChildOf(entity))) {
		// A child with a Source is the file's (an authored stroke, say), not
		// the preset's; only what a decoder made is cleared.
		if (child.has(Source)) continue;
		if (child.has(Paint) || child.has(Shadow) || child.has(TextRange) || child.has(Stroke)) {
			deleteEntity(world, child);
		}
	}
}

/**
 * Lazily resolve (or create) a caption decoder for a caption entity.
 * Recreates the decoder when the caption type changes.
 * Returns null if the transcript asset isn't available yet.
 */
export function resolveCaptionDecoder(world: World, entity: Entity): CaptionDecoder | null {
	const assetId = entity.get(AssetId)?.value;
	if (!assetId) return null;

	const captionType = entity.get(Caption)?.type ?? CaptionType.CLASSIC;
	const existing = entity.get(CaptionDecoderHandle);

	if (existing && captionType === existing.type) {
		// A resolve before the entity was parented had nothing to place
		// against; keep trying until placement lands.
		if (!existing.styled) existing.styled = existing.applyStyles(world, entity);
		return existing;
	}

	const typeChanged = existing != null;
	existing?.dispose();

	const asset = getAsset(world, assetId);
	if (!asset) return null;

	const decoder = createCaptionDecoder(captionType, asset);
	entity.add(CaptionDecoderHandle);
	entity.set(CaptionDecoderHandle, decoder);

	if (typeChanged) clearPresetStyling(world, entity);
	decoder.styled = decoder.applyStyles(world, entity);

	return decoder;
}

export function invalidateCaptionDecoder(world: World, entity: Entity): void {
	const existing = entity.get(CaptionDecoderHandle);
	existing?.dispose();
	entity.remove(CaptionDecoderHandle);
	clearPresetStyling(world, entity);
	const assetId = entity.get(AssetId)?.value;
	if (assetId) {
		const asset = getAsset(world, assetId);
		if (asset) invalidateAssetFile(asset);
	}
}
