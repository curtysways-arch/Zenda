"use client";

import React, { useEffect, useState } from 'react';
import KitchenTables from '@/components/restaurant/KitchenTables';

export default function AdminMesasPage() {
  const [slug, setSlug] = useState<string>('demo');
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMesas = async (currentSlug: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${currentSlug}/mesas`);
      const data = await res.json();
      if (data.mesas) setMesas(data.mesas);
    } catch (err) {
      console.error("Error al cargar mesas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/current-business')
      .then(res => res.json())
      .then(data => {
        const s = data.negocio?.slug || 'demo';
        setSlug(s);
        fetchMesas(s);
      })
      .catch(() => fetchMesas('demo'));
  }, []);

  const handleUpdateStatus = async (mesaId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/${slug}/mesas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesaId, status: newStatus })
      });
      if (res.ok) {
        setMesas(prev => prev.map(m => m.id === mesaId ? { ...m, status: newStatus } : m));
      }
    } catch (err) {
      console.error("Error actualizando mesa:", err);
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white font-sans">
      <KitchenTables slug={slug} mesas={mesas} onUpdateStatus={handleUpdateStatus} />
    </div>
  );
}
