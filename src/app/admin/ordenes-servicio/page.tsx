'use client';

import { useSession } from 'next-auth/react';
import ShoeCareBackoffice from '@/modules/shoe-care/components/ShoeCareBackoffice';

export default function AdminOrdenesServicioPage() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-400 font-semibold">
        Cargando órdenes de servicio...
      </div>
    );
  }

  const negocioId = (session?.user as any)?.negocioId;

  const negocio = negocioId ? {
    id: negocioId,
    nombre: 'Sneaker Wash Premium',
    slug: negocioId
  } : undefined;

  return <ShoeCareBackoffice negocio={negocio} />;
}
