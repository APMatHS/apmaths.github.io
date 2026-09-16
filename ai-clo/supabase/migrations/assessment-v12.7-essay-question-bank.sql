-- AI-CLO PTITHCM V12.7
-- Additive essay-question bank. Existing MCQ tables are not altered.

create table if not exists public.essay_questions (
  id uuid primary key default gen_random_uuid(),
  question_bank_id uuid not null references public.question_banks(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete restrict,
  topic_id uuid null references public.topics(id) on delete set null,
  content text not null,
  solution text not null default '',
  essay_kind text not null default 'exercise' check (essay_kind in ('theory','exercise','mixed')),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  question_scope text not null default 'practice' check (question_scope in ('practice','secure_exam','both')),
  approval_status text not null default 'draft' check (approval_status in ('draft','pending','approved','archived')),
  max_points numeric(8,2) not null default 0 check (max_points >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  version_no integer not null default 1 check (version_no >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.essay_question_parts (
  id uuid primary key default gen_random_uuid(),
  essay_question_id uuid not null references public.essay_questions(id) on delete cascade,
  order_index integer not null default 1 check (order_index >= 1),
  label text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  unique (essay_question_id, order_index)
);

create table if not exists public.essay_rubric_items (
  id uuid primary key default gen_random_uuid(),
  essay_question_part_id uuid not null references public.essay_question_parts(id) on delete cascade,
  order_index integer not null default 1 check (order_index >= 1),
  criterion text not null,
  points numeric(8,2) not null check (points > 0),
  clo_id uuid not null references public.clos(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (essay_question_part_id, order_index)
);

create table if not exists public.essay_question_revisions (
  id uuid primary key default gen_random_uuid(),
  essay_question_id uuid not null references public.essay_questions(id) on delete cascade,
  revision_no integer not null check (revision_no >= 1),
  snapshot jsonb not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now(),
  unique (essay_question_id, revision_no)
);

create index if not exists essay_questions_bank_idx on public.essay_questions(question_bank_id);
create index if not exists essay_questions_chapter_idx on public.essay_questions(chapter_id);
create index if not exists essay_questions_topic_idx on public.essay_questions(topic_id);
create index if not exists essay_questions_creator_idx on public.essay_questions(created_by);
create index if not exists essay_parts_question_idx on public.essay_question_parts(essay_question_id);
create index if not exists essay_rubric_part_idx on public.essay_rubric_items(essay_question_part_id);
create index if not exists essay_rubric_clo_idx on public.essay_rubric_items(clo_id);
create index if not exists essay_revision_question_idx on public.essay_question_revisions(essay_question_id, revision_no desc);

alter table public.essay_questions enable row level security;
alter table public.essay_question_parts enable row level security;
alter table public.essay_rubric_items enable row level security;
alter table public.essay_question_revisions enable row level security;

grant select, insert, update, delete on public.essay_questions to authenticated;
grant select, insert, update, delete on public.essay_question_parts to authenticated;
grant select, insert, update, delete on public.essay_rubric_items to authenticated;
grant select, insert on public.essay_question_revisions to authenticated;
revoke all on public.essay_questions, public.essay_question_parts, public.essay_rubric_items, public.essay_question_revisions from anon;

create policy essay_questions_staff_select on public.essay_questions
for select to authenticated
using (public.is_question_bank_teacher(question_bank_id));

create policy essay_questions_creator_insert on public.essay_questions
for insert to authenticated
with check (
  public.is_question_bank_teacher(question_bank_id)
  and (public.is_admin() or created_by = (select auth.uid()))
);

create policy essay_questions_creator_update on public.essay_questions
for update to authenticated
using (public.is_admin() or created_by = (select auth.uid()))
with check (
  public.is_question_bank_teacher(question_bank_id)
  and (public.is_admin() or created_by = (select auth.uid()))
);

create policy essay_questions_creator_delete on public.essay_questions
for delete to authenticated
using (public.is_admin() or created_by = (select auth.uid()));

create policy essay_parts_staff_select on public.essay_question_parts
for select to authenticated
using (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and public.is_question_bank_teacher(q.question_bank_id)
));

create policy essay_parts_owner_insert on public.essay_question_parts
for insert to authenticated
with check (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and public.is_question_bank_teacher(q.question_bank_id)
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create policy essay_parts_owner_update on public.essay_question_parts
for update to authenticated
using (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and (public.is_admin() or q.created_by = (select auth.uid()))
))
with check (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and public.is_question_bank_teacher(q.question_bank_id)
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create policy essay_parts_owner_delete on public.essay_question_parts
for delete to authenticated
using (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create policy essay_rubric_staff_select on public.essay_rubric_items
for select to authenticated
using (exists (
  select 1
  from public.essay_question_parts p
  join public.essay_questions q on q.id = p.essay_question_id
  where p.id = essay_question_part_id
    and public.is_question_bank_teacher(q.question_bank_id)
));

create policy essay_rubric_owner_insert on public.essay_rubric_items
for insert to authenticated
with check (exists (
  select 1
  from public.essay_question_parts p
  join public.essay_questions q on q.id = p.essay_question_id
  join public.clos c on c.id = clo_id and c.question_bank_id = q.question_bank_id
  where p.id = essay_question_part_id
    and public.is_question_bank_teacher(q.question_bank_id)
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create policy essay_rubric_owner_update on public.essay_rubric_items
for update to authenticated
using (exists (
  select 1
  from public.essay_question_parts p
  join public.essay_questions q on q.id = p.essay_question_id
  where p.id = essay_question_part_id
    and (public.is_admin() or q.created_by = (select auth.uid()))
))
with check (exists (
  select 1
  from public.essay_question_parts p
  join public.essay_questions q on q.id = p.essay_question_id
  join public.clos c on c.id = clo_id and c.question_bank_id = q.question_bank_id
  where p.id = essay_question_part_id
    and public.is_question_bank_teacher(q.question_bank_id)
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create policy essay_rubric_owner_delete on public.essay_rubric_items
for delete to authenticated
using (exists (
  select 1
  from public.essay_question_parts p
  join public.essay_questions q on q.id = p.essay_question_id
  where p.id = essay_question_part_id
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create policy essay_revisions_staff_select on public.essay_question_revisions
for select to authenticated
using (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and public.is_question_bank_teacher(q.question_bank_id)
));

create policy essay_revisions_owner_insert on public.essay_question_revisions
for insert to authenticated
with check (exists (
  select 1 from public.essay_questions q
  where q.id = essay_question_id
    and (public.is_admin() or q.created_by = (select auth.uid()))
));

create or replace function public.save_essay_question(
  p_question_id uuid,
  p_question_bank_id uuid,
  p_chapter_id uuid,
  p_topic_id uuid,
  p_content text,
  p_solution text,
  p_essay_kind text,
  p_difficulty text,
  p_question_scope text,
  p_approval_status text,
  p_parts jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_existing public.essay_questions%rowtype;
  v_total numeric(8,2) := 0;
  v_part jsonb;
  v_rubric jsonb;
  v_part_id uuid;
  v_part_index integer;
  v_rubric_index integer;
  v_snapshot jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not public.is_question_bank_teacher(p_question_bank_id) then raise exception 'No permission for this question bank'; end if;
  if nullif(btrim(coalesce(p_content,'')), '') is null then raise exception 'Question content is required'; end if;
  if p_essay_kind not in ('theory','exercise','mixed') then raise exception 'Invalid essay kind'; end if;
  if p_difficulty not in ('easy','medium','hard') then raise exception 'Invalid difficulty'; end if;
  if p_question_scope not in ('practice','secure_exam','both') then raise exception 'Invalid question scope'; end if;
  if p_approval_status not in ('draft','pending','approved','archived') then raise exception 'Invalid approval status'; end if;
  if jsonb_typeof(coalesce(p_parts,'[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_parts,'[]'::jsonb)) = 0 then raise exception 'At least one essay part is required'; end if;

  if not exists (select 1 from public.chapters c where c.id=p_chapter_id and c.question_bank_id=p_question_bank_id) then
    raise exception 'Chapter does not belong to question bank';
  end if;
  if p_topic_id is not null and not exists (select 1 from public.topics t where t.id=p_topic_id and t.question_bank_id=p_question_bank_id and t.chapter_id=p_chapter_id) then
    raise exception 'Topic does not belong to selected chapter/question bank';
  end if;

  for v_part in select value from jsonb_array_elements(p_parts)
  loop
    if jsonb_typeof(coalesce(v_part->'rubrics','[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(v_part->'rubrics','[]'::jsonb)) = 0 then
      raise exception 'Each essay part must contain at least one rubric item';
    end if;
    for v_rubric in select value from jsonb_array_elements(v_part->'rubrics')
    loop
      if nullif(btrim(coalesce(v_rubric->>'criterion','')), '') is null then raise exception 'Rubric criterion is required'; end if;
      if coalesce((v_rubric->>'points')::numeric,0) <= 0 then raise exception 'Rubric points must be greater than zero'; end if;
      if not exists (select 1 from public.clos c where c.id=(v_rubric->>'clo_id')::uuid and c.question_bank_id=p_question_bank_id) then
        raise exception 'Rubric CLO does not belong to question bank';
      end if;
      v_total := v_total + (v_rubric->>'points')::numeric;
    end loop;
  end loop;

  if p_question_id is null then
    insert into public.essay_questions(
      question_bank_id,chapter_id,topic_id,content,solution,essay_kind,difficulty,question_scope,approval_status,max_points,created_by
    ) values (
      p_question_bank_id,p_chapter_id,p_topic_id,btrim(p_content),coalesce(p_solution,''),p_essay_kind,p_difficulty,p_question_scope,p_approval_status,v_total,v_uid
    ) returning id into v_id;
  else
    select * into v_existing from public.essay_questions where id=p_question_id for update;
    if not found then raise exception 'Essay question not found'; end if;
    if not public.is_admin() and v_existing.created_by <> v_uid then raise exception 'Only creator or admin can edit'; end if;
    if v_existing.question_bank_id <> p_question_bank_id then raise exception 'Question bank cannot be changed'; end if;

    select jsonb_build_object(
      'question', to_jsonb(q),
      'parts', coalesce((
        select jsonb_agg(to_jsonb(p) || jsonb_build_object('rubrics', coalesce((
          select jsonb_agg(to_jsonb(r) order by r.order_index)
          from public.essay_rubric_items r where r.essay_question_part_id=p.id
        ), '[]'::jsonb)) order by p.order_index)
        from public.essay_question_parts p where p.essay_question_id=q.id
      ), '[]'::jsonb)
    ) into v_snapshot
    from public.essay_questions q where q.id=p_question_id;

    insert into public.essay_question_revisions(essay_question_id,revision_no,snapshot,changed_by)
    values (p_question_id,v_existing.version_no,v_snapshot,v_uid);

    update public.essay_questions set
      chapter_id=p_chapter_id,
      topic_id=p_topic_id,
      content=btrim(p_content),
      solution=coalesce(p_solution,''),
      essay_kind=p_essay_kind,
      difficulty=p_difficulty,
      question_scope=p_question_scope,
      approval_status=p_approval_status,
      max_points=v_total,
      version_no=version_no+1,
      updated_at=now()
    where id=p_question_id;

    delete from public.essay_question_parts where essay_question_id=p_question_id;
    v_id := p_question_id;
  end if;

  v_part_index := 0;
  for v_part in select value from jsonb_array_elements(p_parts)
  loop
    v_part_index := v_part_index + 1;
    insert into public.essay_question_parts(essay_question_id,order_index,label,content)
    values (v_id,v_part_index,coalesce(v_part->>'label',''),coalesce(v_part->>'content',''))
    returning id into v_part_id;

    v_rubric_index := 0;
    for v_rubric in select value from jsonb_array_elements(v_part->'rubrics')
    loop
      v_rubric_index := v_rubric_index + 1;
      insert into public.essay_rubric_items(essay_question_part_id,order_index,criterion,points,clo_id)
      values (v_part_id,v_rubric_index,btrim(v_rubric->>'criterion'),(v_rubric->>'points')::numeric,(v_rubric->>'clo_id')::uuid);
    end loop;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.save_essay_question(uuid,uuid,uuid,uuid,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.save_essay_question(uuid,uuid,uuid,uuid,text,text,text,text,text,text,jsonb) to authenticated;
