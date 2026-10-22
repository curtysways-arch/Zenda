import { redirect } from 'next/navigation';

// El catálogo ahora vive dentro del club, en la pestaña Premios.
export default async function PremiosCatalogoPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    redirect(`/${slug}/misiones?tab=premios`);
    return null;
}
