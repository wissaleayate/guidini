-- ====================================================================
-- GUIDINI: MIGRATION 20261114000002
-- Sécurisation du Compte Administrateur Unique et Gestion des Étudiants
-- ====================================================================

-- 1. Ajout des colonnes de statut et d'activation sur les profils étudiants
alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists status text not null default 'active' check (status in ('active', 'suspended', 'revoked'));

create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_is_active on public.profiles(is_active);

-- 2. RÈGLE CRITIQUE : UN SEUL COMPTE ADMINISTRATEUR (Single Admin Account)
-- Index unique partiel garantissant qu'AU MAXIMUM UN SEUL profil peut porter le rôle 'admin'
create unique index if not exists uq_single_admin_profile
  on public.profiles(role)
  where (role = 'admin');

-- 3. Fonction SQL de vérification du statut actif d'un compte
create or replace function public.is_active_user()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true and status = 'active'
  );
$$;

-- 4. Renforcement de la fonction is_admin()
-- Vérifie que le compte connecté est admin ET qu'il est actif
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- 5. Renforcement des politiques RLS de progression et sessions d'étude
-- Les étudiants suspendus/révoqués ne peuvent pas insérer ou modifier de données
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own"
  on public.lesson_progress for insert
  with check (auth.uid() = student_id and public.is_active_user());

drop policy if exists "lesson_progress_update_own" on public.lesson_progress;
create policy "lesson_progress_update_own"
  on public.lesson_progress for update
  using (auth.uid() = student_id and public.is_active_user())
  with check (auth.uid() = student_id and public.is_active_user());

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own"
  on public.study_sessions for insert
  with check (auth.uid() = student_id and public.is_active_user());

drop policy if exists "study_sessions_update_own" on public.study_sessions;
create policy "study_sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = student_id and public.is_active_user())
  with check (auth.uid() = student_id and public.is_active_user());

-- 6. Procédure sécurisée de promotion de l'Administrateur Unique
-- Rétrograde automatiquement tout administrateur précédent pour garantir un Administrateur Unique
create or replace function public.promote_user_to_admin(target_email text)
returns json language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_old_admin_count int;
begin
  target_email := lower(trim(target_email));
  select id into v_user_id from public.profiles where lower(email) = target_email;

  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Utilisateur introuvable avec l''email: ' || target_email);
  end if;

  -- 1. Rétrograder tout compte admin existant en 'student' pour respecter l'index unique
  update public.profiles
  set role = 'student', updated_at = now()
  where role = 'admin' and id <> v_user_id;
  get diagnostics v_old_admin_count = row_count;

  update public.cohort_members
  set role = 'student'
  where role = 'admin' and user_id <> v_user_id;

  -- 2. Élever le compte ciblé au rang d'Administrateur Unique
  update public.profiles
  set role = 'admin', is_active = true, status = 'active', updated_at = now()
  where id = v_user_id;

  update public.cohort_members
  set role = 'admin'
  where user_id = v_user_id;

  return json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', target_email,
    'demoted_previous_admins', v_old_admin_count,
    'message', 'L''utilisateur ' || target_email || ' est désormais l''unique Administrateur officiel.'
  );
end;
$$;
