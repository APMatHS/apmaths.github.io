-- Public Practice PDF V1
-- Cấu hình rút đề ôn tập công khai theo học phần; không mở trực tiếp bảng cho anon/authenticated.

create table if not exists public.practice_configs (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null unique references public.subjects(id) on delete cascade,
  access_code text not null,
  is_enabled boolean not null default false,
  question_count integer not null default 20 check (question_count between 1 and 200),
  matrix jsonb not null default '[]'::jsonb,
  include_answers boolean not null default false,
  allow_unlimited_redraw boolean not null default true,
  open_at timestamptz null,
  close_at timestamptz null,
  title text null,
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_configs_access_code_len check (char_length(trim(access_code)) between 4 and 32),
  constraint practice_configs_window check (open_at is null or close_at is null or open_at < close_at)
);

create unique index if not exists practice_configs_access_code_upper_uidx
  on public.practice_configs (upper(access_code));
create index if not exists practice_configs_enabled_idx
  on public.practice_configs (is_enabled);

create table if not exists public.practice_draws (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  seed text not null,
  selected_question_ids uuid[] not null,
  drawn_at timestamptz not null default now(),
  constraint practice_draws_seed_len check (char_length(seed) between 4 and 40),
  constraint practice_draws_subject_seed_unique unique (subject_id, seed)
);

create index if not exists practice_draws_subject_drawn_idx
  on public.practice_draws (subject_id, drawn_at desc);

alter table public.practice_configs enable row level security;
alter table public.practice_draws enable row level security;

revoke all on public.practice_configs from anon, authenticated;
revoke all on public.practice_draws from anon, authenticated;
grant all on public.practice_configs to service_role;
grant all on public.practice_draws to service_role;

comment on table public.practice_configs is 'Cấu hình cổng rút đề ôn tập PDF công khai theo học phần.';
comment on table public.practice_draws is 'Lưu seed và danh sách câu đã rút để tái tạo đề mà không lưu file PDF.';
