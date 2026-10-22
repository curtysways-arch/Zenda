'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminPosRedirectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveSlug() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const data = await res.json();
          if (data.slug) {
            router.replace(`/${data.slug}/pos`);
            return;
          }
        }
      } catch (e) {
        console.error('Error resolviendo slug para POS:', e);
      }
      router.replace('/admin');
    }
    resolveSlug();
  }, [router]);

  return (
    <div className="flex h-[80vh] items-center justify-center text-slate-400">
      <div className="text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm">Abriendo Citiox POS...</p>
      </div>
    </div>
  );
}
