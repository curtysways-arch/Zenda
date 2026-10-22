import PublicMisionesPage from "@/app/[slug]/misiones/page";

export const dynamic = 'force-dynamic';

export default async function LavadoMisionesPage(props: {
    searchParams?: Promise<{ tab?: string; questId?: string }>;
}) {
    return (
        <PublicMisionesPage
            params={Promise.resolve({ slug: 'lavado' })}
            searchParams={props.searchParams || Promise.resolve({})}
        />
    );
}
