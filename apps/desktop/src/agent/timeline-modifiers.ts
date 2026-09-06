/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ActionResult } from "./ai-actions";

/**
 * Handles trimming / cutting video duration.
 */
export function handleTrimVideo(
  prompt: string,
  norm: string,
  currentCode: string,
): ActionResult | null {
  const isCutOrDelete =
    norm.includes("cat") ||
    norm.includes("xoa") ||
    norm.includes("loai bo") ||
    norm.includes("giam") ||
    norm.includes("trim") ||
    norm.includes("cut") ||
    norm.includes("delete") ||
    norm.includes("crop");

  if (!isCutOrDelete) return null;

  // Check for range cut: "0s den 4s", "0 den 4s", "0-4s", "0-4 giay"
  const rangeMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:s|giây|giay)?\s*(?:đến|den|-|to)\s*(\d+(?:\.\d+)?)\s*(?:s|giây|giay)?/i);
  if (rangeMatch) {
    const startSec = Number(rangeMatch[1]);
    const endSec = Number(rangeMatch[2]);

    if (!isNaN(startSec) && !isNaN(endSec) && endSec > startSec) {
      if (currentCode.includes("<video") || currentCode.includes("<rect")) {
        let updatedCode = currentCode;

        if (updatedCode.includes("start={")) {
          updatedCode = updatedCode.replace(/(<video[^>]*?)start=\{[^}]+\}/, `$1start={${startSec}}`);
        } else {
          updatedCode = updatedCode.replace(/<video\b/, `<video start={${startSec}}`);
        }

        if (updatedCode.includes("end={")) {
          updatedCode = updatedCode.replace(/(<video[^>]*?)end=\{[^}]+\}/, `$1end={${endSec}}`);
        } else {
          updatedCode = updatedCode.replace(/<video\b/, `<video end={${endSec}}`);
        }

        return {
          explanation: `✂️ **Đã cắt video giữ lại đoạn từ ${startSec}s đến ${endSec}s!**\n- ⏱️ **Thời lượng mới**: ${endSec - startSec} giây (từ giây thứ **${startSec}** đến giây thứ **${endSec}**).\n- ⚡ **Timeline**: Đã tự động điều chỉnh thuộc tính \`start={${startSec}}\` và \`end={${endSec}}\` trên Canvas.`,
          newCode: updatedCode,
        };
      }
    }
  }

  // Check single cut: "cắt từ giây thứ 3 đi", "cắt 3s"
  const cutMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:s|giây|giay)?/);
  if (cutMatch && (norm.includes("cat") || norm.includes("xoa") || norm.includes("trim"))) {
    const cutTime = Number(cutMatch[1]);
    if (!isNaN(cutTime) && cutTime > 0) {
      if (currentCode.includes("<video") || currentCode.includes("<rect")) {
        let updatedCode = currentCode;

        if (norm.includes("dau")) {
          if (updatedCode.includes("start={")) {
            updatedCode = updatedCode.replace(/(<video[^>]*?)start=\{[^}]+\}/, `$1start={${cutTime}}`);
          } else {
            updatedCode = updatedCode.replace(/<video\b/, `<video start={${cutTime}}`);
          }
          return {
            explanation: `✂️ **Đã cắt bỏ ${cutTime} giây đầu của video!**\n- ⏱️ Video bắt đầu phát từ giây thứ **${cutTime}s** trở đi.`,
            newCode: updatedCode,
          };
        } else {
          if (updatedCode.includes("end={")) {
            updatedCode = updatedCode.replace(/(<video[^>]*?)end=\{[^}]+\}/, `$1end={${cutTime}}`);
          } else {
            updatedCode = updatedCode.replace(/<video\b/, `<video end={${cutTime}}`);
          }
          return {
            explanation: `✂️ **Đã cắt video dừng lại ở ${cutTime} giây!**\n- ⏱️ Giữ lại từ **0s đến ${cutTime}s**.`,
            newCode: updatedCode,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Handles keyframe zoom in effects.
 */
export function handleZoomEffect(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<video")) return null;

  let updatedCode = currentCode;
  updatedCode = updatedCode.replace(/<keyframeTrack\s+property="scale"[\s\S]*?<\/keyframeTrack>/g, "");

  const keyframeBlock = `
          <keyframeTrack property="scale">
            <keyframe time={0} value={1} easing="easeInOut" />
            <keyframe time={3} value={1.3} />
          </keyframeTrack>`;

  if (updatedCode.includes("/>")) {
    updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${keyframeBlock}\n          </video>`);
  } else if (updatedCode.includes("</video>")) {
    updatedCode = updatedCode.replace("</video>", `${keyframeBlock}\n          </video>`);
  }

  return {
    explanation: `🔍 **Đã thêm hiệu ứng Keyframe Zoom In!**\n- Phóng to mượt mà từ **1.0x lên 1.3x** trong 3 giây đầu tiên với gia tốc \`easeInOut\`.\n- Bạn có thể bấm Play để xem thử chuyển động trên Canvas.`,
    newCode: updatedCode,
  };
}

/**
 * Handles fade in / out opacity keyframes.
 */
export function handleFadeEffect(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<video")) return null;

  let updatedCode = currentCode;
  updatedCode = updatedCode.replace(/<keyframeTrack\s+property="opacity"[\s\S]*?<\/keyframeTrack>/g, "");

  const keyframeBlock = `
          <keyframeTrack property="opacity">
            <keyframe time={0} value={1} />
            <keyframe time={8.5} value={1} />
            <keyframe time={10.7} value={0} easing="easeIn" />
          </keyframeTrack>`;

  if (updatedCode.includes("/>")) {
    updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${keyframeBlock}\n          </video>`);
  } else if (updatedCode.includes("</video>")) {
    updatedCode = updatedCode.replace("</video>", `${keyframeBlock}\n          </video>`);
  }

  return {
    explanation: `✨ **Đã thêm hiệu ứng Fade Out kết thúc!**\n- Mờ dần êm ái khi clip sắp kết thúc.`,
    newCode: updatedCode,
  };
}

/**
 * Handles text overlay / intro title insertion.
 */
export function handleAddText(prompt: string, currentCode: string): ActionResult | null {
  let titleText = "Nhanh gọn lẹ, dứt khoát ✅";
  const textQuoteMatch = prompt.match(/["'“](.+?)["'”]/);
  if (textQuoteMatch) {
    titleText = textQuoteMatch[1];
  } else {
    const cleaned = prompt
      .replace(/(?:thêm|tạo|ghi|chèn|viết)\s*(?:chữ|tiêu đề|text|title|intro|phụ đề)?/gi, "")
      .replace(/[:\-]/g, "")
      .trim();
    if (cleaned.length > 0 && cleaned.length < 50) {
      titleText = cleaned;
    }
  }

  const textElement = `
        <text
          x={70}
          y={200}
          fontSize={48}
          fontWeight="bold"
          color="#FFFFFF"
          fontFamily="Inter"
          start={0}
          end={4}
        >
          ${titleText}
          <shadow color="#000000" blur={16} offsetY={4} />
        </text>`;

  if (currentCode.includes("</scene>")) {
    const updatedCode = currentCode.replace("</scene>", `${textElement}\n      </scene>`);
    return {
      explanation: `📝 **Đã chèn thêm tiêu đề chữ Intro:** "${titleText}"\n- Xuất hiện từ **0s đến 4s** với hiệu ứng bóng đổ sắc nét.`,
      newCode: updatedCode,
    };
  }

  return null;
}

/**
 * Handles cinematic color grading filter.
 */
export function handleColorGrade(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<video")) return null;

  let updatedCode = currentCode;
  const effectsBlock = `
          <effect type="contrast" value={0.12} />
          <effect type="saturate" value={0.2} />
          <effect type="brightness" value={0.05} />`;

  if (updatedCode.includes("/>")) {
    updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${effectsBlock}\n          </video>`);
  } else if (updatedCode.includes("</video>")) {
    updatedCode = updatedCode.replace("</video>", `${effectsBlock}\n          </video>`);
  }

  return {
    explanation: `🎨 **Đã áp dụng bộ lọc màu Cinematic Color Grading!**\n- ✨ **Tương phản (Contrast)**: +12% giúp hình ảnh sắc nét hơn.\n- 🌈 **Độ bão hòa (Saturate)**: +20% giúp màu sắc tươi tắn, rực rỡ.\n- ☀️ **Độ sáng (Brightness)**: +5% cân bằng ánh sáng khung hình.`,
    newCode: updatedCode,
  };
}

/**
 * Handles composite effects (Keyframe scale + opacity + intro title).
 */
export function handleCompositeEffects(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<video")) return null;

  let updatedCode = currentCode;
  updatedCode = updatedCode.replace(/<keyframeTrack[\s\S]*?<\/keyframeTrack>/g, "");

  const compositeTracks = `
          <keyframeTrack property="scale">
            <keyframe time={0} value={1} easing="easeInOut" />
            <keyframe time={3.5} value={1.18} />
          </keyframeTrack>
          <keyframeTrack property="opacity">
            <keyframe time={0} value={1} />
            <keyframe time={8.5} value={1} />
            <keyframe time={10.7} value={0} easing="easeIn" />
          </keyframeTrack>`;

  const introTitle = `
        <text
          x={50}
          y={200}
          fontSize={44}
          fontWeight="bold"
          color="#FFFFFF"
          fontFamily="Inter"
          start={0}
          end={4}
        >
          ✨ Cinematic Moments
          <shadow color="#000000" blur={12} offsetY={3} />
        </text>`;

  if (updatedCode.includes("/>")) {
    updatedCode = updatedCode.replace(/(<video[^>]*?)\/>/, `$1>${compositeTracks}\n          </video>`);
  } else if (updatedCode.includes("</video>")) {
    updatedCode = updatedCode.replace("</video>", `${compositeTracks}\n          </video>`);
  }

  if (updatedCode.includes("</scene>") && !updatedCode.includes("Cinematic Moments")) {
    updatedCode = updatedCode.replace("</scene>", `${introTitle}\n      </scene>`);
  }

  return {
    explanation: `🎬 **Đã áp dụng combo hiệu ứng hoàn chỉnh cho video!**\n- 🔍 **Zoom In**: Phóng to nhẹ nhàng 1.18x trong 3.5 giây đầu.\n- ✨ **Fade Out**: Mờ dần êm ái khi kết thúc clip.\n- 📝 **Intro Title**: Tiêu đề nghệ thuật *"Cinematic Moments"* mở đầu.`,
    newCode: updatedCode,
  };
}

/**
 * Handles revert / undo to original state.
 */
export function handleResetOriginal(): ActionResult {
  const defaultCode = `import type { Time } from "@diffusionstudio/jsx";

export default function Project() {
  return (
    <stage background="#161616" camera={[0.5, 0, 0, 0.5, 0, 0]} id="stage-root">
      <scene name="Main" width={720} height={1280} fill="#000000" active id="main-scene">
        <sequence name="A-roll" id="a-roll-seq">
          <video
            name="123.mp4"
            src="123.mp4"
            start={0}
            end={10.73}
            width={720}
            height={1280}
            id="video-1"
          />
        </sequence>
      </scene>
    </stage>
  );
}
`;
  return {
    explanation: `🔄 **Đã hoàn tác video về trạng thái nguyên bản gốc (10.73s).**`,
    newCode: defaultCode,
  };
}
