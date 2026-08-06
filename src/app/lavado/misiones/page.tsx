import PublicMisionesPage from "@/app/[slug]/misiones/page";

export const dynamic = 'force-dynamic';

export default async function LavadoMisionesPage() {
    return <PublicMisionesPage params={Promise.resolve({ slug: 'lavado' })} />;
}
