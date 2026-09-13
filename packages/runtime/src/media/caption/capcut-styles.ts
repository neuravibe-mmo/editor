/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { FontStyle, TextAlign, TextBaseline, TextCase } from '../../constants';
import type { CaptionPresetStyle } from './types';

export type BackgroundShape = 'box' | 'pill' | 'comic_burst';

export interface CapCutBackgroundConfig {
	type: BackgroundShape;
	color: number;
	opacity?: number;
	strokeColor?: number;
	strokeWidth?: number;
	radius?: number;
	paddingX?: number;
	paddingY?: number;
	/**
	 * 'all': Draw behind entire caption phrase/line
	 * 'activeWord': Draw only behind the currently active spoken word
	 */
	target?: 'all' | 'activeWord';
}

export interface CapCut3DExtrudeConfig {
	color: number;
	depth: number;
	dirX?: number;
	dirY?: number;
}

export interface CapCutGlowConfig {
	color: string;
	blur: number;
}

export interface CapCutRainbowConfig {
	palette: number[];
	stickers?: boolean;
	confetti?: boolean;
	target?: 'all' | 'activeWord';
}

export interface CapCutBubbleCloudConfig {
	cloudColor?: number;
	cloudBorderColor?: number;
	innerBorderColor?: number;
	bubbles?: boolean;
	sparkles?: boolean;
}

export interface CapCutRoyalStarsConfig {
	starColor?: number;
	glowColor?: string;
}

export interface CapCutEchoTrailConfig {
	color?: number;
	opacity?: number;
	steps?: number;
	distance?: number;
	direction?: 'right' | 'left';
	target?: 'all' | 'activeWord';
}

export interface CapCutAnimationConfig {
	/** Scale multiplier for the currently spoken active word (e.g. 1.22 for 22% pop) */
	scalePop?: number;
	/** Whether to dim upcoming words in the current phrase (e.g. 0.4 opacity) */
	dimUpcoming?: boolean | number;
	/** Whether the active word glow should pulse with speech */
	glowPulse?: boolean;
}

export interface CapCutLightningElectricConfig {
	color?: number;
	glowColor?: string;
	coreColor?: string;
	sparks?: boolean;
}

export interface CapCutCandyDreamConfig {
	topColor?: string;
	bottomColor?: string;
	base3DColor?: string;
	stickers?: boolean;
}

export interface CapCutPresetConfig {
	id: string;
	name: string;
	style: CaptionPresetStyle;
	textColor: number;
	activeTextColor?: number;
	stroke?: {
		color: number;
		width: number;
	};
	outerStroke?: {
		color: number;
		width: number;
	};
	shadow?: {
		color: number;
		x: number;
		y: number;
		blur: number;
		opacity?: number;
	};
	glow?: CapCutGlowConfig;
	extrude3D?: CapCut3DExtrudeConfig;
	background?: CapCutBackgroundConfig;
	rainbowLetters?: CapCutRainbowConfig;
	bubbleCloud?: CapCutBubbleCloudConfig;
	royalStars?: CapCutRoyalStarsConfig;
	echoTrail?: CapCutEchoTrailConfig;
	lightningElectric?: CapCutLightningElectricConfig;
	candyDream?: CapCutCandyDreamConfig;
	animation?: CapCutAnimationConfig;
}

const BASE_MONTSERRAT_STYLE: CaptionPresetStyle = {
	fontFamily: 'Montserrat',
	fontWeight: '900',
	fontStyle: FontStyle.NORMAL,
	fontSize: 58,
	textAlign: TextAlign.CENTER,
	textBaseline: TextBaseline.MIDDLE,
	textCase: TextCase.UPPER,
	leading: 1.1,
	letterSpacing: 2,
};

export const CAPCUT_PRESET_CONFIGS: Record<string, CapCutPresetConfig> = {
	// 01. THE QUICK (PRO) - Yellow active word, white base text, black stroke
	capcut_01: {
		id: 'capcut_01',
		name: 'Hormozi Vàng (PRO)',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFE600,
		stroke: { color: 0x000000, width: 7 },
		shadow: { color: 0x000000, x: 4, y: 5, blur: 0, opacity: 1 },
	},

	// 02. THE QUICK BROWN FOX (PRO) - Clean white text with vibrant green active word highlight
	capcut_02: {
		id: 'capcut_02',
		name: 'Chữ Trắng Tinh Tế (PRO)',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Inter',
			fontWeight: '800',
			fontSize: 50,
			letterSpacing: 0.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0x26DD24,
		shadow: { color: 0x000000, x: 0, y: 2, blur: 4, opacity: 0.75 },
	},

	// 03. [THE] QUICK BROWN FOX (PRO) - Lilac rounded tag box on active word, bold white text with solid black outline
	capcut_03: {
		id: 'capcut_03',
		name: 'Hộp Tím Nổi Bật (PRO)',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Montserrat',
			fontWeight: '900',
			fontSize: 50,
			letterSpacing: 0.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x000000, width: 4.5 },
		background: {
			type: 'box',
			color: 0xA479AA,
			strokeColor: 0x6D4577,
			strokeWidth: 1.5,
			radius: 8,
			paddingX: 14,
			paddingY: 6,
			target: 'activeWord',
		},
	},

	// 04. THE QUICK (PRO) - Comic Yellow Box banner with bold red active word, white inactive text with black outline
	capcut_04: {
		id: 'capcut_04',
		name: 'Comic Lime Pop',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Montserrat',
			fontWeight: '900',
			fontStyle: FontStyle.ITALIC,
			fontSize: 50,
			letterSpacing: 0.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xEA3C3C,
		stroke: { color: 0x000000, width: 4.5 },
		background: {
			type: 'box',
			color: 0xE4FF03,
			strokeColor: 0x000000,
			strokeWidth: 2,
			radius: 4,
			paddingX: 12,
			paddingY: 6,
			target: 'activeWord',
		},
		animation: {
			scalePop: 1.18,
			dimUpcoming: 0.4,
		},
	},

	// 05. THE - Bubble cloud font with cyan/blue cloud outline and floating bubble particles
	capcut_05: {
		id: 'capcut_05',
		name: 'Bong Bóng Mây Xanh',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 60,
			letterSpacing: 1.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xBAE6FD,
		activeTextColor: 0x38BDF8,
		stroke: { color: 0x0284C7, width: 6 },
		outerStroke: { color: 0x0284C7, width: 22 },
		bubbleCloud: {
			cloudColor: 0xBAE6FD,
			cloudBorderColor: 0x0284C7,
			innerBorderColor: 0x0369A1,
			bubbles: true,
		},
	},

	// 06. THE QUICK BROWN - Serif font, white base text, gold active word with royal starlight sparkles
	capcut_06: {
		id: 'capcut_06',
		name: 'Cổ Điển Hoàng Gia',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Playfair Display',
			fontWeight: '700',
			fontSize: 54,
			letterSpacing: 1.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xD97706,
		shadow: { color: 0x78350F, x: 0, y: 2, blur: 6, opacity: 0.35 },
		royalStars: {
			starColor: 0xFFFFFF,
			glowColor: 'rgba(253, 230, 138, 0.65)',
		},
	},

	// 07. Bùng Nổ Comic - Bold italic uppercase, white letters with thick black outline, bright yellow jagged comic explosion on active word with pitch-black text
	capcut_07: {
		id: 'capcut_07',
		name: 'Bùng Nổ Comic',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			fontWeight: '900',
			fontSize: 58,
			letterSpacing: 1.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0x000000,
		stroke: { color: 0x000000, width: 6 },
		background: {
			type: 'comic_burst',
			color: 0xFFD600,
			strokeColor: 0x000000,
			strokeWidth: 5,
			paddingX: 24,
			paddingY: 16,
			target: 'activeWord',
		},
	},

	// 08. Vệt Đỏ Điện Ảnh (Echo Motion Trail) - White text with black outline, vibrant red active word with horizontal motion echo trail
	capcut_08: {
		id: 'capcut_08',
		name: 'Vệt Đỏ Điện Ảnh',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontWeight: '900',
			fontSize: 54,
			letterSpacing: 2,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xEF4444,
		stroke: { color: 0x000000, width: 4.5 },
		echoTrail: {
			steps: 3,
			distance: 30,
			opacity: 0.52,
			target: 'activeWord',
		},
		animation: {
			scalePop: 1.18,
			dimUpcoming: 0.4,
		},
	},

	// 09. THE QUICK BROWN FOX JUMPS OVER - Soft warm ambient aura + vibrant orange highlight
	capcut_09: {
		id: 'capcut_09',
		name: 'Phụ Đề Phát Sáng Cam',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontWeight: '900',
			fontSize: 54,
			letterSpacing: 2,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFF7A00,
		stroke: { color: 0x000000, width: 3.5 },
		glow: { color: '#FF7A00', blur: 22 },
		animation: {
			scalePop: 1.32,
			dimUpcoming: false,
			glowPulse: true,
		},
	},

	// 10. THE QUICK BROWN - Dual Neon Glow (Pink neon + Cyan neon)
	capcut_10: {
		id: 'capcut_10',
		name: 'Neon Hồng Xanh',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Nunito',
			fontWeight: '900',
			fontSize: 54,
			letterSpacing: 1.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFF2A85,
		activeTextColor: 0x00F0FF,
		stroke: { color: 0xFF2A85, width: 3.5 },
		glow: { color: '#00F0FF', blur: 24 },
		animation: {
			scalePop: 1.30,
			dimUpcoming: false,
			glowPulse: true,
		},
	},

	// 11. OVER THE LAZY DOG - Multi-color Rainbow Candy Letters with active bounce pop & NO shadow
	capcut_11: {
		id: 'capcut_11',
		name: 'Kẹo Ngọt Đa Sắc',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Montserrat',
			fontWeight: '900',
			fontSize: 58,
			letterSpacing: 2,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFF9900,
		activeTextColor: 0xFF3366,
		stroke: { color: 0x000000, width: 5.5 },
		rainbowLetters: {
			palette: [
				0xFF9900, // Vibrant Orange
				0x00D2FF, // Electric Cyan
				0xFF3366, // Hot Candy Pink/Red
				0x22C55E, // Fresh Lime Green
				0xFFCC00, // Bright Sunshine Yellow
				0x9933FF, // Vivid Violet/Purple
				0x00B4D8, // Deep Sky Blue
				0xFF5E00, // Rich Tangerine
			],
			stickers: false,
		},
		animation: {
			scalePop: 1.24,
			dimUpcoming: 0.5,
		},
	},

	// 12. THE QUICK - Neon Rainbow Candy with Lightning Stickers
	capcut_12: {
		id: 'capcut_12',
		name: 'Kẹo Cầu Vồng & Sấm Sét',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Montserrat',
			fontStyle: FontStyle.ITALIC,
			fontWeight: '900',
			fontSize: 54,
			letterSpacing: 2,
			textCase: TextCase.UPPER,
		},
		textColor: 0x00D2FF,
		activeTextColor: 0xFFD000,
		stroke: { color: 0x000000, width: 4.5 },
		glow: { color: '#00D2FF', blur: 20 },
		rainbowLetters: {
			palette: [
				0x2563EB, // Electric Blue
				0x00D2FF, // Vibrant Cyan
				0x10D897, // Mint Turquoise
				0x68CC26, // Lime Green
				0xFFD000, // Golden Sunshine
				0xFF3366, // Hot Coral Pink
				0x9933FF, // Neon Violet
			],
			stickers: true,
		},
		animation: {
			scalePop: 1.25,
			dimUpcoming: 0.5,
		},
	},

	// 13. The Lazy Dog - Script/Cursive font with Pink/Cyan neon
	capcut_13: {
		id: 'capcut_13',
		name: 'Chữ Ký Neon',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Dancing Script',
			fontWeight: '700',
			fontStyle: FontStyle.NORMAL,
			textCase: TextCase.ORIGINAL,
			fontSize: 60,
			letterSpacing: 1,
		},
		textColor: 0xFF2A85,
		activeTextColor: 0x00F0FF,
		stroke: { color: 0xFF2A85, width: 3 },
		glow: { color: '#00F0FF', blur: 24 },
		animation: {
			scalePop: 1.25,
			dimUpcoming: false,
			glowPulse: true,
		},
	},

	// 14. Kẹo Ngọt Dễ Thương - Vibrant pastel sky-blue cloud badge with puffy white border, pure white text, and floating pink sakura blossoms
	capcut_14: {
		id: 'capcut_14',
		name: 'Kẹo Ngọt Dễ Thương',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Nunito',
			fontWeight: '900',
			fontSize: 54,
			letterSpacing: 2,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0xFFFFFF, width: 4 },
		bubbleCloud: {
			cloudColor: 0x4695D8,
			cloudBorderColor: 0xFFFFFF,
			innerBorderColor: 0x3B82F6,
			bubbles: true,
			sparkles: true,
		},
		animation: {
			scalePop: 1.15,
			dimUpcoming: false,
		},
	},

	// 15. Kẹo Cầu Vồng & Confetti - Multi-color candy rainbow letters on active word with festive confetti sprinkles
	capcut_15: {
		id: 'capcut_15',
		name: 'Kẹo Cầu Vồng & Confetti',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Montserrat',
			fontWeight: '900',
			fontStyle: FontStyle.ITALIC,
			fontSize: 56,
			letterSpacing: 2,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFF4B5C,
		stroke: { color: 0x000000, width: 4.5 },
		shadow: { color: 0x000000, x: 2, y: 3, blur: 0 },
		rainbowLetters: {
			palette: [
				0x38BDF8, // Sky Cyan
				0xFF4B5C, // Coral Red
				0xFB7185, // Bubblegum Pink
				0xFACC15, // Sunny Gold
				0x4ADE80, // Mint Lime
				0xA855F7, // Soft Violet
			],
			target: 'activeWord',
			confetti: true,
		},
		animation: {
			scalePop: 1.22,
			dimUpcoming: false,
		},
	},

	// 16. BROWN - Electric Cyan neon on dark letters with lightning crackles
	capcut_16: {
		id: 'capcut_16',
		name: 'Tia Sét Cyan',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Alfa Slab One',
			fontWeight: '400',
			fontStyle: FontStyle.NORMAL,
			fontSize: 60,
			letterSpacing: 1.5,
			textCase: TextCase.UPPER,
		},
		textColor: 0x040810,
		activeTextColor: 0x00F2FF,
		stroke: { color: 0x00F2FF, width: 5.5 },
		glow: { color: '#00F2FF', blur: 30 },
		lightningElectric: {
			color: 0x00F2FF,
			glowColor: '#00F2FF',
			coreColor: '#E0FFFF',
			sparks: true,
		},
		animation: {
			scalePop: 1.25,
			dimUpcoming: false,
			glowPulse: true,
		},
	},

	// 17. THE QUICK - Pastel Rainbow Candy Letters with crisp dark outline & NO shadow
	capcut_17: {
		id: 'capcut_17',
		name: 'Kẹo Pastel Đa Sắc',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Montserrat',
			fontStyle: FontStyle.ITALIC,
			fontWeight: '900',
			fontSize: 64,
			letterSpacing: 2,
			textCase: TextCase.UPPER,
		},
		textColor: 0x34D399,
		activeTextColor: 0xFB7185,
		stroke: { color: 0x18181B, width: 4.5 },
		rainbowLetters: {
			palette: [
				0x34D399, // Mint Turquoise (Letter T, U)
				0xC084FC, // Soft Lavender (Letter H, I)
				0x38BDF8, // Sky Blue (Letter E, C)
				0xFDE047, // Butter Yellow (Letter Q)
				0x4ADE80, // Fresh Lime Green
				0xD8B4FE, // Pastel Lilac Purple
				0x7DD3FC, // Baby Sky Blue
				0xFB7185, // Sweet Candy Pink (Letter K)
			],
			stickers: false,
		},
		animation: {
			scalePop: 1.20,
			dimUpcoming: 0.65,
		},
	},

	// 18. THE QUICK BROWN - Diagonal 3D Pink glitter block
	capcut_18: {
		id: 'capcut_18',
		name: 'Khối 3D Hồng Nghiêng',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xEC4899,
		stroke: { color: 0x000000, width: 4 },
		extrude3D: { color: 0x831843, depth: 8, dirX: 1, dirY: 1 },
	},

	// 19. The Quick Brown Fox - Warm cream serif with amber gold highlight
	capcut_19: {
		id: 'capcut_19',
		name: 'Hổ Phách Trầm Ấm',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Playfair Display',
			textCase: TextCase.ORIGINAL,
		},
		textColor: 0xFEF3C7,
		activeTextColor: 0xD97706,
		shadow: { color: 0x000000, x: 0, y: 3, blur: 6 },
	},

	// 20. THE QUICK BROWN - Colorful carnival rainbow blocks
	capcut_20: {
		id: 'capcut_20',
		name: 'Sắc Màu Lễ Hội',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFDE047,
		activeTextColor: 0x38BDF8,
		stroke: { color: 0x000000, width: 5 },
	},

	// 21. BROWN - Rich gold glitter border on dark text
	capcut_21: {
		id: 'capcut_21',
		name: 'Hoàng Kim Lấp Lánh',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x000000,
		stroke: { color: 0xF59E0B, width: 8 },
		outerStroke: { color: 0x78350F, width: 14 },
		glow: { color: '#FBBF24', blur: 16 },
	},

	// 22. QUICK - Red Spiky Comic Burst explosion
	capcut_22: {
		id: 'capcut_22',
		name: 'Comic Nổ Đỏ Rực',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x000000, width: 6 },
		background: {
			type: 'comic_burst',
			color: 0xDC2626,
			strokeColor: 0x000000,
			strokeWidth: 5,
			paddingX: 24,
			paddingY: 14,
			target: 'activeWord',
		},
	},

	// 23. FOX JUMPS OVER - Icy White with Electric Cyan Bevel
	capcut_23: {
		id: 'capcut_23',
		name: 'Băng Giá Bắc Cực',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0x38BDF8,
		stroke: { color: 0x0F172A, width: 6 },
		shadow: { color: 0x1E293B, x: 4, y: 5, blur: 0 },
	},

	// 24. THE QUICK BROWN - Chalk Grunge White
	capcut_24: {
		id: 'capcut_24',
		name: 'Bụi Phấn Phá Cách',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xF8FAFC,
		stroke: { color: 0x334155, width: 3 },
	},

	// 25. The Quick Brown Fox - Casual yellow handwriting script
	capcut_25: {
		id: 'capcut_25',
		name: 'Viết Tay Tự Nhiên',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			textCase: TextCase.ORIGINAL,
		},
		textColor: 0xF59E0B,
		activeTextColor: 0xB45309,
	},

	// 26. Brown - Yellow Spiky Comic Burst explosion
	capcut_26: {
		id: 'capcut_26',
		name: 'Comic Vàng Nổ Gai',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x000000,
		activeTextColor: 0x000000,
		stroke: { color: 0x000000, width: 3 },
		background: {
			type: 'comic_burst',
			color: 0xFACC15,
			strokeColor: 0x000000,
			strokeWidth: 5,
			paddingX: 24,
			paddingY: 14,
			target: 'activeWord',
		},
	},

	// 27. The quick BROWN - Metallic silver with icy cyan glow
	capcut_27: {
		id: 'capcut_27',
		name: 'Bạc Kim Ánh Băng',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xE2E8F0,
		activeTextColor: 0x67E8F9,
		stroke: { color: 0x1E293B, width: 4 },
		glow: { color: '#06B6D4', blur: 16 },
	},

	// 28. THE QUICK BROWN - Splatter Crimson Distress
	capcut_28: {
		id: 'capcut_28',
		name: 'Vết Loang Máu Đỏ',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xDC2626,
		stroke: { color: 0x000000, width: 6 },
		shadow: { color: 0x450A0A, x: 4, y: 4, blur: 0 },
	},

	// 29. BROWN - Spiky Purple/Cyan Comic Burst
	capcut_29: {
		id: 'capcut_29',
		name: 'Comic Tím Nổi Gai',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x4ADE80,
		stroke: { color: 0x000000, width: 5 },
		background: {
			type: 'comic_burst',
			color: 0xA855F7,
			strokeColor: 0x000000,
			strokeWidth: 5,
			paddingX: 24,
			paddingY: 14,
			target: 'activeWord',
		},
	},

	// 30. JUMPS OVER THE LAZY - Clean white bold with horizontal red split accent
	capcut_30: {
		id: 'capcut_30',
		name: 'Đường Cắt Ngang Đỏ',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xEF4444,
		stroke: { color: 0x000000, width: 4 },
	},

	// 31. FOX JUMPS OVER - Bubblegum Pink with playful accents
	capcut_31: {
		id: 'capcut_31',
		name: 'Hồng Kẹo Bọt Biển',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xF472B6,
		stroke: { color: 0x831843, width: 5 },
		shadow: { color: 0xBE185D, x: 3, y: 4, blur: 0 },
	},

	// 32. THE QUICK BROWN - Glossy Sky Blue reflection
	capcut_32: {
		id: 'capcut_32',
		name: 'Gương Soi Biển Xanh',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x38BDF8,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x0C4A6E, width: 4 },
		shadow: { color: 0x0284C7, x: 0, y: 4, blur: 10 },
	},

	// 33. THE QUICK BROWN - Burning Ember / Fire text
	capcut_33: {
		id: 'capcut_33',
		name: 'Tàn Tro Rực Cháy',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x27272A,
		activeTextColor: 0xF97316,
		stroke: { color: 0x7C2D12, width: 4 },
		glow: { color: '#EA580C', blur: 20 },
	},

	// 34. The Quick Brown - Neon Pink Cursive + Hot Pink Glitter
	capcut_34: {
		id: 'capcut_34',
		name: 'Dạ Quang Nữ Tính',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			textCase: TextCase.ORIGINAL,
		},
		textColor: 0xFB7185,
		activeTextColor: 0xEC4899,
		glow: { color: '#F43F5E', blur: 20 },
	},

	// 35. THE QUICK BROWN - Cartoon with colorful paint splatter
	capcut_35: {
		id: 'capcut_35',
		name: 'Vết Sơn Hoạt Họa',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFACC15,
		stroke: { color: 0x000000, width: 6 },
		outerStroke: { color: 0x06B6D4, width: 12 },
	},

	// 36. THE QUICK BROWN FOX JUMPS - High contrast subtitle (White with amber active word)
	capcut_36: {
		id: 'capcut_36',
		name: 'Phụ Đề Tương Phản Cao',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 50,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xF59E0B,
		stroke: { color: 0x000000, width: 5 },
		shadow: { color: 0x000000, x: 3, y: 4, blur: 0 },
	},

	// 37. THE QUICK BROWN - Gold 3D Bubble letters
	capcut_37: {
		id: 'capcut_37',
		name: 'Bong Bóng Vàng Kim',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFDE047,
		stroke: { color: 0x92400E, width: 5 },
		extrude3D: { color: 0x78350F, depth: 6, dirX: 1, dirY: 1 },
	},

	// 38. The quick - Elegant white cursive with ribbon underline
	capcut_38: {
		id: 'capcut_38',
		name: 'Ruy Băng Mềm Mại',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			textCase: TextCase.ORIGINAL,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFDE68A,
		shadow: { color: 0x000000, x: 0, y: 3, blur: 6 },
	},

	// 39. THE QUICK BROWN - Two-tone neon (Pink & White)
	capcut_39: {
		id: 'capcut_39',
		name: 'Song Sắc Hồng Bạch',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xFF2A85,
		glow: { color: '#FF2A85', blur: 18 },
	},

	// 40. THE QUICK BROWN - Gradient Neon: Magenta to Cyan
	capcut_40: {
		id: 'capcut_40',
		name: 'Chuyển Sắc Tím Lam',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xEC4899,
		activeTextColor: 0x06B6D4,
		glow: { color: '#06B6D4', blur: 20 },
	},

	// 41. THE QUICK BROWN - Heavy Purple Neon Glow
	capcut_41: {
		id: 'capcut_41',
		name: 'Tím Neon Huyền Bí',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		glow: { color: '#C026D3', blur: 24 },
		stroke: { color: 0x4C1D95, width: 3 },
	},

	// 42. FOX - White text inside Vibrant Blue 3D Cube Box
	capcut_42: {
		id: 'capcut_42',
		name: 'Khối Lập Phương Xanh',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 54,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x000000, width: 4 },
		background: {
			type: 'box',
			color: 0x2563EB,
			strokeColor: 0x000000,
			strokeWidth: 4,
			radius: 8,
			paddingX: 18,
			paddingY: 10,
			target: 'activeWord',
		},
		extrude3D: { color: 0x000000, depth: 5, dirX: 1, dirY: 1 },
	},

	// 43. THE QUICK BROWN - Pink Chrome Metallic with sparkles
	capcut_43: {
		id: 'capcut_43',
		name: 'Kim Loại Hồng Chrome',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xF472B6,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x701A75, width: 5 },
		shadow: { color: 0x000000, x: 4, y: 4, blur: 0 },
	},

	// 44. THE QUICK BROWN - Graffiti Fire Orange/Yellow
	capcut_44: {
		id: 'capcut_44',
		name: 'Lửa Phun Bốc Cháy',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xEA580C,
		activeTextColor: 0xFACC15,
		stroke: { color: 0x451A03, width: 5 },
		shadow: { color: 0x000000, x: 4, y: 4, blur: 0 },
	},

	// 45. THE QUICK - Heavy bold white text with golden star accents
	capcut_45: {
		id: 'capcut_45',
		name: 'Ngôi Sao Tinh Tú',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xFEF08A,
		stroke: { color: 0x000000, width: 6 },
		shadow: { color: 0x000000, x: 3, y: 5, blur: 0 },
	},
};
