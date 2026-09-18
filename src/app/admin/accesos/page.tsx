import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GymAccessScanner from '@/modules/gym/components/GymAccessScanner';

export default async function AccesosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login');
  }

  return <GymAccessScanner />;
}