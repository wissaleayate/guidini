#!/usr/bin/env node

/**
 * ====================================================================
 * GUIDINI: Safe Single-Admin Provisioning CLI Script
 * ====================================================================
 *
 * This server-side process elevates ONE authenticated user to Administrator.
 * It enforces the Single Admin Account constraint by automatically demoting
 * any existing admin to student.
 *
 * SECURITY NOTICE:
 * - NEVER expose SUPABASE_SERVICE_ROLE_KEY in client code or browser bundles.
 * - This script is designed to run in a secure server or developer terminal.
 *
 * Usage:
 *   node scripts/provision-admin.mjs user@univ.dz
 *   or:
 *   npm run admin:promote -- user@univ.dz
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to parse .env.local or .env if present
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const equalIdx = trimmed.indexOf('=');
        if (equalIdx > 0) {
          const key = trimmed.slice(0, equalIdx).trim();
          let val = trimmed.slice(equalIdx + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();

  console.log('\n======================================================');
  console.log('   GUIDINI : PROVISIONNEMENT ADMINISTRATEUR UNIQUE');
  console.log('======================================================\n');

  if (!targetEmail || !targetEmail.includes('@')) {
    console.error('❌ ERREUR: Vous devez spécifier une adresse email valide.\n');
    console.log('Usage:');
    console.log('  node scripts/provision-admin.mjs <email>');
    console.log('Exemple:');
    console.log('  node scripts/provision-admin.mjs delegue@univ.dz\n');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
    console.error('❌ ERREUR: NEXT_PUBLIC_SUPABASE_URL est manquante ou non configurée dans .env.local.');
    console.log('Veuillez renseigner votre URL de projet Supabase.\n');
    process.exit(1);
  }

  if (!serviceRoleKey || serviceRoleKey.includes('your-service-role-key-here')) {
    console.error('❌ ERREUR: SUPABASE_SERVICE_ROLE_KEY est manquante dans .env.local.\n');
    console.log('Où trouver votre clé de service :');
    console.log('  1. Allez sur votre tableau de bord Supabase : https://supabase.com/dashboard');
    console.log('  2. Ouvrez votre projet -> Paramètres (Project Settings) -> API');
    console.log('  3. Copiez la clé "service_role (secret)"');
    console.log('  4. Ajoutez-la dans votre fichier .env.local :');
    console.log('     SUPABASE_SERVICE_ROLE_KEY=eyJh...\n');
    console.log('⚠️  ATTENTION: Ne commitez jamais cette clé et ne l\'exposez jamais côté client !\n');
    process.exit(1);
  }

  console.log(`📡 Connexion au projet Supabase: ${supabaseUrl}`);
  console.log(`🔍 Recherche de l'utilisateur: ${targetEmail}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Search in profiles table
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', targetEmail)
    .single();

  let targetUserId = profile?.id;

  if (profileErr || !profile) {
    console.log('\n⚠️  Profil non trouvé dans la table "profiles".');
    console.log('Vérification dans la table d\'authentification Supabase...');

    // Search via Supabase Auth Admin API
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      console.error('❌ Erreur lors de la lecture des utilisateurs auth:', authErr.message);
      process.exit(1);
    }

    const authUser = authData.users.find((u) => u.email?.toLowerCase() === targetEmail);

    if (!authUser) {
      console.error(`\n❌ ERREUR: Aucun compte trouvé pour l'email "${targetEmail}".`);
      console.log('\nProcédure à suivre:');
      console.log('  1. Vous devez d\'abord créer votre compte sur le portail :');
      console.log('     http://localhost:3000/auth/register');
      console.log('  2. Une fois inscrit, réexécutez cette commande pour élever votre compte :\n');
      console.log(`     node scripts/provision-admin.mjs ${targetEmail}\n`);
      process.exit(1);
    }

    targetUserId = authUser.id;
    console.log(`✅ Compte Auth trouvé (ID: ${authUser.id}).`);
  }

  // 2. ENFORCE SINGLE ADMIN: Demote any other existing admin account to 'student'
  console.log('🔒 Application de la contrainte d\'Administrateur Unique...');
  const { error: demoteErr } = await supabase
    .from('profiles')
    .update({ role: 'student', updated_at: new Date().toISOString() })
    .eq('role', 'admin')
    .neq('id', targetUserId);

  if (demoteErr) {
    console.warn('Note sur la rétrogradation des anciens admins:', demoteErr.message);
  }

  // Also in cohort_members
  await supabase
    .from('cohort_members')
    .update({ role: 'student' })
    .eq('role', 'admin')
    .neq('user_id', targetUserId);

  // 3. Elevate target user to Admin
  const { error: upsertErr } = await supabase.from('profiles').upsert({
    id: targetUserId,
    email: targetEmail,
    role: 'admin',
    is_active: true,
    status: 'active',
    updated_at: new Date().toISOString(),
  });

  if (upsertErr) {
    console.error('❌ Erreur lors de l\'attribution du statut admin:', upsertErr.message);
    process.exit(1);
  }

  // Elevate in cohort_members if membership exists
  await supabase
    .from('cohort_members')
    .update({ role: 'admin' })
    .eq('user_id', targetUserId);

  console.log('\n======================================================');
  console.log('🎉 SUCCÈS ! Administrateur Unique configuré avec succès.');
  console.log('======================================================');
  console.log(`Email Administrateur : ${targetEmail}`);
  console.log(`ID Stable Supabase  : ${targetUserId}`);
  console.log(`Rôle                : admin`);
  console.log(`Statut du compte    : actif`);
  console.log('\nConfiguration recommandée dans votre fichier .env.local :');
  console.log(`  ADMIN_EMAIL=${targetEmail}`);
  console.log(`  ADMIN_USER_ID=${targetUserId}`);
  console.log('\nPrivilèges accordés :');
  console.log('  - Accès exclusif à /admin et à tous les sous-menus');
  console.log('  - Gestion du cursus partagé (matières, unités, cours)');
  console.log('  - Planification des 8 examens et contrôles');
  console.log('  - Importation en masse CSV / Excel');
  console.log('  - Supervision des étudiants et révocation d\'accès');
  console.log('  - Gestion des codes d\'invitation de promotion');
  console.log('======================================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur inattendue:', err);
  process.exit(1);
});
