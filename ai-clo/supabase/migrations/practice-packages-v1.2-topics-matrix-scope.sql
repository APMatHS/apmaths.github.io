-- Practice PDF v1.2: phạm vi Mục và 2 kiểu ma trận CLO.
alter table public.practice_packages
  add column if not exists topic_ids uuid[] not null default '{}';

alter table public.practice_packages
  add column if not exists matrix_scope text not null default 'chapter';

alter table public.practice_packages
  drop constraint if exists practice_packages_matrix_scope_check;

alter table public.practice_packages
  add constraint practice_packages_matrix_scope_check
  check (matrix_scope in ('chapter','topic'));

-- Tương thích gói v1.1: gói đã chọn Chương được hiểu là chọn toàn bộ Mục của Chương.
update public.practice_packages p
set topic_ids = coalesce((
  select array_agg(t.id order by t.order_index)
  from public.topics t
  where t.chapter_id = any(p.chapter_ids)
), '{}')
where cardinality(p.topic_ids)=0;

comment on column public.practice_packages.topic_ids is
  'Các Mục/chủ đề được phép rút trong gói ôn tập.';
comment on column public.practice_packages.matrix_scope is
  'chapter = CLO theo Chương; topic = CLO theo Mục.';
