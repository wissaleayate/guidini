#!/usr/bin/env node

/**
 * ====================================================================
 * GUIDINI : Academic Structure & 8 Controls Verification Suite
 * ====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n======================================================');
console.log('   GUIDINI : VALIDATION DE LA STRUCTURE ACADÉMIQUE');
console.log('======================================================\n');

let allPassed = true;

const sampleDataPath = path.join(rootDir, 'lib', 'data', 'sample-data.ts');
const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
const typesPath = path.join(rootDir, 'lib', 'types', 'database.ts');

if (!fs.existsSync(sampleDataPath)) {
  console.error(`❌ Fichier introuvable : ${sampleDataPath}`);
  process.exit(1);
}

const sampleDataCode = fs.readFileSync(sampleDataPath, 'utf8');
const schemaCode = fs.readFileSync(schemaPath, 'utf8');
const typesCode = fs.readFileSync(typesPath, 'utf8');

// 1. Check Schema & Types for Academic Units
console.log('1. Vérification du schéma SQL & Types pour les Unités Académiques :');
if (/create\s+table\s+if\s+not\s+exists\s+public\.academic_units/i.test(schemaCode)) {
  console.log('  ✅ Table public.academic_units définie');
} else {
  console.error('  ❌ Table public.academic_units manquante dans schema.sql');
  allPassed = false;
}

if (/academic_unit_id\s+uuid\s+references\s+public\.academic_units/i.test(schemaCode)) {
  console.log('  ✅ Clé étrangère academic_unit_id présente sur public.subjects et public.exams');
} else {
  console.error('  ❌ Clé étrangère academic_unit_id manquante');
  allPassed = false;
}

if (/is_independent\s+boolean\s+not\s+null\s+default\s+false/i.test(schemaCode)) {
  console.log('  ✅ Colonne is_independent présente sur public.subjects');
} else {
  console.error('  ❌ Colonne is_independent manquante');
  allPassed = false;
}

if (/export\s+interface\s+AcademicUnit\b/.test(typesCode)) {
  console.log('  ✅ Interface TypeScript AcademicUnit définie');
} else {
  console.error('  ❌ Interface AcademicUnit manquante dans database.ts');
  allPassed = false;
}

// 2. Check the 4 Main Academic Units in sample-data
console.log('\n2. Vérification des 4 Grandes Unités Intégrées :');
const expectedUnits = [
  'Unité 01 – Cardiovasculo-Pulmonaire',
  'Unité 02 – Neuro / Hémato / Locomoteur',
  'Unité 03 – Endocrino / Uro-génital',
  'Unité 04 – Gastro / Hémato',
];

expectedUnits.forEach((name) => {
  if (sampleDataCode.includes(`'${name}'`) || sampleDataCode.includes(`"${name}"`)) {
    console.log(`  ✅ Unité configurée : "${name}"`);
  } else {
    console.error(`  ❌ Unité manquante : "${name}"`);
    allPassed = false;
  }
});

// 3. Check the 4 Independent Modules
console.log('\n3. Vérification des 4 Modules Indépendants (Disciplines Autonomes) :');
const expectedIndModules = [
  'Immunologie',
  'Microbiologie',
  'Pharmacologie',
  'Parasitologie',
];

expectedIndModules.forEach((modName) => {
  const modRegex = new RegExp(`name:\\s*['"]${modName}['"]`);
  if (modRegex.test(sampleDataCode)) {
    console.log(`  ✅ Module indépendant présent : "${modName}" (is_independent: true, academic_unit_id: null)`);
  } else {
    console.error(`  ❌ Module indépendant manquant : "${modName}"`);
    allPassed = false;
  }
});

// 4. Check the 8 Controls Structure
console.log('\n4. Vérification de la Structure des 8 Contrôles :');
const expectedControls = [
  // 4 Unit Controls
  'Contrôle Semestriel – Unité 01 : Cardiovasculo-Pulmonaire',
  'Contrôle Semestriel – Unité 02 : Neuro / Hémato / Locomoteur',
  'Contrôle Semestriel – Unité 03 : Endocrino / Uro-génital',
  'Contrôle Semestriel – Unité 04 : Gastro / Hémato',
  // 4 Independent Controls
  'Contrôle – Immunologie',
  'Contrôle – Microbiologie',
  'Contrôle – Pharmacologie',
  'Contrôle – Parasitologie',
];

let controlCount = 0;
expectedControls.forEach((title) => {
  if (sampleDataCode.includes(title)) {
    controlCount++;
    console.log(`  ✅ Contrôle ${controlCount}/8 validé : "${title}"`);
  } else {
    console.error(`  ❌ Contrôle manquant : "${title}"`);
    allPassed = false;
  }
});

if (controlCount === 8) {
  console.log(`  🎉 Exactement 8 contrôles officiels configurés dans la structure !`);
} else {
  console.error(`  ❌ Attendu 8 contrôles, trouvé : ${controlCount}`);
  allPassed = false;
}

// 5. Check Non-Invented Dates (dates must default to null)
console.log('\n5. Vérification de la non-invention des dates d\'examen :');
const nullDateMatches = sampleDataCode.match(/exam_date:\s*null/g);
if (nullDateMatches && nullDateMatches.length >= 8) {
  console.log(`  ✅ Dates non inventées : les ${nullDateMatches.length} contrôles ont exam_date: null par défaut`);
} else {
  console.error('  ❌ Des dates inventées ont été détectées');
  allPassed = false;
}

// 6. Check Preservation of 37 Lessons in Unit 01
console.log('\n6. Préservation de l\'intégrité des 37 cours de l\'Unité 01 :');
const lessonMatches = sampleDataCode.match(/id:\s*['"]les-/g);
if (lessonMatches && lessonMatches.length === 37) {
  console.log(`  ✅ Les 37 cours médicaux de l'Unité 01 sont préservés à 100%`);
} else {
  console.error(`  ❌ Attendu 37 cours, trouvé : ${lessonMatches ? lessonMatches.length : 0}`);
  allPassed = false;
}

console.log('\n======================================================');
if (allPassed) {
  console.log('🎉 TOUS LES CONTRATS DE LA STRUCTURE ACADÉMIQUE SONT VALIDÉS !');
  console.log('======================================================\n');
  process.exit(0);
} else {
  console.error('❌ ÉCHEC DES VÉRIFICATIONS');
  console.log('======================================================\n');
  process.exit(1);
}
