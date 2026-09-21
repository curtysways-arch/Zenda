import React, { Suspense } from 'react';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import GymMembershipsPage from '@/modules/gym/components/GymMembershipsPage';

export default async function MembresiasPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <Suspense>
      <GymMembershipsPage />
    </Suspense>
  );
}
