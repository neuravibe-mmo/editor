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

	// 03. [THE] QUICK BROWN FOX (PRO) - Purple rounded tag box on active word
	capcut_03: {
		id: 'capcut_03',
		name: 'Hộp Tím Nổi Bật (PRO)',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 52,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x000000, width: 2 },
		background: {
			type: 'box',
			color: 0x8B5CF6,
			radius: 8,
			paddingX: 14,
			paddingY: 6,
			target: 'activeWord',
		},
		shadow: { color: 0x000000, x: 0, y: 3, blur: 6, opacity: 0.6 },
	},

	// 04. THE QUICK - Bold white text with neon lime yellow drop shadow
	capcut_04: {
		id: 'capcut_04',
		name: 'Comic Lime Pop',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x000000, width: 4 },
		extrude3D: { color: 0xCCFF00, depth: 6, dirX: 1, dirY: 1 },
	},

	// 05. THE - Bubble cloud font with cyan/blue cloud outline and floating bubble particles
	capcut_05: {
		id: 'capcut_05',
		name: 'Bong Bóng Mây Xanh',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 62,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xBAE6FD,
		stroke: { color: 0x0EA5E9, width: 8 },
		outerStroke: { color: 0x0369A1, width: 14 },
		shadow: { color: 0x0284C7, x: 0, y: 4, blur: 8 },
	},

	// 06. THE QUICK BROWN - Serif font, white base text, gold active word
	capcut_06: {
		id: 'capcut_06',
		name: 'Cổ Điển Hoàng Gia',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontFamily: 'Playfair Display',
			fontWeight: '700',
			fontSize: 54,
			textCase: TextCase.UPPER,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xD97706,
		shadow: { color: 0x000000, x: 0, y: 3, blur: 8, opacity: 0.8 },
	},

	// 07. THE - Heavy italic font, white with black outline and straight downward 3D block extrusion
	capcut_07: {
		id: 'capcut_07',
		name: 'Thể Thao Đổ Khối',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			fontWeight: '900',
			fontSize: 60,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFFFFF,
		stroke: { color: 0x000000, width: 5 },
		extrude3D: { color: 0x000000, depth: 6, dirX: 0, dirY: 1 },
		shadow: { color: 0x000000, x: 0, y: 4, blur: 0 },
	},

	// 08. THE - Sleek translucent black rounded pill
	capcut_08: {
		id: 'capcut_08',
		name: 'Hộp Đen Tối Giản',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 50,
		},
		textColor: 0xFFFFFF,
		background: {
			type: 'pill',
			color: 0x000000,
			opacity: 0.65,
			paddingX: 18,
			paddingY: 8,
			target: 'all',
		},
	},

	// 09. THE QUICK BROWN FOX JUMPS OVER - Soft white ambient glow + warm orange highlight
	capcut_09: {
		id: 'capcut_09',
		name: 'Phụ Đề Phát Sáng Cam',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 48,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xF97316,
		glow: { color: '#FFFFFF', blur: 14 },
		shadow: { color: 0xEA580C, x: 0, y: 3, blur: 10, opacity: 0.8 },
	},

	// 10. THE QUICK BROWN - Dual Neon Glow (Pink neon + Cyan neon)
	capcut_10: {
		id: 'capcut_10',
		name: 'Neon Hồng Xanh',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFF2A85,
		activeTextColor: 0x00F0FF,
		stroke: { color: 0x1E1B4B, width: 3 },
		glow: { color: '#00F0FF', blur: 20 },
	},

	// 11. THE QUICK BROWN FOX - Carnival Fire gradient
	capcut_11: {
		id: 'capcut_11',
		name: 'Hỏa Tiễn Rực Lửa',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xEF4444,
		stroke: { color: 0x000000, width: 5 },
		shadow: { color: 0x9A3412, x: 3, y: 3, blur: 0 },
	},

	// 12. THE QUICK - Neon Rainbow Candy with Lightning Stickers
	capcut_12: {
		id: 'capcut_12',
		name: 'Kẹo Cầu Vồng & Sấm Sét',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			fontWeight: '900',
			fontSize: 66,
		},
		textColor: 0xFFFFFF,
		activeTextColor: 0xFFD000,
		rainbowLetters: {
			palette: [0xFFB800, 0x22C55E, 0x06B6D4, 0xEC4899, 0xF97316],
			stickers: true,
		},
	},

	// 13. Fox Jumps Over - Script/Cursive font with Pink/Cyan neon
	capcut_13: {
		id: 'capcut_13',
		name: 'Chữ Ký Neon',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontStyle: FontStyle.ITALIC,
			textCase: TextCase.ORIGINAL,
			fontSize: 54,
		},
		textColor: 0xF43F5E,
		activeTextColor: 0x06B6D4,
		glow: { color: '#06B6D4', blur: 18 },
	},

	// 14. THE - Pink bubble gum with white border and yellow accents
	capcut_14: {
		id: 'capcut_14',
		name: 'Kẹo Ngọt Dễ Thương',
		style: {
			...BASE_MONTSERRAT_STYLE,
			fontSize: 60,
		},
		textColor: 0xF472B6,
		stroke: { color: 0xFFFFFF, width: 8 },
		outerStroke: { color: 0x000000, width: 14 },
		shadow: { color: 0xFBBF24, x: 3, y: 4, blur: 0 },
	},

	// 15. THE QUICK BROWN FOX - White text with dripping fire brush on active word
	capcut_15: {
		id: 'capcut_15',
		name: 'Bụi Bặm Đường Phố',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0xFFFFFF,
		activeTextColor: 0xEA580C,
		stroke: { color: 0x000000, width: 5 },
		shadow: { color: 0x7C2D12, x: 3, y: 3, blur: 0 },
	},

	// 16. BROWN - Electric Cyan neon on dark letters
	capcut_16: {
		id: 'capcut_16',
		name: 'Tia Sét Cyan',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x22D3EE,
		stroke: { color: 0x083344, width: 6 },
		glow: { color: '#06B6D4', blur: 22 },
	},

	// 17. THE QUICK - Mint green & Pastel Coral Pink
	capcut_17: {
		id: 'capcut_17',
		name: 'Bạc Hà San Hô',
		style: BASE_MONTSERRAT_STYLE,
		textColor: 0x34D399,
		activeTextColor: 0xFB7185,
		stroke: { color: 0x1F2937, width: 5 },
		shadow: { color: 0x000000, x: 4, y: 4, blur: 0 },
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
