# DESIGN — HUST DRL Tracker

Tài liệu thiết kế giao diện. **Nghiệp vụ vẫn theo `docs/SPEC.md`**; file này chỉ quy định cách trình bày. Chỗ nào thiết kế đề xuất lệch khỏi SPEC thì ghi ở mục 5 để duyệt, chưa được tự ý làm.

Ảnh chụp hiện trạng (dữ liệu `data/samples/2026.1.json`, 1440px và 390px) được dùng làm căn cứ cho phần audit. Số liệu đo trên ảnh:

| Màn hình | Chiều cao trang 1440px | Chiều cao trang 390px | Số control tương tác trong `<main>` |
|---|---|---|---|
| Trạng thái ĐRL | 4 718 px | 9 767 px | 70 |
| Hoạt động | 1 983 px | 3 347 px | 151 |
| Gợi ý | 1 340 px | 2 890 px | 1 (dữ liệu mẫu không có thay đổi nào) |

Thanh trên cùng (sticky) cao 82 px ở desktop, **154 px ở điện thoại** (18% chiều cao màn hình 844 px).

---

## 1. Audit

Mức độ:
- **P0 — nghiêm trọng**: làm người dùng hiểu sai hoặc không biết nhìn vào đâu.
- **P1 — lớn**: tốn công đọc/thao tác rõ rệt.
- **P2 — nhỏ**: nhiễu thị giác, thiếu nhất quán.

### 1.0 Toàn app

| # | Mức | Vấn đề |
|---|---|---|
| G1 | P0 | **Ba kịch bản có 3–4 tên khác nhau.** Kịch bản 1: "Hiện tại" (thẻ), "Đã xác nhận" (chú thích), "✓" (tiêu đề bảng). Kịch bản 2: "Nếu đã tham gia được tính", "Đã tham gia", "Đã tham gia, chờ xác nhận", "◐". Kịch bản 3: "Nếu làm hết kế hoạch", "Kế hoạch", "Dự định", "○". Người dùng phải tự suy ra đây là cùng một thứ. |
| G2 | P1 | **Màu trạng thái bị dùng cho nghĩa khác.** Xanh lá dùng cho "còn N điểm" (màn Gợi ý), vàng hổ phách cho "phí N điểm" (gần như trùng màu vàng của *planned*), xanh da trời cho thông báo `info` (gần xanh dương của *joined*). Màu mất nghĩa. |
| G3 | P1 | **Thanh trên cùng: 6 nút cùng một trọng lượng** (↶ ↷ Tải xuống, Tải lên, Tạo dữ liệu mới, ?). "Tạo dữ liệu mới" là thao tác hiếm, lại to ngang "Tải xuống". Ở 390px thanh xuống 3 dòng, chiếm 154 px cố định. |
| G4 | P1 | Nút ↶ ↷ khi bị vô hiệu trông như ô trống; không có chữ, khó hiểu là gì. |
| G5 | P1 | Hỗ trợ dark mode làm mọi class phải viết đôi (`dark:`), mà giao diện tối hiện tại không được kiểm tra kỹ. Tăng chi phí bảo trì, không tăng giá trị. |
| G6 | P2 | Quá nhiều "pill" có viền màu (chip trạng thái, chip Đầy, chip phí, chip còn N điểm, chip lọc). Mọi thứ đều "nổi" nên không gì nổi. |
| G7 | P2 | Mã tiêu chí dùng font mono cỡ to bằng chữ thường, màu xám nhưng đậm hơn tên: mắt đọc mã trước tên. Độ rộng mã khác nhau (`I.1.a` vs `III.1.a`) làm tên tiêu chí không thẳng hàng. |
| G8 | P2 | Icon lẫn lộn hai hệ: ký hiệu chữ (✓ ◐ ○ ✕) và emoji (📅 🔗 📝 📌). |

### 1.1 Màn hình "Trạng thái ĐRL"

| # | Mức | Vấn đề |
|---|---|---|
| S1 | P0 | **Không có điểm nhìn chính.** Ba thẻ 42 / 60 / 63 cùng cỡ chữ, cùng khung, cùng chip xếp loại xám. Mắt không biết số nào là "điểm của mình". |
| S2 | P0 | **Mỗi con số xuất hiện 2–3 lần.** Điểm mục lớn có trong bảng "Theo mục" *và* trên tiêu đề từng mục ở "Chi tiết" (vd. mục I: `10 16 16 25` ở bảng, `✓10 ◐16 ○16 /25` ở cây). Tổng điểm có trong thẻ và tooltip thanh. |
| S3 | P0 | **Số cộng dồn lặp lại vô nghĩa.** Mục IV hiện `7 7 7`, mục V `10 10 10`, nhóm I.1 `10 10 10`. Bảng có 28 ô số, phần lớn là số trùng. Thông tin thật sự (mục I còn **+6** đang chờ xác nhận) bị chìm. |
| S4 | P0 | **Trang quá dài**: 4,7k px desktop, 9,8k px điện thoại, vì 5 mục × ~14 nhóm × ~55 tiêu chí đều mở sẵn. Người dùng muốn "biết ngay đang ở đâu" phải cuộn qua hàng chục tiêu chí "Trống". |
| S5 | P1 | Bảng "Theo mục": thanh tiến độ nằm dưới tên, số nằm cách đó ~500 px ở cột phải. Mắt phải nhảy ngang để ghép thanh với số. Tên mục III, V xuống 2–3 dòng làm hàng cao không đều. |
| S6 | P1 | Ở 390px, tiêu đề cột chỉ còn icon (✓ ◐ ○), cột "Còn trống" bị ẩn — cùng một bảng nhưng nội dung khác nhau tuỳ cỡ màn hình. |
| S7 | P1 | **Dòng tiêu chí mã hoá trạng thái 3 lần**: viền trái 4 px màu + chip màu có viền + icon. Chip "Đã xác nhận" rộng gấp đôi chip "Trống" nên cột mã/tên lệch nhau từng dòng. Ở 390px chip chiếm ~100 px, tên tiêu chí bị đẩy xuống 3–4 dòng. |
| S8 | P1 | Dòng "Trống" (không có gì để xem) có chip viền giống hệt dòng có điểm → dòng rỗng tranh sự chú ý với dòng có giá trị. |
| S9 | P2 | Hộp lồng hộp: mục (không viền) → nhóm (khung viền + thanh) → tiêu chí (viền trái). Ba tầng khung cho một cây. |
| S10 | P2 | Chip "Đầy" có màu theo kịch bản đạt trần (xanh dương ở II.2) — không ai đoán được màu đó nghĩa là gì nếu không hover. |
| S11 | P2 | Hai checkbox lọc ("Ẩn nhóm đã đầy", "Chỉ hiện tiêu chí còn trống") nằm cạnh tiêu đề "Chi tiết", xa phần chúng tác động, và gần như trùng ý nhau. |

### 1.2 Màn hình "Hoạt động"

| # | Mức | Vấn đề |
|---|---|---|
| A1 | P0 | **Form thêm chiếm trọn màn hình đầu** (~780 px desktop, >1 500 px điện thoại). Danh sách hoạt động — thứ người dùng xem và sửa thường xuyên nhất — bị đẩy xuống dưới màn hình. |
| A2 | P0 | **151 control trên một trang.** Mỗi dòng có 5 control (ô chọn trạng thái, ô nhập tên trông như chữ thường, ô chọn tiêu chí, nút Sửa, nút ✕). Không biết chỗ nào bấm được, chỗ nào chỉ để đọc. |
| A3 | P0 | **Chữ bị cắt trong ô chọn tiêu chí**: `II.2.b · đang chọn · Tham gia các cu…`, `IV.1.c · đang chọn · Tham gia các hc…`. Cụm "đang chọn" lặp ở **mọi dòng** và chiếm chỗ của tên tiêu chí. Ở 390px cũng bị cắt. Không có cách nào đọc trọn tên mà không mở ô chọn. |
| A4 | P1 | Thông tin lặp: tiêu chí đang chọn có trong ô chọn *và* được in đậm trong dòng "Có thể dùng". Trạng thái có trong ô chọn màu *và* viền trái màu. |
| A5 | P1 | Bấm "Sửa" mở rộng tại chỗ một bảng chọn tiêu chí cao ~500 px; danh sách nhảy, mất vị trí đang xem. |
| A6 | P1 | Chip lọc hiện cả trạng thái có 0 hoạt động ("Không được 0"). Chip đang chọn khi thì đen ("Tất cả"), khi thì màu trạng thái — hai kiểu "đang chọn". |
| A7 | P1 | Form đánh số "1. 2. 3. 4. 5." như wizard nhưng mọi bước hiện cùng lúc. Bước 3 bị vô hiệu với chữ placeholder dài; nút chính "Thêm hoạt động" xám mờ — cả form trông như bị khoá. |
| A8 | P2 | Ở 1440px có ~400 px trống giữa tên hoạt động và ô chọn tiêu chí; còn ô chọn thì hẹp đến mức cắt chữ (A3). |
| A9 | P2 | Nút ✕ xoá ngay cạnh "Sửa", không xác nhận (có undo nhưng không có thông báo "đã xoá — hoàn tác"). Trên điện thoại dễ bấm nhầm. |

### 1.3 Màn hình "Gợi ý"

| # | Mức | Vấn đề |
|---|---|---|
| R1 | P0 | **Khi không có thay đổi, hiện 3 thẻ lớn `42 → 42`, `60 → 60`, `63 → 63`**: 6 số to không mang thông tin, lặp lại điểm ở màn Trạng thái. Thông điệp thật ("đã tối ưu") nằm trong một dòng nhỏ phía dưới. |
| R2 | P0 | **"Còn N điểm" của các nhóm không cộng được nhưng trông như cộng được.** V.1 "còn 10", V.2 "còn 10", nhưng mục V chỉ còn 10 điểm chung. Người dùng dễ tưởng còn 20 điểm ở mục V. |
| R3 | P1 | Đoạn giải thích thuật toán 2–3 dòng đứng trước kết quả (ở 390px là 6 dòng). Đây là thông tin tham khảo, không phải nội dung chính. |
| R4 | P1 | Lưới 2 cột "Nhóm còn trống": thẻ cao thấp không đều, tên tiêu chí dài xuống 2–3 dòng; 8 nhóm × 3 tiêu chí = 24 dòng chữ dài. |
| R5 | P1 | `+5 I.1.b` trong khi tiêu chí I.1.b là +6 (bị trần nhóm cắt). Không có giải thích, trông như lỗi. |
| R6 | P2 | Pill "còn N điểm" màu xanh lá — màu của *confirmed* (xem G2). |
| R7 | P2 | Nút chính đổi nhãn "Tính gợi ý" / "Tính lại" và nằm sát tiêu đề, không thẳng hàng với nút "Áp dụng tất cả". |

---

## 2. Định hướng

**Một công cụ làm việc yên tĩnh**, như Linear/Notion: nền trắng, chữ đen xám, rất ít khung viền, màu chỉ xuất hiện khi mang nghĩa trạng thái.

Nguyên tắc (xếp theo ưu tiên khi mâu thuẫn):

1. **Mỗi con số chỉ xuất hiện một lần trên một màn hình.** Nếu cần nhắc lại thì dùng chênh lệch (`+18`) hoặc hình (thanh), không in lại số.
2. **Mỗi màn hình có đúng một điểm nhìn chính**, to nhất và đậm nhất. Mọi thứ khác nhỏ hơn ít nhất 2 bậc cỡ chữ.
3. **Màu = trạng thái, không gì khác.** 4 màu trạng thái chỉ dùng cho planned / joined / confirmed / rejected-excluded. Cảnh báo, gợi ý, "còn N điểm"… dùng màu chữ trung tính + icon.
4. **Mỗi trạng thái mã hoá đúng một lần trên mỗi dòng, bằng icon màu, không có chữ**: icon ✓ ◐ ○ ✕ (màu `*-fg`) ở cột cố định 16 px. Không viền trái, không chip, không nhãn "Đã xác nhận"/"Đã tham gia"/"Không đạt" trên dòng. Icon khác hình nhau nên không chỉ dựa vào màu (SPEC 7.2); mỗi icon có `aria-label` và `title` là tên trạng thái. Tên trạng thái bằng chữ chỉ xuất hiện ở nơi làm chú giải hoặc nơi chọn: tab lọc, menu đổi trạng thái, ô chọn trạng thái trong panel, dòng chú giải dưới thanh tổng.
5. **Đọc trước, sửa sau.** Danh sách hiển thị dạng chữ; bấm vào dòng mới mở chỗ sửa. Control chỉ xuất hiện khi cần.
6. **Không cắt chữ quan trọng.** Tên hoạt động, tên tiêu chí được xuống dòng (tối đa 2 dòng ở bảng); chỉ được cắt chữ phụ, và luôn có `title`.
7. **Ẩn chi tiết mặc định, mở khi cần.** Màn hình đầu tiên phải trả lời được "mình đang ở đâu" mà không cuộn.
8. **Một tên cho mỗi khái niệm** — xem bảng thuật ngữ dưới.

### 2.1 Thuật ngữ thống nhất

| Khái niệm | Tên dùng trong UI | Icon | Ghi chú |
|---|---|---|---|
| status `planned` | Dự định | ○ | |
| status `joined` | Đã tham gia | ◐ | |
| status `confirmed` | Đã xác nhận | ✓ | |
| status `rejected` | Không được | ✕ | |
| tiêu chí trong `excludedCriteria` | Không đạt | ✕ | dùng màu đỏ như rejected |
| tiêu chí chưa ai chọn | (không nhãn) | · | màu chữ phụ |
| kịch bản `{confirmed}` | **Điểm hiện tại** | ✓ | |
| phần thêm khi joined được tính | **chờ xác nhận** | ◐ | luôn viết dạng `+N chờ xác nhận` |
| phần thêm khi planned được tính | **dự định** | ○ | luôn viết dạng `+N dự định` |
| kịch bản `{confirmed, joined}` | Nếu được xác nhận hết | | chỉ dùng trong tooltip / màn Gợi ý |
| kịch bản `{confirmed, joined, planned}` | Nếu làm hết dự định | | chỉ dùng trong tooltip / màn Gợi ý |

Như vậy kịch bản 2 và 3 được trình bày như **phần cộng thêm** vào điểm hiện tại, khớp với thanh xếp chồng (đoạn xanh dương dài đúng `+N chờ xác nhận`). Xem câu hỏi Q1.

### 2.2 Bỏ dark mode

- `src/index.css`: `color-scheme: light` (bỏ `dark`).
- Xoá mọi class `dark:*`.
- Không có nút đổi theme.

---

## 3. Design tokens

Đặt trong `src/index.css` bằng `@theme` của Tailwind v4, để dùng như class (`bg-surface`, `text-fg-muted`, `bg-confirmed-soft`…). Component **chỉ** dùng token, không dùng thẳng `slate-*`, `green-*`.

### 3.1 Màu trung tính

| Token | Giá trị | Dùng cho |
|---|---|---|
| `canvas` | `#FFFFFF` | nền trang |
| `surface` | `#F7F7F8` | nền hover dòng, khối mở rộng, ô nhập đang focus |
| `surface-selected` | `#F0F0F2` | dòng/tab đang chọn |
| `border` | `#EBEBEE` | đường chia dòng, viền khung |
| `border-strong` | `#D4D4D8` | viền ô nhập, nút phụ |
| `track` | `#EDEDF0` | nền thanh tiến độ (phần còn trống) |
| `fg` | `#18181B` | chữ chính, số chính |
| `fg-muted` | `#52525B` | chữ phụ (tên hoạt động trong cây, mô tả) — tương phản 7.7:1 |
| `fg-subtle` | `#71717A` | mã tiêu chí, nhãn cột, `/max` — tương phản 4.8:1 (đạt AA) |
| `fg-disabled` | `#A1A1AA` | control vô hiệu |
| `accent` | `#18181B` | nút chính (nền đen chữ trắng) |
| `focus` | `#18181B` | vòng focus 2 px, cách 2 px |

Không có màu thương hiệu riêng: nút chính màu đen, để 4 màu trạng thái là màu duy nhất trên trang.

### 3.2 Màu trạng thái

Mỗi màu có 3 giá trị: **chữ** (đậm, đủ tương phản AA trên cả `canvas` lẫn nền nhạt), **thanh** (đậm, dùng cho thanh tiến độ và icon cỡ lớn), **nền** (nhạt, dùng cho nền dòng được chọn / ô segmented đang chọn). Vàng cần tách chữ và thanh vì vàng đủ sáng để đọc được thì quá nhạt cho thanh.

| Trạng thái | Token | Chữ `*-fg` | Thanh `*-bar` | Nền `*-soft` |
|---|---|---|---|---|
| Dự định (planned) | `planned` | `#854D0E` | `#EAB308` | `#FEF9C3` |
| Đã tham gia (joined) | `joined` | `#1D4ED8` | `#3B82F6` | `#EFF6FF` |
| Đã xác nhận (confirmed) | `confirmed` | `#15803D` | `#16A34A` | `#F0FDF4` |
| Không được / Không đạt | `rejected` | `#B91C1C` | `#DC2626` | `#FEF2F2` |

Quy tắc:
- Icon trạng thái (✓ ◐ ○ ✕) dùng màu `*-fg`.
- Đoạn "dự định" trên thanh xếp chồng có sọc chéo `*-bar` / `#FDE68A` (giữ như hiện tại) để phân biệt khi không thấy màu.
- Mục penalty (rubric 2025.1): thanh dùng `rejected-bar`, không dùng 3 sắc đỏ.
- **Không** dùng `*-soft` làm nền cho chip có viền. Nền nhạt chỉ dùng cho vùng được chọn.
- Cảnh báo validate: icon `⚠` màu `planned-fg`, chữ `fg-muted`. Thông tin: icon `ⓘ` màu `fg-subtle`. Không có hộp nền màu.

### 3.3 Chữ

Font: `Inter` (Google Fonts, có đủ dấu tiếng Việt), dự phòng `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Mọi con số dùng `font-variant-numeric: tabular-nums`. Mã tiêu chí **không** dùng mono; dùng font thường, cỡ `xs`, màu `fg-subtle`, trong cột có độ rộng cố định.

| Token | Cỡ / dòng | Weight | Dùng cho |
|---|---|---|---|
| `text-display` | 48 / 52 | 600 | **chỉ** điểm hiện tại ở màn Trạng thái |
| `text-title` | 20 / 28 | 600 | tiêu đề màn hình |
| `text-heading` | 15 / 22 | 600 | tiêu đề khu vực ("Theo mục", "Nên tìm thêm ở đâu") |
| `text-body` | 14 / 20 | 400 / 500 | nội dung chính, dòng bảng, tên mục |
| `text-small` | 13 / 18 | 400 | chữ phụ, mô tả, tên hoạt động dưới tiêu chí |
| `text-xs` | 12 / 16 | 500 | mã tiêu chí, nhãn cột (viết hoa nhỏ, `letter-spacing: .02em`) |

Chỉ 3 weight: 400, 500, 600. Không dùng 700.

### 3.4 Khoảng cách

Bậc 4 px: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

| Chỗ | Giá trị |
|---|---|
| Lề trang ngang | 32 px desktop, 16 px điện thoại |
| Độ rộng nội dung tối đa | 960 px (Trạng thái, Gợi ý), 1 120 px (Hoạt động — bảng nhiều cột) |
| Giữa các khu vực lớn | 48 px |
| Tiêu đề khu vực → nội dung | 12 px |
| Chiều cao dòng bảng | 40 px desktop, 48 px điện thoại (vùng chạm ≥ 44 px) |
| Thụt lề mỗi tầng cây | 24 px |
| Padding ô nhập / nút | 6 × 10 px (cao 32 px) |
| Thanh trên cùng | 48 px desktop; 48 + 40 px điện thoại |

### 3.5 Bo góc, viền, bóng

| Token | Giá trị | Dùng cho |
|---|---|---|
| `radius-sm` | 4 px | thanh tiến độ, ô segmented con |
| `radius-md` | 6 px | nút, ô nhập, menu |
| `radius-lg` | 10 px | khung bảng, panel, dialog |
| `radius-full` | 9999 px | chấm "chưa tải xuống" |
| viền | 1 px `border` | |
| `shadow-pop` | `0 4px 16px rgb(0 0 0 / .08), 0 0 0 1px rgb(0 0 0 / .04)` | **chỉ** menu, popover, panel, dialog |

Thanh tiến độ: cao 6 px trong bảng, 8 px ở thẻ tổng.

---

## 4. Wireframe

Ký hiệu: `█` đã xác nhận · `▓` chờ xác nhận · `▒` dự định (sọc) · `░` còn trống · `[ ]` nút · `▾ ▸` mở/đóng · `⋯` menu. Số liệu lấy từ dữ liệu mẫu 2026.1.

### 4.0 Thanh trên cùng

Desktop (1 dòng, 48 px):
```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ĐRL HUST   Học kỳ 2026.1 ▾   ● Chưa tải xuống    Trạng thái  Hoạt động  Gợi ý    ↶ ↷  [Tải xuống] ⋯ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
- "Học kỳ 2026.1 ▾" mở menu: danh sách học kỳ có bản nháp · "Tạo học kỳ mới…" · dòng phụ "Rubric 2026.1". Rubric chỉ hiện trên thanh khi có cảnh báo (rubric trong file không tồn tại).
- `● Chưa tải xuống` chỉ hiện khi dirty; khi đó "Tải xuống" là nút chính (đen), còn lại là nút phụ.
- `⋯`: Tải lên file JSON… · Phím tắt (?).
- ↶ ↷ là icon button 32 × 32, có tooltip "Hoàn tác (Ctrl+Z)"; khi vô hiệu chỉ mờ icon, không vẽ khung.
- Tab: chữ `text-body` 500; tab đang chọn chữ `fg` + gạch dưới 2 px; tab khác `fg-subtle`.

Điện thoại (2 dòng, 88 px):
```
┌──────────────────────────────────────┐
│ 2026.1 ▾  ●              ↶  ⤓  ⋯    │  ⤓ = Tải xuống (icon, chấm đen khi dirty)
│ Trạng thái   Hoạt động   Gợi ý       │
└──────────────────────────────────────┘
```

### 4.1 Trạng thái ĐRL

**Điểm nhìn chính: số 42.** Nhìn thứ hai: thanh tổng có vạch xếp loại. Thứ ba: bảng mục.

Desktop 1440 (nội dung 960 px, giữa):
```
  Điểm hiện tại
  42 /100   Yếu                                         Còn 8 điểm nữa lên Trung bình
  ████████████████████████████████▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  0                          35 Yếu      50 TB         65 Khá       80 Tốt      90 XS  100
  ◐ +18 chờ xác nhận → 60 Trung bình       ○ +3 dự định → 63 Trung bình


  Theo mục                                                       ( Tất cả | Còn trống )
  ───────────────────────────────────────────────────────────────────────────────────
  ▸ I    Chấp hành pháp luật và nội quy, quy chế    ██████▓▓▓▓░░░░░     10   ◐ +6       /25
         của nhà trường
  ▾ II   Trách nhiệm, tinh thần và thái độ trong    ███▓▓▓▓▓▓▓▓▓░░░      6   ◐ +12      /20
         học tập
         II.1  Tham gia các hoạt động học tập       ██████░░░░░░░░       6              /15
           ✓  II.1.a  Có kế hoạch học tập và rèn luyện được thầy cô ghi nhận          +3
                      Kế hoạch học tập
           ·  II.1.b  Tham gia hoạt động, sự kiện NCKH, học thuật, chuyên môn          +3
                      1 hoạt động khác có thể dùng
           ·  II.1.c  Tham gia các buổi tư vấn xây dựng kế hoạch …                     +3
           ✓  II.1.f  Chủ động xây dựng, cập nhật Portfolio cá nhân                    +3
                      Portfolio
         II.2  Tham gia các kỳ thi, cuộc thi         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓   Đầy   ◐ +12     /12
           ✕  II.2.a  Công bố khoa học tại hội nghị …                                 +̶6̶
           ◐  II.2.b  Tham gia các cuộc thi Olympic …                                  +6
                      Tham gia AI Thực chiến 2026
           ◐  II.2.c  Thành viên CLB học thuật, Lab nghiên cứu …                       +6
                      Thành viên GDG-HUST · 1 hoạt động khác có thể dùng
         II.3  Vượt khó, phấn đấu trong học tập     ░░░░░░░░░░░░░░       0              /8
  ▸ III  Hoạt động chính trị - xã hội, văn hoá, …   █████▒▒░░░░░░░░      9   ○ +3       /20
  ▸ IV   Ý thức công dân trong cộng đồng            ███████░░░░░░░       7              /15
  ▸ V    Công tác cán bộ, đoàn thể, thành tích …    ███████░░░░░░░░     10              /20
```

Quy tắc:
- **Thẻ tổng** chỉ có 1 số to (42). 60 và 63 xuất hiện đúng một lần, ở dòng nhỏ dưới thanh, kèm chênh lệch. Không còn 3 thẻ.
- Vạch xếp loại trên thanh (35/50/65/80/90) thay cho dòng "còn N điểm" lặp 3 lần; chỉ giữ một câu "Còn 8 điểm nữa lên Trung bình" cho điểm hiện tại.
- **"Theo mục" và "Chi tiết" gộp làm một cây.** Bỏ bảng riêng. Mỗi mục/nhóm có đúng một bộ số: `điểm hiện tại` (đậm) · `◐ +N` (nếu ≠ 0) · `○ +N` (nếu ≠ 0) · `/max` (`fg-subtle`). Số 0 không in.
- Mặc định **tất cả mục đều đóng** → 5 dòng, vừa một màn hình cùng thẻ tổng. Trạng thái mở/đóng nhớ trong localStorage (tiện ích, không phải dữ liệu).
- Thanh nằm cùng dòng với số, cột cố định, để mắt so được các mục theo chiều dọc.
- Tên mục/nhóm xuống tối đa 2 dòng, không cắt.
- Dòng tiêu chí: cột icon 16 px · cột mã 56 px · tên · điểm. Icon là tín hiệu trạng thái duy nhất (cộng `aria-label`). Dòng có hoạt động: dòng phụ `text-small fg-muted` là tên hoạt động. Dòng trống: icon `·` và chữ `fg-muted` (nhạt hơn dòng có điểm).
- Tiêu chí "Không đạt": icon ✕ đỏ, tên `fg-muted`, điểm gạch ngang `fg-subtle`. Không thêm chữ "Không đạt" (tooltip của icon có).
- "Đầy": chữ `text-xs fg-muted` thay cho cột điểm; tooltip nói đầy ở kịch bản nào. "phí N điểm": `text-xs fg-muted` với ⚠, chỉ khi > 0.
- Bộ lọc: **một** segmented control `Tất cả | Còn trống` (thay 2 checkbox). "Còn trống" ẩn nhóm đầy và tiêu chí đã có hoạt động.
- Bấm dòng tiêu chí → mở khối `surface` ngay bên dưới (thụt 24 px): danh sách hoạt động có thể dùng (icon trạng thái + tên + "đang dùng cho III.2.e") và một nút phụ "Đánh dấu không đạt" / "Bỏ đánh dấu".

Điện thoại 390:
```
┌──────────────────────────────────────┐
│ Điểm hiện tại                        │
│ 42 /100  Yếu                         │
│ Còn 8 điểm nữa lên Trung bình        │
│ ████████████▓▓▓▓▓▒░░░░░░░░░░░░░░░░   │
│        35   50   65   80  90         │
│ ◐ +18 chờ xác nhận → 60 TB           │
│ ○ +3 dự định → 63 TB                 │
│                                      │
│ Theo mục        ( Tất cả | Còn trống )│
│ ──────────────────────────────────── │
│ ▸ I  Chấp hành pháp luật và     10   │
│      nội quy, quy chế …     ◐+6 /25  │
│      ██████▓▓▓▓░░░░░░░░░░░░░░        │
│ ▾ II Trách nhiệm, tinh thần và   6   │
│      thái độ trong học tập ◐+12 /20  │
│      ███▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░        │
│   II.1 Hoạt động học tập     6 /15   │
│   ✓ II.1.a Có kế hoạch học     +3    │
│            tập và rèn luyện …        │
│            Kế hoạch học tập          │
│   · II.1.b Tham gia hoạt động  +3    │
│            NCKH, học thuật …         │
│ ▸ III …                              │
└──────────────────────────────────────┘
```
- Ở điện thoại thanh xuống dòng riêng dưới tên; số giữ cùng dòng tên.
- Không còn chip: icon 16 px + mã + tên, nên tên tiêu chí có ~280 px thay vì ~180 px.

### 4.2 Hoạt động

**Điểm nhìn chính: danh sách.** Form thêm/sửa chuyển vào panel bên phải (desktop) hoặc trang phủ toàn màn hình (điện thoại).

Desktop 1440 (nội dung 1 120 px):
```
  Hoạt động                                                          [+ Thêm hoạt động]

  Tất cả 15   ○ Dự định 1   ◐ Đã tham gia 3   ✓ Đã xác nhận 11             🔍 Tìm hoạt động
  ─────────────────────────────────────────────────────────────────────────────────────
     HOẠT ĐỘNG ↕                      TÍNH CHO TIÊU CHÍ                              NGÀY
  ─────────────────────────────────────────────────────────────────────────────────────
  ○  2 cuộc thi Nghị quyết Đảng       III.1.a  Tham gia sự kiện chính trị – xã hội
                                               (Hội nghị, cuộc họp …)
  ◐  Tham gia AI Thực chiến 2026      II.2.b   Tham gia các cuộc thi Olympic cấp
                                               đại học, quốc gia, quốc tế
  ◐  Thành viên GDG-HUST              II.2.c   Thành viên CLB học thuật, Lab …
  ◐  Họp lớp                          I.2.a    Tham gia họp lớp thường kỳ
  ✓  Sử dụng PTCC                     IV.1.c   Tham gia các hoạt động phổ biến …
  ✓  HUST Club Day                    III.2.e  Tham gia các hoạt động phổ biến, tìm hiểu
                                               bản sắc văn hoá …
  …
  ─────────────────────────────────────────────────────────────────────────────────────
```
- Mỗi dòng **0 control hiển thị sẵn**. Hover dòng: nền `surface`, hiện `⋯` ở cuối dòng (Sửa · Ghim · Xoá).
- Cột trạng thái chỉ có icon (vùng bấm 32 × 32), không có chữ và không có tiêu đề cột. Tab lọc phía trên ("○ Dự định 1 · ◐ Đã tham gia 3 …") đồng thời là chú giải icon.
- Bấm icon trạng thái → menu nhỏ 4 trạng thái có icon + chữ (đổi nhanh, SPEC 7.3). Bấm phần còn lại của dòng → mở panel sửa.
- Cột "Tính cho tiêu chí": mã `text-xs fg-subtle` + tên tiêu chí `fg-muted`, xuống tối đa 2 dòng, không cắt. Bỏ hẳn "đang chọn" và bỏ dòng "Có thể dùng" (xem trong panel).
- Thiếu tiêu chí: cột hiện `—  Chưa chọn tiêu chí` màu `fg-subtle`.
- Hoạt động được ghim: icon ghim nhỏ `fg-subtle` sau tên (không emoji).
- Lỗi validate: icon `⚠` cuối tên; dòng thông báo `text-small fg-muted` ngay dưới dòng đó. Thông báo chung (không gắn hoạt động) nằm trên bảng, mỗi thông báo một dòng.
- Tab lọc ẩn trạng thái có 0 hoạt động; tab đang chọn: chữ `fg` + nền `surface-selected` (một kiểu duy nhất).
- Sắp xếp: bấm tiêu đề cột (Trạng thái / Hoạt động / Ngày); mặc định thứ tự nhập. Bỏ ô select "Sắp xếp".
- Xoá: thực hiện ngay, hiện toast dưới góc "Đã xoá "Họp lớp" · Hoàn tác" trong 6 s.

Panel thêm/sửa (desktop: panel phải rộng 480 px, phủ lên danh sách, có `shadow-pop`):
```
                                       ┌─ Thêm hoạt động ──────────────────── ✕ ┐
                                       │                                        │
                                       │ Tên hoạt động                          │
                                       │ [Ví dụ: Hiến máu nhân đạo tháng 11   ] │
                                       │                                        │
                                       │ Tiêu chí có thể dùng                   │
                                       │ Mọi tiêu chí nhà trường có thể tính.   │
                                       │ [🔍 Tìm theo tên hoặc mã             ] │
                                       │ III.2.e ✕   III.3.a ✕   IV.1.c ✕       │
                                       │ ┌────────────────────────────────────┐ │
                                       │ │ I  Chấp hành pháp luật …            │ │
                                       │ │ ☐ I.1.a Hiểu biết và chấp hành…  +6 │ │
                                       │ │ ☐ I.1.b Sinh hoạt công dân …     +6 │ │
                                       │ └────────────────────────────────────┘ │
                                       │                                        │
                                       │ Tính cho tiêu chí                      │
                                       │ ( ) IV.1.c  Phổ biến chủ trương… +4    │
                                       │ (•) III.3.a Bảo vệ cảnh quan, …  +4    │
                                       │ ( ) III.2.e Phổ biến bản sắc …   +0    │
                                       │     đã có hoạt động khác chọn          │
                                       │ ( ) Chưa chọn                          │
                                       │                                        │
                                       │ Trạng thái                             │
                                       │ ( ○ Dự định | ◐ Đã tham gia |          │
                                       │   ✓ Đã xác nhận | ✕ Không được )       │
                                       │                                        │
                                       │ ▸ Ngày, link, ghi chú                  │
                                       │ ☐ Ghim tiêu chí (Gợi ý không đổi)      │  ← chỉ khi sửa
                                       ├────────────────────────────────────────┤
                                       │ Xoá                     [Huỷ] [Lưu]    │  ← "Xoá" chỉ khi sửa
                                       └────────────────────────────────────────┘
```
- Bỏ số thứ tự "1. 2. 3."; thứ tự từ trên xuống đã là thứ tự nhập.
- **"Tính cho tiêu chí" là danh sách radio, không phải `<select>`** → không bao giờ cắt tên. Gain `+N` căn phải, `confirmed-fg` khi > 0, `fg-subtle` khi 0, kèm lý do ngắn khi 0. Khi chưa có tiêu chí có thể dùng: một dòng `fg-subtle` "Chọn tiêu chí có thể dùng ở trên trước." (không có control vô hiệu).
- Nút "Lưu" luôn bấm được; nếu thiếu tên thì focus vào ô tên và hiện lỗi dưới ô.
- Dùng cùng một panel cho thêm và sửa. Lưu = một bước undo. Esc/✕ = huỷ.

Điện thoại 390:
```
┌──────────────────────────────────────┐
│ Hoạt động                 [+ Thêm]   │
│ Tất cả 15 · ○ 1 · ◐ 3 · ✓ 11  →      │  cuộn ngang được
│ ──────────────────────────────────── │
│ ○ 2 cuộc thi Nghị quyết Đảng         │
│   III.1.a Tham gia sự kiện chính trị │
│           – xã hội …                 │
│ ──────────────────────────────────── │
│ ◐ Tham gia AI Thực chiến 2026        │
│   II.2.b Tham gia các cuộc thi       │
│          Olympic cấp đại học …       │
│ ──────────────────────────────────── │
│ ✓ Sử dụng PTCC                    ⋯  │
│   IV.1.c Tham gia các hoạt động …    │
└──────────────────────────────────────┘
```
- Dòng = icon trạng thái + tên (500) · dòng phụ mã + tên tiêu chí. Chạm dòng → trang sửa toàn màn hình (cùng nội dung panel, nút Lưu dính đáy).
- Trên điện thoại tab lọc chỉ hiện icon + số cho các trạng thái (có `aria-label` đầy đủ).

### 4.3 Gợi ý

**Điểm nhìn chính: câu kết luận** — hoặc "Áp dụng N thay đổi để được +X điểm", hoặc "Cách gán hiện tại đã tối ưu".

Desktop — có thay đổi (ví dụ minh hoạ, số giả định):
```
  Gợi ý gán tiêu chí                                                    [Tính lại]
  Đổi tiêu chí cho hoạt động chưa xác nhận để điểm cao nhất.  ⓘ Cách tính

  Áp dụng 2 thay đổi: +3 nếu làm hết dự định (63 → 66)              [Áp dụng tất cả]
  ───────────────────────────────────────────────────────────────────────────────────
  ○ 2 cuộc thi Nghị quyết Đảng   III.1.a → IV.1.b                   +3    [Áp dụng]
                                 Tham gia tuyên truyền chủ trương …
  ◐ Tham gia AI Thực chiến 2026  II.2.b → II.1.b                    +0    [Áp dụng]
                                 Tham gia hoạt động NCKH …          cần đi cùng dòng khác
  ───────────────────────────────────────────────────────────────────────────────────
  Áp dụng xong vẫn hoàn tác được (Ctrl+Z).
```
- Bỏ 3 thẻ trước → sau. Chỉ một dòng kết luận, chỉ nhắc kịch bản **có đổi**; kịch bản không đổi không in.
- Mã cũ gạch ngang `fg-subtle`, mã mới `fg` 500; tên tiêu chí mới ở dòng phụ, không cắt.
- `ⓘ Cách tính` mở popover chứa đoạn giải thích thuật toán (hiện là đoạn văn 3 dòng).
- Cảnh báo "dùng cách tính gần đúng" (greedy): một dòng `⚠ text-small fg-muted` dưới câu kết luận.

Desktop — không có thay đổi (trường hợp của dữ liệu mẫu):
```
  Gợi ý gán tiêu chí                                                    [Tính lại]
  Đổi tiêu chí cho hoạt động chưa xác nhận để điểm cao nhất.  ⓘ Cách tính

  ✓ Cách gán hiện tại đã tốt nhất. Không cần đổi gì.
```

Phần "Nên tìm thêm hoạt động ở đâu" (thay "Nhóm còn trống"), cùng màn hình, bên dưới:
```
  Nên tìm thêm hoạt động ở đâu
  Điểm còn lấy được nếu làm hết dự định. Các nhóm trong cùng một mục dùng chung phần
  còn lại của mục, nên không cộng dồn.
  ───────────────────────────────────────────────────────────────────────────────────
  V   Cán bộ, đoàn thể, thành tích                              còn tối đa 10 cho cả mục
      V.1  Công tác cán bộ Lớp, Đoàn - Hội, CLB                 10
           V.1.c +3 · V.1.b +4 · V.1.a +6
      V.2  Hỗ trợ hoạt động chung của Đại học/Khoa/Lớp           10
           V.2.c +3 · V.2.b +4 · V.2.a +6
  I   Chấp hành pháp luật và nội quy                            còn tối đa 9 cho cả mục
      I.2  Chấp hành nội quy, quy chế của trường                 9
           I.2.b +6 · I.2.c +6
      I.1  Chấp hành pháp luật                                   5
           I.1.b +5 (tiêu chí +6, nhóm chỉ còn 5)
  III …
  ───────────────────────────────────────────────────────────────────────────────────
  [Xem thêm 3 nhóm]
```
- **Gom theo mục** và in "còn tối đa N cho cả mục" ở dòng mục → hết hiểu nhầm cộng dồn (R2). Số "còn tối đa" của mục = `max` mục − điểm "Nếu làm hết dự định" của mục (đã tính trần tổng), cần thêm vào kết quả của `openGroups` trong domain.
- Tiêu chí gợi ý chỉ hiện `mã +điểm`; hover/chạm mã hiện tên đầy đủ (tooltip / popover). Mỗi nhóm còn 1 dòng thay vì 3–6 dòng.
- Khi điểm bị trần cắt (`+5` cho tiêu chí `+6`) ghi rõ lý do trong ngoặc.
- Số "còn N" màu `fg`, không pill, không màu xanh lá.

Điện thoại 390:
```
┌──────────────────────────────────────┐
│ Gợi ý gán tiêu chí       [Tính lại]  │
│ ⓘ Cách tính                          │
│                                      │
│ ✓ Cách gán hiện tại đã tốt nhất.     │
│                                      │
│ Nên tìm thêm hoạt động ở đâu         │
│ Các nhóm cùng mục dùng chung phần    │
│ còn lại của mục.                     │
│ ──────────────────────────────────── │
│ V  Cán bộ, đoàn thể…   tối đa 10     │
│    V.1 Cán bộ Lớp, Đoàn…        10   │
│        V.1.c +3 · V.1.b +4 · V.1.a+6 │
│    V.2 Hỗ trợ hoạt động chung   10   │
│        V.2.c +3 · V.2.b +4 · V.2.a+6 │
│ I  Chấp hành pháp luật…  tối đa 9    │
│    …                                 │
└──────────────────────────────────────┘
```
Khi có thay đổi, mỗi dòng diff trên điện thoại xếp dọc: tên hoạt động → `mã cũ → mã mới` → hàng dưới cùng `+N` bên trái, [Áp dụng] bên phải.

### 4.4 Các phần phụ

Hộp thoại (Tải lên, Tạo học kỳ mới, Phím tắt) và màn Chào mừng dùng cùng token: `radius-lg`, `shadow-pop`, tiêu đề `text-title`, nút chính đen ở góc phải dưới. Bảng xem trước khi tải lên cũng theo quy tắc "một điểm nhìn": hiện `Điểm hiện tại 42 (đang có 38)` to, hai kịch bản còn lại ở dòng nhỏ.

---

## 5. Quyết định đã duyệt

Các điểm sau lệch khỏi chữ của SPEC hoặc là lựa chọn có đánh đổi. **Tất cả Q1–Q6 đã được duyệt (2026-10-21)**, kèm một quyết định bổ sung:

- **Q7 — trạng thái trên dòng chỉ bằng icon màu, không có chữ** (xem nguyên tắc 4). Áp dụng cho cây tiêu chí, danh sách hoạt động, bảng diff ở màn Gợi ý. Lý do: các nhãn "Đã xác nhận", "Đã tham gia" lặp ở mọi dòng, rối và tốn chỗ.

| # | Đề xuất | Lệch SPEC? | Đánh đổi |
|---|---|---|---|
| Q1 | Hiển thị kịch bản 2 và 3 dạng **phần cộng thêm** (`10 ◐+6 /25`) thay vì ba cột cộng dồn (`10 16 16 /25`). | SPEC 7.2 ghi "ba cột theo ba kịch bản". Thông tin không mất (60 = 42 + 18), chỉ đổi cách in. | Muốn biết "điểm mục I nếu được xác nhận hết" phải cộng nhẩm 10 + 6 (hoặc hover xem tooltip). |
| Q2 | Gộp "Bảng theo mục lớn" và "Cây chi tiết" làm một cây, mặc định đóng. | SPEC 7.2 liệt kê hai khối riêng. | Ít hơn một khối nhìn tổng quan; bù lại hàng mục lớn chính là bảng tổng quan. |
| Q3 | Bỏ cột "Còn trống" ở màn Trạng thái; thông tin này chuyển hẳn sang "Nên tìm thêm ở đâu" (màn Gợi ý). | Không (SPEC không yêu cầu cột này). | Phần trống vẫn nhìn được bằng đoạn `░` trên thanh. |
| Q4 | Thêm/sửa hoạt động bằng panel có nút **Lưu**, thay cho sửa trực tiếp trên dòng. Đổi trạng thái nhanh vẫn làm trên dòng. | SPEC 7.3 ghi "sửa trực tiếp trên danh sách". | Sửa tên phải mở panel (thêm 1 cú bấm); đổi lại danh sách sạch, không còn 151 control. |
| Q5 | Màn Gợi ý tự tính khi mở (vài trăm ms), nút chỉ còn "Tính lại". | SPEC 7.4 có nút "Tính gợi ý". | Nếu có lúc chậm (greedy) thì người dùng phải chờ ngay khi mở tab. |
| Q6 | Đổi nhãn kịch bản theo bảng 2.1 ("Điểm hiện tại", "+N chờ xác nhận", "+N dự định"). | SPEC dùng "Nếu đã tham gia được tính", "Nếu làm hết kế hoạch". | Tên trong SPEC giữ lại cho tooltip và màn Gợi ý. |
