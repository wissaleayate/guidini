import { StudentProfileClient } from './StudentProfileClient';

export const metadata = {
  title: 'Mon Profil Étudiant | Guidini',
  description: 'Gestion du compte étudiant, statistiques d\'étude médicale et paramètres de sécurité.',
};

export default function StudentProfilePage() {
  return <StudentProfileClient />;
}
