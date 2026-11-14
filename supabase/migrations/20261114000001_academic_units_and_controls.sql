-- ====================================================================
-- GUIDINI: MIGRATION 20261114000001
-- Organisation Académique Réelle : 4 Grandes Unités + 4 Modules Indépendants + 8 Contrôles
-- ====================================================================

-- 1. Table ACADEMIC_UNITS (Grandes Unités d'Enseignement Intégrées)
create table if not exists public.academic_units (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text not null,
  code text,
  color text default '#0d9488',
  semester text default 'S1',
  display_order int not null default 0,
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'archived')) default 'not_started',
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS sur ACADEMIC_UNITS
alter table public.academic_units enable row level security;

create policy "academic_units_select_cohort"
  on public.academic_units for select
  using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.cohort_members
      where cohort_members.cohort_id = academic_units.cohort_id
      and cohort_members.user_id = auth.uid()
    )
  );

create policy "academic_units_admin_all"
  on public.academic_units for all
  using (
    auth.role() = 'authenticated' and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  )
  with check (
    auth.role() = 'authenticated' and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 2. Liens vers ACADEMIC_UNITS et distinction des Modules Indépendants dans SUBJECTS
alter table public.subjects add column if not exists academic_unit_id uuid references public.academic_units(id) on delete set null;
alter table public.subjects add column if not exists is_independent boolean not null default false;

create index if not exists idx_subjects_academic_unit on public.subjects(academic_unit_id);
create index if not exists idx_subjects_independent on public.subjects(is_independent);

-- 3. Mise à jour de EXAMS pour supporter les 8 contrôles avec dates facultatives (non inventées)
-- Rend exam_date optionnel (null = date à définir par l'administration)
alter table public.exams alter column exam_date drop not null;

-- Ajout des colonnes de rattachement d'unité et métadonnées d'examen
alter table public.exams add column if not exists academic_unit_id uuid references public.academic_units(id) on delete set null;
alter table public.exams add column if not exists target_type text check (target_type in ('unit', 'independent_module')) default 'unit';
alter table public.exams add column if not exists exam_time text;
alter table public.exams add column if not exists notes text;

create index if not exists idx_exams_academic_unit on public.exams(academic_unit_id);
create index if not exists idx_exams_target_type on public.exams(target_type);

-- 4. Initialisation des 4 Grandes Unités Pédagogiques (Cohorte DFGSM 2)
insert into public.academic_units (id, cohort_id, name, code, color, semester, display_order, status)
select
  'c0a80101-0000-4000-8000-000000000011'::uuid,
  c.id,
  'Unité 01 – Cardiovasculo-Pulmonaire',
  'UE-01',
  '#0d9488',
  'S1',
  1,
  'in_progress'
from public.cohorts c
where not exists (
  select 1 from public.academic_units where id = 'c0a80101-0000-4000-8000-000000000011'::uuid
);

insert into public.academic_units (id, cohort_id, name, code, color, semester, display_order, status)
select
  'c0a80101-0000-4000-8000-000000000012'::uuid,
  c.id,
  'Unité 02 – Neuro / Hémato / Locomoteur',
  'UE-02',
  '#6366f1',
  'S1',
  2,
  'not_started'
from public.cohorts c
where not exists (
  select 1 from public.academic_units where id = 'c0a80101-0000-4000-8000-000000000012'::uuid
);

insert into public.academic_units (id, cohort_id, name, code, color, semester, display_order, status)
select
  'c0a80101-0000-4000-8000-000000000013'::uuid,
  c.id,
  'Unité 03 – Endocrino / Uro-génital',
  'UE-03',
  '#f59e0b',
  'S1',
  3,
  'not_started'
from public.cohorts c
where not exists (
  select 1 from public.academic_units where id = 'c0a80101-0000-4000-8000-000000000013'::uuid
);

insert into public.academic_units (id, cohort_id, name, code, color, semester, display_order, status)
select
  'c0a80101-0000-4000-8000-000000000014'::uuid,
  c.id,
  'Unité 04 – Gastro / Hémato',
  'UE-04',
  '#ef4444',
  'S1',
  4,
  'not_started'
from public.cohorts c
where not exists (
  select 1 from public.academic_units where id = 'c0a80101-0000-4000-8000-000000000014'::uuid
);
