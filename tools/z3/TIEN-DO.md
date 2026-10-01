# Tiến độ — Ma trận trên Fp — 01/10/2026

## Đã thực hiện

- Thay công cụ Z3 cũ bằng bộ tính Fp, mặc định p=3, giữ URL /tools/z3/.
- BigInt cho phần tử, phân số và số mũ; kiểm tra nguyên tố xác định trong khoảng 64 bit, có nhãn xác suất với p lớn hơn.
- Bộ phân tích biểu thức đầy đủ, hỗ trợ hàm lồng nhau, số âm, lũy thừa âm và thông báo vị trí lỗi.
- Ma trận chữ nhật với kích thước riêng, dán Excel, sinh mẫu, chuẩn hóa và hoàn tác.
- Các phép toán cơ bản, định thức/hạng/vết, nghịch đảo, phụ hợp/phần bù, REF/RREF, Kronecker/Hadamard, ghép/trích/bỏ dòng cột, đa thức ma trận và giao hoán tử.
- Kết quả sao chép bảng/LaTeX, đưa vào ma trận, lịch sử 20 phép tính trong phiên.
- Web Worker, nút hủy và giới hạn tài nguyên; không dùng eval hoặc JS vá phiên bản.
- Head/nav gọn dùng header.css của các trang công cụ; không dùng nav lớn của trang /tools/.
- Không còn phụ thuộc polyfill.io hay MathJax để chạy phép tính.

## Kiểm tra

- Core đạt: toàn bộ 19.764 ma trận cấp 2 và 3 trên F3, định thức đối chiếu công thức độc lập; số ma trận khả nghịch đúng 48 và 11.232, tích nghịch đảo đúng I.
- Kiểm tra các phép ghép/trích, ma trận chữ nhật, cú pháp sai, phân số, lũy thừa lớn, prime/pseudoprime và độ chính xác vượt Number.
- Workflow trình duyệt kiểm tra các thao tác nhập/dán, thay trường, worker, xuất LaTeX, dùng lại kết quả, hoàn tác và điện thoại.

## Giới hạn

- Fp với p nguyên tố; chưa có trường mở rộng.
- p trên 64 bit chỉ kiểm tra xác suất, được ghi rõ trên giao diện.
- p tối đa 1000 chữ số; ma trận tối đa 4096 ô, tổng đầu vào 8192 ô, worker 60 giây.
- Không lưu đầu vào/lịch sử lâu dài. Không triển khai giải hệ hoặc tính toán trên số thực.
