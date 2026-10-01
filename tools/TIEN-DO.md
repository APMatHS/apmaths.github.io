# Danh sách công cụ — 01/10/2026

- tools/index.md là trang chính tại /tools/, dùng layout page → default với head/header/nav/footer chung của APMaths.
- Chuyển đầy đủ 10 thẻ công cụ từ tools/all/index.html sang trang chính; giữ đích liên kết và mở tab mới như trước.
- CSS danh sách nằm trong tools/css/directory.css, giới hạn phạm vi .tools-directory để không ảnh hưởng nav hoặc trang con.
- /tools/all/ chuyển hướng đến /tools/ trên tên miền hiện tại, giữ query/hash khi JavaScript hoạt động; có meta refresh và link dự phòng.
- Không đổi HTML/nav của các trang công cụ con.
- Công bố điểm: nút bị vô hiệu hóa dùng con trỏ not-allowed thay cho vòng chờ.
