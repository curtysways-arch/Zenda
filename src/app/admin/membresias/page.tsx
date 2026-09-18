import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GymMembersPage from '@/modules/gym/components/GymMembersPage';

export default async function MembresiasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/login');
  }

  return <GymMembersPage />;
}