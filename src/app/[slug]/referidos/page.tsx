import { redirect } from 'next/navigation';

// Invitar amigos ahora vive dentro del club, en la pestaña Invitar.
export default async function ReferidosPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    redirect(`/${slug}/misiones?tab=invitar`);
}
