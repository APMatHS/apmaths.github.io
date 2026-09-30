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
