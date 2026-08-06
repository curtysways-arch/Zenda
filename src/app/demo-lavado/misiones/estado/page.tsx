import QuestEstadoPage from "@/app/[slug]/misiones/estado/page";

export const dynamic = 'force-dynamic';

export default async function DemoLavadoQuestEstadoPage() {
    return <QuestEstadoPage params={Promise.resolve({ slug: 'demo-lavado' })} />;
}
