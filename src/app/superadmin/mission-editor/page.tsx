import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function MissionEditorPage() {
  redirect('/superadmin/misiones-globales');
}
