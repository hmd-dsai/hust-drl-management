# HUST DRL Tracker

Web app một trang giúp sinh viên Đại học Bách khoa Hà Nội quản lý **điểm rèn luyện (ĐRL)**. App thay cho file Google Sheet tự làm trước đây (tab Checklist và tab Plan).

- **Nhập hoạt động một lần.** Mỗi hoạt động gồm tên, các tiêu chí nó có thể được tính, tiêu chí định chọn và trạng thái (dự định / đã tham gia / đã xác nhận / không được).
- **Tự tính điểm** theo bộ tiêu chí của trường, có trần ở mọi tầng: tiêu chí → nhóm → mục lớn → tổng 100. App cho biết điểm ở ba kịch bản:
  - **Hiện tại:** chỉ tính hoạt động đã được hệ thống xác nhận.
  - **Nếu đã tham gia được tính:** cộng thêm các hoạt động đã làm nhưng chưa được xác nhận.
  - **Nếu làm hết kế hoạch:** cộng thêm cả các hoạt động định làm.
- **Nhìn là biết cần tập trung vào đâu.** Thanh tiến độ xếp chồng xanh lá / xanh dương / vàng; nhãn "Đầy" khi nhóm đã chạm trần, "phí N điểm" khi nhóm vượt trần; xếp loại kèm "còn N điểm nữa lên mức trên".
- **Gợi ý cách gán tiêu chí cho điểm cao nhất.** Mỗi hoạt động chỉ được tính cho một tiêu chí. App thử các cách gán và chỉ ra nên đổi hoạt động nào sang tiêu chí nào. App cũng liệt kê các nhóm còn trống nhiều điểm nhất, để bạn biết nên tìm loại hoạt động nào tiếp theo.

Không có máy chủ, không cần đăng nhập. Dữ liệu chỉ nằm trên máy bạn.

## Dùng app

### Ba màn hình

| Màn hình | Dùng để |
|---|---|
| **Trạng thái ĐRL** (mặc định) | Xem tổng điểm ba kịch bản, điểm theo từng mục và nhóm, từng tiêu chí đang được hoạt động nào dùng. Bấm vào một tiêu chí để xem các hoạt động có thể dùng nó, hoặc đánh dấu "không đạt được" (loại trừ), ví dụ khi bạn không có chứng chỉ TOEIC. |
| **Hoạt động** | Thêm hoạt động theo thứ tự: tên → tiêu chí có thể dùng → tiêu chí định chọn (mỗi lựa chọn hiện "+N điểm", mặc định chọn lựa chọn nhiều điểm nhất) → trạng thái. Sửa trực tiếp trên danh sách. Cảnh báo (chọn trùng tiêu chí, quên chọn tiêu chí…) hiện ngay trên dòng tương ứng. |
| **Gợi ý** | Bấm "Tính gợi ý" để xem bảng thay đổi đề xuất. Áp dụng tất cả hoặc từng dòng; áp dụng xong vẫn hoàn tác được. |

Hoạt động **đã xác nhận**, **đã ghim** (📌) hoặc **không được** thì bộ gợi ý không đụng tới.

### Lưu dữ liệu

- **Bản nháp tự động.** Mọi thay đổi được lưu ngay vào trình duyệt (localStorage), mỗi học kỳ một bản. Mở lại app thì tự nạp bản nháp gần nhất.
- **File JSON là bản lưu chính thức.** Bấm **Tải xuống** (hoặc Ctrl/⌘ + S) để lưu file `drl-<học kỳ>-<ngày giờ>.json`. Thanh trên cùng hiện chấm "Chưa tải xuống" khi có thay đổi mới. App cũng nhắc khi bạn đóng tab lúc còn thay đổi chưa tải xuống.
- **Tải lên.** Bấm **Tải lên** hoặc kéo thả file vào cửa sổ. App kiểm tra file. Nếu file hợp lệ, app cho xem trước số hoạt động và điểm, rồi mới thay dữ liệu hiện tại. Nếu file lỗi, app báo rõ vị trí lỗi bằng tiếng Việt (ví dụ `activities[3].status`) và không đụng vào dữ liệu đang có.
- **Chế độ ẩn danh, hoặc trình duyệt chặn lưu trữ.** App vẫn chạy bình thường, nhưng hiện cảnh báo "Dữ liệu sẽ mất khi đóng tab, nhớ tải xuống".

> Xoá dữ liệu trình duyệt là mất bản nháp. Hãy tải xuống file JSON sau mỗi lần cập nhật quan trọng.

### Phím tắt

Bấm `?` trong app để xem bảng phím tắt.

| Phím | Tác dụng |
|---|---|
| Ctrl/⌘ + Z | Hoàn tác (nhớ 50 bước gần nhất) |
| Ctrl + Y, ⌘ + Shift + Z | Làm lại |
| Ctrl/⌘ + S | Tải xuống file JSON |
| Alt + 1 / 2 / 3 | Chuyển màn hình Trạng thái / Hoạt động / Gợi ý |
| Esc | Đóng hộp thoại |

## Chạy trên máy

Cần Node.js 22.12 trở lên (Vitest không chạy trên Node 20).

```bash
npm install
npm run dev        # chạy local tại http://localhost:5173
npm test           # chạy test (Vitest)
npm run typecheck  # kiểm tra kiểu TypeScript
npm run build      # build production vào dist/
npm run preview    # xem thử bản build
```

Muốn thử nhanh: mở app, bấm **Tải lên file JSON**, rồi chọn `data/samples/2026.1.json`. Ba thẻ tổng phải hiện **42 / 60 / 63**.

## Định dạng file JSON

File dữ liệu của bạn tuân theo [`schema/userdata.schema.json`](schema/userdata.schema.json). Mỗi học kỳ một file. File chỉ chứa những gì bạn nhập: điểm, màu và cảnh báo đều được app tính lại mỗi lần mở, không bao giờ được lưu.

```json
{
  "schemaVersion": 1,
  "semester": "2026.1",
  "rubric": "2026.1",
  "excludedCriteria": ["II.3.c"],
  "activities": [
    {
      "id": "tham-gia-ai-thuc-chien-2026",
      "name": "Tham gia AI Thực chiến 2026",
      "status": "joined",
      "eligible": ["II.1.b", "II.2.b", "II.2.c"],
      "chosen": "II.2.b",
      "date": "2026-10-12",
      "link": "https://…",
      "note": "Chờ BTC gửi danh sách"
    }
  ]
}
```

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `schemaVersion` | có | Luôn là `1`. |
| `semester` | có | Học kỳ, dạng `năm.kỳ` (kỳ 1–3), ví dụ `2026.1`. |
| `rubric` | có | Id bộ tiêu chí dùng để tính điểm. Khi tạo mới, app tự điền theo học kỳ (xem mục dưới). |
| `excludedCriteria` | không | Các tiêu chí bạn biết chắc không đạt được. Bộ gợi ý sẽ bỏ qua chúng. Nếu sau đó bạn vẫn chọn một tiêu chí trong danh sách này cho một hoạt động, lựa chọn đó được ưu tiên và tiêu chí được tính điểm bình thường. |
| `activities[].id` | có | Mã hoạt động: chữ thường không dấu, số và `-`. App tự tạo từ tên. |
| `activities[].name` | có | Tên hoạt động. |
| `activities[].status` | có | `planned` (dự định, vàng) · `joined` (đã tham gia, chưa xác nhận, xanh dương) · `confirmed` (đã xác nhận, xanh lá) · `rejected` (không được, đỏ). |
| `activities[].eligible` | có | Danh sách mã tiêu chí mà hoạt động này có thể được tính. |
| `activities[].chosen` | có | Mã tiêu chí định dùng (nên nằm trong `eligible`), hoặc `null` nếu chưa chọn. |
| `activities[].pinned` | không | `true` thì bộ gợi ý không được đổi `chosen`. |
| `activities[].date` | không | Ngày dạng `YYYY-MM-DD`. |
| `activities[].link`, `note` | không | Link và ghi chú tuỳ ý. |

Bạn có thể sửa file bằng tay rồi tải lên lại. Nếu file sai định dạng, app chỉ ra chỗ sai. Nếu file đúng định dạng nhưng có điểm bất thường, app chỉ cảnh báo và vẫn mở được, ví dụ: `chosen` không nằm trong `eligible`, mã tiêu chí không có trong rubric, hai hoạt động chọn trùng một tiêu chí.

### Luật tính điểm, tóm tắt

1. Tiêu chí được tính nếu có ít nhất một hoạt động (thuộc kịch bản đang xét) chọn nó. **Mỗi tiêu chí chỉ tính một lần**, dù nhiều hoạt động cùng chọn.
2. Điểm nhóm bằng tổng điểm các tiêu chí được tính, kẹp ở `max` của nhóm. Với các tiêu chí cùng `exclusiveGroup` (các mức loại trừ nhau), chỉ mức cao nhất được tính.
3. Điểm mục lớn bằng tổng điểm các nhóm (đã kẹp), kẹp ở `max` của mục.
4. Tổng = `max(0, min(Σ mục cộng điểm, totalMax) + Σ mục trừ điểm)`.

Đặc tả đầy đủ nằm ở [`docs/SPEC.md`](docs/SPEC.md).

## Sửa bộ tiêu chí (rubric) khi trường đổi

Bộ tiêu chí là dữ liệu, không nằm trong code. Mỗi phiên bản là một file trong [`data/rubrics/`](data/rubrics/). File phải tuân theo [`schema/rubric.schema.json`](schema/rubric.schema.json).

| File | Áp dụng cho |
|---|---|
| `2025.1.json` | Rubric cũ: các học kỳ trước 2026.1 |
| `2026.1.json` | Rubric mới: từ học kỳ 2026.1 |

**Quy tắc chọn rubric:** một học kỳ dùng rubric có id lớn nhất mà ≤ học kỳ đó. Học kỳ cũ hơn mọi rubric thì dùng rubric cũ nhất. Tên file phải trùng với `id` trong file.

### Cấu trúc một file rubric

```json
{
  "$schema": "../../schema/rubric.schema.json",
  "schemaVersion": 1,
  "id": "2026.1",
  "name": "Tiêu chí đánh giá điểm rèn luyện HUST (áp dụng từ 2026.1)",
  "totalMax": 100,
  "categories": [
    {
      "id": "I",
      "name": "Chấp hành pháp luật và nội quy, quy chế của nhà trường",
      "max": 25,
      "groups": [
        {
          "id": "I.1",
          "name": "Chấp hành các quy định của pháp luật…",
          "max": 15,
          "criteria": [
            { "id": "I.1.a", "name": "Hiểu biết và chấp hành pháp luật…", "points": 6 },
            { "id": "I.1.b", "name": "Tham gia Sinh hoạt công dân…", "points": 6 }
          ]
        }
      ]
    }
  ]
}
```

- **Ba tầng:** mục lớn (`categories`, có `max`) → nhóm (`groups`, có `max`) → tiêu chí (`criteria`, có `points`).
- **Mã phân cấp:**
  - mục là chữ in hoa (`II`);
  - nhóm là `<mục>.<số>` (`II.3`);
  - tiêu chí là `<nhóm>.<chữ thường>` (`II.3.b`).

  Mã không được trùng, và mã con phải nối tiếp đúng mã cha.
- **Mục trừ điểm:** thêm `"kind": "penalty"`. Khi đó `points` là số âm và `max` là trần dưới (ví dụ `-50`). Vi phạm được nhập như một hoạt động có đúng một tiêu chí là tiêu chí trừ điểm. Bộ gợi ý không bao giờ bỏ hay đổi hoạt động này.
- **Các mức loại trừ nhau** (ví dụ các mức GPA, các mức cán bộ lớp): gán cùng một chuỗi `exclusiveGroup` cho các tiêu chí đó trong cùng một nhóm. Khi đó chỉ mức có điểm cao nhất được tính.
- `note` (ở tiêu chí) và `source` (ở rubric) là tuỳ chọn, dùng để ghi nguồn văn bản quy định.

### Các bước khi trường đổi tiêu chí

1. **Chỉ sửa điểm hoặc trần, hoặc thêm/bớt tiêu chí trong một phiên bản đang dùng:** sửa trực tiếp file tương ứng trong `data/rubrics/`.
2. **Trường ra bộ tiêu chí mới từ một học kỳ nào đó** (ví dụ từ 2027.1): tạo file `data/rubrics/2027.1.json` với `"id": "2027.1"`. App tự nạp mọi file trong thư mục này, không cần sửa code. Học kỳ 2027.1 trở đi sẽ tự dùng rubric mới, các học kỳ cũ vẫn dùng rubric cũ.
3. Chạy `npm test`. Test sẽ báo ngay nếu file rubric sai schema, trùng mã hoặc mã con không khớp mã cha. Lỗi được báo bằng tiếng Việt, kèm vị trí.
4. Nếu bạn sửa `2026.1.json` làm thay đổi điểm của dữ liệu mẫu, cập nhật luôn `data/samples/2026.1.expected.json` cho khớp. Test bắt buộc so từng số trong file đó.
5. Chạy `npm run build` (hoặc đẩy lên GitHub để deploy lại). Rubric được đóng gói vào bản build.

> File dữ liệu cũ của bạn ghi sẵn `"rubric": "<id>"`, nên vẫn được tính theo đúng rubric cũ. Hiện app chưa hỗ trợ chuyển dữ liệu tự động sang rubric mới khi mã tiêu chí đổi.

## Cấu trúc mã nguồn

```
schema/          JSON Schema cho rubric và dữ liệu người dùng
data/rubrics/    các bộ tiêu chí
data/samples/    dữ liệu mẫu + kết quả kỳ vọng (dùng trong test)
docs/            SPEC.md (đặc tả nghiệp vụ), PROMPTS.md (kế hoạch triển khai)
src/domain/      logic thuần, có test, không phụ thuộc React
  rubric.ts        nạp, kiểm tra, chọn rubric theo học kỳ
  schema.ts        kiểm tra JSON bằng Ajv, thông báo lỗi tiếng Việt
  scoring.ts       tính điểm 3 kịch bản
  validate.ts      cảnh báo trên dữ liệu
  optimizer.ts     gợi ý cách gán tiêu chí (branch-and-bound), marginalGain, nhóm còn trống
  activities.ts    thêm, sửa, xoá hoạt động
  overview.ts      dữ liệu dẫn xuất cho màn Trạng thái
  grading.ts       ngưỡng xếp loại (sửa ở đây nếu trường đổi)
src/storage.ts   bản nháp localStorage, tải xuống/tải lên JSON
src/state.ts     state của app + undo/redo
src/ui/          các component React
```

Stack: Vite, React 19, TypeScript (strict), Tailwind CSS v4, Ajv, Vitest.
