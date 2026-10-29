-- ====================================================================
-- GUIDINI: Medical Student Cohort Academic Portal (Syllabus Radar)
-- Production Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ====================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====================================================================
-- 1. BASE TABLES
-- ====================================================================

-- 1.1 PROFILES (Linked 1:1 with Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'student')) default 'student',
  cohort_id uuid, -- Will reference public.cohorts after cohorts table creation
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.2 COHORTS (Academic Year, Study Year, Semester, Default Invite Code)
create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_year text not null default '2026 - 2027',
  study_year text not null default 'DFGSM 2 (2ème Année Médecine)',
  semester text not null default 'Semestre 1',
  invite_code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Establish foreign key from profiles to cohorts
alter table public.profiles
  drop constraint if exists fk_profiles_cohort,
  add constraint fk_profiles_cohort foreign key (cohort_id) references public.cohorts(id) on delete set null;

-- 1.3 COHORT MEMBERS (Cohort membership and role assignment)
create table if not exists public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'student')) default 'student',
  joined_at timestamptz not null default now(),
  constraint uq_cohort_user unique(cohort_id, user_id)
);

-- 1.4 COHORT INVITATION CODES / SECURE INVITE TOKENS
create table if not exists public.cohort_invites (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  code text not null unique,
  max_uses int default null, -- null = unlimited
  uses_count int not null default 0,
  expires_at timestamptz default null, -- null = never expires
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 1.5 SUBJECTS (Modules / Matières du cursus)
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text not null,
  code text,
  color text default '#0d9488',
  semester text default 'S1',
  display_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1.6 UNITS (Unités d'Enseignement / Chapitres)
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  display_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1.7 LESSONS (Cours / Séances du programme partagé)
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  title text not null,
  display_order int not null default 0,
  difficulty text not null check (difficulty in ('Facile', 'Moyen', 'Difficile', 'Très Difficile')) default 'Moyen',
  estimated_duration_min int not null check (estimated_duration_min > 0) default 60,
  revision_target int not null check (revision_target > 0) default 3,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.8 EXAMS (Examens, Contrôles continus, Épreuves)
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam_type text not null check (exam_type in ('Examen Final', 'Contrôle Continu', 'Rattrapage', 'TP/Stage')) default 'Contrôle Continu',
  exam_date timestamptz not null,
  location text,
  coefficient numeric not null check (coefficient > 0) default 1.0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1.9 EXAM SUBJECTS (Multi-subject exam association)
create table if not exists public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_exam_subject unique(exam_id, subject_id)
);

-- 1.10 LESSON PROGRESS (Strictly Personal Student Study Progress)
-- NOTE: Separated from shared curriculum lessons. Updating a shared lesson
-- never alters or resets individual student progress!
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'needs_revision')) default 'not_started',
  confidence_score int not null check (confidence_score between 1 and 5) default 3,
  last_studied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_student_lesson_progress unique(student_id, lesson_id)
);

-- 1.11 STUDY SESSIONS (Student Revision Session Logs)
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  session_date timestamptz not null default now(),
  duration_min int not null check (duration_min > 0) default 30,
  session_type text not null default 'Lecture active',
  confidence_rating int not null check (confidence_rating between 1 and 5) default 3,
  notes text,
  created_at timestamptz not null default now()
);

-- Backwards-compatibility views for legacy queries
create or replace view public.student_lesson_progress as
  select * from public.lesson_progress;

create or replace view public.student_revision_sessions as
  select * from public.study_sessions;

-- ====================================================================
-- 2. INDEXES (Optimized query performance & constraint enforcement)
-- ====================================================================

create index if not exists idx_profiles_cohort_id on public.profiles(cohort_id);
create index if not exists idx_profiles_role on public.profiles(role);

create index if not exists idx_cohort_members_cohort_id on public.cohort_members(cohort_id);
create index if not exists idx_cohort_members_user_id on public.cohort_members(user_id);

create index if not exists idx_cohort_invites_cohort_id on public.cohort_invites(cohort_id);
create index if not exists idx_cohort_invites_code on public.cohort_invites(upper(code));

create index if not exists idx_subjects_cohort_id on public.subjects(cohort_id);
create index if not exists idx_subjects_order on public.subjects(display_order);

create index if not exists idx_units_subject_id on public.units(subject_id);
create index if not exists idx_units_order on public.units(display_order);

create index if not exists idx_lessons_unit_id on public.lessons(unit_id);
create index if not exists idx_lessons_order on public.lessons(display_order);

create index if not exists idx_exams_cohort_id on public.exams(cohort_id);
create index if not exists idx_exams_date on public.exams(exam_date);

create index if not exists idx_exam_subjects_exam_id on public.exam_subjects(exam_id);
create index if not exists idx_exam_subjects_subject_id on public.exam_subjects(subject_id);

create index if not exists idx_lesson_progress_student on public.lesson_progress(student_id);
create index if not exists idx_lesson_progress_lesson on public.lesson_progress(lesson_id);
create index if not exists idx_lesson_progress_status on public.lesson_progress(status);

create index if not exists idx_study_sessions_student on public.study_sessions(student_id);
create index if not exists idx_study_sessions_lesson on public.study_sessions(lesson_id);
create index if not exists idx_study_sessions_date on public.study_sessions(session_date);

-- ====================================================================
-- 3. HELPER FUNCTIONS (Security Definer)
-- ====================================================================

-- Function to check if the authenticated user is an administrator
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Function to check if authenticated user belongs to a cohort
create or replace function public.is_member_of_cohort(target_cohort_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cohort_members
    where cohort_id = target_cohort_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.profiles
    where cohort_id = target_cohort_id and id = auth.uid()
  ) or public.is_admin();
$$;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

alter table public.profiles enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_members enable row level security;
alter table public.cohort_invites enable row level security;
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.exams enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.study_sessions enable row level security;

-- 4.1 PROFILES POLICIES
-- Users can view their own profile; admins can view all; cohort members can view peers in the same cohort
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_admin()
    or (
      cohort_id is not null and exists (
        select 1 from public.profiles peer
        where peer.id = auth.uid() and peer.cohort_id = public.profiles.cohort_id
      )
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id or public.is_admin());

-- 4.2 COHORTS POLICIES
-- Authenticated users can view cohorts (to browse or join via code); only admins can insert/update/delete
drop policy if exists "cohorts_select" on public.cohorts;
create policy "cohorts_select"
  on public.cohorts for select
  using (auth.role() = 'authenticated');

drop policy if exists "cohorts_admin_all" on public.cohorts;
create policy "cohorts_admin_all"
  on public.cohorts for all
  using (public.is_admin());

-- 4.3 COHORT MEMBERS POLICIES
-- Members can view membership of their cohort; admins have full management
drop policy if exists "cohort_members_select" on public.cohort_members;
create policy "cohort_members_select"
  on public.cohort_members for select
  using (public.is_member_of_cohort(cohort_id));

drop policy if exists "cohort_members_admin_all" on public.cohort_members;
create policy "cohort_members_admin_all"
  on public.cohort_members for all
  using (public.is_admin());

-- 4.4 COHORT INVITES POLICIES
-- Only admins can manage and view raw invite records; students validate via secure function
drop policy if exists "cohort_invites_admin_all" on public.cohort_invites;
create policy "cohort_invites_admin_all"
  on public.cohort_invites for all
  using (public.is_admin());

-- 4.5 SUBJECTS POLICIES
-- Cohort members can read subjects; only admins can create/update/delete
drop policy if exists "subjects_select_cohort" on public.subjects;
create policy "subjects_select_cohort"
  on public.subjects for select
  using (public.is_member_of_cohort(cohort_id));

drop policy if exists "subjects_admin_manage" on public.subjects;
create policy "subjects_admin_manage"
  on public.subjects for all
  using (public.is_admin());

-- 4.6 UNITS POLICIES
-- Cohort members can read units; only admins can create/update/delete
drop policy if exists "units_select_cohort" on public.units;
create policy "units_select_cohort"
  on public.units for select
  using (
    exists (
      select 1 from public.subjects s
      where s.id = units.subject_id and public.is_member_of_cohort(s.cohort_id)
    )
  );

drop policy if exists "units_admin_manage" on public.units;
create policy "units_admin_manage"
  on public.units for all
  using (public.is_admin());

-- 4.7 LESSONS POLICIES
-- Cohort members can read lessons; only admins can create/update/delete
drop policy if exists "lessons_select_cohort" on public.lessons;
create policy "lessons_select_cohort"
  on public.lessons for select
  using (
    exists (
      select 1 from public.units u
      join public.subjects s on s.id = u.subject_id
      where u.id = lessons.unit_id and public.is_member_of_cohort(s.cohort_id)
    )
  );

drop policy if exists "lessons_admin_manage" on public.lessons;
create policy "lessons_admin_manage"
  on public.lessons for all
  using (public.is_admin());

-- 4.8 EXAMS POLICIES
-- Cohort members can read exams; only admins can create/update/delete
drop policy if exists "exams_select_cohort" on public.exams;
create policy "exams_select_cohort"
  on public.exams for select
  using (public.is_member_of_cohort(cohort_id));

drop policy if exists "exams_admin_manage" on public.exams;
create policy "exams_admin_manage"
  on public.exams for all
  using (public.is_admin());

-- 4.9 EXAM SUBJECTS POLICIES
-- Cohort members can read exam subjects; only admins can create/update/delete
drop policy if exists "exam_subjects_select_cohort" on public.exam_subjects;
create policy "exam_subjects_select_cohort"
  on public.exam_subjects for select
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_subjects.exam_id and public.is_member_of_cohort(e.cohort_id)
    )
  );

drop policy if exists "exam_subjects_admin_manage" on public.exam_subjects;
create policy "exam_subjects_admin_manage"
  on public.exam_subjects for all
  using (public.is_admin());

-- 4.10 LESSON PROGRESS POLICIES (STRICT STUDENT ISOLATION)
-- Students can ONLY view, insert, update, or delete their OWN progress!
drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own"
  on public.lesson_progress for select
  using (auth.uid() = student_id or public.is_admin());

drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own"
  on public.lesson_progress for insert
  with check (auth.uid() = student_id);

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own"
  on public.lesson_progress for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
create policy "lesson_progress_delete_own"
  on public.lesson_progress for delete
  using (auth.uid() = student_id);

-- 4.11 STUDY SESSIONS POLICIES (STRICT STUDENT ISOLATION)
-- Students can ONLY view, insert, update, or delete their OWN study sessions!
drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own"
  on public.study_sessions for select
  using (auth.uid() = student_id or public.is_admin());

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own"
  on public.study_sessions for insert
  with check (auth.uid() = student_id);

drop policy if exists "study_sessions_update_own" on public.study_sessions;
create policy "study_sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own"
  on public.study_sessions for delete
  using (auth.uid() = student_id);

-- ====================================================================
-- 5. PRIVILEGE ESCALATION PREVENTION TRIGGERS
-- ====================================================================

-- Prohibit non-admin users from escalating their own or other users' roles
create or replace function public.prevent_profile_role_escalation()
returns trigger as $$
begin
  if (old.role is distinct from new.role) then
    if not public.is_admin() then
      raise exception 'Action interdite: Vous ne pouvez pas modifier votre propre rôle ou vous attribuer des privilèges administrateur.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_prevent_profile_role_escalation on public.profiles;
create trigger tr_prevent_profile_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_escalation();

-- Trigger to automatically create a profile row upon registration in auth.users
-- CRITICAL SECURITY RULE: The role is ALWAYS 'student', never trusted from user metadata!
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_cohort_id uuid;
  v_invite_code text;
begin
  -- Check if invite_code was supplied during registration
  v_invite_code := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')));

  if v_invite_code <> '' then
    -- Verify in cohort_invites
    select cohort_id into v_cohort_id
    from public.cohort_invites
    where upper(code) = v_invite_code and is_active = true and (expires_at is null or expires_at > now())
    limit 1;

    -- Fallback to default cohort invite_code
    if v_cohort_id is null then
      select id into v_cohort_id
      from public.cohorts
      where upper(invite_code) = v_invite_code
      limit 1;
    end if;
  end if;

  -- Default to the primary cohort if there is only one cohort
  if v_cohort_id is null then
    select id into v_cohort_id from public.cohorts limit 1;
  end if;

  -- Insert profile with enforced 'student' role
  insert into public.profiles (id, email, full_name, role, cohort_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'student', -- Enforce student role!
    v_cohort_id
  );

  -- If joined cohort, create membership record as 'student'
  if v_cohort_id is not null then
    insert into public.cohort_members (cohort_id, user_id, role)
    values (v_cohort_id, new.id, 'student')
    on conflict (cohort_id, user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ====================================================================
-- 6. SECURE COHORT INVITATION JOIN PROCEDURE (SECURITY DEFINER)
-- ====================================================================

-- Securely validates invite codes and adds user to cohort strictly as a student
create or replace function public.join_cohort_with_code(code_input text)
returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cohort_id uuid;
  v_cohort_name text;
  v_invite_id uuid;
  v_max_uses int;
  v_uses_count int;
  v_expires_at timestamptz;
  v_is_active boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Non authentifié. Veuillez vous connecter d''abord.');
  end if;

  code_input := upper(trim(code_input));

  -- 1. Check in cohort_invites
  select id, cohort_id, max_uses, uses_count, expires_at, is_active
  into v_invite_id, v_cohort_id, v_max_uses, v_uses_count, v_expires_at, v_is_active
  from public.cohort_invites
  where upper(code) = code_input;

  -- 2. Fallback to primary cohort invite code
  if v_cohort_id is null then
    select id, name into v_cohort_id, v_cohort_name
    from public.cohorts
    where upper(invite_code) = code_input;

    if v_cohort_id is null then
      return json_build_object('success', false, 'error', 'Code d''invitation invalide ou introuvable.');
    end if;
  else
    if not v_is_active then
      return json_build_object('success', false, 'error', 'Ce code d''invitation a été désactivé.');
    end if;
    if v_expires_at is not null and v_expires_at < now() then
      return json_build_object('success', false, 'error', 'Ce code d''invitation a expiré.');
    end if;
    if v_max_uses is not null and v_uses_count >= v_max_uses then
      return json_build_object('success', false, 'error', 'Ce code d''invitation a atteint sa limite d''utilisations.');
    end if;

    select name into v_cohort_name from public.cohorts where id = v_cohort_id;

    -- Increment usage counter
    update public.cohort_invites
    set uses_count = uses_count + 1
    where id = v_invite_id;
  end if;

  -- 3. Register user in cohort_members strictly as 'student'
  insert into public.cohort_members (cohort_id, user_id, role)
  values (v_cohort_id, v_user_id, 'student')
  on conflict (cohort_id, user_id)
  do update set joined_at = now();

  -- 4. Update profile cohort_id
  update public.profiles
  set cohort_id = v_cohort_id, updated_at = now()
  where id = v_user_id;

  return json_build_object(
    'success', true,
    'cohort_id', v_cohort_id,
    'cohort_name', v_cohort_name,
    'message', 'Félicitations, vous avez rejoint la cohorte avec succès.'
  );
end;
$$;

-- ====================================================================
-- 7. SAFE FIRST-ADMIN PROVISIONING PROCEDURE (SERVER-SIDE / SQL)
-- ====================================================================

-- Function to safely promote an existing registered user to administrator.
-- Can be called via Supabase SQL Editor:
--   SELECT public.promote_user_to_admin('delegue@univ.dz');
create or replace function public.promote_user_to_admin(target_email text)
returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  target_email := lower(trim(target_email));
  select id into v_user_id from public.profiles where lower(email) = target_email;

  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Utilisateur introuvable avec l''email: ' || target_email);
  end if;

  -- Update profile to admin
  update public.profiles
  set role = 'admin', updated_at = now()
  where id = v_user_id;

  -- Update cohort_members to admin
  update public.cohort_members
  set role = 'admin'
  where user_id = v_user_id;

  return json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', target_email,
    'message', 'L''utilisateur ' || target_email || ' a été promu Administrateur avec succès.'
  );
end;
$$;

-- ====================================================================
-- 8. INITIAL SEED DATA (Medical Cohort DFGSM 2)
-- ====================================================================

-- Default Cohort
insert into public.cohorts (id, name, academic_year, study_year, semester, invite_code)
values (
  'c0a80101-0000-4000-8000-000000000001',
  'Faculté de Médecine - Cohorte DFGSM 2',
  '2026 - 2027',
  'DFGSM 2 (Deuxième Année)',
  'Semestre 1',
  'MED-2026-ALG'
)
on conflict (id) do update set
  name = excluded.name,
  invite_code = excluded.invite_code;

-- Primary Invite Record
insert into public.cohort_invites (cohort_id, code, is_active)
values (
  'c0a80101-0000-4000-8000-000000000001',
  'MED-2026-ALG',
  true
)
on conflict (code) do nothing;

-- 8.1 Subject: Cardiologie
insert into public.subjects (id, cohort_id, name, code, color, semester, display_order)
values
  ('sub-cardio-01', 'c0a80101-0000-4000-8000-000000000001', 'Cardiologie & Vasculaire', 'CARD-201', '#0284c7', 'S1', 1)
on conflict (id) do nothing;

insert into public.units (id, subject_id, title, display_order)
values
  ('unit-cardio-u1', 'sub-cardio-01', 'Physiopathologie Cardiovasculaire', 1),
  ('unit-cardio-u2', 'sub-cardio-01', 'Rythmologie & Valvulopathies', 2)
on conflict (id) do nothing;

insert into public.lessons (id, unit_id, title, display_order, difficulty, estimated_duration_min, notes)
values
  ('les-cardio-01', 'unit-cardio-u1', 'Insuffisance Cardiaque Aiguë et Chronique', 1, 'Difficile', 90, 'Classification NYHA et critères de Framingham.'),
  ('les-cardio-02', 'unit-cardio-u1', 'Hypertension Artérielle de l''adulte (HTA)', 2, 'Moyen', 60, 'Recommandations ESC/ESH et complications cibles.'),
  ('les-cardio-03', 'unit-cardio-u1', 'Syndromes Coronariens Aigus (SCA ST+ et ST-)', 3, 'Très Difficile', 120, 'ECG en urgence, cinétique troponine et reperfusion.'),
  ('les-cardio-04', 'unit-cardio-u2', 'Fibrillation Atriale (FA) et Flutter', 1, 'Difficile', 75, 'Score CHA2DS2-VASc et anticoagulation.'),
  ('les-cardio-05', 'unit-cardio-u2', 'Rétrécissement Aortique & Insuffisance Mitrale', 2, 'Moyen', 60, 'Auscultation cardiaque et indications chirurgicales.')
on conflict (id) do nothing;

-- 8.2 Subject: Pneumologie
insert into public.subjects (id, cohort_id, name, code, color, semester, display_order)
values
  ('sub-pneumo-02', 'c0a80101-0000-4000-8000-000000000001', 'Pneumologie', 'PNEU-202', '#0d9488', 'S1', 2)
on conflict (id) do nothing;

insert into public.units (id, subject_id, title, display_order)
values
  ('unit-pneumo-u1', 'sub-pneumo-02', 'Pathologies Obstructives & Infectieuses', 1)
on conflict (id) do nothing;

insert into public.lessons (id, unit_id, title, display_order, difficulty, estimated_duration_min, notes)
values
  ('les-pneu-01', 'unit-pneumo-u1', 'Asthme aigu grave et traitement de fond', 1, 'Moyen', 60, 'Paliers GINA et urgence de la crise sévère.'),
  ('les-pneu-02', 'unit-pneumo-u1', 'Bronchopneumopathie Chronique Obstructive (BPCO)', 2, 'Difficile', 80, 'EFR, classification GOLD et oxygénothérapie.'),
  ('les-pneu-03', 'unit-pneumo-u1', 'Pneumonies Aiguës Communautaires (PAC)', 3, 'Moyen', 60, 'Score CRB-65 et antibiothérapie probabiliste.')
on conflict (id) do nothing;

-- 8.3 Exams & Exam Subjects
insert into public.exams (id, cohort_id, subject_id, title, exam_type, exam_date, location, coefficient)
values
  ('exam-001', 'c0a80101-0000-4000-8000-000000000001', 'sub-cardio-01', 'Contrôle Continu Cardiologie (QCM + Cas Clinique)', 'Contrôle Continu', now() + interval '12 days', 'Amphithéâtre Pasteur', 1.5),
  ('exam-002', 'c0a80101-0000-4000-8000-000000000001', 'sub-pneumo-02', 'Partiel de Pneumologie', 'Examen Final', now() + interval '28 days', 'Hall des Examens B', 2.0)
on conflict (id) do nothing;

insert into public.exam_subjects (id, exam_id, subject_id)
values
  ('exsub-001', 'exam-001', 'sub-cardio-01'),
  ('exsub-002', 'exam-002', 'sub-pneumo-02')
on conflict (id) do nothing;
