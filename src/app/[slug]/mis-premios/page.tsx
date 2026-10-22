import { redirect } from 'next/navigation';

// "Mis premios" ahora vive dentro del club, en su propia pestaña (con el QR para usar en el local).
export default async function MisPremiosPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ questId?: string }>;
}) {
    const { slug } = await params;
    const { questId } = await searchParams;
    redirect(`/${slug}/misiones?tab=mis-premios${questId ? `&questId=${encodeURIComponent(questId)}` : ''}`);
}
