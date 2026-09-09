# AI-CLO APMatHS — V1.0

> Bản ghi trạng thái khởi đầu của AI-CLO trong repository `APMatHS/apmaths.github.io`.

## Thông tin phiên bản

- Phiên bản sản phẩm tại APMatHS: **V1.0**
- Ngày chốt: **10/09/2026 (UTC+7)**
- Repository: `APMatHS/apmaths.github.io`
- Nhánh chuẩn: `main`
- Đường dẫn triển khai: `/ai-clo/`
- Commit nền trước khi tạo bản ghi này: `472ec7fe793dde09bda65200c5eeabce2ce4242e`
- Trạng thái quyền truy cập repo: có quyền đọc và ghi trên `main`
- Nền mã được kế thừa: **AI-CLO PTITHCM V12.6.43**
- Backend Assessment checkpoint được tài liệu hiện hành ghi nhận: `assessment_schema_version = 12.3.1`

V1.0 là mốc phiên bản khởi đầu của bản AI-CLO nằm trong hệ sinh thái APMatHS. Các số phiên bản V12.6.x trong tên file, query cache, migration và tài liệu cũ vẫn là lịch sử kỹ thuật của nền mã được kế thừa; không đổi hàng loạt các số này chỉ để gắn nhãn V1.0.

## Trạng thái triển khai hiện tại

- Frontend là ứng dụng tĩnh phục vụ bằng GitHub Pages.
- Trang công khai: `index.html`, `gioi-thieu.html`, `huong-dan.html`, `chinh-sach.html`.
- Ứng dụng đăng nhập: `app.html`.
- Backend sử dụng Supabase cho PostgreSQL, Auth, Storage, RLS, RPC, autosave, dữ liệu giám sát và Edge Functions.
- `app.html` đã chuyển preconnect sang Supabase mới của dự án APMatHS tại commit nền nêu trên.
- Cấu trúc chính trong `/ai-clo/`: `assets/`, `css/`, `data/`, `docs/`, `js/`, `supabase/`, `templates/`, `tools/`.
- Tệp `.nojekyll` đã có để phục vụ trực tiếp qua GitHub Pages.

## Chức năng đã có

### Quản lý hệ thống và học phần

- Đăng nhập theo tài khoản được quản trị viên cấp.
- Phân vai Admin, giảng viên và sinh viên.
- Quản lý học phần, thành viên, chương, chủ đề và CLO.
- Tổng quan, thông báo, nhật ký và hồ sơ người dùng.

### Ngân hàng câu hỏi

- Hai nguồn: **Luyện tập – kiểm tra** và **Đề thi – bảo mật**.
- Hỗ trợ thêm/sửa câu, AI hỗ trợ, nhập Excel hàng loạt, lọc và phân tích ma trận.
- Workbook nhập chính dùng sheet `Cau_hoi`; mã câu được hệ thống tự sinh.
- Hover desktop do `js/questions/hover-preview.js` sở hữu duy nhất, hiển thị nội dung và A/B/C/D nhưng không đánh dấu đáp án đúng.
- Nhiều học phần có thể dùng chung `question_bank_id`; không được giả định ngân hàng câu hỏi thuộc trực tiếp một học phần theo mô hình cũ.

### Đánh giá trực tuyến

Các chế độ rút câu hiện có:

1. `common_fixed` — đề chung cố định.
2. `student_fixed` — đề riêng cố định theo sinh viên.
3. `attempt_random` — rút lại mỗi lượt làm.
4. `mixed_fixed_random` — cố định kết hợp rút ngẫu nhiên.

Luồng hiện có gồm tạo bài, ma trận câu hỏi, xem chi tiết, làm bài, autosave, nộp/chấm điểm, kết quả CLO, xuất dữ liệu và quản lý lượt làm.

### AI-CLO | LIVE

- Là subpage bên trong `app.html`.
- Giảng viên theo dõi tiến độ, câu hiện tại, thời gian còn lại, heartbeat, fullscreen, số lần và tổng thời gian rời màn hình, cảnh báo, mất kết nối và trạng thái nộp.
- Không hiển thị phương án A/B/C/D sinh viên đang chọn.
- Telemetry đi qua RPC; không truy cập trực tiếp bảng telemetry từ frontend.
- Đây là tín hiệu giám sát, không phải secure browser/kiosk tuyệt đối.

### Giữ trạng thái giao diện

- `js/ui/subpage-state.js` phục hồi subpage sau reload/discard thực sự.
- `js/ui/form-persistence.js` giữ form/draft và trạng thái nhập.
- Chuyển browser tab rồi quay lại phải giữ DOM sống, scroll và workspace; không render lại bằng `visibilitychange`, `pageshow` hoặc `focus`.
- Bấm sidebar là điều hướng chủ động về trang mẹ của mục tương ứng.

### Công cụ độc lập

- Công cụ **Chấm thi CLO** là luồng public độc lập, không trộn với Assessment online.

## Kiến trúc và quy tắc kỹ thuật đang áp dụng

- Một hành vi quan trọng chỉ có một runtime owner.
- Sửa đúng module owner; tránh wrapper, monkey patch và listener trùng.
- Assessment dùng `js/assessment.js` làm owner/router/lifecycle public duy nhất; các module con đăng ký qua `window.AICLO_ASSESSMENT_MODULES`.
- Supabase là nguồn dữ liệu nghiệp vụ chính thức; local/session storage chỉ dùng cho UI state, draft và recovery.
- Frontend không chứa service-role key và không bypass RLS.
- Thay đổi schema, RPC hoặc RLS phải có migration rõ ràng trong `supabase/migrations/`.
- Edge Function phải self-contained, có thể deploy độc lập và không phụ thuộc thư mục `_shared`.
- Sửa mã Edge Function trên GitHub không đồng nghĩa Function đã được redeploy trên Supabase.
- CSS được tổ chức theo owner/domain; không khôi phục `css/ui/final-layer.css`, và `app.html` không load `css/public.css`.
- Mobile không được làm toàn ứng dụng tràn ngang; bảng rộng phải cuộn trong vùng riêng hoặc chuyển sang card.

## Backend cần đối chiếu trước khi nghiệm thu V1.0

Tài liệu/migration hiện có ghi nhận các phần sau, nhưng cần kiểm tra trực tiếp trên Supabase production mới trước khi coi backend hoàn tất:

- Schema/RLS/RPC nền của Assessment.
- Migration chế độ `mixed_fixed_random`.
- Migration ownership ngân hàng câu hỏi dùng chung.
- `assessment-v12.6.34-live-monitoring.sql`.
- `assessment-v12.6.35-ios-live-sync.sql`.
- Edge Functions cần thiết đã được deploy lại vào project Supabase mới.
- Biến môi trường và khóa API của từng Edge Function đã được cấu hình đúng.

Không ghi khóa bí mật hoặc service-role key vào repository hay tài liệu phiên bản.

## Kiểm thử ưu tiên sau mốc V1.0

- Đăng nhập thực tế cho Admin, giảng viên và sinh viên trên Supabase mới.
- Teacher mở Chi tiết bài kiểm tra và thấy AI-CLO | LIVE ngay, không cần F5.
- Sinh viên desktop/iPhone rời màn hình; teacher nhận đúng event và thời gian away dừng khi quay lại.
- Đổi browser tab giữ nguyên DOM, vị trí cuộn, form và workspace.
- Bấm sidebar mở đúng trang mẹ.
- Xóa attempt làm cascade Live state/history đúng lượt.
- Ngân hàng câu hỏi chỉ có một hover; list/detail cùng hiển thị nhãn **AI hỗ trợ**.
- Import Excel đọc đúng sheet `Cau_hoi`.
- Kiểm tra RLS giữa teacher/student và giữa các học phần/ngân hàng dùng chung.
- Kiểm tra xuất kết quả Excel và công cụ Chấm thi CLO.
- Kiểm tra responsive, đặc biệt không tràn ngang trên điện thoại.
- Kiểm tra build/deploy GitHub Pages sau commit V1.0.

## Tài liệu nguồn cần đọc trước khi tiếp tục sửa

1. `README.md`
2. `docs/project/PROJECT-NOTES-AI-CLO.md`
3. `docs/project/ARCHITECTURE-AI-CLO.md`
4. `docs/project/TECHNICAL-AGREEMENTS.md`
5. `docs/project/PROJECT-STATUS-2026-09-08.md`
6. `docs/project/PROJECT-PROGRESS-2026-09-08.md`
7. Mã mới nhất trên nhánh `main`

## Kết luận checkpoint

**V1.0 đã được chốt ở mức mã nguồn hiện tại của `/ai-clo/` trên APMatHS.** Frontend và toàn bộ lịch sử kỹ thuật đã có trong repository. Công việc tiếp theo nên là đối chiếu Supabase production mới, chạy đủ migration/Edge Function cần thiết và thực hiện smoke test theo danh sách trên trước khi xác nhận sẵn sàng vận hành thực tế.
