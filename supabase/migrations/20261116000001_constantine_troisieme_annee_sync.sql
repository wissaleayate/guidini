-- ====================================================================
-- GUIDINI MIGRATION : Troisième Année - Constantine & Robust Sync
-- Migration: 20261116000001_constantine_troisieme_annee_sync.sql
-- ====================================================================

-- 1. Mise à jour de la cohorte et du niveau d'études
update public.cohorts
set name = 'Faculté de Médecine - Constantine',
    study_year = 'Troisième Année',
    updated_at = now()
where id = 'c0a80101-0000-4000-8000-000000000001'
   or name ilike '%DFGSM%';

alter table public.cohorts
  alter column study_year set default 'Troisième Année';

-- 2. Déclencheur robuste de synchronisation automatique profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_cohort_id uuid;
  v_invite_code text;
begin
  -- Recherche du code d'invitation fourni dans les métadonnées
  v_invite_code := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')));

  if v_invite_code <> '' then
    -- Vérification dans cohort_invites
    select cohort_id into v_cohort_id
    from public.cohort_invites
    where upper(code) = v_invite_code
      and is_active = true
      and (expires_at is null or expires_at > now())
    limit 1;

    -- Repli sur le code d'invitation de la cohorte
    if v_cohort_id is null then
      select id into v_cohort_id
      from public.cohorts
      where upper(invite_code) = v_invite_code
      limit 1;
    end if;
  end if;

  -- Raccordement par défaut à la cohorte active de Troisième Année
  if v_cohort_id is null then
    select id into v_cohort_id from public.cohorts limit 1;
  end if;

  -- Insertion ou synchronisation du profil avec rôle 'student' garanti
  insert into public.profiles (id, email, full_name, role, cohort_id, is_active, status)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    'student', -- Rôle étudiant strictement imposé
    v_cohort_id,
    true,
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    cohort_id = coalesce(public.profiles.cohort_id, excluded.cohort_id),
    updated_at = now();

  -- Raccordement de l'adhésion cohorte
  if v_cohort_id is not null then
    insert into public.cohort_members (cohort_id, user_id, role)
    values (v_cohort_id, new.id, 'student')
    on conflict (cohort_id, user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Réinstallation propre du trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger additionnel pour répercuter les mises à jour métadonnées auth.users
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data, email on auth.users
  for each row
  execute function public.handle_new_user();
