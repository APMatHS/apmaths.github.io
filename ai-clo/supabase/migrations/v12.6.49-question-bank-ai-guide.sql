-- AI-CLO PTITHCM V12.6.49
-- Hướng dẫn AI dùng chung theo Question Bank để các học phần/lớp dùng chung ngân hàng
-- nhận cùng một phạm vi và quy tắc sinh câu hỏi.

create table if not exists public.question_bank_ai_guides (
  question_bank_id uuid primary key references public.question_banks(id) on delete cascade,
  instruction text not null default '',
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_ai_guides_instruction_length check (char_length(instruction) <= 12000)
);

alter table public.question_bank_ai_guides enable row level security;

drop policy if exists question_bank_ai_guides_member_select on public.question_bank_ai_guides;
create policy question_bank_ai_guides_member_select
on public.question_bank_ai_guides
for select
to authenticated
using (public.is_question_bank_member(question_bank_id));

drop policy if exists question_bank_ai_guides_teacher_insert on public.question_bank_ai_guides;
create policy question_bank_ai_guides_teacher_insert
on public.question_bank_ai_guides
for insert
to authenticated
with check (public.is_question_bank_teacher(question_bank_id));

drop policy if exists question_bank_ai_guides_teacher_update on public.question_bank_ai_guides;
create policy question_bank_ai_guides_teacher_update
on public.question_bank_ai_guides
for update
to authenticated
using (public.is_question_bank_teacher(question_bank_id))
with check (public.is_question_bank_teacher(question_bank_id));

drop policy if exists question_bank_ai_guides_teacher_delete on public.question_bank_ai_guides;
create policy question_bank_ai_guides_teacher_delete
on public.question_bank_ai_guides
for delete
to authenticated
using (public.is_question_bank_teacher(question_bank_id));

grant select, insert, update, delete on public.question_bank_ai_guides to authenticated;
grant all on public.question_bank_ai_guides to service_role;
