import React from 'react';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import GymAttendancePage from '@/modules/gym/components/GymAttendancePage';

export default async function AsistenciasPage() {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    redirect('/login');
  }

  return <GymAttendancePage />;
}