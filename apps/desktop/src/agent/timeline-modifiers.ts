/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ActionResult } from "./ai-actions";

/**
 * Chuẩn hoá code và khắc phục triệt để lỗi cú pháp video/videoPaint.
 * Nếu có <videoPaint ... > ... </video> hoặc </videoPaint> do lỗi trước đó,
 * chuyển về dạng thẻ tự đóng chuẩn <videoPaint ... />.
 */
function sanitizeVideoCode(code: string): string {
  return code.replace(
    /<videoPaint([^>]*?)>([\s\S]*?)<\/(?:video|videoPaint)>/g,
    (_match, attrs) => `<videoPaint${attrs.trimEnd()} />`
  );
}

/**
 * Chèn các phần tử con (keyframeTrack, effect) vào node video phù hợp:
 * - Nếu là <rect ...><videoPaint ... /></rect>: chèn sau <videoPaint ... /> trước </rect>.
 * - Nếu là <video ... />: chuyển thành <video ...>\n{snippet}\n</video>.
 * - Nếu là <video ...>...</video>: chèn trước </video>.
 */
function injectChildrenIntoVideoNode(
  code: string,
  snippet: string,
  removePattern?: RegExp
): string | null {
  let cleaned = sanitizeVideoCode(code);

  if (removePattern) {
    cleaned = cleaned.replace(removePattern, "");
  }

  // Trường hợp 1: Có <rect ...> chứa <videoPaint ... />
  if (cleaned.includes("<videoPaint") && cleaned.includes("<rect")) {
    const videoPaintMatch = cleaned.match(/<videoPaint[^>]*?\/>/);
    if (videoPaintMatch && videoPaintMatch.index !== undefined) {
      const insertPos = videoPaintMatch.index + videoPaintMatch[0].length;
      return (
        cleaned.slice(0, insertPos) +
        "\n" +
        snippet +
        cleaned.slice(insertPos)
      );
    }
  }

  // Trường hợp 2: Có <video ... /> tự đóng
  const selfClosingVideo = /(<video\b[^>]*?)\/>/;
  if (selfClosingVideo.test(cleaned)) {
    return cleaned.replace(
      selfClosingVideo,
      `$1>\n${snippet}\n          </video>`
    );
  }

  // Trường hợp 3: Có thẻ <video ...> ... </video>
  if (cleaned.includes("</video>")) {
    return cleaned.replace("</video>", `${snippet}\n          </video>`);
  }

  return null;
}

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

  const cleanedCode = sanitizeVideoCode(currentCode);

  // Check for range cut: "0s den 4s", "0 den 4s", "0-4s", "0-4 giay"
  const rangeMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:s|giây|giay)?\s*(?:đến|den|-|to)\s*(\d+(?:\.\d+)?)\s*(?:s|giây|giay)?/i);
  if (rangeMatch) {
    const startSec = Number(rangeMatch[1]);
    const endSec = Number(rangeMatch[2]);

    if (!isNaN(startSec) && !isNaN(endSec) && endSec > startSec) {
      const isRectPaint = cleanedCode.includes("<videoPaint") && cleanedCode.includes("<rect");
      const tagPattern = isRectPaint ? /<rect\b([^>]*?)>/ : /<video\b([^>]*?)>/;

      if (tagPattern.test(cleanedCode)) {
        const updatedCode = cleanedCode.replace(tagPattern, (_match, attrs) => {
          let updatedAttrs = attrs;
          if (updatedAttrs.includes("start={")) {
            updatedAttrs = updatedAttrs.replace(/start=\{[^}]+\}/, `start={${startSec}}`);
          } else {
            updatedAttrs += ` start={${startSec}}`;
          }
          if (updatedAttrs.includes("end={")) {
            updatedAttrs = updatedAttrs.replace(/end=\{[^}]+\}/, `end={${endSec}}`);
          } else {
            updatedAttrs += ` end={${endSec}}`;
          }
          const tagName = isRectPaint ? "rect" : "video";
          return `<${tagName}${updatedAttrs}>`;
        });

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
      const isRectPaint = cleanedCode.includes("<videoPaint") && cleanedCode.includes("<rect");
      const tagPattern = isRectPaint ? /<rect\b([^>]*?)>/ : /<video\b([^>]*?)>/;

      if (tagPattern.test(cleanedCode)) {
        const isFromStart = norm.includes("dau");
        const updatedCode = cleanedCode.replace(tagPattern, (_match, attrs) => {
          let updatedAttrs = attrs;
          if (isFromStart) {
            if (updatedAttrs.includes("start={")) {
              updatedAttrs = updatedAttrs.replace(/start=\{[^}]+\}/, `start={${cutTime}}`);
            } else {
              updatedAttrs += ` start={${cutTime}}`;
            }
          } else {
            if (updatedAttrs.includes("end={")) {
              updatedAttrs = updatedAttrs.replace(/end=\{[^}]+\}/, `end={${cutTime}}`);
            } else {
              updatedAttrs += ` end={${cutTime}}`;
            }
          }
          const tagName = isRectPaint ? "rect" : "video";
          return `<${tagName}${updatedAttrs}>`;
        });

        if (isFromStart) {
          return {
            explanation: `✂️ **Đã cắt bỏ ${cutTime} giây đầu của video!**\n- ⏱️ Video bắt đầu phát từ giây thứ **${cutTime}s** trở đi.`,
            newCode: updatedCode,
          };
        } else {
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
  if (!currentCode.includes("<video") && !currentCode.includes("<videoPaint") && !currentCode.includes("<rect")) {
    return null;
  }

  const keyframeBlock = `          <keyframeTrack property="scale">
            <keyframe time={0} value={1} easing="easeInOut" />
            <keyframe time={3.5} value={1.25} />
          </keyframeTrack>`;

  const updatedCode = injectChildrenIntoVideoNode(
    currentCode,
    keyframeBlock,
    /<keyframeTrack\s+property="scale"[\s\S]*?<\/keyframeTrack>/g
  );

  if (!updatedCode) return null;

  return {
    explanation: `🔍 **Đã thêm hiệu ứng Keyframe Zoom In!**\n- Phóng to mượt mà từ **1.0x lên 1.25x** trong 3.5 giây đầu tiên với gia tốc \`easeInOut\`.\n- Bạn có thể bấm Play để xem thử chuyển động trên Canvas.`,
    newCode: updatedCode,
  };
}

/**
 * Handles fade in / out opacity keyframes.
 */
export function handleFadeEffect(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<video") && !currentCode.includes("<videoPaint") && !currentCode.includes("<rect")) {
    return null;
  }

  const keyframeBlock = `          <keyframeTrack property="opacity">
            <keyframe time={0} value={1} />
            <keyframe time={8.5} value={1} />
            <keyframe time={10.7} value={0} easing="easeIn" />
          </keyframeTrack>`;

  const updatedCode = injectChildrenIntoVideoNode(
    currentCode,
    keyframeBlock,
    /<keyframeTrack\s+property="opacity"[\s\S]*?<\/keyframeTrack>/g
  );

  if (!updatedCode) return null;

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
  if (!currentCode.includes("<video") && !currentCode.includes("<videoPaint") && !currentCode.includes("<rect")) {
    return null;
  }

  const effectsBlock = `          <effect type="contrast" value={0.12} />
          <effect type="saturate" value={0.2} />
          <effect type="brightness" value={0.05} />`;

  const updatedCode = injectChildrenIntoVideoNode(
    currentCode,
    effectsBlock,
    /<effect\s+type="(?:contrast|saturate|brightness)"[^>]*\/>/g
  );

  if (!updatedCode) return null;

  return {
    explanation: `🎨 **Đã áp dụng bộ lọc màu Cinematic Color Grading!**\n- ✨ **Tương phản (Contrast)**: +12% giúp hình ảnh sắc nét hơn.\n- 🌈 **Độ bão hòa (Saturate)**: +20% giúp màu sắc tươi tắn, rực rỡ.\n- ☀️ **Độ sáng (Brightness)**: +5% cân bằng ánh sáng khung hình.`,
    newCode: updatedCode,
  };
}

/**
 * Handles composite effects (Keyframe scale + opacity + intro title).
 */
export function handleCompositeEffects(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<video") && !currentCode.includes("<videoPaint") && !currentCode.includes("<rect")) {
    return null;
  }

  const compositeTracks = `          <keyframeTrack property="scale">
            <keyframe time={0} value={1} easing="easeInOut" />
            <keyframe time={3.5} value={1.18} />
          </keyframeTrack>
          <keyframeTrack property="opacity">
            <keyframe time={0} value={1} />
            <keyframe time={8.5} value={1} />
            <keyframe time={10.7} value={0} easing="easeIn" />
          </keyframeTrack>`;

  let updatedCode = injectChildrenIntoVideoNode(
    currentCode,
    compositeTracks,
    /<keyframeTrack[\s\S]*?<\/keyframeTrack>/g
  );

  if (!updatedCode) return null;

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
          <shadow color="#000000" blur={16} offsetY={4} />
        </text>`;

  if (updatedCode.includes("</scene>") && !updatedCode.includes("Cinematic Moments")) {
    updatedCode = updatedCode.replace("</scene>", `${introTitle}\n      </scene>`);
  }

  return {
    explanation: `🎬 **Đã áp dụng combo hiệu ứng hoàn chỉnh cho video!**\n- 🔍 **Zoom In Cinematic**: Phóng to nhẹ nhàng từ **1.0x → 1.18x** trong 3.5s đầu.\n- 📝 **Intro Title**: Tiêu đề *"✨ Cinematic Moments"* nổi bật với bóng đổ.\n- ✨ **Fade Out**: Mờ dần kết thúc êm ái ở cuối clip.\n\n👉 **Bấm nút Play (Space) hoặc kéo thanh thời gian để xem chuyển động!**`,
    newCode: updatedCode,
  };
}

/**
 * Center camera framing for the scene.
 */
export function handleCenterCamera(currentCode: string): ActionResult | null {
  if (!currentCode.includes("<stage")) return null;

  let updatedCode = currentCode;
  if (currentCode.includes("camera={")) {
    updatedCode = currentCode.replace(/camera=\{[^\}]+\}/, `camera={[0.35, 0, 0, 0.35, 180, 80]}`);
  } else {
    updatedCode = updatedCode.replace("<stage", `<stage camera={[0.35, 0, 0, 0.35, 180, 80]}`);
  }

  return {
    explanation: `🎯 **Đã căn chỉnh lại khung video vào chính giữa màn hình!**\n\n- Khung video đã được căn giữa viewport cân đối với giao diện làm việc.\n- Bạn cũng có thể bấm icon **Canh giữa khung hình** (hoặc phím tắt **⌘1**) trên thanh công cụ phía dưới bất cứ lúc nào!`,
    newCode: updatedCode,
  };
}

/**
 * Handles revert / undo to original state.
 */
export function handleResetOriginal(currentCode?: string, assets?: unknown[]): ActionResult {
  let videoSrc = "Readme.mp4";
  let videoName = "Readme.mp4";
  let videoDuration = 10.73;

  if (currentCode) {
    const srcMatch = currentCode.match(/src="([^"]+\.(?:mp4|mov|webm))"/i);
    if (srcMatch) {
      videoSrc = srcMatch[1];
      videoName = videoSrc;
    }
    const endMatch = currentCode.match(/\bend=\{([0-9.]+)\}/);
    if (endMatch) {
      videoDuration = Number(endMatch[1]);
    }
  }

  if (Array.isArray(assets) && assets.length) {
    const videoAsset = assets.find((a: any) => typeof a?.name === "string" && /\.(mp4|mov|webm)$/i.test(a.name));
    if (videoAsset) {
      videoSrc = (videoAsset as any).name;
      videoName = videoSrc;
    }
  }

  const defaultCode = `import type { Time } from "@diffusionstudio/jsx";

export default function Project() {
  return (
    <stage background="#161616" camera={[0.35, 0, 0, 0.35, 180, 80]} id="stage-root">
      <scene name="Main" width={720} height={1280} fill="#000000" active id="main-scene">
        <sequence name="A-roll" id="a-roll-seq">
          <video
            name="${videoName}"
            src="${videoSrc}"
            start={0}
            end={${videoDuration}}
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
    explanation: `🔄 **Đã hoàn tác video về trạng thái nguyên bản gốc (${videoDuration}s) và căn giữa khung hình.**`,
    newCode: defaultCode,
  };
}

