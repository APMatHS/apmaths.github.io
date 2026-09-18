# AI·CLO APMaths V12.8.2 — Security hardening

Ngày: 18/09/2026

## Mục tiêu

Khóa các đường ghi trực tiếp có thể làm sai phân quyền hoặc dữ liệu bài kiểm tra, nhưng giữ nguyên luồng sử dụng hiện tại thông qua RPC/Edge Function.

## Thay đổi

- `profiles`
  - Bỏ quyền UPDATE toàn bảng của `authenticated`.
  - Người dùng chỉ còn quyền cập nhật cột `full_name` trên hồ sơ được RLS cho phép.
  - Không thể tự sửa `role`, `is_active`, `email`, `mssv`, thông tin khóa tài khoản.
  - Quản lý tài khoản tiếp tục đi qua Edge Function `admin-users` dùng service role.

- `exam_attempts`
  - Bỏ policy ghi trực tiếp của sinh viên.
  - `authenticated` chỉ còn SELECT theo RLS.
  - Tạo/lưu/nộp lượt làm phải đi qua các RPC có kiểm quyền như `start_exam_attempt`, `save_exam_progress`, `submit_exam_attempt`, `finalize_exam_attempt`.

- `student_answers`
  - Bỏ INSERT/UPDATE trực tiếp từ client.
  - `authenticated` chỉ còn SELECT theo RLS.
  - Dữ liệu đáp án cuối và `is_correct` chỉ được tạo bởi luồng nộp bài phía server.

- `ai_live_token`
  - Lưu source chính thức tại `supabase/functions/ai_live_token/index.ts`.
  - Edge Function production chuyển sang `verify_jwt=true`.
  - Thêm kiểm tra `Authorization: Bearer ...` trong function như lớp bảo vệ thứ hai.

## Backup

Trước khi sửa đã tạo nhánh backup từ `main`:

`backup/ai-clo-before-security-fix-2026-09-18`

## Migration

`supabase/migrations/assessment-v12.8.2-security-hardening.sql`

Migration đã được áp dụng lên project Supabase `Apmaths-ai-clo` và kiểm tra lại quyền thực tế sau khi chạy.

## Kiểm tra sau cập nhật

Kết quả xác nhận trên production:

- `authenticated` UPDATE `profiles.role`: **false**
- `authenticated` UPDATE `profiles.full_name`: **true**
- `authenticated` INSERT `exam_attempts`: **false**
- `authenticated` UPDATE `exam_attempts`: **false**
- `authenticated` INSERT `student_answers`: **false**
- `authenticated` UPDATE `student_answers`: **false**
- Các RPC làm bài chính vẫn có quyền EXECUTE cho `authenticated`.
- `ai_live_token` production: `verify_jwt=true`.
