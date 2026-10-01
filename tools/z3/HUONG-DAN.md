# Ma trận trên trường hữu hạn

Mở `/tools/z3/` trên GitHub Pages hoặc Cloudflare Pages. Công cụ tính ngay tại trình duyệt, không cần tài khoản và không gửi ma trận lên máy chủ.

## Trường tính toán

- Mặc định F3. Chọn nhanh F2, F3, F5, F7, F11, F13, F17 hoặc nhập p khác rồi bấm **Áp dụng trường**.
- p phải nguyên tố để Z/pZ là trường. Phần tử dùng BigInt, không bị giới hạn độ chính xác của JavaScript Number.
- Với p < 2^64, Miller–Rabin dùng bộ 7 cơ sở xác định cho khoảng này. Với p lớn hơn, kiểm tra 32 cơ sở ngẫu nhiên độc lập và ghi rõ **nguyên tố xác suất**, không tuyên bố đã chứng minh nguyên tố. Nếu p là hợp số lẻ, xác suất lọt qua 32 cơ sở ngẫu nhiên không quá 4^-32 theo giả thiết lấy mẫu độc lập.
- Ô p nhận tối đa 1000 chữ số; đây là giới hạn nhập và tài nguyên, không phải một danh sách nguyên tố cố định. Tác vụ được hủy sau 60 giây hoặc khi bấm Hủy tính.
- Các trường mở rộng F4, F8, F9 chưa thuộc phiên bản này. Nhập 4, 8, 9 bị từ chối vì p hợp số.
- Khi đổi p, văn bản trong các ô được giữ nguyên và sẽ được diễn giải modulo p mới. Các phân số có thể mất tính hợp lệ khi mẫu số bằng 0 modulo p mới.

## Ma trận và nhập liệu

- Mỗi ma trận có số dòng/cột riêng, từ 1 đến 64, tối đa 4096 ô. Tổng đầu vào tối đa 8192 ô. Tối đa 25 tên A–Z, trừ I dành cho đơn vị.
- Nhập số nguyên có dấu hoặc a/b; mẫu số phải có nghịch đảo modulo p. Không nhận số thập phân. Nhập 0 vào ô có phần tử không.
- Dán cả bảng từ Excel qua nút Dán bảng. Có thể dán nhiều ô vào một ô ma trận để mở hộp nhập; bảng dán thay toàn ma trận, không phải dán một vùng. Hộp dán nhận tab, khoảng trắng, dấu phẩy/chấm phẩy; phân số dùng dạng `1/2`, không có khoảng trắng quanh `/` khi dán.
- Đổi kích thước giữ phần giao với ma trận cũ và điền 0 vào ô mới; ô bị cắt có thể lấy lại bằng Hoàn tác.
- Nút Không, Đơn vị, Ngẫu nhiên, Ngẫu nhiên khả nghịch, Chuẩn hóa và Sao chép nằm cạnh từng ma trận. Ma trận ngẫu nhiên khả nghịch được sinh bằng phép biến đổi dòng từ I, không tuyên bố phân bố đều trên GL_n(Fp).
- Hoàn tác giữ 6 thay đổi đầu vào gần nhất. Enter, mũi tên lên/xuống chuyển ô theo dòng; Tab chuyển đến ô kế tiếp.

## Các phép toán

Cộng, trừ, nhân, nhân vô hướng, chuyển vị, định thức, nghịch đảo, hạng, vết, lũy thừa nguyên (kể cả âm khi khả nghịch), ma trận phụ hợp, phần bù đại số, dạng bậc thang/RREF, Kronecker, tích từng phần tử, ghép ngang/dọc, lấy ma trận con, bỏ dòng/cột và giao hoán tử.

Các nút phép chọn đưa công thức vào ô biểu thức. Cũng có thể nhập:

```text
2A-B
A^3+2*A+I
(A*B)^-1
A^(-3)
det(A+B)
rank(A)
adj(A)
kron(A,B)
hcat(A,B)
sub(A,1,2,2,3)
droprow(A,2)
A*B*A^-1*B^-1
```

- `I` được xác định theo kích thước ngữ cảnh ở phép cộng/nhân trực tiếp, hoặc ma trận được chọn ở ô Ma trận thứ nhất; dùng `eye(n)` nếu cần chỉ rõ kích thước.
- `zero(r,c)` tạo ma trận không. Chỉ số dòng/cột của sub, droprow, dropcol bắt đầu từ 1. Hạng trả số nguyên thông thường; các phép toán số kết hợp vẫn dùng modulo p.
- Số mũ là số nguyên trực tiếp, có thể kèm dấu và ngoặc. `A^2^3` bị từ chối; viết `(A^2)^3` nếu muốn tính tuần tự.
- Ký tự lạ, thiếu ma trận, sai số đối số, không tương thích kích thước hoặc ma trận suy biến được báo rõ; không âm thầm bỏ qua ký tự.
- Tính toán chạy trong Web Worker; Hủy tính kết thúc worker để giao diện vẫn tương tác được.

## Kết quả

Kết quả ghi biểu thức, trường tính toán và kích thước. Có thể sao chép bảng, sao chép LaTeX, tạo ma trận mới hoặc thay ma trận đầu vào. Hạng khi đưa vào ma trận được chuẩn hóa modulo p.

Lịch sử giữ tối đa 20 kết quả trong phiên trang; tải lại trang sẽ mất đầu vào và lịch sử. Kết quả thuộc trường cũ vẫn xem được, nhưng phải áp dụng lại đúng p trước khi đưa vào ma trận.

## Mã nguồn và kiểm tra

- `js/field.js`: kiểm tra nguyên tố, số học trường chính xác.
- `js/matrix.js`: các phép toán ma trận.
- `js/expression.js`: phân tích biểu thức và kiểm tra kiểu/kích thước.
- `js/worker.js`: tính toán ngoài luồng giao diện.
- `js/app.js`: nhập liệu, giao diện, kết quả và lịch sử.
- `css/app.css`: bố cục; dùng `/tools/css/header.css` cho nav chung công cụ.
- `tests/core.mjs`: kiểm tra đại số và các lỗi cú pháp.
- `tests/browser.mjs`: kiểm tra luồng thao tác và bố cục điện thoại.
