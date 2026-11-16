import { AnnouncementsPageClient } from './AnnouncementsPageClient';

export const metadata = {
  title: 'Annonces Officielles | Guidini Administration',
  description: 'Publication et gestion des annonces officielles de la promotion médicale.',
};

export default function AdminAnnouncementsPage() {
  return <AnnouncementsPageClient />;
}
