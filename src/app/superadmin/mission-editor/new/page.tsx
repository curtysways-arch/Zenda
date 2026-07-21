import { redirect } from 'next/navigation';

export default function NewMissionPage() {
  redirect('/superadmin/mission-editor?new=true');
}
