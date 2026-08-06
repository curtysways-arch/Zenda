import PremiosPage from "@/app/[slug]/misiones/premios/page";

export const dynamic = 'force-dynamic';

export default async function LavadoPremiosPage() {
    return <PremiosPage params={Promise.resolve({ slug: 'lavado' })} />;
}
