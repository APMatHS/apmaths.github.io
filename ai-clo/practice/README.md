# Practice PDF – Rút đề ôn tập AI-CLO

## 1. Mục tiêu

Module này là cổng rút đề ôn tập PDF độc lập của AI-CLO PTITHCM.

- Không phụ thuộc `app.html`.
- Sinh viên không cần đăng nhập.
- Mỗi môn có một mã truy cập riêng.
- Sau khi nhập mã, sinh viên chọn một **gói ôn tập** rồi rút đề PDF.
- Chỉ dùng câu hỏi thuộc ngân hàng **Luyện tập – kiểm tra** đã duyệt và đang hoạt động.
- Không lấy câu từ ngân hàng **Đề thi – bảo mật**.
- PDF được tạo ở phía trình duyệt; không lưu hàng loạt file PDF lên Supabase Storage.

Thư mục giao diện:

```text
/ai-clo/practice/
    index.html
    admin.html
    practice.js
    admin.js
    pdf.js
    practice.css
    README.md
```

## 2. Luồng sinh viên

Trang công khai: `/ai-clo/practice/`.

1. Nhập mã môn.
2. Backend kiểm tra môn đang bật và còn trong thời gian cho phép.
3. Hiện các gói ôn tập đang bật.
4. Sinh viên chọn gói.
5. Bấm **Rút đề mới & tạo PDF**.
6. Backend chỉ trả về các câu đã được rút, không trả toàn bộ ngân hàng câu hỏi.
7. Trình duyệt tạo PDF A4, render công thức bằng MathJax, cho xem trước và tải xuống.
8. Mỗi lượt rút có `seed` để có thể tái tạo đúng bộ câu.

Nếu giảng viên tắt môn hoặc đổi mã truy cập, mã cũ không còn sử dụng được.

## 3. Luồng giảng viên / Admin

Trang quản trị: `/ai-clo/practice/admin.html`.

- Dùng tài khoản Supabase Auth hiện có của AI-CLO.
- Admin nhìn thấy tất cả môn.
- Giảng viên chỉ nhìn thấy các môn mình phụ trách qua `subject_members`.
- Có thể:
  - bật/tắt môn;
  - đổi/tạo mã truy cập;
  - đặt thời gian mở/đóng;
  - cho phép hoặc không cho phép rút lại;
  - tạo nhiều gói ôn tập;
  - sửa gói;
  - xóa gói có xác nhận;
  - bật/tắt từng gói;
  - bật/tắt đáp án cuối PDF.

## 4. Gói ôn tập

Một môn có thể có nhiều gói, ví dụ:

- Ôn tập toàn môn;
- Chương 1;
- Chương 1–2;
- Ôn giữa kỳ;
- Ôn cuối kỳ;
- một nhóm Mục cụ thể.

Mỗi gói chọn:

- một hoặc nhiều **Chương**;
- các **Mục** con thuộc các Chương đã chọn;
- cách rút câu;
- trạng thái bật/tắt;
- có/không kèm đáp án.

Khi chọn một Chương, mặc định chọn toàn bộ Mục của Chương đó; giảng viên có thể bỏ riêng từng Mục.

## 5. Các cách rút câu

### 5.1. Theo số câu

Giảng viên nhập tổng số câu cần rút trong phạm vi các Mục đã chọn.

Ví dụ:

```text
Chương 1 + Chương 2
Tổng số câu: 30
```

### 5.2. Theo ma trận CLO

Khi chọn **Theo ma trận CLO**, có hai kiểu giống logic tạo đề hiện tại của AI-CLO.

#### CLO theo Chương

- Hàng = Chương.
- Cột = CLO.
- Các Mục được chọn trong cùng Chương được gộp thành một pool.
- Backend rút đúng số câu của từng ô `Chương × CLO`.

Ví dụ:

| Chương | CLO1 | CLO2 | CLO3 | Tổng |
|---|---:|---:|---:|---:|
| Chương 1 | 3 | 5 | 2 | 10 |
| Chương 2 | 4 | 4 | 2 | 10 |
| **Tổng** | **7** | **9** | **4** | **20** |

#### CLO theo Mục

- Hàng = từng Mục.
- Cột = CLO.
- Backend rút đúng số câu của từng ô `Mục × CLO`.
- Phù hợp khi cần kiểm soát chi tiết nội dung.

Mỗi ô ma trận hiển thị số câu hiện có dạng **“có N”**. Nếu nhập vượt số câu khả dụng thì backend không cho lưu.

## 6. Supabase

Project hiện dùng:

```text
Apmaths-ai-clo
project ref: yhfburffwzvcayjadskr
```

Các bảng riêng của module:

### `practice_configs`

Cấu hình chung theo môn:

- `subject_id`
- `access_code`
- `is_enabled`
- `allow_unlimited_redraw`
- `open_at`
- `close_at`
- `title`
- metadata cập nhật

### `practice_packages`

Cấu hình từng gói ôn tập:

- `subject_id`
- `name`
- `is_enabled`
- `chapter_ids`
- `topic_ids`
- `draw_mode` (`count` hoặc `matrix`)
- `matrix_scope` (`chapter` hoặc `topic`)
- `question_count`
- `matrix`
- `include_answers`
- `sort_order`

### `practice_draws`

Lưu lịch sử tối thiểu để tái tạo đề:

- `subject_id`
- `package_id`
- `seed`
- danh sách ID câu đã rút
- thời điểm rút

Không lưu file PDF.

## 7. Bảo mật

- `practice_configs`, `practice_packages`, `practice_draws` bật RLS.
- `anon` và `authenticated` không đọc trực tiếp các bảng cấu hình/lịch sử này.
- Trang công khai gọi Edge Function bằng mã môn.
- Trang quản trị gửi JWT; Edge Function tự kiểm tra người dùng và quyền môn.
- Public API chỉ trả đúng các câu đã được rút, không trả toàn bộ ngân hàng.

## 8. Edge Functions

### `practice-public`

- Public endpoint.
- Không yêu cầu đăng nhập sinh viên.
- Kiểm tra mã môn, trạng thái bật/tắt và thời gian mở.
- Trả danh sách gói đang bật.
- Rút câu theo gói, Mục và CLO.
- Tái tạo theo `seed`.

### `practice-admin`

- Dùng JWT AI-CLO hiện có.
- Kiểm tra Admin / Giảng viên phụ trách môn.
- Quản lý cấu hình môn và các gói ôn tập.
- Kiểm tra số câu khả dụng trước khi lưu ma trận.

Tại thời điểm cập nhật README này, hai function đã được deploy ở **version 4** và đang `ACTIVE`.

## 9. Nguồn câu hỏi

Backend chỉ dùng câu thỏa đồng thời:

```text
question_scope = practice
approval_status = approved
status = active
question_bank_id = ngân hàng của môn
```

Phạm vi tiếp tục được lọc theo:

```text
chapter_id
+ topic_id nếu gói chỉ chọn một số Mục
+ clo_id nếu dùng ma trận CLO
```

## 10. PDF

PDF hiện được tạo bằng browser-side HTML → PDF.

- A4 portrait.
- MathJax cho công thức.
- Hỗ trợ nội dung rich text và hình ảnh.
- Cố gắng tránh ngắt một câu hỏi giữa hai trang.
- Có số trang và seed ở footer.
- Có trang đáp án nếu gói bật `include_answers`.

## 11. Trạng thái hiện tại

Đã hoàn thành:

- cổng sinh viên độc lập;
- trang quản trị độc lập;
- mã truy cập theo môn;
- bật/tắt môn;
- thời gian mở/đóng;
- nhiều gói ôn tập trong một môn;
- chọn nhiều Chương;
- chọn/bỏ từng Mục;
- rút theo số câu;
- ma trận CLO theo Chương;
- ma trận CLO theo Mục;
- bật/tắt gói;
- sửa/xóa gói;
- seed để tái tạo đề;
- PDF xem trước/tải xuống;
- backend không làm lộ toàn bộ ngân hàng câu hỏi.

Dữ liệu thử hiện có đã được giữ tương thích khi nâng cấp từ Chương sang Chương + Mục.

## 12. Việc nên kiểm tra tiếp

1. Test end-to-end trên trình duyệt thật với cả ba trường hợp:
   - theo số câu;
   - CLO theo Chương;
   - CLO theo Mục.
2. Kiểm tra PDF có công thức dài và hình ảnh.
3. Kiểm tra ma trận khi một Mục không có câu ở một CLO.
4. Kiểm tra giao diện trên iPhone/mobile.
5. Nếu cần, bổ sung thống kê lượt rút theo từng gói.

## 13. Quy tắc khi tiếp tục phát triển

- Không sửa `app.html` nếu không thật sự cần thiết.
- Giữ module độc lập trong `/ai-clo/practice/`.
- Không tạo ngân hàng câu hỏi riêng cho Practice.
- Luôn dùng ngân hàng hiện có của AI-CLO.
- Không cho public client tải toàn bộ ngân hàng câu hỏi.
- Khi thay đổi schema phải giữ tương thích với các gói đã tạo.
