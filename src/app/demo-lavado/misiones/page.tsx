import PublicMisionesPage from "@/app/[slug]/misiones/page";

export const dynamic = 'force-dynamic';

export default async function DemoLavadoMisionesPage(props: {
    searchParams?: Promise<{ tab?: string; questId?: string }>;
}) {
    return (
        <PublicMisionesPage
            params={Promise.resolve({ slug: 'demo-lavado' })}
            searchParams={props.searchParams || Promise.resolve({})}
        />
    );
}
