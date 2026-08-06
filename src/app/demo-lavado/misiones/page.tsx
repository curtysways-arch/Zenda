import PublicMisionesPage from "@/app/[slug]/misiones/page";

export const dynamic = 'force-dynamic';

export default async function DemoLavadoMisionesPage() {
    return <PublicMisionesPage params={Promise.resolve({ slug: 'demo-lavado' })} />;
}
