import NegocioLayout from "@/app/[slug]/layout";

export const dynamic = 'force-dynamic';

export default async function DemoLavadoLayout({ children }: { children: React.ReactNode }) {
    return (
        <NegocioLayout params={Promise.resolve({ slug: 'demo-lavado' })}>
            {children}
        </NegocioLayout>
    );
}
