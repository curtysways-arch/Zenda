import PremiosPage from "@/app/[slug]/misiones/premios/page";

export const dynamic = 'force-dynamic';

export default async function DemoLavadoPremiosPage() {
    return <PremiosPage params={Promise.resolve({ slug: 'demo-lavado' })} />;
}
