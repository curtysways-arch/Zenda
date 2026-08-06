import QuestEstadoPage from "@/app/[slug]/misiones/estado/page";

export const dynamic = 'force-dynamic';

export default async function LavadoQuestEstadoPage() {
    return <QuestEstadoPage params={Promise.resolve({ slug: 'lavado' })} />;
}
