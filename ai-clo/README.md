# AI·CLO APMaths

AI·CLO APMaths là module đánh giá theo chuẩn đầu ra học phần của APMaths. Hệ thống hỗ trợ quản lý học phần, chương, chủ đề, CLO, ngân hàng câu hỏi trắc nghiệm/tự luận, bài đánh giá, bài làm và kết quả CLO; các chức năng AI chỉ hỗ trợ tạo, rà soát và phân tích nội dung.

## Đường dẫn

- Trang giới thiệu và hướng dẫn ngắn: `/ai-clo/`
- Ứng dụng đăng nhập: `/ai-clo/app.html`
- Cổng vào nhanh trên APMaths: nút tròn **CLO** trên thanh điều hướng
- Công cụ độc lập của APMaths: `/tools/` — không nằm trong thư mục `ai-clo/`

## Nhận diện V12.8

- Tên hiển thị: **AI·CLO APMaths**
- Màu chính: `#1e3a8a`
- Hover/nhấn mạnh: `#2563eb`
- Nền xanh nhạt: `#eff6ff`
- Màu đỏ chỉ dùng cho lỗi, cảnh báo nguy hiểm và thao tác phá hủy dữ liệu.
- Landing PTITHCM cũ, trang Giới thiệu riêng, Hướng dẫn riêng, Chính sách riêng và `ai-clo/tools/` đã được loại bỏ.

## Kiến trúc chính

Frontend được phục vụ bằng GitHub Pages. Backend dùng Supabase cho PostgreSQL, Auth, Storage, RLS, RPC và Edge Functions. Gemini được gọi qua Edge Functions cho các tác vụ AI; secret không được đưa vào frontend hoặc repository.

Các nhóm frontend chính nằm trong:

```text
ai-clo/
├─ app.html
├─ index.html
├─ css/
│  ├─ courses/
│  ├─ exams/
│  ├─ questions/
│  ├─ results/
│  ├─ students/
│  ├─ system/
│  └─ ui/
├─ js/
│  ├─ courses/
│  ├─ questions/
│  ├─ results/
│  ├─ system/
│  └─ ui/
├─ practice/
└─ supabase/
```

## Nguyên tắc phát triển

- Giữ một owner rõ ràng cho mỗi behavior quan trọng; tránh tạo nhiều lớp render hoặc compatibility cùng xử lý một việc.
- Chuyển tab con trong Ngân hàng câu hỏi phải dùng dữ liệu/DOM đã có và không gọi lại global `render()` nếu dữ liệu không thay đổi.
- Trắc nghiệm và Tự luận có cache riêng; chỉ invalidate phần dữ liệu thật sự thay đổi.
- Câu tự luận dùng rubric điểm để suy ra phân bố CLO; điểm dùng bước `0.25`.
- AI tạo nội dung ở dạng bản nháp; người dùng kiểm tra trước khi lưu.
- Không sửa schema hoặc backend khi thay đổi chỉ thuộc giao diện.
- Trước thay đổi runtime/backend lớn cần tạo backup branch.

## Backend

Mã Supabase nằm trong `ai-clo/supabase/`:

- `migrations/` — migration SQL.
- `functions/` — Edge Functions tự chứa dependency cần thiết.
- `schema/` — snapshot/mô tả cấu trúc.
- `policies/` — policy SQL độc lập.
- `docs/` — tài liệu vận hành.

Chat hiện dùng Edge Function `ai_clo_chat`, lấy knowledge từ `ai-clo/data/ai-clo-knowledge.json` và chỉ cho phép origin APMaths cùng localhost phục vụ phát triển.

## Tài liệu kỹ thuật

- `docs/project/ARCHITECTURE-AI-CLO.md` — kiến trúc chi tiết và owner các module.
- `docs/project/PROJECT-NOTES-AI-CLO.md` — các quyết định kỹ thuật/UI/nghiệp vụ.
- `docs/releases/` — lịch sử các phiên bản cũ; các tên PTITHCM trong thư mục release được giữ như lịch sử của dự án.

Cập nhật nhận diện APMaths: **16/09/2026**.
