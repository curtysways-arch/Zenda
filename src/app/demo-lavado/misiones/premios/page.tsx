import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DemoLavadoPremiosPage() {
    redirect('/demo-lavado/misiones?tab=premios');
    return null;
}
