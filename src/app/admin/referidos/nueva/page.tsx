import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReferralCampaignForm from '../ReferralCampaignForm';

export default async function NuevaCampaniaPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/login');
    }

    return <ReferralCampaignForm />;
}
