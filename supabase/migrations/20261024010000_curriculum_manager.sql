-- ====================================================================
-- GUIDINI: Migration 20261024010000_curriculum_manager.sql
-- Add revision_target, archiving, and multi-subject support
-- ====================================================================

-- 1. Add revision_target and is_archived to lessons
alter table public.lessons
  add column if not exists revision_target int not null default 3 check (revision_target > 0),
  add column if not exists is_archived boolean not null default false;

-- 2. Add is_archived to subjects and units
alter table public.subjects
  add column if not exists is_archived boolean not null default false;

alter table public.units
  add column if not exists is_archived boolean not null default false;

-- 3. Add is_archived to exams
alter table public.exams
  add column if not exists is_archived boolean not null default false;

-- 4. Index on display_order and is_archived
create index if not exists idx_lessons_archived on public.lessons(is_archived);
create index if not exists idx_subjects_archived on public.subjects(is_archived);
create index if not exists idx_units_archived on public.units(is_archived);

-- 5. Helper function to check if a lesson has student progress before deletion
create or replace function public.get_lesson_progress_count(target_lesson_id uuid)
returns int language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.lesson_progress where lesson_id = target_lesson_id;
$$;
