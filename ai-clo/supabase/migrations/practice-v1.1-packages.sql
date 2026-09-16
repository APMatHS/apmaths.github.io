create table if not exists public.practice_packages (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  is_enabled boolean not null default true,
  chapter_ids uuid[] not null default '{}'::uuid[],
  draw_mode text not null default 'count' check (draw_mode in ('count','matrix')),
  question_count integer not null default 20 check (question_count between 1 and 200),
  matrix jsonb not null default '[]'::jsonb,
  include_answers boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_packages_name_len check (char_length(btrim(name)) between 1 and 120),
  constraint practice_packages_chapters_not_empty check (cardinality(chapter_ids) >= 1)
);

create index if not exists practice_packages_subject_idx on public.practice_packages(subject_id, sort_order, created_at);
alter table public.practice_packages enable row level security;
revoke all on table public.practice_packages from anon, authenticated;
grant all on table public.practice_packages to service_role;

alter table public.practice_draws add column if not exists package_id uuid references public.practice_packages(id) on delete set null;

do $$ begin
  if exists (
    select 1 from pg_constraint where conname='practice_draws_subject_seed_unique' and conrelid='public.practice_draws'::regclass
  ) then
    alter table public.practice_draws drop constraint practice_draws_subject_seed_unique;
  end if;
end $$;

create unique index if not exists practice_draws_subject_package_seed_unique
  on public.practice_draws(subject_id, package_id, seed)
  where package_id is not null;

insert into public.practice_packages(subject_id,name,is_enabled,chapter_ids,draw_mode,question_count,matrix,include_answers,sort_order)
select pc.subject_id,
       'Ôn tập toàn môn',
       true,
       array_agg(ch.id order by ch.order_index),
       case when jsonb_typeof(pc.matrix)='array' and jsonb_array_length(pc.matrix)>0 then 'matrix' else 'count' end,
       pc.question_count,
       coalesce(pc.matrix,'[]'::jsonb),
       pc.include_answers,
       0
from public.practice_configs pc
join public.subjects s on s.id=pc.subject_id
join public.chapters ch on ch.question_bank_id=s.question_bank_id
where not exists (select 1 from public.practice_packages pp where pp.subject_id=pc.subject_id)
group by pc.subject_id,pc.matrix,pc.question_count,pc.include_answers;
