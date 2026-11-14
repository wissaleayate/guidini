-- ====================================================================
-- GUIDINI: Migration 20261114000000_unit01_cardiovasculo_pulmonaire.sql
-- Add Unit 01 Cardiovasculo-Pulmonaire tracking, lesson availability,
-- and archive references.
-- ====================================================================

-- 1. Add current_unit_name and current_unit_status to cohorts
alter table public.cohorts
  add column if not exists current_unit_name text not null default 'Unité 01 – Cardiovasculo-Pulmonaire',
  add column if not exists current_unit_status text not null default 'in_progress' check (current_unit_status in ('in_progress', 'completed', 'archived'));

-- 2. Add description, source_file_ref, and is_available to lessons
alter table public.lessons
  add column if not exists description text,
  add column if not exists source_file_ref text,
  add column if not exists is_available boolean not null default true;

-- 3. Indexes for fast queries
create index if not exists idx_lessons_is_available on public.lessons(is_available);
create index if not exists idx_lessons_unit_available on public.lessons(unit_id, is_available);

-- 4. Update existing default cohort if present
update public.cohorts
set current_unit_name = 'Unité 01 – Cardiovasculo-Pulmonaire',
    current_unit_status = 'in_progress'
where current_unit_name is null;
