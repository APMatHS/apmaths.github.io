# Practice PDF — Rút đề ôn tập AI·CLO APMaths

Module này là cổng rút đề ôn tập PDF độc lập của **AI·CLO APMaths**.

## Trang sử dụng

- Sinh viên: `/ai-clo/practice/`
- Giảng viên/Admin: `/ai-clo/practice/admin.html`

## Nguyên tắc

- Sinh viên không cần đăng nhập; dùng mã môn/mã rút đề do giảng viên cung cấp.
- Mỗi môn có thể có nhiều gói ôn tập: toàn môn, một chương, nhiều chương hoặc nhóm mục cụ thể.
- Chỉ lấy câu thuộc ngân hàng **Luyện tập - kiểm tra** đã duyệt và còn hoạt động.
- Không lấy câu từ ngân hàng **Đề thi - bảo mật**.
- PDF được tạo ở trình duyệt; không lưu hàng loạt PDF vào Supabase Storage.
- Mỗi lượt rút có `seed` để có thể tái tạo cùng bộ câu khi cần.

## Luồng sinh viên

1. Nhập mã môn.
2. Hệ thống kiểm tra môn đang bật và còn trong thời gian cho phép.
3. Chọn gói ôn tập.
4. Bấm **Rút đề mới & tạo PDF**.
5. Backend chỉ trả các câu đã được chọn.
6. Trình duyệt render công thức, tạo PDF A4, cho xem trước và tải xuống.

## Luồng giảng viên/Admin

Dùng tài khoản AI·CLO hiện có. Tùy quyền, người dùng có thể:

- bật/tắt môn;
- tạo hoặc thay mã truy cập;
- đặt thời gian mở/đóng;
- bật/tắt quyền rút lại;
- tạo/sửa/xóa/bật/tắt gói ôn tập;
- chọn Chương · Mục;
- chọn rút theo tổng số câu hoặc ma trận CLO;
- chọn có/không kèm đáp án cuối PDF.

## Cách rút câu

### Theo số câu

Rút tổng số câu trong pool của các Chương/Mục đã chọn.

### Theo ma trận CLO

Có hai kiểu:

- **CLO theo Chương:** hàng = Chương, cột = CLO.
- **CLO theo Mục:** hàng = Mục, cột = CLO.

Backend phải đảm bảo đủ số câu cho từng ô ma trận trước khi rút.

## File chính

```text
practice/
├─ index.html
├─ admin.html
├─ practice.css
├─ practice.js
├─ admin.js
├─ pdf.js
└─ README.md
```

Nhận diện giao diện dùng màu APMaths: `#1e3a8a`, `#2563eb`, `#eff6ff`; đỏ chỉ dùng cho lỗi hoặc thao tác nguy hiểm.
