-- AI-CLO PTITHCM V12.7.2
-- Essay display codes are sequential inside each question bank: TL-000001, TL-000002, ...
-- Adds lightweight AI session history for essay generation/variants.
-- Additive only; MCQ schema is untouched.

alter table public.essay_questions
  add column if not exists display_number integer,
  add column if not exists display_code varchar(9);

-- Backfill existing essay questions independently inside each question bank.
with ranked as (
  select id,
         row_number() over (
           partition by question_bank_id
           order by created_at, id
         )::integer as rn
  from public.essay_questions
)
update public.essay_questions q
set display_number = ranked.rn,
    display_code = 'TL-' || lpad(ranked.rn::text, 6, '0')
from ranked
where ranked.id = q.id
  and (q.display_number is null or q.display_code is null);

create unique index if not exists essay_questions_bank_display_number_uidx
  on public.essay_questions(question_bank_id, display_number);
create unique index if not exists essay_questions_bank_display_code_uidx
  on public.essay_questions(question_bank_id, display_code);

alter table public.essay_questions
  alter column display_number set not null,
  alter column display_code set not null;

create or replace function public.assign_essay_question_display_code()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_next integer;
begin
  if new.display_number is not null and nullif(new.display_code, '') is not null then
    return new;
  end if;

  -- One allocator at a time for each question bank.
  perform pg_advisory_xact_lock(hashtextextended('essay-code:' || new.question_bank_id::text, 0));

  select coalesce(max(display_number), 0) + 1
  into v_next
  from public.essay_questions
  where question_bank_id = new.question_bank_id;

  new.display_number := v_next;
  new.display_code := 'TL-' || lpad(v_next::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists trg_assign_essay_question_display_code on public.essay_questions;
create trigger trg_assign_essay_question_display_code
before insert on public.essay_questions
for each row execute function public.assign_essay_question_display_code();

-- AI generation history for the essay bank. This does not store secrets.
create table if not exists public.essay_ai_sessions (
  id uuid primary key default gen_random_uuid(),
  question_bank_id uuid not null references public.question_banks(id) on delete cascade,
  question_scope text not null check (question_scope in ('practice','secure_exam')),
  generation_type text not null check (generation_type in ('create','variant')),
  source_question_id uuid null references public.essay_questions(id) on delete set null,
  chapter_id uuid null references public.chapters(id) on delete set null,
  topic_id uuid null references public.topics(id) on delete set null,
  specification jsonb not null default '{}'::jsonb,
  model text null,
  generated_count integer not null default 1 check (generated_count >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists essay_ai_sessions_bank_created_idx
  on public.essay_ai_sessions(question_bank_id, created_at desc);
create index if not exists essay_ai_sessions_source_idx
  on public.essay_ai_sessions(source_question_id);

alter table public.essay_ai_sessions enable row level security;

grant select, insert, delete on public.essay_ai_sessions to authenticated;
revoke all on public.essay_ai_sessions from anon;

create policy essay_ai_sessions_staff_select on public.essay_ai_sessions
for select to authenticated
using (public.is_question_bank_teacher(question_bank_id));

create policy essay_ai_sessions_creator_insert on public.essay_ai_sessions
for insert to authenticated
with check (
  public.is_question_bank_teacher(question_bank_id)
  and created_by = (select auth.uid())
);

create policy essay_ai_sessions_creator_delete on public.essay_ai_sessions
for delete to authenticated
using (public.is_admin() or created_by = (select auth.uid()));
