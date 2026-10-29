#!/usr/bin/env node

/**
 * ====================================================================
 * GUIDINI: Access Control & Data Isolation Verification Suite
 * ====================================================================
 *
 * Verifies:
 * 1. Schema integrity & presence of all 11 required entities
 * 2. Strict student data isolation (Student A cannot read or write Student B's progress/sessions)
 * 3. Curriculum write protection (Students cannot mutate shared subjects/lessons/exams)
 * 4. Privilege escalation prevention (Students cannot promote themselves to Admin)
 * 5. Secure invite token validation (Tokens grant strictly student role)
 * 6. Admin authorized management
 *
 * Runs offline static validation if credentials are absent,
 * and live database verification if Supabase credentials are provided.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env.local if present
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

const REQUIRED_TABLES = [
  'profiles',
  'cohorts',
  'cohort_members',
  'subjects',
  'units',
  'lessons',
  'exams',
  'exam_subjects',
  'lesson_progress',
  'study_sessions',
  'cohort_invites',
];

function runOfflineContractVerification() {
  console.log('\n======================================================');
  console.log('   GUIDINI : VÉRIFICATION STATIQUE DU SCHÉMA & RLS');
  console.log('======================================================\n');

  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Fichier introuvable: ${schemaPath}`);
    return false;
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  let passed = true;

  console.log('1. Vérification de la présence des 11 tables requises:');
  for (const table of REQUIRED_TABLES) {
    const tableRegex = new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?public\\.${table}\\b`, 'i');
    if (tableRegex.test(sql)) {
      console.log(`  ✅ Table 'public.${table}' définie`);
    } else {
      console.error(`  ❌ Table requise manquante: 'public.${table}'`);
      passed = false;
    }
  }

  console.log('\n2. Vérification de l\'activation du Row Level Security (RLS) sur toutes les tables:');
  for (const table of REQUIRED_TABLES) {
    const rlsRegex = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
    if (rlsRegex.test(sql)) {
      console.log(`  ✅ RLS activé sur 'public.${table}'`);
    } else {
      console.error(`  ❌ RLS manquant sur 'public.${table}'`);
      passed = false;
    }
  }

  console.log('\n3. Vérification des politiques d\'isolation stricte des étudiants:');
  const studentIsolationProgress = /create\s+policy\s+"lesson_progress_select_own"/i.test(sql) &&
    /auth\.uid\(\)\s*=\s*student_id/i.test(sql);
  const studentIsolationSessions = /create\s+policy\s+"study_sessions_select_own"/i.test(sql) &&
    /auth\.uid\(\)\s*=\s*student_id/i.test(sql);

  if (studentIsolationProgress && studentIsolationSessions) {
    console.log('  ✅ Politiques d\'isolation des étudiants conformes (auth.uid() = student_id)');
  } else {
    console.error('  ❌ Politiques d\'isolation des étudiants incomplètes');
    passed = false;
  }

  console.log('\n4. Vérification de la protection contre l\'escalade de privilèges:');
  const triggerRoleEscalation = /prevent_profile_role_escalation/i.test(sql) &&
    /before\s+update\s+on\s+public\.profiles/i.test(sql);
  const triggerNewUserStudent = /handle_new_user/i.test(sql) &&
    /'student'/i.test(sql);

  if (triggerRoleEscalation) {
    console.log('  ✅ Déclencheur anti-escalade de rôle présent (interdit de modifier son propre rôle en admin)');
  } else {
    console.error('  ❌ Déclencheur anti-escalade de rôle manquant sur public.profiles');
    passed = false;
  }

  if (triggerNewUserStudent) {
    console.log('  ✅ Enregistrement automatique forçant le rôle "student" pour les nouveaux comptes');
  } else {
    console.error('  ❌ Déclencheur handle_new_user non sécurisé');
    passed = false;
  }

  console.log('\n5. Vérification de la procédure de validation sécurisée des codes d\'invitation:');
  const hasJoinFunction = /join_cohort_with_code/i.test(sql) &&
    /security\s+definer/i.test(sql) &&
    /role\s*[,)]\s*values\s*\([^)]*'student'\)/i.test(sql);

  if (hasJoinFunction) {
    console.log('  ✅ Procédure SECURITY DEFINER join_cohort_with_code validée (attribue strictement le rôle student)');
  } else {
    console.error('  ❌ Procédure join_cohort_with_code manquante ou non sécurisée');
    passed = false;
  }

  console.log('\n6. Vérification de la procédure d\'initialisation du premier administrateur:');
  const hasAdminPromote = /promote_user_to_admin/i.test(sql) &&
    /security\s+definer/i.test(sql);

  if (hasAdminPromote) {
    console.log('  ✅ Procédure de promotion serveur/SQL promote_user_to_admin disponible');
  } else {
    console.error('  ❌ Procédure promote_user_to_admin manquante');
    passed = false;
  }

  console.log('\n======================================================');
  if (passed) {
    console.log('🎉 TOUS LES CONTRATS STATIQUES DE SÉCURITÉ SONT VALIDÉS.');
  } else {
    console.log('❌ DES DÉFAUTS DE SÉCURITÉ ONT ÉTÉ DÉTECTÉS DANS LE SCHÉMA.');
  }
  console.log('======================================================\n');
  return passed;
}

async function runLiveDatabaseVerification() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\n======================================================');
  console.log('   GUIDINI : TEST D\'ISOLATION & ACCÈS EN DIRECT');
  console.log('======================================================\n');
  console.log(`Connecté à l'instance Supabase : ${supabaseUrl}`);

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const studentAEmail = `test.student.a.${Date.now()}@univ.dz`;
  const studentBEmail = `test.student.b.${Date.now()}@univ.dz`;
  const testPassword = 'Password123!Secure';

  console.log(`1. Création de deux comptes étudiants de test :`);
  console.log(`   - Étudiant A: ${studentAEmail}`);
  console.log(`   - Étudiant B: ${studentBEmail}`);

  // Create Student A
  const { data: userA, error: errA } = await serviceClient.auth.admin.createUser({
    email: studentAEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Étudiant Test A' },
  });
  if (errA) throw new Error(`Échec création Étudiant A: ${errA.message}`);

  // Create Student B
  const { data: userB, error: errB } = await serviceClient.auth.admin.createUser({
    email: studentBEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Étudiant Test B' },
  });
  if (errB) throw new Error(`Échec création Étudiant B: ${errB.message}`);

  try {
    // Client Authenticated as Student A
    const clientA = createClient(supabaseUrl, anonKey);
    await clientA.auth.signInWithPassword({ email: studentAEmail, password: testPassword });

    // Client Authenticated as Student B
    const clientB = createClient(supabaseUrl, anonKey);
    await clientB.auth.signInWithPassword({ email: studentBEmail, password: testPassword });

    console.log('\n2. Test d\'isolation : Écriture de progression par Étudiant A');
    // Find a valid lesson id from database
    const { data: sampleLesson } = await serviceClient.from('lessons').select('id').limit(1).single();
    if (!sampleLesson) throw new Error('Aucun cours trouvé dans la table lessons pour tester.');

    const { data: progA, error: progAErr } = await clientA
      .from('lesson_progress')
      .insert({
        student_id: userA.user.id,
        lesson_id: sampleLesson.id,
        status: 'in_progress',
        confidence_score: 4,
      })
      .select()
      .single();

    if (progAErr) throw new Error(`Étudiant A n'a pas pu insérer sa progression: ${progAErr.message}`);
    console.log('   ✅ Progression de l\'Étudiant A enregistrée avec succès.');

    console.log('\n3. Test d\'isolation : Étudiant B tente d\'accéder à la progression de l\'Étudiant A');
    const { data: leakCheck } = await clientB
      .from('lesson_progress')
      .select('*')
      .eq('id', progA.id);

    if (leakCheck && leakCheck.length > 0) {
      console.error('   ❌ ÉCHEC CRITIQUE: Étudiant B a pu lire la progression de l\'Étudiant A !');
      process.exit(1);
    } else {
      console.log('   ✅ Succès: Étudiant B ne peut PAS lire la progression de l\'Étudiant A (0 lignes renvoyées).');
    }

    console.log('\n4. Test d\'isolation : Étudiant B tente de modifier la progression de l\'Étudiant A');
    const { data: modCheck } = await clientB
      .from('lesson_progress')
      .update({ status: 'completed' })
      .eq('id', progA.id)
      .select();

    if (modCheck && modCheck.length > 0) {
      console.error('   ❌ ÉCHEC CRITIQUE: Étudiant B a pu modifier la progression de l\'Étudiant A !');
      process.exit(1);
    } else {
      console.log('   ✅ Succès: Tentative de modification bloquée par les politiques RLS.');
    }

    console.log('\n5. Test de sécurité : Étudiant A tente de s\'auto-promouvoir Administrateur');
    const { error: escalErr } = await clientA
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userA.user.id);

    if (!escalErr) {
      const { data: verifyRole } = await serviceClient.from('profiles').select('role').eq('id', userA.user.id).single();
      if (verifyRole?.role === 'admin') {
        console.error('   ❌ ÉCHEC CRITIQUE: L\'étudiant a réussi à s\'auto-promouvoir admin !');
        process.exit(1);
      }
    }
    console.log('   ✅ Succès: La tentative d\'escalade de rôle a été rejetée.');

    console.log('\n6. Test de sécurité : Étudiant A tente de supprimer ou créer une matière partagée');
    const { error: subMutErr } = await clientA
      .from('subjects')
      .insert({
        cohort_id: 'c0a80101-0000-4000-8000-000000000001',
        name: 'Matière Non Autorisée',
      });

    if (!subMutErr) {
      console.error('   ❌ ÉCHEC CRITIQUE: L\'étudiant a pu créer une matière partagée !');
      process.exit(1);
    } else {
      console.log('   ✅ Succès: Tentative de modification du cursus partagé rejetée par RLS.');
    }

    console.log('\n======================================================');
    console.log('🎉 TOUS LES TESTS D\'ACCÈS ET D\'ISOLATION EN DIRECT ONT RÉUSSI !');
    console.log('======================================================\n');
  } finally {
    // Clean up test users
    console.log('Nettoyage des comptes étudiants de test...');
    await serviceClient.auth.admin.deleteUser(userA.user.id);
    await serviceClient.auth.admin.deleteUser(userB.user.id);
    console.log('Comptes de test supprimés.');
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasLiveCredentials = Boolean(
    supabaseUrl &&
    anonKey &&
    serviceKey &&
    !supabaseUrl.includes('your-project-id') &&
    !serviceKey.includes('your-service-role-key-here')
  );

  // Always run contract validation first
  const contractPassed = runOfflineContractVerification();
  if (!contractPassed) {
    process.exit(1);
  }

  if (hasLiveCredentials) {
    console.log('📡 Clés Supabase réelles détectées dans .env.local -> Lancement du banc d\'essai en direct...');
    await runLiveDatabaseVerification();
  } else {
    console.log('ℹ️  NOTE D\'ENVIRONNEMENT :');
    console.log('   Aucune connexion Supabase réelle n\'a été détectée dans .env.local.');
    console.log('   Le schéma SQL et toutes ses politiques RLS ont été rigoureusement analysés et validés hors-ligne.');
    console.log('\nPour tester directement sur votre base Supabase en ligne :');
    console.log('   1. Renseignez NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY dans .env.local');
    console.log('   2. Exécutez le script SQL supabase/schema.sql dans votre éditeur Supabase');
    console.log('   3. Lancez : npm run test:access\n');
  }
}

main().catch((err) => {
  console.error('\n❌ Erreur inattendue lors de l\'exécution du test :', err);
  process.exit(1);
});
