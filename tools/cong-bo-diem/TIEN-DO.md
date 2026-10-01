# Tiến độ Công bố điểm — 01/10/2026
## Đã triển khai
- Dùng đúng Supabase Apmaths-ai-clo: yhfburffwzvcayjadskr, không dùng PTITHCM.
- Danh sách, tìm kiếm và phân trang công bố; link/QR sinh viên; quản lý bằng mã/link và mật khẩu riêng.
- Mã tạo 4 chữ số dùng chung, admin cấu hình trong LOGIN. Giảng viên không tạo tài khoản.
- Nhập Excel/CSV, chọn sheet/dòng tiêu đề; dán toàn bảng/vùng, sửa ô, thêm/xóa dòng/cột, hoàn tác.
- Chọn cột công bố và tổ hợp MSSV/SĐT/ngày sinh/mã riêng; kiểm tra dữ liệu trùng/trống, xem thử kết quả.
- Bản nháp, bật/tắt, cập nhật giữ link, khôi phục dữ liệu trước, phát hiện xung đột phiên sửa.
- Admin sử dụng tài khoản APMaths AI-CLO; xem/sửa/xóa, đổi mã chung, đặt lại mật khẩu thu hồi phiên cũ.
- Bảng grade_* và bucket riêng tư; gateway SQL chỉ service_role, Edge Function xác thực từng luồng.
- Tra cứu xử lý trong database, chỉ trả dòng/cột được chọn; không chuyển cả bảng qua mỗi lượt.
- Kết nối Sheets qua service account, đồng bộ theo nhu cầu với lưu tạm 15 phút và khóa đồng bộ.
- Mã nguồn backend, migration, hướng dẫn và kiểm tra nằm trong repo.

## Kiểm tra
- Cú pháp JavaScript frontend và core: đạt.
- Core: chuẩn hóa MSSV/SĐT/ngày sinh, ngày không tồn tại/năm nhuận, dán quoted multiline, tiêu đề lệch dòng,
  tổ hợp xác nhận trùng và xác nhận nhiều trường.
- Kiểm tra giao dịch trên Supabase: quyền riêng tư, mã tạo sai, phiên chỉnh sửa, bản nháp, loại bỏ hash,
  chỉ trả cột được chọn, sai thông tin sinh viên, xung đột revision, khôi phục, thu hồi phiên,
  giới hạn lượt, khóa/lưu tạm đồng bộ và xóa admin. Mọi dữ liệu kiểm tra đã được rollback.
- Có workflow kiểm tra Node và trình duyệt Chromium với backend mô phỏng.
- Chưa kiểm tra Google Sheets thật do chưa có thông tin tài khoản dịch vụ Google.

## Cần cấu hình để sử dụng
1. Admin vào LOGIN thiết lập mã chung 4 chữ số.
2. Để bật Google Sheets: tạo tài khoản dịch vụ Google, thêm secret GRADE_GOOGLE_SERVICE_ACCOUNT_JSON trong Supabase
   và chia sẻ sheet quyền Người xem cho client_email. Không đưa khóa riêng vào repo.
3. Thử một bảng điểm mẫu trước khi công bố lớp thật.

## Giới hạn hiện tại
- Giữ một bản dữ liệu trước, không giữ lịch sử đầy đủ hoặc phiên bản file Excel cũ.
- Phiên chỉnh sửa 2 giờ; nhập lại mật khẩu nếu hết hạn.
- 5000 dòng, 100 cột; file gốc tối đa 5 MB.
- Không chỉnh dữ liệu Sheets trong công cụ; giảng viên sửa nguồn Sheets.


## Cập nhật giao diện 01/10/2026
- Thông báo xuất hiện giữa màn hình, chữ lớn, có nút đóng; thông báo thành công tự ẩn sau 6 giây.
- Lỗi nhập liệu tô đỏ trường cần sửa; lỗi dữ liệu xác nhận chuyển đến trang chứa dòng sai và tô đỏ ô.
- Thông báo Lưu cập nhật xuất hiện giữa màn hình; phân biệt lưu dữ liệu thành công với lỗi tải file gốc.
- Header dùng chung tools/css/header.css với tools/all; đồng bộ cỡ chữ, chiều cao, màu và bỏ gạch chân link cả khi hover.
- Bổ sung kiểm thử trình duyệt cho ô lỗi, vị trí/cỡ chữ thông báo Đã lưu và link header.


## Cập nhật luồng tạo và tên miền 01/10/2026
- Mã chung 4 chữ số nhập trong hộp thoại giữa màn hình, kiểm tra trên server trước khi mở biểu mẫu; không nhập lại trong biểu mẫu, không lưu mã trong URL hoặc bộ nhớ trình duyệt lâu dài.
- Mở lại công bố bằng link qua hộp thoại cùng phong cách thông báo lỗi, hỗ trợ link GitHub Pages và Cloudflare Pages.
- Hiển thị link quản lý để giảng viên lưu cùng mật khẩu; mật khẩu không bắt buộc khác nhau giữa các bài.
- Chỉnh autocomplete, tên trường và chỉ mở nhập khi tương tác để hạn chế trình duyệt điền email vào Học kỳ và tự điền mật khẩu chỉnh sửa. Password manager của trình duyệt có thể áp dụng quy tắc riêng.
- Backend cho phép đúng hai origin apmaths.github.io và apmaths.pages.dev; giữ xác thực Admin và phiên chỉnh sửa như cũ.
- Sửa file chức năng hiện có, không thêm JS vá phiên bản.
- Đã kiểm tra cú pháp JS, core và hàm kiểm tra mã/quyền trong giao dịch rollback. Bổ sung kiểm tra trình duyệt cho mã sai/đúng, hộp thoại giữa màn hình, link khác miền và link quản lý.

- Xác nhận sau triển khai: GitHub Actions đạt core và toàn bộ kiểm tra Chromium; GitHub Pages và Cloudflare Pages triển khai thành công. API trả 200/CORS đúng cho hai tên miền và 403 cho origin ngoài danh sách. Đã kiểm tra hộp Mở lại công bố, hộp nhập mã và danh sách công bố trên Cloudflare Pages.
