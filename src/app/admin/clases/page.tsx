import React from 'react';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import GymClassesAdminPage from '@/modules/gym/components/GymClassesAdminPage';

export default async function ClasesPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    redirect('/login');
  }

  return <GymClassesAdminPage />;
}
