# Guidini — Portail Académique & Syllabus Radar Médical

Portail académique web moderne conçu spécifiquement pour la cohorte d'étudiants en médecine (**DFGSM 2 — Deuxième Année**), propulsé par **Next.js (App Router)** et **Supabase PostgreSQL & Auth**.

---

## Architecture Générale & Séparation des Données

Guidini sépare rigoureusement les données pédagogiques partagées de la cohorte et les données personnelles d'étude des étudiants :

```
Cohorte Partagée (Gérée par l'Admin / Délégué)
├── Cohorte (DFGSM 2 Médecine 2026-2027)
├── Matières / Modules (ex: Cardiologie, Pneumologie)
├── Unités d'Enseignement / Chapitres
├── Cours / Séances partagées (titre, difficulté, durée estimée)
├── Examens & Contrôles continus (dates, coefficients)
└── Codes d'invitation sécurisés (ex: MED-2026-ALG)

Données Étudiant Personnelles (Isolées par RLS au niveau PostgreSQL)
├── Profil personnel
├── Statut de progression par cours (non commencé, en cours, maîtrisé, à réviser)
├── Score d'auto-évaluation / confiance (1 à 5)
└── Historique des séances de révision (durée, type de travail, date)
```

> **Garantie d'intégrité pédagogique :** Modifier le titre d'un cours partagé, sa difficulté ou ajouter un examen n'efface ni ne réinitialise **JAMAIS** la progression personnelle d'un étudiant.

---

## Modèle de Données Supabase (11 Entités)

Le schéma SQL de production (`supabase/schema.sql` et `supabase/migrations/20261024000000_production_database.sql`) implémente l'ensemble des 11 tables requises :

| Table | Description | Règle d'Accès RLS |
|---|---|---|
| `public.profiles` | Profil lié 1:1 à `auth.users` (nom, email, rôle, cohorte) | Consultation par soi-même / pairs de la cohorte / admin. Mise à jour de ses données propres. Escalade de rôle interdite par déclencheur. |
| `public.cohorts` | Métadonnées de la promotion (année universitaire, semestre, code d'accès) | Lecture par tous les membres authentifiés. Modification réservée aux Administrateurs. |
| `public.cohort_members` | Association membre-cohorte avec horodatage et rôle | Lecture par les membres de la cohorte. Gestion par l'Admin. Inscription via fonction sécurisée. |
| `public.cohort_invites` | Codes d'invitation et jetons sécurisés (quotas, expiration) | Lecture et gestion strictement réservées aux Administrateurs. Validation par fonction `SECURITY DEFINER`. |
| `public.subjects` | Matières et modules médicaux (code, couleur, semestre, ordre) | Lecture par les étudiants de la cohorte. Création/modification par l'Admin. |
| `public.units` | Unités d'enseignement rattachées à une matière | Lecture par les membres de la cohorte. Gestion par l'Admin. |
| `public.lessons` | Cours et séances du programme partagé | Lecture par les membres de la cohorte. Gestion par l'Admin. |
| `public.exams` | Épreuves, contrôles continus, partiels | Lecture par les membres de la cohorte. Gestion par l'Admin. |
| `public.exam_subjects` | Table de liaison n-à-n entre examens et matières | Lecture par les membres de la cohorte. Gestion par l'Admin. |
| `public.lesson_progress` | Progression individuelle sur chaque cours (statut, confiance) | **Isolation stricte** : `auth.uid() = student_id`. Seul l'étudiant authentifié peut lire ou modifier son enregistrement. |
| `public.study_sessions` | Journal des séances de révision effectuées par l'étudiant | **Isolation stricte** : `auth.uid() = student_id`. |

---

## Sécurité & Politiques Row Level Security (RLS)

1. **Isolation stricte des données étudiants** :
   Les politiques `lesson_progress` et `study_sessions` imposent la clause `auth.uid() = student_id`. Un étudiant ne peut en aucun cas lire ou modifier les données d'étude d'un camarade.

2. **Protection du programme partagé** :
   Les tables `subjects`, `units`, `lessons`, `exams` et `cohorts` n'autorisent l'écriture (`INSERT`, `UPDATE`, `DELETE`) qu'aux utilisateurs possédant le rôle `'admin'` dans `public.profiles`.

3. **Protection contre l'auto-attribution des droits admin (Anti-Escalade)** :
   - Le déclencheur `on_auth_user_created` attribue **systématiquement** le rôle `'student'`, ignorant toute métadonnée forgée par un client.
   - Le déclencheur `tr_prevent_profile_role_escalation` sur `public.profiles` rejette toute requête SQL tentant de modifier la colonne `role` si l'appelant n'est pas déjà administrateur.

4. **Validation sécurisée des invitations** :
   La fonction PostgreSQL `join_cohort_with_code(code_input)` s'exécute en mode `SECURITY DEFINER` :
   - Elle vérifie la validité, la date d'expiration et le quota d'utilisation du code dans `cohort_invites`.
   - Elle inscrit l'utilisateur dans `cohort_members` avec le rôle `'student'` (**jamais admin**).
   - Les étudiants n'ont pas accès en lecture directe à la table brute des codes d'invitation.

---

## Guide d'Installation & Configuration Pas-à-Pas

### Étape 1 : Créer votre projet Supabase
1. Rendez-vous sur [Supabase](https://supabase.com) et créez un nouveau projet (ex: `guidini-med`).
2. Définissez un mot de passe sécurisé pour la base PostgreSQL et sélectionnez la région la plus proche.

### Étape 2 : Exécuter la migration SQL
1. Dans le tableau de bord Supabase, ouvrez l'onglet **SQL Editor** (dans le menu de gauche).
2. Cliquez sur **New query**.
3. Copiez l'intégralité du contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) et collez-le dans l'éditeur.
4. Cliquez sur **Run** (ou `Ctrl + Entrée`).
5. Vérifiez l'affichage du message `Success. No rows returned`. Vos 11 tables, déclencheurs, fonctions et données initiales sont désormais créés.

### Étape 3 : Configurer l'authentification Supabase
1. Accédez à **Authentication** -> **Providers** -> **Email**.
2. Assurez-vous que le fournisseur Email est activé.
3. *Optionnel pour le développement local* : Si vous souhaitez tester l'inscription sans avoir à valider un lien reçu par courriel, désactivez temporairement l'option **Confirm email** dans **Authentication** -> **URL Configuration / Email Templates**.

### Étape 4 : Configurer vos variables d'environnement locales
1. Dupliquez le fichier `.env.example` en `.env.local` :
   ```bash
   cp .env.example .env.local
   ```
2. Dans le tableau de bord Supabase, allez dans **Project Settings** -> **API**.
3. Renseignez les variables dans `.env.local` :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
   ```
   > ⚠️ **IMPORTANT :** La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit **JAMAIS** être préfixée par `NEXT_PUBLIC_` et ne doit jamais être exposée côté navigateur. Elle est utilisée exclusivement par les scripts d'administration serveur.

---

## Procédure Sécurisée de Provisionnement du Premier Administrateur

Les identifiants administrateurs ne sont jamais inscrits en dur dans le code. Deux méthodes sécurisées sont fournies :

### Méthode A — Via le script CLI Serveur (Recommandé)

1. L'administrateur (ex: le délégué de promotion) crée d'abord son compte normal sur le portail :
   `http://localhost:3000/auth/register` (ou `/auth/login`).
2. Depuis votre terminal sécurisé, exécutez la commande :
   ```bash
   npm run admin:promote -- delegue@univ.dz
   ```
   Le script vérifie la clé de service, authentifie l'utilisateur et lui accorde le statut `admin` dans `profiles` et `cohort_members`.

### Méthode B — Directement dans l'éditeur SQL Supabase

Si vous avez accès à la console Supabase, exécutez simplement la requête :
```sql
SELECT public.promote_user_to_admin('delegue@univ.dz');
```

---

## Vérification & Tests de Sécurité

### Vérification Statique & Test d'Isolation en Direct

Une suite complète de tests d'accès et d'isolation est intégrée :
```bash
npm run test:access
```

- **Mode Hors-Ligne (Sans clés Supabase)** : Analyse statique du contrat SQL, vérifie la présence des 11 tables, l'activation du RLS, les déclencheurs anti-escalade et les fonctions `SECURITY DEFINER`.
- **Mode En Ligne (Avec `.env.local` configuré)** : Crée automatiquement deux comptes étudiants temporaires (`Etudiant A`, `Etudiant B`), tente des lectures et écritures croisées, teste l'auto-promotion non autorisée, vérifie le rejet par PostgreSQL, puis nettoie les comptes.

### Lancement du Projet

```bash
# Lancement en développement
npm run dev

# Construction pour la production
npm run build
```

Accédez au portail sur [http://localhost:3000](http://localhost:3000).

- **Mode Démonstration / Sans Supabase** : Si aucune clé n'est configurée, l'application fonctionne immédiatement en mode hors-ligne fluide avec les données de la cohorte médicale DFGSM 2.
- **Mode Connecté Supabase** : L'authentification réelle, le suivi personnel chiffré et le partage de cursus en direct sont automatiquement activés.
