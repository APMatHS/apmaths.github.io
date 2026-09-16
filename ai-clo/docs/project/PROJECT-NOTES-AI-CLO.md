# AI·CLO APMaths — Ghi nhớ kỹ thuật và quyết định thiết kế

> Đây là file ghi nhớ ưu tiên khi tiếp tục phát triển. Đọc cùng `ARCHITECTURE-AI-CLO.md` trước khi sửa runtime/backend.

Cập nhật gần nhất: **16/09/2026 — nhận diện APMaths + ngân hàng Tự luận + tối ưu chuyển tab**.

## 1. Nguyên tắc phát triển

- Ưu tiên framework/component dùng chung; tránh vá từng trang.
- Một behavior quan trọng chỉ có một owner rõ ràng.
- Không thêm wrapper `render()` hoặc `MutationObserver` rộng nếu owner có thể xử lý trực tiếp.
- Không thay schema Supabase nếu thay đổi chỉ thuộc UX/frontend.
- Supabase Edge Function phải self-contained; không phụ thuộc `_shared`.
- AI chỉ gọi khi người dùng chủ động yêu cầu, trừ nơi đã chốt khác.
- Nội dung AI là bản hỗ trợ/bản nháp; người dùng kiểm tra trước khi lưu hoặc sử dụng.
- Trước thay đổi runtime/backend có ý nghĩa phải tạo backup branch.

## 2. Nhận diện APMaths

- Tên hiển thị: **AI·CLO APMaths**; dùng dấu giữa cao `·`.
- Màu chính: `#1e3a8a`.
- Hover/nhấn mạnh: `#2563eb`.
- Nền xanh nhạt: `#eff6ff`.
- Đỏ chỉ dùng cho lỗi, cảnh báo nguy hiểm, sai và thao tác phá hủy.
- `css/apmaths-brand.css` là lớp override branding cuối cùng của app.
- Login không dùng ảnh/campus PTITHCM; dùng nền xanh APMaths.
- AI Chat giữ lại và dùng cùng nhận diện xanh APMaths.

## 3. Public surface

Cấu trúc đã chốt:

```text
apmaths.github.io/
├─ ai-clo/
├─ tools/
├─ courses/
└─ ...
```

- `/ai-clo/`: giới thiệu + hướng dẫn ngắn, dùng theme/layout APMaths.
- `/ai-clo/app.html`: app chính.
- Nút tròn **CLO** trên nav APMaths đi trực tiếp tới `/ai-clo/app.html`.
- `/tools/` là khu công cụ độc lập, đồng hạng với `/ai-clo/`.
- Đã bỏ `ai-clo/tools/`.
- Đã bỏ các public page riêng cũ: `gioi-thieu.html`, `huong-dan.html`, `chinh-sach.html`.
- Hướng dẫn được gộp vào `/ai-clo/#huong-dan`.
- Landing/public-shell PTITHCM cũ và asset chỉ phục vụ chúng đã được dọn.
- Release note cũ trong `docs/releases/` được giữ nguyên như lịch sử.

## 4. Render và hiệu năng

Global `render()` đang có nhiều lớp legacy wrap. Quy tắc bắt buộc:

- chuyển view lớn: có thể dùng global render;
- chuyển tab con: không gọi global render nếu dữ liệu không đổi;
- giao diện phải hiện ngay, dữ liệu có thể load ngầm;
- request cũ không được ghi đè lựa chọn tab mới;
- cache phải invalidate đúng phạm vi khi tạo/sửa/xóa.

Ngân hàng câu hỏi:

- Trắc nghiệm có phân trang 50 câu và MathJax chỉ phần đang hiển thị.
- `bank-fast-switch.js` giữ pane/DOM khi đổi Trắc nghiệm ↔ Tự luận.
- `bank-fast-sync.js` giữ đồng bộ Luyện tập ↔ Đề thi và invalidate sau write.
- Tự luận được prefetch khi trình duyệt rảnh; quay lại tab đã mở phải gần như tức thời.

## 5. Ngân hàng câu hỏi

### Hai phạm vi

- `practice`: Luyện tập - kiểm tra.
- `secure_exam`: Đề thi - bảo mật.
- `both`: xuất hiện ở cả hai khi nghiệp vụ cho phép.

Kiểm tra trùng phải theo phạm vi ngân hàng đang xem: practice so với practice/both; secure so với secure/both; không đối chiếu practice-only với secure-only qua hai khu khác nhau.

### Trắc nghiệm

Giữ logic/tables hiện hữu; các thay đổi Tự luận không được làm hỏng MCQ.

### Tự luận

Mô hình:

```text
Câu tự luận
  → Ý/phần (tùy chọn)
  → Rubric
  → Điểm + một CLO chính cho mỗi tiêu chí
```

- Tổng điểm = tổng điểm rubric.
- Tỷ lệ CLO tự suy ra từ điểm rubric, không nhập riêng.
- Điểm là bội dương của `0.25`.
- Dạng câu: Lý thuyết / Bài tập / Hỗn hợp.
- Mã riêng theo question bank: `TL-000001`, `TL-000002`, ...
- Mã giữ nguyên khi sửa và không tái sử dụng sau xóa.
- Ma trận mặc định Chương × CLO; có thể đổi Chủ đề × CLO; ô hiển thị số câu và tổng điểm.

## 6. AI cho câu hỏi

### AI tạo tự luận

- Edge Function: `generate-one-essay-question`.
- Chỉ trả bản nháp; không auto-save.
- Người dùng xem lại đề, lời giải, rubric, CLO và điểm.

### AI nhân bản tự luận

- Edge Function: `generate-essay-variants`.
- Giữ chính xác tổng điểm và phân bố điểm theo CLO của câu nguồn.
- AI thay đổi đề/dữ liệu/lời giải/tiêu chí rubric.
- Duyệt tuần tự; chỉ lưu câu người dùng xác nhận.

### Phiên AI

`essay_ai_sessions` ghi lịch sử tạo/nhân bản để xem lại trong UI.

## 7. Assessment

- Framework Đánh giá dùng chung cho các loại bài.
- Ma trận/chọn câu phải dựa trên dữ liệu ngân hàng thực tế.
- Khi đã có lượt làm, các phần cấu hình cần khóa theo nghiệp vụ hiện hành.
- Xóa lượt làm phải làm sạch trạng thái liên quan trước khi cho sửa bài kiểm tra.

## 8. Kết quả CLO

- Ngưỡng đạt mặc định hiện hành: 4/10 nếu cấu hình không quy định khác.
- Hiển thị GPA và CLO_i tách biệt.
- AI nhận xét chỉ chạy khi người dùng bấm yêu cầu; không gọi tự động không cần thiết.

## 9. AI Chat

- Frontend: `js/ai-chat.js`, `css/ai-chat.css`.
- Backend: Supabase Edge Function `ai_clo_chat`.
- Knowledge: `data/ai-clo-knowledge.json`.
- Origin production: `https://apmaths.github.io`.
- Chat chỉ hỗ trợ phạm vi AI·CLO APMaths và không được tự bịa dữ liệu động.

## 10. Backend / dữ liệu

- Supabase project production hiện hành thuộc APMaths.
- RLS phải bật cho dữ liệu cần bảo vệ.
- Không đưa secret/service-role key vào repo.
- Migration tự luận V12.7.x đã thêm bảng câu tự luận, parts, rubric, revision, code counter và phiên AI.
- RPC lưu tự luận kiểm tra quyền/ngân hàng/chương/chủ đề/CLO và bước điểm 0.25.

## 11. Quy tắc trước khi commit

1. Tìm owner của UI/behavior.
2. Rà dependency trước khi xóa file.
3. Không đổi business logic khi chỉ rebrand CSS.
4. Bump query version nếu asset thay đổi để tránh cache trình duyệt.
5. Sau thay đổi lớn: rà link cũ, console, Supabase function và mobile.
6. Không tuyên bố đã test browser nếu chỉ mới kiểm tra code/static/backend.
