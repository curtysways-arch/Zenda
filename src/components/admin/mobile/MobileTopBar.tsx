'use client';

import { Sparkles, Bell, User, LogOut, QrCode, Share2, Copy, Check, ExternalLink, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TopBarProps {
    primaryColor: string;
    title?: string;
}

const ZendaLogo = ({ size = 24, className = "", style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
    >
        {/* Cuerpo del Calendario */}
        <rect x="3" y="5" width="18" height="15" rx="3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Cabezal */}
        <path d="M3 9.5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Anillos de sujeción */}
        <path d="M8 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 3V6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* El Check en el centro */}
        <path d="M9.5 13.5L11.5 15.5L15 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Líneas inferiores de agenda */}
        <path d="M6 17.5H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M7 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M9 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M11 16.5V18.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        
        {/* Mini reloj abajo a la derecha */}
        <circle cx="16.5" cy="17" r="1.5" stroke="currentColor" strokeWidth="1" />
        <path d="M16.5 16.2V17H17.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

export default function MobileTopBar({ primaryColor, title = 'ADMIN' }: TopBarProps) {
    const { data: session } = useSession();
    const [showMenu, setShowMenu] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        // Construir URL pública del negocio a partir de la sesión
        const slug = (session?.user as any)?.slug;
        if (slug && typeof window !== 'undefined') {
            setShareUrl(`${window.location.origin}/${slug}`);
        }
    }, [session]);

    const handleCopy = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLogout = async () => {
        if (!confirm('¿Cerrar sesión?')) return;
        await signOut({ callbackUrl: '/login' });
    };

    const qrColor = primaryColor.replace('#', '');
    const qrUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=${qrColor}` : '';
    const waUrl = shareUrl ? `https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Reserva tu cita aquí! 👉 ${shareUrl}`)}` : '#';

    return (
        <>
            <div className="sticky top-0 left-0 right-0 z-[90] h-16 bg-white/90 backdrop-blur-2xl border-b border-slate-100 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'));
                            }
                        }}
                        className="size-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-2xl transition-all active:scale-90"
                    >
                        <ZendaLogo size={20} style={{ color: primaryColor }} />
                    </button>
                    <div>
                        <h2 className="font-black text-slate-900 uppercase tracking-tighter leading-none italic">{title}</h2>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none text-slate-400">Spa Premium</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Botón QR / Compartir */}
                    <button 
                        onClick={() => setShowShare(true)}
                        className="size-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-2xl transition-all relative"
                        title="QR y Compartir"
                    >
                        <QrCode size={18} />
                    </button>

                    <button className="size-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-2xl transition-all relative">
                        <Bell size={18} />
                        <span className="absolute top-2.5 right-2.5 size-2 bg-pink-500 rounded-full border-2 border-white" />
                    </button>

                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="size-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-2xl transition-all overflow-hidden border-2"
                        style={{ borderColor: showMenu ? primaryColor : 'transparent' }}
                    >
                        {session?.user?.image ? (
                            <img src={session.user.image} className="w-full h-full object-cover" alt="Perfil" />
                        ) : (
                            <User size={18} />
                        )}
                    </button>
                </div>

                {/* Menu de usuario */}
                {showMenu && (
                    <>
                        <div className="fixed inset-0 z-[-1]" onClick={() => setShowMenu(false)} />
                        <div className="absolute top-[4.5rem] right-4 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-3 mb-2 border-b border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conectado como</p>
                                <p className="text-xs font-black text-slate-900 truncate">{session?.user?.name || 'Administrador'}</p>
                            </div>
                            
                            <Link 
                                href="/admin/perfil"
                                onClick={() => setShowMenu(false)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest mb-1"
                            >
                                <User size={16} />
                                Mi Perfil
                            </Link>

                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                <LogOut size={16} />
                                Cerrar Sesión
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Panel Compartir (Drawer inferior) */}
            {showShare && (
                <div className="fixed inset-0 z-[200] flex flex-col justify-end">
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowShare(false)} />
                    
                    {/* Drawer */}
                    <div className="relative bg-white rounded-t-[2rem] p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Comparte tu Spa</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Código QR y enlace de reservas</p>
                            </div>
                            <button onClick={() => setShowShare(false)} className="size-10 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-500">
                                <X size={18} />
                            </button>
                        </div>

                        {/* QR Code */}
                        {qrUrl && (
                            <div className="flex justify-center bg-slate-50 rounded-3xl p-6">
                                <img src={qrUrl} alt="QR" className="w-44 h-44 rounded-2xl" />
                            </div>
                        )}

                        {/* Enlace copiable */}
                        {shareUrl && (
                            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="bg-transparent text-xs text-slate-600 font-bold w-full outline-none px-1 truncate"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="size-9 shrink-0 rounded-xl flex items-center justify-center transition-all text-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {copied ? <Check size={15} /> : <Copy size={15} />}
                                </button>
                                <Link
                                    href={shareUrl}
                                    target="_blank"
                                    className="size-9 shrink-0 rounded-xl flex items-center justify-center bg-slate-200 text-slate-600"
                                >
                                    <ExternalLink size={15} />
                                </Link>
                            </div>
                        )}

                        {/* WhatsApp */}
                        <Link
                            href={waUrl}
                            target="_blank"
                            className="w-full flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                            Compartir por WhatsApp
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
