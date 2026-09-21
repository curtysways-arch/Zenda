'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GymAccessConfigDedicatedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/config?tab=accesos');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin mb-4 text-emerald-500" size={36} />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
        Redirigiendo a Configuración...
      </p>
    </div>
  );
}
