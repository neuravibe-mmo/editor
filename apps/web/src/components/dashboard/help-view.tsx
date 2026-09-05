/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { For, Show, createMemo, createSignal } from "solid-js";
import { Icon } from "@/components/ui/icon";

type FeatureItem = {
  id: string;
  category: string;
  title: string;
  badge?: string;
  description: string;
  howToUse: string;
  shortcut?: string;
  icon: string;
};

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "editing", label: "Biên tập & Dòng thời gian" },
  { id: "audio_caption", label: "Âm thanh & Phụ đề" },
  { id: "visual_effects", label: "Chữ & Đồ họa" },
  { id: "motion", label: "Chuyển động (Keyframe)" },
  { id: "ai_agent", label: "AI & Tự động hoá" },
  { id: "export_preview", label: "Xem trước & Xuất file" },
];

const FEATURES: FeatureItem[] = [
  // Biên tập & Dòng thời gian
  {
    id: "split-clip",
    category: "editing",
    title: "Cắt & Chia nhỏ clip (Split)",
    badge: "Cơ bản",
    description: "Chia clip thành 2 đoạn riêng biệt tại vị trí con trỏ phát để dễ dàng xóa bỏ đoạn thừa hoặc chèn hiệu ứng.",
    howToUse: "Kéo con trỏ thời gian (Playhead) đến vị trí muốn cắt, sau đó nhấn phím C hoặc biểu tượng Split trên thanh công cụ timeline.",
    shortcut: "C",
    icon: "controls-split",
  },
  {
    id: "trim-clip",
    category: "editing",
    title: "Cắt tỉa độ dài (Trim)",
    badge: "Cơ bản",
    description: "Thu gọn hoặc kéo dài thời lượng xuất hiện của một đoạn video, âm thanh hoặc hình ảnh.",
    howToUse: "Di chuyển chuột vào mép đầu hoặc đuôi của clip trên dòng thời gian, giữ chuột trái và kéo sang trái/phải để điều chỉnh.",
    shortcut: "Kéo mép clip",
    icon: "duration",
  },
  {
    id: "layers-tracks",
    category: "editing",
    title: "Sắp xếp lớp & Track (Layers)",
    badge: "Bố cục",
    description: "Quản lý thứ tự hiển thị các đối tượng. Lớp ở track phía trên sẽ hiển thị đè lên lớp ở track phía dưới.",
    howToUse: "Nhấp giữ và kéo thả clip giữa các hàng track để hoán đổi vị trí hoặc đưa lên lớp trên/dưới.",
    icon: "sequence",
  },
  {
    id: "transitions",
    category: "editing",
    title: "Hiệu ứng chuyển cảnh (Transitions)",
    badge: "Hiệu ứng",
    description: "Tạo chuyển đổi mượt mà giữa hai clip liên tiếp (như mờ dần, hòa tan, trượt cảnh).",
    howToUse: "Đặt 2 clip nằm liền kề nhau trên cùng một track, chọn điểm tiếp giáp và chọn kiểu hiệu ứng ở bảng thuộc tính bên phải.",
    icon: "video-transition",
  },

  // Âm thanh & Phụ đề
  {
    id: "auto-captions",
    category: "audio_caption",
    title: "Tạo phụ đề tự động (Auto Captions)",
    badge: "Nổi bật",
    description: "Tự động nhận diện lời nói từ video/âm thanh và hiển thị phụ đề chạy khớp theo từng từ.",
    howToUse: "Chọn clip có âm thanh, chọn tính năng Captions để tự động sinh phụ đề. Bạn có thể tùy biến font chữ, màu sắc và kiểu chạy chữ.",
    shortcut: "Captions",
    icon: "captions",
  },
  {
    id: "audio-controls",
    category: "audio_caption",
    title: "Âm lượng & Kiểm âm (Volume & Mixer)",
    badge: "Âm thanh",
    description: "Điều chỉnh độ to nhỏ (dB), tắt tiếng hoàn toàn (Mute) hoặc nghe riêng biệt (Solo) một track cụ thể.",
    howToUse: "Chọn clip âm thanh, kéo thanh trượt dB tại bảng thuộc tính bên phải hoặc nhấn nút biểu tượng Loa / Tai nghe ở đầu mỗi track.",
    shortcut: "Mute / Solo",
    icon: "audio",
  },

  // Chữ & Đồ họa
  {
    id: "text-overlay",
    category: "visual_effects",
    title: "Chèn chữ & Tiêu đề (Text)",
    badge: "Cơ bản",
    description: "Thêm tiêu đề, nhãn dán chữ hoặc chú thích với đầy đủ font chữ, kích thước, căn lề và độ dày nét.",
    howToUse: "Bấm phím T hoặc chọn công cụ Text trên thanh công cụ, nhấp chuột vào khung video (Canvas) và gõ nội dung.",
    shortcut: "T",
    icon: "text",
  },
  {
    id: "shapes-drawing",
    category: "visual_effects",
    title: "Hình khối & Khung nền (Shapes)",
    badge: "Đồ họa",
    description: "Vẽ hình chữ nhật, hình tròn để tạo nền cho chữ, khung viền trang trí hoặc tạo điểm nhấn thị giác.",
    howToUse: "Bấm phím R (Hình chữ nhật) hoặc O (Hình tròn), sau đó kéo chuột trên Canvas để vẽ kích thước mong muốn.",
    shortcut: "R / O",
    icon: "shapes",
  },
  {
    id: "color-style",
    category: "visual_effects",
    title: "Màu sắc, Viền & Đổ bóng (Style)",
    badge: "Tùy biến",
    description: "Tô màu đơn sắc, dải màu chuyển sắc (gradient), bo góc tròn, thêm viền nổi bật hoặc bóng đổ mềm mại.",
    howToUse: "Chọn đối tượng trên Canvas, tìm đến các mục Fills, Strokes, Shadows ở bảng bên phải để chỉnh màu và thông số.",
    icon: "fill.gradient",
  },

  // Chuyển động (Keyframe)
  {
    id: "keyframes",
    category: "motion",
    title: "Hoạt ảnh & Chuyển động (Keyframes)",
    badge: "Nâng cao",
    description: "Tạo chuyển động mượt mà cho vị trí, phóng to thu nhỏ (Scale), xoay góc hoặc làm mờ dần theo thời gian.",
    howToUse: "Nhấp vào biểu tượng hình thoi (Keyframe) bên cạnh thuộc tính cần chuyển động, di chuyển Playhead đến mốc thời gian khác rồi đổi giá trị.",
    shortcut: "Biểu tượng hình thoi",
    icon: "motion",
  },

  // AI & Tự động hoá
  {
    id: "ai-generation",
    category: "ai_agent",
    title: "Tạo nội dung với AI (AI Generator)",
    badge: "Thông minh",
    description: "Tạo hình ảnh minh họa, đoạn video ngắn hoặc giọng đọc tự động chỉ bằng một câu mô tả ngắn bằng lời.",
    howToUse: "Bấm nút \"Generate with AI\" trên thanh công cụ, gõ câu lệnh mô tả ý tưởng của bạn và nhấn Tạo để đưa trực tiếp vào dự án.",
    icon: "ai-generate",
  },
  {
    id: "agent-automation",
    category: "ai_agent",
    title: "Điều khiển bằng AI Agent & CLI",
    badge: "Chuyên sâu",
    description: "Tự động hóa hoàn toàn quy trình cắt ghép, chọn cảnh, tóm tắt video thông qua câu lệnh mã nguồn với công cụ dapi CLI.",
    howToUse: "Sử dụng lệnh dapi trong terminal hoặc ra lệnh cho AI trợ lý (như Claude Code / Gemini) qua các kỹ năng /editor và /watch.",
    icon: "command-slash",
  },

  // Xem trước & Xuất file
  {
    id: "playback-controls",
    category: "export_preview",
    title: "Phát & Xem trước (Preview & Playback)",
    badge: "Cơ bản",
    description: "Xem trước sản phẩm với tốc độ khung hình chuẩn, bật lặp lại (Loop) để kiểm tra các phân đoạn ngắn.",
    howToUse: "Nhấn phím Cách (Space) để phát hoặc dừng; kéo Playhead để duyệt từng khung hình chính xác.",
    shortcut: "Space",
    icon: "controls-play",
  },
  {
    id: "export-video",
    category: "export_preview",
    title: "Xuất video (Export)",
    badge: "Đầu ra",
    description: "Đóng gói toàn bộ dự án thành file video hoàn chỉnh (định dạng MP4 sắc nét) để chia sẻ lên mạng xã hội hoặc lưu trữ.",
    howToUse: "Nhấn nút \"Export\" ở góc trên bên phải màn hình chỉnh sửa, chọn độ phân giải (1080p, 4K) và bấm Render để xuất file.",
    icon: "film-video-export",
  },
];

const SHORTCUTS = [
  { key: "Space", desc: "Phát hoặc Tạm dừng video (Play / Pause)" },
  { key: "C", desc: "Cắt chia nhỏ clip tại con trỏ phát (Split)" },
  { key: "T", desc: "Chọn công cụ thêm chữ (Text tool)" },
  { key: "R", desc: "Chọn công cụ vẽ hình chữ nhật (Rectangle)" },
  { key: "O", desc: "Chọn công cụ vẽ hình tròn (Ellipse)" },
  { key: "V", desc: "Chuyển về con trỏ chọn đối tượng (Select tool)" },
  { key: "Delete / Backspace", desc: "Xóa clip hoặc đối tượng đang chọn" },
  { key: "Cmd/Ctrl + Z", desc: "Hoàn tác thao tác trước đó (Undo)" },
  { key: "Cmd/Ctrl + Shift + Z", desc: "Làm lại thao tác vừa hoàn tác (Redo)" },
  { key: "Cmd/Ctrl + D", desc: "Quay về màn hình bảng điều khiển (Dashboard)" },
];

export function DashboardHelpView() {
  const [search, setSearch] = createSignal("");
  const [selectedCategory, setSelectedCategory] = createSignal("all");

  const filteredFeatures = createMemo(() => {
    const q = search().trim().toLowerCase();
    const cat = selectedCategory();

    return FEATURES.filter((item) => {
      const matchCat = cat === "all" || item.category === cat;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.howToUse.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  });

  return (
    <div class="min-h-0 flex-1 overflow-y-auto px-8 py-8 w-full">
      <div class="flex w-full flex-col gap-6">
        {/* Header Giới thiệu */}
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon name="help" class="size-6 text-primary" />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-foreground">Hướng dẫn sử dụng & Tính năng</h1>
            <p class="text-xs text-muted-foreground">
              Khám phá toàn bộ chức năng của trình biên tập và các mẹo thao tác nhanh dễ hiểu.
            </p>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & Lọc danh mục */}
      <div class="flex flex-col gap-3">
        <div class="relative">
          <Icon
            name="search"
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Tìm kiếm tính năng, thao tác (ví dụ: cắt, âm thanh, chữ, xuất video...)"
            class="h-10 w-full rounded-xl border border-border bg-accent/40 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Show when={search()}>
            <button
              onClick={() => setSearch("")}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="close-remove-small" class="size-4" />
            </button>
          </Show>
        </div>

        {/* Danh mục nút chọn nhanh */}
        <div class="flex flex-wrap gap-1.5">
          <For each={CATEGORIES}>
            {(cat) => {
              const active = () => selectedCategory() === cat.id;
              return (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  class="h-7 rounded-lg px-2.5 text-xs font-medium transition-colors"
                  classList={{
                    "bg-primary text-primary-foreground shadow-xs": active(),
                    "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground":
                      !active(),
                  }}
                >
                  {cat.label}
                </button>
              );
            }}
          </For>
        </div>
      </div>

      {/* Danh sách các tính năng */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Danh sách tính năng ({filteredFeatures().length})
          </h2>
        </div>

        <Show
          when={filteredFeatures().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <Icon name="search" class="mb-2 size-8 text-muted-foreground/60" />
              <p class="text-sm font-medium text-foreground">Không tìm thấy tính năng nào</p>
              <p class="text-xs text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.</p>
            </div>
          }
        >
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <For each={filteredFeatures()}>
              {(item) => (
                <div class="flex flex-col justify-between rounded-xl border border-border/70 bg-accent/30 p-4 transition-all hover:border-border hover:bg-accent/60">
                  <div class="flex flex-col gap-2.5">
                    {/* Tiêu đề & Icon */}
                    <div class="flex items-start gap-3">
                      <div class="grid size-8 shrink-0 place-items-center rounded-lg bg-background/80 border border-border/50 text-foreground">
                        <Icon name={item.icon} class="size-4.5" />
                      </div>
                      <div class="flex min-w-0 flex-1 flex-col">
                        <div class="flex items-center gap-2">
                          <h3 class="truncate text-xs font-semibold text-foreground">
                            {item.title}
                          </h3>
                          <Show when={item.badge}>
                            <span class="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {item.badge}
                            </span>
                          </Show>
                        </div>
                        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Hướng dẫn cách dùng */}
                    <div class="rounded-lg bg-background/40 p-2.5 border border-border/40 text-[11px] leading-relaxed">
                      <span class="font-medium text-foreground/90">Cách dùng: </span>
                      <span class="text-muted-foreground">{item.howToUse}</span>
                    </div>
                  </div>

                  {/* Phím tắt nếu có */}
                  <Show when={item.shortcut}>
                    <div class="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      <span>Phím tắt nhanh:</span>
                      <kbd class="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
                        {item.shortcut}
                      </kbd>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Bảng phím tắt thông dụng */}
      <div class="flex flex-col gap-3 pt-4">
        <div class="flex items-center gap-2 px-1">
          <Icon name="keyboard-shortcut" class="size-4 text-primary" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-foreground">
            Bảng phím tắt thông dụng
          </h2>
        </div>

        <div class="overflow-hidden rounded-xl border border-border/70 bg-accent/30">
          <div class="grid grid-cols-1 divide-y divide-border/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {/* Cột 1 */}
            <div class="divide-y divide-border/40">
              <For each={SHORTCUTS.slice(0, 5)}>
                {(s) => (
                  <div class="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span class="text-muted-foreground">{s.desc}</span>
                    <kbd class="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-2xs">
                      {s.key}
                    </kbd>
                  </div>
                )}
              </For>
            </div>

            {/* Cột 2 */}
            <div class="divide-y divide-border/40">
              <For each={SHORTCUTS.slice(5)}>
                {(s) => (
                  <div class="flex items-center justify-between px-3.5 py-2.5 text-xs">
                    <span class="text-muted-foreground">{s.desc}</span>
                    <kbd class="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-2xs">
                      {s.key}
                    </kbd>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
