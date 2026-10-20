# AGENTS.md — HUST DRL Tracker

Web app 1 trang giúp sinh viên HUST quản lý điểm rèn luyện (ĐRL): nhập hoạt động → app tự tính điểm theo bộ tiêu chí có trần nhiều tầng, tô màu theo trạng thái, và gợi ý cách gán tiêu chí cho điểm cao nhất.

**Đọc `docs/SPEC.md` trước khi code.** Đó là nguồn sự thật về nghiệp vụ. Nếu code và SPEC mâu thuẫn, hỏi lại thay vì tự đoán.

## Stack
- Vite + React 19 + TypeScript (strict). Không có backend.
- Tailwind CSS v4 cho style. Không thêm UI kit nặng; component tự viết.
- Ajv (draft 2020-12) để validate JSON theo `schema/*.schema.json`.
- Vitest cho unit test.
- Lưu trữ: bản nháp trong localStorage + nút tải xuống/tải lên file JSON (giống nhau trên mọi trình duyệt). Toàn bộ truy cập storage đi qua một module `src/storage.ts`.

## Cấu trúc thư mục (mục tiêu)
```
schema/            JSON Schema — KHÔNG sửa trừ khi được yêu cầu
data/rubrics/      Rubric: 2025.1 (rubric cũ, áp dụng đến 2025.2) và 2026.1 (rubric mới)
data/samples/      Dữ liệu mẫu + kết quả kỳ vọng dùng cho test
src/domain/        Logic thuần (types, scoring, optimizer, validate) — không import React
src/ui/            Component React
src/storage.ts     Đọc/ghi dữ liệu người dùng
```

## Quy tắc
- **Một nguồn sự thật**: chỉ `UserData` (xem schema) là dữ liệu người dùng nhập. Điểm, màu, tổng, cảnh báo đều là giá trị *tính ra* (derived), không bao giờ lưu.
- Logic tính điểm và tối ưu nằm trong `src/domain/`, là hàm thuần, có test. UI chỉ gọi vào.
- Test bắt buộc: `data/samples/2026.1.json` phải cho ra đúng `data/samples/2026.1.expected.json` (confirmed = 42, done = 60, projected = 63).
- Kiểu TypeScript phải khớp với JSON Schema. Dữ liệu import từ file phải được validate bằng Ajv trước khi dùng; báo lỗi dễ hiểu bằng tiếng Việt.
- Giao diện tiếng Việt. Màu trạng thái: vàng = planned, xanh dương = joined, xanh lá = confirmed, đỏ = rejected / tiêu chí bị loại.
- Ưu tiên laptop, nhưng không được vỡ layout trên điện thoại.
- Sau mỗi thay đổi: `npm run typecheck && npm test && npm run build` phải pass.
- Commit nhỏ, message dạng Conventional Commits (`feat:`, `fix:`, `test:`...).

## Lệnh
- `npm run dev` — chạy local
- `npm test` — Vitest
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — build production
