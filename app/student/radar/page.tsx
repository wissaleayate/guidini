import { StudentRadarClient } from './StudentRadarClient';

export const metadata = {
  title: 'Radar de Rattrapage & Charge d\'Étude | Guidini',
  description: 'Analyse hermétique et calculée de la charge d\'étude médicale pour la promotion DFGSM 2.',
};

export default function StudentRadarPage() {
  return <StudentRadarClient />;
}
