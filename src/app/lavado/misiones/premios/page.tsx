import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LavadoPremiosPage() {
    redirect('/lavado/misiones?tab=premios');
    return null;
}
