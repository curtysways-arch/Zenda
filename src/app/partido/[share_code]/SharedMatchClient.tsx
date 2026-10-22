'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
    Users,
    Share2, 
    CheckCircle2, 
    Settings, 
    Trash2, 
    Plus, 
    Trophy, 
    ChevronLeft,
    Crown,
    MinusSquare,
    UserCheck,
    Coins,
    ChevronRight,
    Wallet,
    ShieldCheck,
    X,
    MoreHorizontal,
    Loader2,
    UserRoundPlus,
    Calculator,
    Zap,
    Target,
    Users2,
    Check,
    Flag
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type TabType = 'resumen' | 'jugadores' | 'partidos' | 'config';

export function SharedMatchClient({ matchInfo, shareCode, businessName, isAdmin }: any) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('resumen');
    const [playerNameInput, setPlayerNameInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    
    const [tempConfig, setTempConfig] = useState({
        jugadores_necesarios: matchInfo.jugadores_necesarios,
        precio_pp: Math.round(matchInfo.precio_total / (matchInfo.jugadores_necesarios || 1)),
        dividir_pago: matchInfo.dividir_pago
    });

    const confirmados = useMemo(() => matchInfo.jugadores.filter((j: any) => j.estado === 'confirmado'), [matchInfo.jugadores]);
    const pendientes = useMemo(() => matchInfo.jugadores.filter((j: any) => j.estado === 'pendiente' || j.estado === 'tal_vez'), [matchInfo.jugadores]);
    const faltan = Math.max(0, matchInfo.jugadores_necesarios - confirmados.length);
    const pagados = confirmados.filter((j: any) => j.ya_pago).length;
    
    const precioPorPersona = matchInfo.precio_por_jugador || (matchInfo.jugadores_necesarios > 0 ? matchInfo.precio_total / matchInfo.jugadores_necesarios : 0);
    const totalRecaudado = pagados * precioPorPersona;
    const totalPorRecaudar = (confirmados.length - pagados) * precioPorPersona;

    const handleShare = useCallback(() => {
        const url = `${window.location.origin}/partido/${shareCode}`;
        const mensaje = `⚽ ¡SE ARMÓ EL PARTIDO! ⚽\n\n🏟 *Complejo:* ${businessName}\n🏟 *Cancha:* ${matchInfo.cancha_nombre}\n📅 *Día:* ${matchInfo.fecha}\n⏰ *Hora:* ${matchInfo.hora}\n\n👥 Faltan *${faltan}* jugadores para completar.\n\n👇 ¡Apúntate aquí y no te quedes fuera!:\n${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
    }, [shareCode, businessName, matchInfo, faltan]);

    const handleStartGame = useCallback(async () => {
        if (!isAdmin || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/partidos/${shareCode}/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: `Partido ${matchInfo.games.length + 1}` })
            });
            if (res.ok) {
                router.refresh();
                setActiveTab('partidos');
            }
        } catch (error) { console.error(error); } finally { setSubmitting(false); }
    }, [isAdmin, submitting, shareCode, matchInfo, router]);

    const handleAction = useCallback(async (playerId: string, action: 'approve' | 'reject' | 'toggle_pago' | 'delete') => {
        if (submitting) return;
        setSubmitting(true);
        try {
            let res;
            if (action === 'approve') {
                res = await fetch(`/api/partidos/${shareCode}/match`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId, status: 'confirmado' })
                });
            } else if (action === 'reject' || action === 'delete') {
                res = await fetch(`/api/partidos/${shareCode}/match`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId })
                });
            } else if (action === 'toggle_pago') {
                const player = matchInfo.jugadores.find((j: any) => j.id === playerId);
                res = await fetch(`/api/partidos/${shareCode}/match`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerId, ya_pago: !player?.ya_pago })
                });
            }
            if (res?.ok) {
                router.refresh();
                setSelectedPlayer(null);
            }
        } catch (error) { console.error(error); } finally { setSubmitting(false); }
    }, [submitting, shareCode, matchInfo.jugadores, router]);

    const handleJoin = useCallback(async (estado: string) => {
        if (!playerNameInput.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/partidos/${shareCode}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_name: playerNameInput, status: estado })
            });
            if (res.ok) {
                router.refresh();
                setPlayerNameInput('');
                setShowAddModal(false);
            }
        } catch (error) { console.error(error); } finally { setSubmitting(false); }
    }, [playerNameInput, submitting, shareCode, router]);

    const handleUpdateConfig = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const totalPrice = tempConfig.jugadores_necesarios * tempConfig.precio_pp;
            const res = await fetch(`/api/partidos/${shareCode}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jugadores_necesarios: tempConfig.jugadores_necesarios,
                    dividir_pago: tempConfig.dividir_pago,
                    precio_total: totalPrice
                })
            });
            if (res.ok) {
                setSaveSuccess(true);
                router.refresh();
                setTimeout(() => {
                    setSaveSuccess(false);
                    setActiveTab('resumen');
                }, 1000);
            }
        } catch (error) { console.error(error); } finally { setSubmitting(false); }
    }, [submitting, shareCode, tempConfig, router]);

    return (
        <div className="min-h-screen bg-[#07090f] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] bg-[#07090f]/80 backdrop-blur-xl border-b border-white/5 h-14 flex items-center px-4">
                <div className="max-w-xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <button onClick={() => router.back()} className="size-8 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-blue-500 active:scale-95 transition-all outline-none">
                            <div className="size-full rounded-full bg-[#07090f] flex items-center justify-center overflow-hidden">
                                <ChevronLeft size={16} strokeWidth={3} className="text-emerald-400 relative right-[1px]" />
                            </div>
                        </button>
                        <h1 className="text-xs font-bold text-white uppercase tracking-wide">{businessName}</h1>
                    </div>
                    <div className="size-8" />
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-24 pb-32">
                {activeTab === 'resumen' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-left">
                        <div className="relative group">
                            <div className="absolute inset-x-4 -bottom-4 h-12 bg-emerald-500/10 blur-3xl rounded-full opacity-60" />
                            <div className="relative overflow-hidden rounded-3xl bg-[#11141d] border border-white/10 shadow-2xl p-6 md:p-8 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Trophy size={14} className="text-emerald-500" />
                                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide ">{matchInfo.cancha_nombre}</span>
                                        </div>
                                        <h2 className="text-3xl font-bold text-white tracking-tight leading-none pr-4">Convocatoria</h2>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 shadow-inner">
                                            <Crown size={18} />
                                        </div>
                                        <span className="text-xs font-bold text-white/30 uppercase tracking-wide ">#{shareCode.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-[#07090f]/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5 shadow-inner">
                                        <span className="text-2xl font-bold text-white leading-none">{confirmados.length}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase ">Listos</span>
                                    </div>
                                    <div className="bg-[#07090f]/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5 shadow-inner">
                                        <span className="text-2xl font-bold text-blue-500 leading-none">{faltan}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase ">Faltan</span>
                                    </div>
                                    <div className="bg-[#07090f]/80 rounded-3xl p-4 flex flex-col items-center justify-center gap-1 border border-white/5 shadow-inner">
                                        <span className="text-2xl font-bold text-white leading-none">{matchInfo.jugadores_necesarios}</span>
                                        <span className="text-xs font-bold text-slate-600 uppercase ">CUPO</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-3 border border-white/5">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha</span>
                                        <span className="text-xs font-bold text-white uppercase ">{matchInfo.fecha}</span>
                                    </div>
                                    <div className="h-4 w-px bg-white/10" />
                                    <div className="flex flex-col gap-0.5 text-right">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">HORA</span>
                                        <span className="text-xs font-bold text-white uppercase ">{matchInfo.hora}</span>
                                    </div>
                                </div>
                                <button onClick={handleShare} className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 text-[#07090f] rounded-2xl flex items-center justify-between px-6 active:scale-95 transition-all shadow-xl shadow-emerald-950/40 group">
                                    <div className="flex flex-col items-start font-bold">
                                        <span className="text-xs uppercase tracking-wide leading-none mb-1 opacity-70">Compartir a</span>
                                        <span className="text-xs uppercase leading-none font-bold text-xs ">Whatsapp</span>
                                    </div>
                                    <Share2 size={20} className="group-hover:rotate-12 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. JUGADORES TAB */}
                {activeTab === 'jugadores' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20 text-left">
                        {isAdmin && (
                            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="bg-[#11141d] border border-white/10 rounded-2xl p-4 space-y-1 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide ">Recaudado</span>
                                        <Wallet size={10} className="text-emerald-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-white leading-none">${totalRecaudado}</span>
                                        {totalPorRecaudar > 0 && <span className="text-xs font-bold text-amber-500/50 ">/ ${totalRecaudado + totalPorRecaudar}</span>}
                                    </div>
                                </div>
                                <div className="bg-[#11141d] border border-white/10 rounded-2xl p-4 space-y-1 shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wide ">Cobros OK</span>
                                        <ShieldCheck size={10} className="text-blue-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-white leading-none">{pagados}</span>
                                        <span className="text-xs font-bold text-slate-600 ">DE {confirmados.length}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between px-1 mt-2">
                            <h3 className="text-xl font-bold text-white tracking-tight">Equipo</h3>
                            <button onClick={() => setShowAddModal(true)} className="size-10 rounded-xl bg-emerald-500 text-[#07090f] flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                                <Plus size={20} strokeWidth={4} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide ">CONFIRMADOS ({confirmados.length})</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {confirmados.map((player: any) => (
                                    <button 
                                        key={player.id} 
                                        onClick={() => isAdmin && setSelectedPlayer(player)}
                                        className={cn(
                                            "w-full bg-[#11141d] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-lg transition-all active:scale-[0.98] group relative overflow-hidden",
                                            isAdmin && "hover:border-emerald-500/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-3.5 relative z-10 text-left">
                                            <div className={cn(
                                                "size-10 rounded-xl flex items-center justify-center relative shadow-inner border transition-all duration-500 text-sm",
                                                player.ya_pago ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold " : "bg-[#07090f] border-white/5 text-slate-700 font-bold "
                                            )}>
                                                {player.nombre?.charAt(0).toUpperCase()}
                                                {player.ya_pago && (
                                                    <div className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#11141d] shadow-lg">
                                                        <CheckCircle2 size={8} className="text-white" strokeWidth={5} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-bold text-white uppercase leading-none">{player.nombre}</span>
                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                    <div className={cn("size-1 rounded-full", player.ya_pago ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
                                                    <span className={cn("text-xs font-bold uppercase tracking-wide leading-none", player.ya_pago ? "text-emerald-500" : "text-rose-500")}>
                                                        {player.ya_pago ? 'PAGO VERIFICADO' : 'COBRO PENDIENTE'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isAdmin && <MoreHorizontal size={16} className="text-slate-800 relative z-10" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {pendientes.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide px-1">Por confirmar</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {pendientes.map((player: any) => (
                                        <button key={player.id} onClick={() => isAdmin && setSelectedPlayer(player)} className="w-full bg-[#11141d]/50 border border-amber-500/10 rounded-2xl p-4 flex items-center justify-between group text-left">
                                            <div className="flex items-center gap-3.5">
                                                <div className="size-10 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-sm shadow-inner">?</div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white uppercase leading-none">{player.nombre}</span>
                                                    <span className="text-xs font-bold text-amber-500/50 uppercase mt-1 tracking-wide">En espera</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-amber-500/30" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. PARTIDOS TAB */}
                {activeTab === 'partidos' && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500 pb-20 text-left">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xl font-bold text-white tracking-tight">Partidos</h3>
                            {isAdmin && (
                                <button onClick={handleStartGame} disabled={submitting} className="px-3 py-2 bg-blue-600 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 active:scale-95 transition-all shadow-xl shadow-blue-950/20">
                                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={4} />} NUEVO PARTIDO
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                            {matchInfo.games.map((game: any) => (
                                <Link key={game.id} href={`/partido/${shareCode}/juego/${game.id}`} className="block bg-[#11141d] border border-white/5 rounded-3xl p-4 active:scale-[0.98] transition-all shadow-lg group overflow-hidden relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wide ">{game.nombre}</span>
                                        <div className="flex items-center gap-1.5">
                                            {game.estado === 'en_curso' ? (
                                                <><div className="size-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-xs font-bold text-white uppercase tracking-wide">LIVE</span></>
                                            ) : (
                                                <><Flag size={10} className="text-emerald-500" /><span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">END</span></>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-around">
                                        <span className="text-xs font-bold text-white uppercase truncate max-w-[80px]">{game.equipo_a_nombre}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl font-bold text-white tabular-nums">{game.equipo_a_goles}</span>
                                            <span className="text-sm font-bold text-slate-900">:</span>
                                            <span className="text-3xl font-bold text-white tabular-nums">{game.equipo_b_goles}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white uppercase truncate max-w-[80px] text-right">{game.equipo_b_nombre}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. CONFIG TAB */}
                {activeTab === 'config' && isAdmin && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20 text-left">
                        <div className="flex items-center justify-between px-1">
                            <div className="space-y-0.5">
                                <h3 className="text-xl font-bold text-white tracking-tight">Estructura</h3>
                                <p className="text-emerald-500 text-xs font-bold uppercase tracking-wide ">Diseño de convocatoria</p>
                            </div>
                        </div>

                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 shadow-xl shadow-blue-900/40">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Calculator size={60} /></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-blue-200 uppercase tracking-wide ">Total estimado</span>
                                    <div className="text-3xl font-bold text-white tracking-tight">${tempConfig.jugadores_necesarios * tempConfig.precio_pp}</div>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold uppercase text-blue-100/60 h-auto">
                                    <div className="flex flex-col items-end"><Users2 size={12} className="mb-1" /> {tempConfig.jugadores_necesarios} CUPO</div>
                                    <div className="h-6 w-px bg-white/10 mx-1" />
                                    <div className="flex flex-col items-end"><Target size={12} className="mb-1" /> ${tempConfig.precio_pp} P/P</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#11141d] border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Cupo (players)</label>
                                    <div className="flex items-center justify-between bg-[#07090f] rounded-2xl p-2 border border-white/5">
                                        <button onClick={() => setTempConfig({...tempConfig, jugadores_necesarios: Math.max(1, tempConfig.jugadores_necesarios - 1)})} className="size-10 rounded-xl bg-white/5 active:bg-blue-600 flex items-center justify-center transition-all"><MinusSquare size={18} /></button>
                                        <span className="text-2xl font-bold text-white tabular-nums">{tempConfig.jugadores_necesarios}</span>
                                        <button onClick={() => setTempConfig({...tempConfig, jugadores_necesarios: tempConfig.jugadores_necesarios + 1})} className="size-10 rounded-xl bg-white/5 active:bg-blue-600 flex items-center justify-center transition-all"><Plus size={18} /></button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Costo unitario ($)</label>
                                    <div className="relative group">
                                        <input type="number" className="w-full h-[56px] bg-[#07090f] border border-white/10 rounded-2xl px-5 text-2xl font-bold text-white outline-none focus:border-blue-500/50 transition-all" value={tempConfig.precio_pp} onChange={(e) => setTempConfig({...tempConfig, precio_pp: parseFloat(e.target.value) || 0})} />
                                        <Zap size={10} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/40" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-white uppercase tracking-wide block">Dividir en whatsapp</span>
                                    <p className="text-xs font-bold text-slate-600 uppercase leading-none">Muestra precio p/p al invitar</p>
                                </div>
                                <button onClick={() => setTempConfig({...tempConfig, dividir_pago: !tempConfig.dividir_pago})} className={cn("w-12 h-6 rounded-full p-1 transition-all duration-300 relative", tempConfig.dividir_pago ? "bg-emerald-500" : "bg-slate-800")}>
                                    <div className={cn("size-4 bg-white rounded-full shadow transition-transform duration-300", tempConfig.dividir_pago ? "translate-x-6" : "translate-x-0")} />
                                </button>
                            </div>

                            <button onClick={handleUpdateConfig} disabled={submitting || saveSuccess} className={cn("w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-xl group overflow-hidden", saveSuccess ? "bg-emerald-500 text-[#07090f]" : "bg-white text-black active:scale-[0.98]")}>
                                {submitting ? <Loader2 size={24} className="animate-spin" /> : saveSuccess ? <><Check size={20} strokeWidth={4} /><span>OK</span></> : <span>Guardar</span>}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-[150] px-6 pb-6 bg-gradient-to-t from-[#07090f] to-transparent pointer-events-none">
                <div className="max-w-xl mx-auto flex items-center justify-between bg-[#11141d]/95 backdrop-blur-3xl border border-white/10 p-1.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
                    <button onClick={() => setActiveTab('resumen')} className={cn("flex-1 h-12 rounded-3xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-bold uppercase", activeTab === 'resumen' ? "bg-emerald-500 text-[#07090f]" : "text-slate-500")}>
                        <Trophy size={18} /><span className="text-xs">Evento</span>
                    </button>
                    <button onClick={() => setActiveTab('jugadores')} className={cn("flex-1 h-12 rounded-3xl flex flex-col items-center justify-center gap-0.5 transition-all relative text-xs font-bold uppercase", activeTab === 'jugadores' ? "bg-emerald-500 text-[#07090f]" : "text-slate-500")}>
                        <Users size={18} /><span className="text-xs">Equipo</span>
                    </button>
                    <button onClick={() => setActiveTab('partidos')} className={cn("flex-1 h-12 rounded-3xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-bold uppercase", activeTab === 'partidos' ? "bg-emerald-500 text-[#07090f]" : "text-slate-500")}>
                        <Trophy size={18} /><span className="text-xs">Cancha</span>
                    </button>
                    {isAdmin && (
                        <button onClick={() => setActiveTab('config')} className={cn("flex-1 h-12 rounded-3xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-bold uppercase", activeTab === 'config' ? "bg-emerald-500 text-[#07090f]" : "text-slate-500")}>
                            <Settings size={18} /><span className="text-xs">Ajustes</span>
                        </button>
                    )}
                </div>
            </nav>

            {/* ADD PLAYER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center px-6 bg-[#07090f]/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="relative w-full max-w-sm bg-[#11141d] border border-white/10 rounded-3xl p-8 md:p-10 space-y-6 shadow-[0_0_100px_rgba(0,0,0,1)]">
                        <button onClick={() => !submitting && setShowAddModal(false)} className="absolute top-6 right-6 size-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 active:scale-90 transition-all font-bold"><X size={20} /></button>
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner"><UserRoundPlus size={32} /></div>
                            <h4 className="text-xl font-bold text-white leading-none">Nuevo fichaje</h4>
                        </div>
                        <div className="space-y-4">
                            <input autoFocus type="text" placeholder="NOMBRE JUGADOR..." className="w-full bg-[#07090f] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white uppercase tracking-wide outline-none focus:border-emerald-500/50 transition-all" value={playerNameInput} onChange={(e) => setPlayerNameInput(e.target.value)} />
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => handleJoin('confirmado')} disabled={submitting || !playerNameInput.trim()} className="h-14 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all font-bold">{submitting ? <Loader2 className="animate-spin" /> : <ShieldCheck size={16} />} CONFIRMAR</button>
                                <button onClick={() => handleJoin('tal_vez')} disabled={submitting || !playerNameInput.trim()} className="h-14 bg-white/5 border border-white/10 text-blue-500 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all font-bold">Tal vez</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGEMENT MODAL */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center px-6 bg-[#07090f]/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div onClick={() => !submitting && setSelectedPlayer(null)} className="absolute inset-0" />
                    <div className="relative w-full max-w-sm bg-[#11141d] border border-white/10 rounded-3xl p-8 space-y-6 shadow-[0_0_80px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="size-16 rounded-2xl bg-[#07090f] border border-white/5 flex items-center justify-center text-2xl font-bold text-emerald-500 shadow-inner">{selectedPlayer.nombre?.charAt(0).toUpperCase()}</div>
                            <h4 className="text-xl font-bold text-white ">{selectedPlayer.nombre}</h4>
                        </div>
                        <div className="space-y-2.5">
                            {selectedPlayer.estado !== 'confirmado' ? (
                                <button onClick={() => handleAction(selectedPlayer.id, 'approve')} disabled={submitting} className="w-full h-14 bg-emerald-500 text-[#07090f] rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all font-bold">{submitting ? <Loader2 className="animate-spin" /> : <UserCheck size={18} />} APROBAR JUGADOR</button>
                            ) : (
                                <button onClick={() => handleAction(selectedPlayer.id, 'toggle_pago')} disabled={submitting} className={cn("w-full h-14 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all font-bold", selectedPlayer.ya_pago ? "bg-white/5 text-slate-500" : "bg-amber-500 text-[#07090f]")}>{submitting ? <Loader2 className="animate-spin" /> : <Coins size={18} />} {selectedPlayer.ya_pago ? 'COBRO OK' : 'REGISTRAR PAGO'}</button>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleAction(selectedPlayer.id, selectedPlayer.estado === 'confirmado' ? 'delete' : 'reject')} disabled={submitting} className="h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all font-bold">{submitting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />} {selectedPlayer.estado === 'confirmado' ? 'EXPULSAR' : 'RECHAZAR'}</button>
                                <button onClick={() => setSelectedPlayer(null)} disabled={submitting} className="h-12 bg-white/5 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center active:scale-95 transition-all font-bold">Salir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
