'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import GymAccessConfigSection from '@/components/admin/gym/GymAccessConfigSection';

export default function GymAccessConfigDedicatedPage() {
  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [primaryColor, setPrimaryColor] = useState<string>('#0ea5e9');

  useEffect(() => {
    async function loadNegocio() {
      try {
        const res = await fetch('/api/negocio');
        if (res.ok) {
          const data = await res.json();
          setNegocio(data);
          if (data.colorPrimario) setPrimaryColor(data.colorPrimario);
        }
      } catch (err) {
        console.error('Error fetching negocio for access config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNegocio();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin mb-4 text-emerald-500" size={36} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
          Cargando Configuración de Accesos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Breadcrumb / Navegación */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/config"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft size={16} />
          <span>Volver a Configuración General</span>
        </Link>
      </div>

      <GymAccessConfigSection 
        negocio={negocio} 
        primaryColor={primaryColor} 
      />
    </div>
  );
}
