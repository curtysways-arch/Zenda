import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GymPlansPage from '@/modules/gym/components/GymPlansPage';

export default async function PlanesMembresiaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login');
  }

  return <GymPlansPage />;
}