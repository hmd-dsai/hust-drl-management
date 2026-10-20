# Prompt cho từng giai đoạn

Dán lần lượt từng prompt vào agent. Sau mỗi giai đoạn:
1. tự mở app lên xem;
2. kiểm tra `npm test` đã xanh;
3. commit;
4. mới sang prompt tiếp theo.

Nếu agent làm lệch hướng, `git reset` và chạy lại prompt đó với chỉ dẫn rõ hơn. Cách này thường nhanh hơn ngồi sửa.

---

## 0. Định hướng (chưa code)

```
Đọc AGENTS.md, docs/SPEC.md, hai file trong schema/ và lướt qua data/.
Chưa viết code. Hãy:
1. Tóm tắt lại bằng 5–7 gạch đầu dòng em hiểu user flow và luật tính điểm.
2. Đề xuất kế hoạch triển khai theo các giai đoạn trong docs/PROMPTS.md, và chỉ ra chỗ nào trong SPEC còn mơ hồ hoặc mâu thuẫn.
3. Kiểm tra giúp anh: với data/samples/2026.1.json, tính tay ba kịch bản có ra 42 / 60 / 63 không.
```

## 1. Khung dự án + domain types

```
Giai đoạn 1: dựng khung dự án theo AGENTS.md.
- Khởi tạo Vite + React + TS strict + Tailwind v4 + Vitest + Ajv ngay trong thư mục hiện tại, không tạo thư mục con.
  Thêm các script dev/test/typecheck/build.
- src/domain/types.ts: kiểu TS khớp chính xác với hai file JSON Schema.
- src/domain/rubric.ts:
  - load các rubric trong data/rubrics/ (import.meta.glob);
  - validate bằng Ajv;
  - hàm rubricForSemester(semester) theo quy tắc ở SPEC mục 3;
  - xây index id → node, kèm cha của mỗi node;
  - kiểm tra id duy nhất, và id con bắt đầu bằng id cha.
- Test:
  - cả 2 rubric đều hợp lệ;
  - rubricForSemester: 2025.2 → 2025.1, 2026.1 → 2026.1, 2026.2 → 2026.1;
  - sample 2026.1 hợp lệ;
  - một file hỏng thì bị từ chối, kèm thông báo lỗi tiếng Việt.
Chạy typecheck, test, build cho đến khi pass.
```

## 2. Engine tính điểm

```
Giai đoạn 2: cài đặt src/domain/scoring.ts và src/domain/validate.ts đúng theo SPEC mục 4 và 5. Chỉ logic thuần, không đụng UI.
- computeScore trả về ScoreTree đầy đủ: raw, capped, max, wasted cho mọi node.
- Thêm helper tính cả ba kịch bản cùng lúc.
- Test bắt buộc: sample 2026.1 khớp từng số trong data/samples/2026.1.expected.json.
- Viết thêm test cho các trường hợp biên:
  - vượt trần nhóm;
  - vượt trần mục lớn;
  - vượt totalMax;
  - mục penalty;
  - exclusiveGroup (lấy ví dụ từ rubric cũ);
  - hai hoạt động chọn cùng một tiêu chí (chỉ tính 1 lần);
  - chosen = null;
  - hoạt động rejected.
- Test cho từng loại thông báo validate, gồm cả hai mức warning và info.
```

## 3. Lưu trữ file JSON

```
Giai đoạn 3: src/storage.ts theo SPEC mục 8.
- Bản nháp tự lưu vào localStorage, tải xuống/tải lên JSON (chọn file + kéo thả), xem trước trước khi thay thế, nhắc sao lưu.
- State của app: useReducer hoặc zustand, chọn cái gọn hơn. Có undo/redo tối thiểu 20 bước.
- Thanh trên cùng theo SPEC mục 7.1.
- Màn hình chào khi chưa có dữ liệu: "Tải lên file JSON" / "Tạo dữ liệu mới cho học kỳ…".
- Test cho serialize, validate, so sánh "có thay đổi chưa tải xuống".
Thử tải lên data/samples/2026.1.json, sửa vài hoạt động, tải xuống rồi tải lên lại: dữ liệu phải giữ nguyên.
```

## 4. Màn hình Trạng thái ĐRL

```
Giai đoạn 4: màn hình "Trạng thái ĐRL" theo SPEC mục 7.2. Đây là màn hình quan trọng nhất.
- Thẻ tổng cho ba kịch bản.
- Bảng theo mục lớn với thanh tiến độ xếp chồng xanh lá / xanh dương / vàng.
- Cây chi tiết có nhãn "Đầy" và "phí N điểm".
- Màu dễ phân biệt trên cả nền sáng và nền tối, có icon hoặc chữ đi kèm.
Kiểm tra bằng sample 2026.1: ba thẻ tổng phải là 42 / 60 / 63, và các mục lớn khớp expected.json.
```

## 5. Màn hình Hoạt động

```
Giai đoạn 5: màn hình "Hoạt động" theo SPEC mục 7.3.
- Viết marginalGain trong domain kèm test trước, rồi mới làm UI.
- Form thêm hoạt động đúng thứ tự: tên → eligible (chọn nhiều, có tìm kiếm) → tiêu chí định chọn (+N điểm, mặc định lấy gain cao nhất) → trạng thái.
- Danh sách hoạt động sửa trực tiếp được, thông báo validate hiện trên từng dòng.
- Mọi thay đổi tự ghi vào bản nháp (localStorage), và màn hình Trạng thái cập nhật ngay.
```

## 6. Màn hình Gợi ý

```
Giai đoạn 6: src/domain/optimizer.ts và màn hình "Gợi ý" theo SPEC mục 6 và 7.4.
Viết test trước. Tối thiểu có:
(a) trường hợp greedy sai còn optimizer đúng: chọn 6đ vào nhóm đã gần đầy thì kém hơn 3đ vào nhóm còn trống;
(b) hoạt động confirmed và pinned không bị đổi;
(c) excludedCriteria bị bỏ qua;
(d) với sample 2026.1, điểm "làm hết kế hoạch" sau tối ưu ≥ 63.
Sau đó làm UI: bảng diff, áp dụng tất cả hoặc từng dòng, có undo, kèm danh sách "nhóm còn trống".
```

## 7. Hoàn thiện

```
Giai đoạn 7: rà soát toàn app:
- layout trên màn hình 375px;
- dark mode;
- phím tắt;
- trạng thái rỗng;
- thông báo lỗi;
- chế độ dự phòng khi localStorage bị chặn (ẩn danh).
Viết README.md tiếng Việt: app làm gì, cách chạy, định dạng file JSON, cách sửa rubric khi trường đổi tiêu chí.
```

## 8. Deploy

```
Giai đoạn 8: deploy lên GitHub Pages bằng GitHub Actions.
Workflow: build khi push lên main, đặt base path đúng theo tên repo.
Thêm link app vào README.
```

---

## Mẹo khi vibecode
- **Một giai đoạn một phiên chat.** Hết giai đoạn thì mở phiên mới. AGENTS.md sẽ được nạp lại tự động.
- **Test trước, UI sau** với mọi thứ có logic: scoring, marginalGain, optimizer.
- Khi agent bảo "xong", hỏi lại: "Chạy typecheck, test, build và cho anh xem output."
- Khi muốn đổi luật nghiệp vụ, sửa `docs/SPEC.md` trước, rồi bảo agent "SPEC mục X đã đổi, cập nhật code + test cho khớp".
- Khi trường đổi tiêu chí, chỉ sửa `data/rubrics/*.json` (và `expected.json` nếu sample bị ảnh hưởng), không phải sửa code.
