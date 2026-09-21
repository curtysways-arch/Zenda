import React from 'react';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import GymMembersPage from '@/modules/gym/components/GymMembersPage';

export default async function SociosPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    redirect('/login');
  }

  return <GymMembersPage />;
}