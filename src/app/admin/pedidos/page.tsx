'use client';
// src/app/admin/pedidos/page.tsx
// Redirección de compatibilidad de /admin/pedidos a /admin/ventas

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminPedidosRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/ventas');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-2">
      <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
      <p className="text-xs font-bold">Redirigiendo a Ventas POS (/admin/ventas)...</p>
    </div>
  );
}
