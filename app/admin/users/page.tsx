import { AdminUsersClient } from './AdminUsersClient';

export const metadata = {
  title: 'Gestion des Étudiants & Accès | Guidini Administration',
  description: 'Supervision des comptes étudiants, gestion des statuts d\'accès et des codes d\'invitation de la cohorte médicale.',
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
