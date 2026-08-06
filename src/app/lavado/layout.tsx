import NegocioLayout from "@/app/[slug]/layout";

export const dynamic = 'force-dynamic';

export default async function LavadoLayout({ children }: { children: React.ReactNode }) {
    return (
        <NegocioLayout params={Promise.resolve({ slug: 'lavado' })}>
            {children}
        </NegocioLayout>
    );
}
