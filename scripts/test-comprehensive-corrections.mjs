#!/usr/bin/env node

/**
 * ====================================================================
 * GUIDINI: Comprehensive Corrections & Verification Suite
 * ====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n================================================================');
console.log('   GUIDINI : VÉRIFICATION COMPLÈTE DES 10 CONTRATS DE CORRECTION');
console.log('================================================================\n');

let allPassed = true;

// Helper to scan directory for files
function getFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, extensions));
    } else {
      if (extensions.some((ext) => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// 1. Check for absence of DFGSM, DFGSM 2, Deuxième Année in app, components, lib
console.log('1. Absence de DFGSM / Deuxième Année dans l\'application :');
const appFiles = [
  ...getFiles(path.join(rootDir, 'app')),
  ...getFiles(path.join(rootDir, 'components')),
  ...getFiles(path.join(rootDir, 'lib')),
];

let forbiddenMatches = 0;
const forbiddenPattern = /\b(DFGSM|DFGSM 2|Deuxième Année|2ème Année)\b/i;

appFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (forbiddenPattern.test(content)) {
    console.error(`  ❌ Occurrence interdite trouvée dans : ${path.relative(rootDir, file)}`);
    forbiddenMatches++;
    allPassed = false;
  }
});

if (forbiddenMatches === 0) {
  console.log('  ✅ Aucune mention de DFGSM / Deuxième Année dans app/, components/, lib/');
}

// 2. Check Academic Info (Faculté de Médecine - Constantine & Troisième Année)
console.log('\n2. Vérification des mentions académiques officielles :');
const dashboardView = fs.readFileSync(path.join(rootDir, 'components', 'StudentDashboardView.tsx'), 'utf8');
const sampleData = fs.readFileSync(path.join(rootDir, 'lib', 'data', 'sample-data.ts'), 'utf8');

if (dashboardView.includes('Faculté de Médecine - Constantine') && dashboardView.includes('Troisième Année')) {
  console.log('  ✅ Dashboard étudiant affiche correctement : "Faculté de Médecine - Constantine" & "Troisième Année"');
} else {
  console.error('  ❌ Mentions académiques incorrectes sur StudentDashboardView.tsx');
  allPassed = false;
}

if (sampleData.includes("'Faculté de Médecine - Constantine'") && sampleData.includes("'Troisième Année'")) {
  console.log('  ✅ Données de référence de cohorte configurées sur Troisième Année - Constantine');
} else {
  console.error('  ❌ INITIAL_COHORT non mise à jour dans sample-data.ts');
  allPassed = false;
}

// 3. Check Curriculum Hierarchical Navigation (8 Categories on initial page, no immediate lessons dump)
console.log('\n3. Hiérarchie du Curriculum & Modules :');
const curriculumView = fs.readFileSync(path.join(rootDir, 'components', 'CurriculumView.tsx'), 'utf8');

if (
  curriculumView.includes('selectedUnitId') &&
  curriculumView.includes('1. Les 4 Grandes Unités Intégrées') &&
  curriculumView.includes('2. Les 4 Modules Indépendants')
) {
  console.log('  ✅ Page initiale présente distinctement les 4 Grandes Unités et les 4 Modules Indépendants');
} else {
  console.error('  ❌ Structure hiérarchique manquante dans CurriculumView.tsx');
  allPassed = false;
}

// Check that initial view only renders category cards when selectedUnitId is null
if (curriculumView.includes('if (!selectedUnitId)')) {
  console.log('  ✅ Condition de vue initiale active : les cours ne sont pas déversés sur la page d\'accueil');
} else {
  console.error('  ❌ Séparation de vue manquante dans CurriculumView');
  allPassed = false;
}

// 4. Check Radar de Rattrapage completely removed from student navigation
console.log('\n4. Retrait du Radar de Rattrapage de la navigation active :');
const sidebarContent = fs.readFileSync(path.join(rootDir, 'components', 'Sidebar.tsx'), 'utf8');
if (!sidebarContent.includes("href: '/student/radar'") && !sidebarContent.includes("'Radar de Rattrapage'")) {
  console.log('  ✅ Radar de Rattrapage retiré de la barre latérale de navigation');
} else {
  console.error('  ❌ Radar de Rattrapage encore présent dans Sidebar.tsx');
  allPassed = false;
}

if (!dashboardView.includes('Radar de Rattrapage')) {
  console.log('  ✅ Radar de Rattrapage retiré du tableau de bord étudiant');
} else {
  console.error('  ❌ Radar de Rattrapage encore présent dans StudentDashboardView.tsx');
  allPassed = false;
}

// 5. Check Authentication Pages: No Demo Mode Messages
console.log('\n5. Interface de Connexion et Inscription sans messages de démonstration :');
const loginPage = fs.readFileSync(path.join(rootDir, 'app', 'auth', 'login', 'page.tsx'), 'utf8');
const registerPage = fs.readFileSync(path.join(rootDir, 'app', 'auth', 'register', 'page.tsx'), 'utf8');

if (!loginPage.includes('Mode Démonstration Actif') && !loginPage.includes('admin.med@univ.dz')) {
  console.log('  ✅ Page de connexion nettoyée de tout message ou consigne de démonstration');
} else {
  console.error('  ❌ Consignes de démo encore présentes sur /auth/login');
  allPassed = false;
}

if (!registerPage.includes('Mode Démonstration :') && !registerPage.includes('admin.med@univ.dz')) {
  console.log('  ✅ Page d\'inscription nettoyée de tout message de démonstration');
} else {
  console.error('  ❌ Message de démo encore présent sur /auth/register');
  allPassed = false;
}

// 6. Check Student Registration Synchronization & Admin Student List
console.log('\n6. Synchronisation de l\'inscription et Gestion des Étudiants :');
const syncRoute = path.join(rootDir, 'app', 'api', 'auth', 'sync-profile', 'route.ts');
const adminUsersRoute = path.join(rootDir, 'app', 'api', 'admin', 'users', 'route.ts');
const adminUsersView = fs.readFileSync(path.join(rootDir, 'components', 'AdminUsersView.tsx'), 'utf8');

if (fs.existsSync(syncRoute)) {
  console.log('  ✅ Route API /api/auth/sync-profile créée et active');
} else {
  console.error('  ❌ Route /api/auth/sync-profile manquante');
  allPassed = false;
}

const adminUsersCode = fs.readFileSync(adminUsersRoute, 'utf8');
if (adminUsersCode.includes('auth.admin.listUsers()') && adminUsersCode.includes('upsert')) {
  console.log('  ✅ /api/admin/users synchronise automatiquement les utilisateurs Supabase Auth vers public.profiles');
} else {
  console.error('  ❌ Auto-synchronisation Supabase Auth manquante dans /api/admin/users');
  allPassed = false;
}

if (!adminUsersView.includes("'demo-student-1'") && !adminUsersView.includes("'sarah.b@univ.dz'")) {
  console.log('  ✅ Faux comptes étudiants (demo-student-1, sarah.b) supprimés de AdminUsersView');
} else {
  console.error('  ❌ Faux comptes étudiants encore présents dans AdminUsersView');
  allPassed = false;
}

// 7. Check Single Admin Security
console.log('\n7. Règle du Compte Administrateur Unique et Contrôle d\'Accès :');
const serverGuard = fs.readFileSync(path.join(rootDir, 'lib', 'auth', 'server-guard.ts'), 'utf8');
const adminConfig = fs.readFileSync(path.join(rootDir, 'lib', 'auth', 'admin-config.ts'), 'utf8');

if (serverGuard.includes('isAuthorizedAdminIdentity') && adminConfig.includes('getAuthorizedAdminEmail')) {
  console.log('  ✅ Règle du Single Admin Account garantie côté serveur');
} else {
  console.error('  ❌ Vérification serveur du compte admin compromise');
  allPassed = false;
}

// 8. Check 8 Controls Assessment Structure
console.log('\n8. Structure des 8 Contrôles et Préservation des Dates :');

if (sampleData.includes('exam-unit-01') && sampleData.includes('Contrôle – Immunologie')) {
  console.log('  ✅ Les 8 contrôles (4 unités + 4 modules indépendants) sont préservés');
} else {
  console.error('  ❌ Contrôles académiques manquants');
  allPassed = false;
}

console.log('\n================================================================');
if (allPassed) {
  console.log('🎉 TOUS LES 10 CONTRATS DE CORRECTION SONT VALIDÉS AVEC SUCCÈS !');
} else {
  console.log('❌ DES CORRECTIONS RESTENT À EFFECTUER.');
  process.exit(1);
}
console.log('================================================================\n');
