'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LaundryIntake from '@/modules/shoe-care/components/laundry/LaundryIntake';

/** Recibir en el local: registrar una orden en el mostrador. */
export default function RecepcionesPage() {
  const [negocio, setNegocio] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/negocio')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => (d?.id ? setNegocio(d) : setError('No se encontró tu negocio.')))
      .catch(() => setError('No se pudo cargar tu negocio. Recarga la página.'));
  }, []);

  if (error) return <p className="p-10 text-center text-sm text-rose-700">{error}</p>;
  if (!negocio) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }
  return <LaundryIntake negocio={negocio} />;
}
