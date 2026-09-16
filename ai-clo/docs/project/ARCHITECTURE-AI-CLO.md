# AI·CLO APMaths — KIẾN TRÚC HỆ THỐNG

> Tài liệu mô tả kiến trúc hiện hành sau đợt đổi nhận diện APMaths ngày **16/09/2026**. Mục tiêu chính là xác định đúng owner trước khi sửa và tránh tạo thêm lớp render/compatibility trùng nhau.

## 1. Vị trí trong APMaths

AI·CLO là một module đồng hạng với các khu vực khác của website:

```text
apmaths.github.io/
├─ ai-clo/
├─ tools/
├─ courses/
├─ knowledge/
└─ ...
```

- `/ai-clo/`: giới thiệu + hướng dẫn ngắn.
- `/ai-clo/app.html`: ứng dụng đăng nhập.
- Nút tròn **CLO** trên nav APMaths đi thẳng tới `/ai-clo/app.html`.
- `/tools/`: các công cụ độc lập của APMaths; không đặt bản sao trong `ai-clo/`.

Các landing/public page PTITHCM cũ đã được loại bỏ. `index.html` của AI·CLO dùng trực tiếp layout/theme APMaths.

## 2. Sơ đồ tổng thể

```text
Browser / GitHub Pages
        │
        ├─ APMaths theme + AI·CLO frontend
        │
        ├─ Supabase Auth / PostgreSQL / Storage / RPC
        │
        └─ Supabase Edge Functions
                  │
                  └─ Gemini API khi người dùng chủ động yêu cầu AI
```

Frontend không chứa secret. Supabase/RLS là lớp kiểm soát dữ liệu chính; không coi việc ẩn nút trên giao diện là cơ chế phân quyền.

## 3. Cấu trúc frontend

```text
ai-clo/
├─ index.html
├─ app.html
├─ css/
│  ├─ app.css
│  ├─ app-brand.css
│  ├─ apmaths-brand.css
│  ├─ ai-chat.css
│  ├─ courses/
│  ├─ exams/
│  ├─ questions/
│  ├─ results/
│  ├─ students/
│  ├─ system/
│  └─ ui/
├─ js/
│  ├─ app.js
│  ├─ ai-chat.js
│  ├─ core/
│  ├─ courses/
│  ├─ questions/
│  ├─ results/
│  ├─ system/
│  └─ ui/
├─ data/
├─ practice/
└─ supabase/
```

### Branding owner

- `css/app.css`: biến màu và primitive chung.
- `css/app-brand.css`: chữ/logo `AI·CLO APMaths` ở login/sidebar.
- `css/apmaths-brand.css`: lớp nhận diện cuối cùng, được load sau các module để đổi các accent cũ sang xanh APMaths mà vẫn giữ màu đỏ cho lỗi/xóa/nguy hiểm.
- Màu chuẩn: `#1e3a8a`, `#2563eb`, `#eff6ff`.

## 4. Render và điều hướng

Global `render()` đã được nhiều module legacy wrap. Vì vậy:

- chỉ dùng global render cho chuyển **view lớn** hoặc khi dữ liệu thật sự cần dựng lại;
- không dùng global render cho các tab con chỉ thay trạng thái hiển thị;
- không thêm `MutationObserver` rộng nếu có thể gọi hàm tăng cường trực tiếp sau render.

Các lớp hiện hữu cần tôn trọng:

- `js/ui/shell.js`: chrome/app shell sau render.
- `js/ui/view-transition.js`: cache/chuyển view lớn.
- `js/ui/layout-system.js`: gắn primitive layout dùng chung.
- `js/questions/state.js`: filter/draft/hydration của ngân hàng trắc nghiệm.
- `js/questions/workspace.js`: phục hồi form/AI review/workspace.
- `js/questions/list-performance.js`: phân trang 50 câu, debounce search và MathJax chỉ phần nhìn thấy.

## 5. Ngân hàng câu hỏi

### Trắc nghiệm

Owner chính là chuỗi module `js/questions/` hiện hữu, đặc biệt `bank.js`, `state.js`, `workspace.js`, `list-performance.js` và các adapter UI.

### Tự luận

- `essay-bank.js`: dữ liệu, danh sách, form, chi tiết.
- `essay-ai.js`: AI tạo câu tự luận.
- `essay-tools.js`: ma trận, kiểm tra trùng, phiên AI, AI nhân bản.
- `essay-context.js`: giữ ngữ cảnh ngân hàng và nạp lớp chuyển tab nhanh.
- `bank-fast-switch.js`: chuyển Trắc nghiệm ↔ Tự luận bằng pane/DOM cache, tránh global render.
- `bank-fast-sync.js`: đồng bộ Luyện tập/Đề thi giữa hai loại câu và invalidate cache sau write.

Nguyên tắc: **vào lần đầu thì tải, chuyển tab thì dùng dữ liệu/DOM đã có; tạo/sửa/xóa mới invalidate đúng phần**.

### Mô hình tự luận

```text
Essay question
  └─ Parts (tùy chọn)
       └─ Rubric items
            ├─ criterion
            ├─ points
            └─ một CLO chính
```

- Tổng điểm câu = tổng điểm rubric.
- Phân bố CLO = tổng điểm rubric theo CLO.
- Điểm rubric dùng bước `0.25`.
- Mã hiển thị tự luận là `TL-000001`, `TL-000002`, ... riêng theo question bank và không tái sử dụng số đã xóa.

## 6. Assessment và kết quả

Các module Assessment nằm trong `js/assessment*`, `js/exams/`, `css/exams/`. Kết quả/CLO nằm trong `js/results/`, `css/results/` và các module liên quan.

Khi sửa Assessment:

- ưu tiên framework chung thay vì tạo luồng riêng;
- giữ tương thích dữ liệu cũ;
- không thay schema nếu thay đổi chỉ thuộc UX/frontend.

## 7. AI

AI chỉ được gọi khi người dùng chủ động yêu cầu, trừ nơi có quyết định riêng rõ ràng.

- AI tạo câu: trả bản nháp, không tự lưu.
- AI nhân bản: người dùng duyệt từng biến thể trước khi lưu.
- AI nhận xét kết quả: thông tin hỗ trợ, không thay thế dữ liệu điểm/CLO.
- AI Chat: `js/ai-chat.js` + Edge Function `ai_clo_chat`.

Knowledge hiện hành của chat: `data/ai-clo-knowledge.json`.

## 8. Supabase

```text
supabase/
├─ migrations/
├─ schema/
├─ policies/
├─ functions/
└─ docs/
```

- Migration phải additive khi có thể.
- RLS luôn được xem là lớp bảo vệ dữ liệu chính.
- Edge Function phải self-contained; không phụ thuộc `_shared`.
- Secret chỉ ở Supabase environment.
- Function công khai như `ai_clo_chat` phải tự giới hạn origin; function nội bộ ưu tiên JWT.

## 9. Quy tắc trước khi sửa

1. Xác định đúng owner của behavior/CSS.
2. Kiểm tra wrapper/render/observer hiện có trước khi thêm cơ chế mới.
3. Không tạo cache thứ hai nếu owner đã có cache phù hợp.
4. Không làm full render khi chỉ cần cập nhật một pane/list.
5. Giữ đỏ cho destructive/error; branding dùng xanh APMaths.
6. Trước thay đổi runtime/backend lớn: tạo backup branch.
7. Sau thay đổi: rà link, cache-busting asset, browser console và Supabase function liên quan.

## 10. Lịch sử

Các file trong `docs/releases/` là lịch sử của giai đoạn AI-CLO PTITHCM trước khi chuyển thành AI·CLO APMaths. Không đổi tên/branding trong release note cũ nếu việc đó làm sai bối cảnh lịch sử.
