-- AI-CLO APMaths V12.8.2 — security hardening for profiles and assessment writes.
-- Goal:
--   1) prevent users from escalating their own profile role;
--   2) force exam-attempt creation/update through guarded SECURITY DEFINER RPCs;
--   3) force final answer writes through guarded submission RPCs.
-- Existing SELECT access is preserved for current UI/reporting flows.

begin;

-- ---------------------------------------------------------------------------
-- 1. profiles: authenticated users may only edit their own display name.
--    Role, activation state, email, MSSV and lock fields remain service/admin
--    managed through the admin-users Edge Function.
-- ---------------------------------------------------------------------------

drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists profiles_update_own_safe on public.profiles;

create policy profiles_update_own_safe
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid()) or public.is_admin()
)
with check (
  id = (select auth.uid()) or public.is_admin()
);

-- Remove broad table-level write privileges, then add back only the one safe
-- self-service column needed by the profile UI/future profile editing.
revoke all on table public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update(full_name) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. exam_attempts: clients must not create or mutate attempts directly.
--    start_exam_attempt(), finalize_exam_attempt(), submit_exam_attempt(), and
--    admin_delete_attempt() remain the only write paths.
-- ---------------------------------------------------------------------------

drop policy if exists exam_attempts_student_insert on public.exam_attempts;
drop policy if exists exam_attempts_own_update on public.exam_attempts;

revoke all on table public.exam_attempts from anon;
revoke insert, update, delete, truncate, references, trigger on table public.exam_attempts from authenticated;
grant select on table public.exam_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- 3. student_answers: final answer/correctness rows are server-owned.
--    Students save choices through attempt_draft_answers via save_exam_progress;
--    finalize_exam_attempt() materializes student_answers after submission.
-- ---------------------------------------------------------------------------

drop policy if exists student_answers_student_insert on public.student_answers;
drop policy if exists student_answers_own_update on public.student_answers;

revoke all on table public.student_answers from anon;
revoke insert, update, delete, truncate, references, trigger on table public.student_answers from authenticated;
grant select on table public.student_answers to authenticated;

commit;
