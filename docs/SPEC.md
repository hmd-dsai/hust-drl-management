# SPEC — HUST DRL Tracker

## 1. Bối cảnh

Điểm rèn luyện (ĐRL) của HUST được chấm theo một bộ tiêu chí (rubric). Sinh viên tham gia hoạt động; mỗi hoạt động có thể khớp với nhiều tiêu chí nhưng **chỉ được dùng cho 1 tiêu chí**. Mỗi tầng (tiêu chí, nhóm, mục lớn, tổng) đều có trần.

Trước đây việc này được quản lý bằng Google Sheet có 2 tab: Checklist, và Plan (ma trận tiêu chí × hoạt động). Cách đó có các vấn đề:
- phải sửa cùng một thông tin ở nhiều chỗ, nên hay quên;
- tiêu chí được chọn cho mỗi hoạt động chỉ nằm trong đầu người dùng;
- không biết tổng điểm hiện tại;
- khi rubric đổi thì sửa rất khổ.

App này thay thế Sheet đó.

## 2. User flow

1. **Nhập.** Người dùng thêm hoặc sửa hoạt động: tên, danh sách tiêu chí có thể dùng, tiêu chí định chọn, trạng thái. Dữ liệu được tự lưu vào bản nháp trong trình duyệt; người dùng bấm **Tải xuống** để có file JSON chính thức.
2. **Xem.** App đọc file JSON đó và hiển thị **bảng trạng thái ĐRL** với đầy đủ thông tin: điểm hiện tại, điểm theo từng mục và nhóm, điểm theo các kịch bản.
3. **Gợi ý (tách riêng).** Một màn hình riêng đề xuất cách gán tiêu chí cho điểm cao nhất. Người dùng chủ động mở khi cần.

File JSON là nguồn sự thật duy nhất. Người dùng có thể sửa file bằng tay, tải lên lại thì app vẫn chạy đúng. Trình duyệt **không** tự đọc/sửa file trên máy: chỉ có nút Tải xuống / Tải lên (xem mục 8).

Dashboard phân tích nâng cao để sau, không làm ở phiên bản 1.

## 3. Mô hình dữ liệu

Xem `schema/rubric.schema.json` và `schema/userdata.schema.json`.

### Rubric
Chỉ có 2 phiên bản:
- `2025.1`: rubric cũ, áp dụng cho các kỳ từ 2025.1 đến 2025.2.
- `2026.1`: rubric mới, áp dụng từ 2026.1.

Quy tắc chọn rubric:
- học kỳ ≥ 2026.1 → `2026.1`;
- mọi học kỳ trước 2026.1 (kể cả trước 2025.1) → `2025.1` (legacy);
- mặc định, khi chưa biết học kỳ: `2026.1`.

Khi mở UserData, dùng trường `rubric` trong file nếu id đó tồn tại; nếu không thì chọn theo quy tắc trên và hiện cảnh báo.

Cấu trúc: `categories[] → groups[] → criteria[]`.
- Category và group có `max`; criterion có `points`.
- Category có `kind`: `bonus` (mặc định) hoặc `penalty` (điểm âm, `max` là trần dưới). Rubric mới hiện không dùng penalty; rubric cũ có. Xem cách nhập penalty ở mục 4.
- Criterion có thể có `exclusiveGroup`: các tiêu chí cùng khoá là các mức loại trừ nhau, chỉ mức có |points| lớn nhất được tính.
  - Rubric cũ: các mức GPA và các mức cán bộ lớp đều là loại trừ.
  - Rubric mới: **không** có `exclusiveGroup`. Mỗi hoạt động được nhà trường cấp cho đúng tiêu chí của nó. Nếu trường cấp hai hoạt động cho hai tiêu chí (ví dụ V.3.g và V.3.h) thì cả hai đều được tính. Đây là vấn đề dữ liệu, hệ thống không cần xử lý gì thêm.
- Mã phân cấp: `II` → `II.3` → `II.3.b`.

### UserData
Mỗi học kỳ một file, gồm:
- `excludedCriteria[]`: các tiêu chí biết chắc không đạt.
- `activities[]`, mỗi hoạt động có `name`, `status`, `eligible[]`, `chosen`, `pinned?`, `date?`, `link?`, `note?`.

Trạng thái hoạt động và màu:

| status | Ý nghĩa | Màu |
|---|---|---|
| planned | định tham gia | vàng |
| joined | đã tham gia, chưa được hệ thống xác nhận | xanh dương |
| confirmed | đã được xác nhận | xanh lá |
| rejected | chắc chắn không được | đỏ |

## 4. Tính điểm (`src/domain/scoring.ts`)

`computeScore(rubric, user, statuses: Set<Status>) → ScoreTree`

1. Lấy tập tiêu chí được kích hoạt: các `chosen` (khác null) của những hoạt động có `status ∈ statuses`. **Mỗi tiêu chí chỉ tính 1 lần**; nhiều hoạt động chọn cùng một tiêu chí cũng không cộng thêm.
2. Điểm nhóm:
   - với tiêu chí không có `exclusiveGroup`: cộng `points` của các tiêu chí được kích hoạt;
   - với mỗi `exclusiveGroup`: chỉ lấy tiêu chí có |points| lớn nhất;
   - kẹp vào trần: `bonus` thì `min(sum, max)`, `penalty` thì `max(sum, max)`.
3. Điểm mục lớn: tổng điểm các nhóm, kẹp theo trần của mục, tương tự bước 2.
4. Tổng: `max(0, min(Σ bonus, totalMax) + Σ penalty)`.

`ScoreTree` phải chứa, cho mọi node: điểm thô (trước khi kẹp trần), điểm sau khi kẹp, max, và `wasted = thô − sau kẹp` (điểm bị trần cắt mất).
- Thô của nhóm: tính sau khi đã gộp `exclusiveGroup`, trước khi kẹp trần nhóm.
- Thô của mục lớn: tổng điểm các nhóm **đã kẹp**, không phải tổng điểm thô của nhóm.
- Thô và `wasted` chỉ là thông tin phụ, UI hiện kín đáo (nhãn "phí N điểm"). Con số chính luôn là điểm sau khi kẹp.

Tiêu chí nằm trong `excludedCriteria` nhưng có hoạt động chọn vẫn được tính điểm bình thường (xem mục 5).

Penalty: vi phạm được nhập như một hoạt động có đúng một tiêu chí eligible là tiêu chí penalty, và `chosen` chính là tiêu chí đó. Hoạt động penalty luôn được tính theo trạng thái như hoạt động thường, và bộ tối ưu không được bỏ hay đổi nó.

Ba kịch bản cần tính và hiển thị:

| Kịch bản | statuses | Ý nghĩa |
|---|---|---|
| **Hiện tại** | `{confirmed}` | điểm đã được hệ thống xác nhận |
| **Nếu đã tham gia được tính** | `{confirmed, joined}` | khi các hoạt động đã làm xong được xác nhận |
| **Nếu làm hết kế hoạch** | `{confirmed, joined, planned}` | khi cả các hoạt động định làm cũng được tính |

Kiểm tra bắt buộc: `data/samples/2026.1.json` cho ra đúng từng giá trị trong `data/samples/2026.1.expected.json`. Ba kịch bản lần lượt là 42 / 60 / 63.

## 5. Kiểm tra hợp lệ (`src/domain/validate.ts`)

Trả về danh sách thông báo có mức `warning` hoặc `info`. Không chặn người dùng.

**warning:**
- `chosen` không nằm trong `eligible`;
- `chosen` hoặc `eligible` trỏ tới id không có trong rubric;
- hoạt động đã joined/confirmed mà chưa có `chosen`.

**`chosen` và `excludedCriteria` mâu thuẫn:** `excludedCriteria` chỉ là phán đoán chủ quan của người dùng, nên lựa chọn thực tế được ưu tiên.
- Khi người dùng chọn trong app một tiêu chí đang bị loại trừ, app tự bỏ tiêu chí đó khỏi `excludedCriteria` trong cùng một thao tác (undo được).
- Với file tải lên hoặc sửa tay đang có mâu thuẫn: coi tiêu chí đó là *không* bị loại trừ khi hiển thị và khi tối ưu. "Loại trừ hiệu lực" = `excludedCriteria` − các `chosen` của hoạt động không bị rejected. Kèm một thông báo `info`.

**info:**
- nhiều hoạt động cùng chọn một tiêu chí, nên các hoạt động sau là thừa. Gợi ý chuyển chúng sang tiêu chí eligible khác còn trống, nếu có.
- hai tiêu chí cùng `exclusiveGroup` đều được chọn.

## 6. Gợi ý tối ưu (`src/domain/optimizer.ts`), màn hình riêng

Mục tiêu: tìm cách gán `chosen` cho điểm cao nhất.

- **Cố định**, không được đổi: hoạt động `confirmed`, hoạt động `pinned`, hoạt động penalty, hoạt động `rejected` (bỏ qua).
- **Tự do**: các hoạt động còn lại. Lựa chọn của mỗi hoạt động là `eligible − excludedCriteria`, hoặc `null`.
- Hàm mục tiêu, so sánh theo thứ tự ưu tiên:
  1. tối đa điểm "Nếu làm hết kế hoạch";
  2. tối đa điểm "Nếu đã tham gia được tính";
  3. ít thay đổi nhất so với cách gán hiện tại.
- Thuật toán: DFS / branch-and-bound. Thường chỉ có ≤ 20 hoạt động tự do, mỗi hoạt động ≤ 5 lựa chọn. Đặt giới hạn số node, quá giới hạn thì dùng greedy và báo cho người dùng.
- Kết quả trả về: cách gán mới, điểm trước/sau, và danh sách thay đổi `{activityId, from, to, gain}`.
- Hàm phụ `marginalGain(rubric, user, activity, criterionId)`: điểm "Nếu làm hết kế hoạch" tăng bao nhiêu nếu gán hoạt động đó vào tiêu chí đó. Form nhập hoạt động dùng hàm này để hiện gợi ý nhỏ, còn tối ưu toàn cục chỉ chạy ở màn hình Gợi ý.
  - Nhận object hoạt động (có thể là bản nháp chưa có trong `user`), không nhận id.
  - Gain = điểm khi gán `criterionId` − điểm khi hoạt động giữ `chosen` hiện tại (null nếu là hoạt động mới). Cả hai lần tính đều thay hoạt động đó vào `user`, các hoạt động khác giữ nguyên.
  - Hoạt động luôn được coi là được tính (như planned), bất kể `status`, vì form chọn tiêu chí trước khi chọn trạng thái.
  - Gain có thể bằng 0 (tiêu chí đã có hoạt động khác chọn, hoặc nhóm/mục đã đầy) hoặc âm (nếu rời tiêu chí hiện tại thì mất điểm).
- Gợi ý thêm (nếu dễ làm): liệt kê các nhóm còn nhiều điểm trống nhất kèm các tiêu chí rẻ nhất trong đó, để người dùng biết nên tìm hoạt động loại nào tiếp theo.

## 7. Giao diện

Ba màn hình chính cùng thanh trên cùng.

### 7.1 Thanh trên cùng
- Học kỳ và rubric đang dùng, chấm báo "có thay đổi chưa tải xuống".
- Các nút: Tải xuống, Tải lên, Tạo dữ liệu mới.

### 7.2 Màn hình "Trạng thái ĐRL" (mặc định)
Thay thế tab Checklist cũ. Mục tiêu: nhìn là biết ngay đang ở đâu và cần tập trung vào đâu.

- **Thẻ tổng.** Ba con số theo ba kịch bản ở mục 4, mỗi con số kèm xếp loại tương ứng. Ngưỡng xếp loại để trong hằng số cấu hình, mặc định 90/80/65/50/35.
- **Bảng theo mục lớn.** Mỗi mục lớn một dòng, ba cột theo ba kịch bản, có `max`. Dùng thanh tiến độ xếp chồng: phần xanh lá (hiện tại), nối tiếp phần xanh dương (đã tham gia), rồi phần vàng (kế hoạch), trên nền là `max`.
- **Cây chi tiết.** Mục lớn → nhóm → tiêu chí.
  - Mỗi nhóm có thanh tiến độ xếp chồng như trên. Nhóm đã chạm trần thì hiện nhãn "Đầy"; nếu có `wasted > 0` thì hiện "phí N điểm".
  - Mỗi dòng tiêu chí hiển thị: tên, điểm, màu theo trạng thái *tốt nhất* của các hoạt động đã chọn nó (confirmed > joined > planned), hoặc đỏ nếu tiêu chí nằm trong `excludedCriteria`.
  - Mỗi dòng cũng hiện tên các hoạt động đã chọn tiêu chí đó, và số hoạt động *có thể* dùng cho nó nhưng đang được gán chỗ khác.
  - Không dùng màu làm tín hiệu duy nhất: kèm icon hoặc chữ.
- Bộ lọc: ẩn nhóm đã đầy, chỉ hiện tiêu chí còn trống.
- Click vào tiêu chí: bật/tắt "loại trừ" (đỏ), xem danh sách hoạt động eligible.
- Màn hình này chỉ đọc, ngoại trừ thao tác bật/tắt loại trừ.

### 7.3 Màn hình "Hoạt động"
Thay thế tab Plan cũ. Dùng để thêm và sửa hoạt động.

- **Form thêm hoạt động**, nhập theo thứ tự:
  1. tên;
  2. tiêu chí eligible: ô chọn nhiều, có tìm kiếm theo tên hoặc mã, nhóm theo mục lớn;
  3. tiêu chí định chọn: chỉ gồm các eligible, mỗi lựa chọn hiện `+N điểm` (marginalGain). Mặc định chọn lựa chọn có gain cao nhất;
  4. trạng thái;
  5. ngày, link, ghi chú (không bắt buộc).
- **Danh sách hoạt động**: sửa trực tiếp trên danh sách, lọc và sắp xếp theo trạng thái, đổi trạng thái nhanh. Thông báo validate (mục 5) hiện ngay trên dòng tương ứng.
- Mọi thay đổi được tự động ghi vào bản nháp (localStorage, mục 8); người dùng bấm Tải xuống để có file JSON. Có undo/redo, tối thiểu 20 bước.

### 7.4 Màn hình "Gợi ý"
- Nút "Tính gợi ý". Kết quả hiện dạng bảng diff: hoạt động, tiêu chí cũ → mới, +điểm, điểm trước → sau theo từng kịch bản.
- Áp dụng được tất cả, hoặc từng dòng. Áp dụng xong có thể undo.
- Hiện thêm danh sách "nhóm còn trống" như ở mục 6.

### 7.5 Rubric
Không cần màn hình riêng ở phiên bản 1. Rubric được sửa trực tiếp trong `data/rubrics/*.json` rồi build lại. Có thể thêm một trang chỉ đọc để xem rubric nếu dễ làm.

## 8. Lưu trữ (`src/storage.ts`)

Cách lưu giống nhau trên mọi trình duyệt. **File JSON tải xuống là bản lưu chính thức**; localStorage chỉ là bản nháp để không mất dữ liệu giữa các lần mở app.

- **Bản nháp tự động**
  - Mọi thay đổi được tự ghi vào localStorage (debounce khoảng 500 ms), mỗi học kỳ một key.
  - Mở lại app thì tự nạp bản nháp gần nhất.
- **Tải xuống JSON**
  - Nút "Tải xuống" xuất file `drl-<semester>-<YYYYMMDD-HHmm>.json`.
  - Nội dung đúng `userdata.schema.json`, format 2 space indent để dễ đọc và sửa tay.
- **Tải lên JSON**
  - Nút "Tải lên" có hai cách: chọn file, hoặc kéo thả file vào cửa sổ app.
  - File được validate bằng Ajv. Nếu lỗi: hiện thông báo tiếng Việt chỉ rõ vị trí lỗi (ví dụ `activities[3].status`) và không đụng vào dữ liệu hiện tại.
  - Nếu hợp lệ: hiện bản xem trước gồm số hoạt động và điểm 3 kịch bản, so sánh với dữ liệu hiện tại. Người dùng bấm xác nhận thì mới thay thế.
- **Nhắc sao lưu**
  - Theo dõi "có thay đổi chưa tải xuống" (so với lần tải xuống/tải lên gần nhất).
  - Thanh trên cùng hiện chấm báo khi có thay đổi chưa tải xuống.
  - Cảnh báo `beforeunload` khi đóng tab lúc còn thay đổi chưa tải xuống.
- **Tạo mới**
  - "Tạo dữ liệu mới cho học kỳ…" tạo UserData rỗng. Trường `rubric` tự điền theo quy tắc ở mục 3.
- **An toàn**
  - Mọi lệnh đọc/ghi localStorage đều bọc trong try/catch.
  - Nếu localStorage không dùng được (chế độ ẩn danh, bị chặn), app vẫn chạy bình thường trong bộ nhớ và hiện cảnh báo "Dữ liệu sẽ mất khi đóng tab, nhớ tải xuống".

## 9. Ngoài phạm vi phiên bản 1
- Dashboard phân tích (xu hướng theo kỳ, thống kê loại hoạt động…).
- Đồng bộ đám mây hoặc đăng nhập (Supabase).
- Chuyển dữ liệu khi rubric đổi (migration): file ánh xạ `data/migrations/<from>-to-<to>.json` dạng `{ oldId: newId | null }`.
- Import trực tiếp từ hệ thống CTSV của trường.
- Sửa rubric trong app.

## 10. Câu hỏi nghiệp vụ còn mở
- Ngưỡng xếp loại ĐRL: tên từng mức, và so sánh ≥ hay >.