'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import ShoeCareBackoffice from '@/modules/shoe-care/components/ShoeCareBackoffice';

export default function AdminOrdenesServicioPage() {
  const { data: session, status } = useSession();
  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNegocio() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setNegocio(data);
          }
        }
      } catch (err) {
        console.error('Error cargando negocio en ordenes-servicio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNegocio();
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-400 font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Cargando órdenes de servicio...</span>
        </div>
      </div>
    );
  }

  const sessionNegocioId = (session?.user as any)?.negocioId;
  const effectiveNegocio = negocio || (sessionNegocioId ? {
    id: sessionNegocioId,
    nombre: session?.user?.name || 'Lavandería & Calzado',
    slug: sessionNegocioId
  } : undefined);

  return <ShoeCareBackoffice negocio={effectiveNegocio} />;
}
