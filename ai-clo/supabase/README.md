# Supabase — AI·CLO APMaths

Thư mục backend Supabase của AI·CLO APMaths được tổ chức theo chức năng:

- `migrations/` — các SQL migration, upgrade và thay đổi schema theo phiên bản.
- `schema/` — snapshot/mô tả cấu trúc database, constraint, RLS và policy.
- `policies/` — các SQL policy riêng lẻ không thuộc chuỗi migration phiên bản.
- `functions/` — mã nguồn Supabase Edge Functions. Mỗi function phải self-contained và có thể deploy độc lập; không phụ thuộc `_shared`.
- `docs/` — hướng dẫn triển khai, cấu hình Supabase/Gemini và ghi chú vận hành.

## Nguyên tắc

- Supabase là nguồn dữ liệu chính thức của hệ thống.
- Không đưa `service_role` key hoặc secret vào repository.
- Migration mới đặt trong `migrations/`.
- Snapshot schema mới đặt trong `schema/`.
- Policy SQL độc lập đặt trong `policies/`.
- Edge Function mới đặt trong `functions/<function-name>/index.ts` và phải tự chứa dependency dùng chung cần thiết.
- Chức năng công khai phải tự kiểm soát origin/quyền truy cập phù hợp; chức năng nội bộ ưu tiên xác thực JWT.

## AI Chat

`functions/ai_clo_chat/` phục vụ trợ lý AI·CLO APMaths. Function lấy knowledge từ repository APMaths, giới hạn origin về `https://apmaths.github.io` cùng localhost phát triển và không được chứa Gemini API key trong mã nguồn.
