"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare, Download, Sparkles, Smartphone } from "lucide-react";
import { usePathname } from "next/navigation";
import { 
  addInstallationListener, 
  removeInstallationListener, 
  installPWA, 
  isPWAInstalled 
} from "@/lib/pwa-install";

export default function PWAInstallPrompt() {
    const pathname = usePathname();
    const [canInstall, setCanInstall] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    
    // Estados dinámicos para nombre y logo del negocio
    const [businessName, setBusinessName] = useState("Zenda App");
    const [businessLogo, setBusinessLogo] = useState("");
 
    // Solo mostrar en la página del negocio final (/[slug])
    const segments = pathname.split('/').filter(Boolean);
    const isPublicBusinessPage = segments.length >= 1 && !['admin', 'superadmin', 'login', 'register', 'api'].includes(segments[0]);
    const slug = isPublicBusinessPage ? segments[0] : null;
 
    useEffect(() => {
        if (!isPublicBusinessPage) return;
 
        // Check standalone mode
        setIsInstalled(isPWAInstalled());
 
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        const android = /android/.test(userAgent);
        setIsIOS(ios);
        setIsAndroid(android);
 
        const handleAvailabilityChange = (available: boolean) => {
            setCanInstall(available);
            if (available && !isInstalled) {
                // Show after some delay for better UX
                const timer = setTimeout(() => setIsVisible(true), 5000); // 5 seconds
                return () => clearTimeout(timer);
            }
        };
 
        addInstallationListener(handleAvailabilityChange);
 
        // Cargar información real del negocio
        if (slug) {
            fetch(`/api/public/negocio/${slug}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.nombre) {
                        setBusinessName(data.nombre);
                    }
                    if (data && data.logoUrl) {
                        setBusinessLogo(data.logoUrl);
                    }
                })
                .catch(err => console.error("Error cargando info de negocio para PWA:", err));
        }
 
        // For iOS, which doesn't support beforeinstallprompt, show instructions
        if (ios && !isPWAInstalled()) {
            const timer = setTimeout(() => setIsVisible(true), 7000); // 7 seconds
            return () => clearTimeout(timer);
        }
 
        return () => {
            removeInstallationListener(handleAvailabilityChange);
        };
    }, [isPublicBusinessPage, isInstalled, slug]);
 
    const handleInstallClick = async () => {
        if (!canInstall) {
            // Should not happen on Android if button is visible, 
            // but for safety/iOS instructions:
            return;
        }
        
        const success = await installPWA();
        if (success) {
            setIsVisible(false);
            setIsInstalled(true);
        }
    };
 
    if (isInstalled || !isVisible || !isPublicBusinessPage) return null;
 
    return (
        <div className="fixed bottom-24 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-700 max-w-sm mx-auto">
            <div className="bg-slate-900/95 dark:bg-[#0a0f0d]/95 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/30 transition-all duration-500" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -ml-12 -mb-12" />
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="size-14 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0 transform group-hover:rotate-6 transition-transform overflow-hidden">
                        {businessLogo ? (
                            <img src={businessLogo} alt={businessName} className="w-full h-full object-cover" />
                        ) : (
                            <Smartphone className="text-white size-7" strokeWidth={2.5} />
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles size={12} className="text-emerald-400 animate-pulse" fill="currentColor" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">App Premium</span>
                        </div>
                        <h4 className="text-base font-black text-white tracking-tight uppercase italic truncate leading-none">{businessName}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1 leading-tight">
                            {isIOS 
                              ? "Instala para recibir notificaciones" 
                              : "Reserva un 50% más rápido que en web"}
                        </p>
                    </div>
 
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-white/30 hover:text-white/60 transition-colors p-1 self-start"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="mt-4 relative z-10">
                    {canInstall && !isIOS ? (
                        <button
                            onClick={handleInstallClick}
                            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-3 rounded-2xl flex items-center justify-center gap-2 hover:from-blue-700 hover:to-emerald-700 transition-all active:scale-95 shadow-xl shadow-blue-500/20 text-sm font-black uppercase italic tracking-wider"
                        >
                            <Download size={18} strokeWidth={3} />
                            Instalar App Gratis
                        </button>
                    ) : isIOS ? (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col gap-2">
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest text-center">Instrucciones iOS</p>
                          <div className="flex items-center justify-center gap-4">
                              <div className="flex flex-col items-center gap-1">
                                <div className="p-2 bg-white/10 rounded-lg"><Share size={16} className="text-blue-400" /></div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Compartir</span>
                              </div>
                              <div className="text-slate-600">→</div>
                              <div className="flex flex-col items-center gap-1">
                                <div className="p-2 bg-white/10 rounded-lg"><PlusSquare size={16} className="text-emerald-400" /></div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Añadir</span>
                              </div>
                          </div>
                        </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 text-center italic">Usa el menú del navegador para instalar</p>
                    )}
                </div>
            </div>
        </div>
    );
}
