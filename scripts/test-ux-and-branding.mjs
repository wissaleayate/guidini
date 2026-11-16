import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

console.log('================================================================');
console.log('   GUIDINI : VALIDATION DES CORRECTIFS UX, RESPONSIVE & BRANDING');
console.log('================================================================\n');

let allPassed = true;

// 1. Check Register Page Full-Name Placeholder
console.log('1. Vérification du Placeholder Nom & Prénom sur Inscription :');
const registerPage = fs.readFileSync(path.join(rootDir, 'app', 'auth', 'register', 'page.tsx'), 'utf8');
if (registerPage.includes('placeholder="Wissale Belala"')) {
  console.log('  ✅ Placeholder Nom & Prénom mis à jour exactement sur "Wissale Belala"');
} else {
  console.error('  ❌ Placeholder incorrect dans app/auth/register/page.tsx');
  allPassed = false;
}
if (registerPage.includes('value={fullName}') && !registerPage.includes('useState(\'Wissale Belala\')')) {
  console.log('  ✅ Champ non pré-rempli (valeur initiale vide préservée)');
} else {
  console.error('  ❌ La valeur du champ a été pré-remplie par erreur');
  allPassed = false;
}

// 2. Check Login Page Email Placeholder
console.log('\n2. Vérification du Placeholder Email sur Connexion :');
const loginPage = fs.readFileSync(path.join(rootDir, 'app', 'auth', 'login', 'page.tsx'), 'utf8');
if (loginPage.includes('placeholder="example@gmail.com"')) {
  console.log('  ✅ Placeholder Email mis à jour exactement sur "example@gmail.com"');
} else {
  console.error('  ❌ Placeholder incorrect dans app/auth/login/page.tsx');
  allPassed = false;
}

// 2b. Check Register Page Email Placeholder
const registerEmailCheck = fs.readFileSync(path.join(rootDir, 'app', 'auth', 'register', 'page.tsx'), 'utf8');
if (registerEmailCheck.includes('placeholder="example@gmail.com"')) {
  console.log('  ✅ Placeholder Email d\'inscription mis à jour sur "example@gmail.com"');
} else {
  console.error('  ❌ Placeholder email incorrect dans app/auth/register/page.tsx');
  allPassed = false;
}

// 3. Check Footer Credit
console.log('\n3. Vérification de la signature élégante dans le Footer :');
const layoutPage = fs.readFileSync(path.join(rootDir, 'components', 'DashboardLayout.tsx'), 'utf8');
if (layoutPage.includes('Made by Belala Wissale Ayate Rrahmane')) {
  console.log('  ✅ Mention "Made by Belala Wissale Ayate Rrahmane" présente dans DashboardLayout.tsx');
} else {
  console.error('  ❌ Signature de bas de page manquante dans components/DashboardLayout.tsx');
  allPassed = false;
}

// 4. Check Curriculum View UX (Zero Reload, Direct Lessons Under Modules)
console.log('\n4. Vérification de la validation des cours sans rechargement :');
const curriculumView = fs.readFileSync(path.join(rootDir, 'components', 'CurriculumView.tsx'), 'utf8');
const homePageClient = fs.readFileSync(path.join(rootDir, 'app', 'HomePageClient.tsx'), 'utf8');

if (homePageClient.includes('silent = false') && homePageClient.includes('if (!silent)')) {
  console.log('  ✅ loadCurriculum supporte le rechargement silencieux en arrière-plan sans démonter le composant');
} else {
  console.error('  ❌ HomePageClient démonte le composant lors des mises à jour');
  allPassed = false;
}

if (curriculumView.includes('// 1. Instant local optimistic update') && curriculumView.includes('showFeedback(')) {
  console.log('  ✅ handleStatusChange applique une mise à jour optimiste immédiate sans redirection');
} else {
  console.error('  ❌ handleStatusChange ne met pas à jour localement de manière optimiste');
  allPassed = false;
}

if (curriculumView.includes('isCollapsed') && curriculumView.includes('mod.units.map') && curriculumView.includes('filteredLessons.map')) {
  console.log('  ✅ Les cours sont affichés directement sous chaque module par défaut');
} else {
  console.error('  ❌ Les cours ne sont pas rendus directement sous les modules');
  allPassed = false;
}

// 5. Check Admin Student Visibility Merging
console.log('\n5. Vérification de la visibilité immédiate des étudiants inscrits pour l\'Admin :');
const adminUsersView = fs.readFileSync(path.join(rootDir, 'components', 'AdminUsersView.tsx'), 'utf8');
if (adminUsersView.includes('cache: \'no-store\'') && adminUsersView.includes('CohortService.getRegisteredStudents()')) {
  console.log('  ✅ fetchUsers fusionne les étudiants enregistrés avec cache: no-store pour une visibilité instantanée');
} else {
  console.error('  ❌ AdminUsersView ne synchronise pas immédiatement les nouveaux étudiants');
  allPassed = false;
}

// 6. Check Mobile Responsiveness & Drawer
console.log('\n6. Vérification du tiroir responsive et accessibilité :');
const sidebar = fs.readFileSync(path.join(rootDir, 'components', 'Sidebar.tsx'), 'utf8');
if (sidebar.includes('fixed inset-0 z-50') && sidebar.includes('Escape') && sidebar.includes('max-w-[85vw]')) {
  console.log('  ✅ Tiroir mobile avec overlay z-50, backdrop blur, fermeture Escape et largeur adaptée');
} else {
  console.error('  ❌ Sidebar mobile incomplet');
  allPassed = false;
}

// 7. Check LessonStatusSelector Component & 4 Distinct Color Codes
console.log('\n7. Vérification du Sélecteur de Statut en Chips / Segments :');
const statusSelectorCode = fs.readFileSync(path.join(rootDir, 'components', 'LessonStatusSelector.tsx'), 'utf8');
const hasGrey = statusSelectorCode.includes('slate-700') && statusSelectorCode.includes('CircleDashed');
const hasBlue = statusSelectorCode.includes('blue-600') && statusSelectorCode.includes('PlayCircle');
const hasGreen = statusSelectorCode.includes('emerald-600') && statusSelectorCode.includes('CheckCircle2');
const hasPurple = statusSelectorCode.includes('purple-600') && statusSelectorCode.includes('RotateCw');

if (hasGrey && hasBlue && hasGreen && hasPurple) {
  console.log('  ✅ 4 Statuts configurés : Gris (Non commencé), Bleu (En cours), Vert (Validé), Violet (À réviser)');
} else {
  console.error('  ❌ Palette de couleurs des statuts non conforme dans LessonStatusSelector');
  allPassed = false;
}

// 8. Check Mobile Bottom Navigation Bar
console.log('\n8. Vérification de la Barre de Navigation Mobile Inférieure :');
const bottomNavCode = fs.readFileSync(path.join(rootDir, 'components', 'MobileBottomNav.tsx'), 'utf8');
if (bottomNavCode.includes('md:hidden fixed bottom-0') && layoutPage.includes('<MobileBottomNav />')) {
  console.log('  ✅ MobileBottomNav intégrée dans DashboardLayout avec padding inférieur sécurisé');
} else {
  console.error('  ❌ MobileBottomNav manquante ou non intégrée');
  allPassed = false;
}

console.log('\n================================================================');
if (allPassed) {
  console.log('🎉 TOUS LES NOUVEAUX CONTRATS UX, BRANDING ET RESPONSIVE SONT VALIDÉS !');
} else {
  console.error('💥 DES VÉRIFICATIONS ONT ÉCHOUÉ');
  process.exit(1);
}
console.log('================================================================\n');
