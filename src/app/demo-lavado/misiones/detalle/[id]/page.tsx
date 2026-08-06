import QuestDetallePage from "@/app/[slug]/misiones/detalle/[id]/page";

export const dynamic = 'force-dynamic';

export default async function DemoLavadoQuestDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <QuestDetallePage params={Promise.resolve({ slug: 'demo-lavado', id })} />;
}
