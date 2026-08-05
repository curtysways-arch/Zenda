import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Plus, Lock } from 'lucide-react';

interface PhotoGalleryCardProps {
  fotos: {
    recepcion?: string[];
    proceso?: string[];
    entrega?: string[];
  };
  onChangeFotos: (fotos: { recepcion: string[]; proceso: string[]; entrega: string[] }) => void;
}

export function PhotoGalleryCard({ fotos, onChangeFotos }: PhotoGalleryCardProps) {
  const [tab, setTab] = useState<'recepcion' | 'proceso' | 'entrega'>('recepcion');

  const list = fotos[tab] || [];

  const handleSimulateAddPhoto = () => {
    const fakeUrl = `/uploads/inspection/${tab}_${Date.now()}.png`;
    const updated = {
      recepcion: fotos.recepcion || [],
      proceso: fotos.proceso || [],
      entrega: fotos.entrega || [],
      [tab]: [...(fotos[tab] || []), fakeUrl],
    };
    onChangeFotos(updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-600" /> Fotografías de Auditoría (Antes / Después)
        </h3>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Privado & Seguro
        </span>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
        {[
          { key: 'recepcion', label: `1. Recepción / Antes (${(fotos.recepcion || []).length})` },
          { key: 'proceso', label: `2. En Proceso (${(fotos.proceso || []).length})` },
          { key: 'entrega', label: `3. Entrega / Después (${(fotos.entrega || []).length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 px-3 rounded-xl transition-all ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid de imágenes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {list.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-30" />
            <p className="text-xs font-semibold">Sin fotografías cargadas en esta etapa</p>
          </div>
        ) : (
          list.map((url, idx) => (
            <div key={idx} className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 relative group">
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                [Foto #{idx + 1}]
              </div>
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-mono rounded-md backdrop-blur-sm">
                {tab.toUpperCase()}
              </span>
            </div>
          ))
        )}

        <button
          onClick={handleSimulateAddPhoto}
          className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 transition-all flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-amber-600 text-xs font-bold"
        >
          <Plus className="w-6 h-6" />
          Subir Foto
        </button>
      </div>
    </div>
  );
}
