import { getNegocioBySlug } from '@/lib/services';
import { featureService } from '@/lib/services/featureService';
import { notFound } from 'next/navigation';
import ClubHub from './ClubHub';

export const dynamic = 'force-dynamic';

const TABS = ['misiones', 'premios', 'mis-premios', 'invitar'] as const;
type Tab = (typeof TABS)[number];

export default async function PublicMisionesPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ tab?: string; questId?: string }>;
}) {
    const { slug } = await params;
    const { tab, questId } = await searchParams;
    const negocio = await getNegocioBySlug(slug);
    if (!negocio) notFound();

    const isLoyaltyEnabled = await featureService.canUseFeature(negocio.id, 'loyalty_module');
    if (!isLoyaltyEnabled) notFound();

    const initialTab: Tab = (TABS as readonly string[]).includes(String(tab)) ? (tab as Tab) : 'misiones';

    return (
        <main className="min-h-screen bg-slate-50">
            <ClubHub
                slug={slug}
                primaryColor={(negocio as any).colorPrimario || '#ec4899'}
                negocioNombre={negocio.nombre}
                initialTab={initialTab}
                focusQuestId={questId || null}
            />
        </main>
    );
}
