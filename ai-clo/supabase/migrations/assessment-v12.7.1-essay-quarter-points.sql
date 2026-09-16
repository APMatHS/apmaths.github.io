-- AI-CLO PTITHCM V12.7.1
-- Essay scoring safety: every rubric/CLO point is a multiple of 0.25.
-- Additive only; MCQ tables are untouched.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'essay_rubric_points_quarter_chk'
      and conrelid = 'public.essay_rubric_items'::regclass
  ) then
    alter table public.essay_rubric_items
      add constraint essay_rubric_points_quarter_chk
      check (points > 0 and points * 4 = trunc(points * 4));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'essay_question_max_points_quarter_chk'
      and conrelid = 'public.essay_questions'::regclass
  ) then
    alter table public.essay_questions
      add constraint essay_question_max_points_quarter_chk
      check (max_points >= 0 and max_points * 4 = trunc(max_points * 4));
  end if;
end
$$;
