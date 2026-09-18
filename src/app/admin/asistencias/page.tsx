import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GymAttendancePage from '@/modules/gym/components/GymAttendancePage';

export default async function AsistenciasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login');
  }

  return <GymAttendancePage />;
}