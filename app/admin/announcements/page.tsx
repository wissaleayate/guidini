import { AnnouncementsPageClient } from './AnnouncementsPageClient';

export const metadata = {
  title: 'Annonces Officielles | Guidini Administration',
  description: 'Publication et gestion des annonces de la cohorte médicale DFGSM 2.',
};

export default function AdminAnnouncementsPage() {
  return <AnnouncementsPageClient />;
}
