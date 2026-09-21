import React from 'react';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import GymPlansPage from '@/modules/gym/components/GymPlansPage';

export default async function PlanesPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    redirect('/login');
  }

  return <GymPlansPage />;
}