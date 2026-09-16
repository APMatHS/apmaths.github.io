-- AI-CLO PTITHCM V12.7.3
-- Keep TL-000001... monotonic per question bank even when the highest question is deleted.

create table if not exists public.essay_question_counters (
  question_bank_id uuid primary key references public.question_banks(id) on delete cascade,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

insert into public.essay_question_counters(question_bank_id,last_number)
select question_bank_id, coalesce(max(display_number),0)
from public.essay_questions
group by question_bank_id
on conflict (question_bank_id) do update
set last_number = greatest(public.essay_question_counters.last_number, excluded.last_number),
    updated_at = now();

alter table public.essay_question_counters enable row level security;
revoke all on public.essay_question_counters from anon, authenticated;

create or replace function public.assign_essay_question_display_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next integer;
begin
  if new.display_number is not null and nullif(new.display_code, '') is not null then
    return new;
  end if;

  insert into public.essay_question_counters(question_bank_id,last_number,updated_at)
  values (new.question_bank_id,1,now())
  on conflict (question_bank_id) do update
  set last_number = public.essay_question_counters.last_number + 1,
      updated_at = now()
  returning last_number into v_next;

  new.display_number := v_next;
  new.display_code := 'TL-' || lpad(v_next::text, 6, '0');
  return new;
end;
$$;

revoke all on function public.assign_essay_question_display_code() from public, anon, authenticated;
