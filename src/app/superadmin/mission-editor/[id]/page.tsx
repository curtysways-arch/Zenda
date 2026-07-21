import { redirect } from 'next/navigation';

export default async function EditMissionRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/superadmin/mission-editor?edit=${id}`);
}
