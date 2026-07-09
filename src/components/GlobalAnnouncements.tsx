'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Megaphone, X, ArrowRight, Bell, Sparkles } from 'lucide-react';

interface ActiveComm {
  id: string;
  titulo: string;
  subtitulo?: string;
  contenido: string;
  imagenUrl?: string;
  icono: string;
  color: string;
  prioridad: string;
  tipo: string;
  canales: string[];
  popupConfig?: {
    showOnce?: boolean;
    showUntilClosed?: boolean;
  };
}

export default function GlobalAnnouncements() {
  const { data: session } = useSession();
  const [activeBanner, setActiveBanner] = useState<ActiveComm | null>(null);
  const [activePopup, setActivePopup] = useState<ActiveComm | null>(null);
  const [closedBanners, setClosedBanners] = useState<string[]>([]);
  const [closedPopups, setClosedPopups] = useState<string[]>([]);

  useEffect(() => {
    if (!session || !session.user) return;

    // Recuperar cerrados del sessionStorage
    try {
      const b = sessionStorage.getItem('citiox_closed_banners');
      const p = sessionStorage.getItem('citiox_closed_popups');
      if (b) setClosedBanners(JSON.parse(b));
      if (p) setClosedPopups(JSON.parse(p));
    } catch (_) {}

    // Fetch comunicaciones activas
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/public/comunicaciones/activas');
        if (res.ok) {
          const list: ActiveComm[] = await res.json();
          
          // Buscar banner activo que no esté cerrado
          const banner = list.find(c => c.canales.includes('BANNER'));
          if (banner) {
            setActiveBanner(banner);
          }

          // Buscar popup activo que no esté cerrado
          const popup = list.find(c => c.canales.includes('POPUP'));
          if (popup) {
            setActivePopup(popup);
          }
        }
      } catch (e) {
        console.error('Error fetching global announcements:', e);
      }
    };

    fetchAnnouncements();
  }, [session]);

  const handleCloseBanner = () => {
    if (!activeBanner) return;
    const updated = [...closedBanners, activeBanner.id];
    setClosedBanners(updated);
    try {
      sessionStorage.setItem('citiox_closed_banners', JSON.stringify(updated));
    } catch (_) {}
    setActiveBanner(null);
  };

  const handleClosePopup = () => {
    if (!activePopup) return;
    const updated = [...closedPopups, activePopup.id];
    setClosedPopups(updated);
    try {
      sessionStorage.setItem('citiox_closed_popups', JSON.stringify(updated));
    } catch (_) {}
    setActivePopup(null);
  };

  const handleTrackAction = async (id: string, action: 'CLICK' | 'CONVERSION') => {
    try {
      await fetch('/api/public/comunicaciones/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationId: id, action }),
      });
    } catch (_) {}
  };

  const isBannerClosed = activeBanner ? closedBanners.includes(activeBanner.id) : true;
  const isPopupClosed = activePopup ? closedPopups.includes(activePopup.id) : true;

  return (
    <>
      {/* Banner Superior */}
      {activeBanner && !isBannerClosed && (
        <div 
          style={{ borderBottomColor: `${activeBanner.color}30` }}
          className="bg-slate-900 text-white border-b relative z-50 animate-slideDown shadow-[0_4px_30px_rgba(0,0,0,0.15)] backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                style={{ backgroundColor: `${activeBanner.color}15`, color: activeBanner.color }}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-800 shrink-0"
              >
                <Megaphone className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate">
                <span className="font-black text-white uppercase tracking-wider mr-2 bg-indigo-500/10 px-2 py-0.5 rounded text-[9px] border border-indigo-500/20">
                  {activeBanner.tipo}
                </span>
                {activeBanner.titulo}
                {activeBanner.subtitulo && (
                  <span className="hidden md:inline text-slate-400 font-medium ml-2">— {activeBanner.subtitulo}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  handleTrackAction(activeBanner.id, 'CLICK');
                  // Puedes navegar o abrir URL si la campaña la tiene en metadatos
                  handleCloseBanner();
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-indigo-500/10"
              >
                Ver Más <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleCloseBanner}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Global */}
      {activePopup && !isPopupClosed && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-scaleUp">
            {/* Background Accent Gradient */}
            <div 
              style={{ background: `radial-gradient(circle at top right, ${activePopup.color}15, transparent 50%)` }}
              className="absolute inset-0 pointer-events-none"
            />

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Anuncio Oficial
                  </span>
                </div>
                <button 
                  onClick={handleClosePopup}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activePopup.imagenUrl && (
                <div className="h-44 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative">
                  <img src={activePopup.imagenUrl} alt="Anuncio" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight leading-snug">
                  {activePopup.titulo}
                </h3>
                {activePopup.subtitulo && (
                  <p className="text-xs font-semibold text-slate-400">{activePopup.subtitulo}</p>
                )}
              </div>

              <div className="text-xs leading-relaxed text-slate-300 bg-slate-950/40 border border-slate-850 p-4 rounded-xl whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                {activePopup.contenido}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleTrackAction(activePopup.id, 'CONVERSION');
                    handleClosePopup();
                  }}
                  style={{ backgroundColor: activePopup.color }}
                  className="flex-1 py-3.5 hover:opacity-90 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all"
                >
                  Entendido / Participar
                </button>
                <button
                  onClick={() => {
                    handleTrackAction(activePopup.id, 'CLICK');
                    handleClosePopup();
                  }}
                  className="px-5 py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
