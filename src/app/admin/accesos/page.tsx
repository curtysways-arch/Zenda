import React from 'react';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import GymAccessScanner from '@/modules/gym/components/GymAccessScanner';

export default async function AccesosPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    redirect('/login');
  }

  return <GymAccessScanner />;
}