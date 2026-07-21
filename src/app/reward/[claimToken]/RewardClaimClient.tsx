'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Gift, 
    User, 
    Phone, 
    Building, 
    Clock, 
    CheckCircle, 
    AlertTriangle, 
    Sparkles, 
    ArrowLeft,
    ShieldCheck
} from 'lucide-react';
import { UnifiedRewardData } from '@/lib/loyalty/rewardService';

interface RewardClaimClientProps {
    reward: UnifiedRewardData;
    sig: string;
    employeeName: string;
    audits: any[];
}

export default function RewardClaimClient({ reward, sig, employeeName, audits }: RewardClaimClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(reward.estado);
    const [error, setError] = useState<string | null>(null);
    const [claimTokenRevokedAt, setClaimTokenRevokedAt] = useState<Date | null>(
        reward.claimTokenRevokedAt ? new Date(reward.claimTokenRevokedAt) : null
    );

    const isExpired = reward.claimTokenExpiresAt ? new Date(reward.claimTokenExpiresAt) < new Date() : false;

    const handleAction = async (actionType: 'READY' | 'DELIVER') => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/loyalty/entregar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    claimToken: reward.claimToken,
                    action: actionType,
                    sig
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al procesar la acción');
            }

            setStatus(data.estado);
            if (data.estado === 'ENTREGADO') {
                setClaimTokenRevokedAt(new Date());
            }
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            {/* Header decorativo */}
            <div className="bg-slate-900 text-white pt-10 pb-16 px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `radial-gradient(circle at 10% 20%, white 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                }} />
                
                <div className="max-w-md mx-auto flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">CITIOX FIDELIDAD</span>
                    <span className="text-[9px] font-bold bg-white/10 px-3 py-1 rounded-full text-slate-300">
                        Atendido por: {employeeName}
                    </span>
                </div>

                <div className="max-w-md mx-auto mt-8 text-center space-y-1 relative z-10">
                    <h1 className="text-3xl font-black uppercase italic tracking-tight">Validar Premio</h1>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                        Ficha de entrega física y QR de seguridad
                    </p>
                </div>
            </div>

            {/* Ficha Principal */}
            <div className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-6">
                
                {/* Alertas de Estado del QR */}
                {claimTokenRevokedAt ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-center space-y-3 shadow-sm animate-in zoom-in-95">
                        <AlertTriangle className="mx-auto text-rose-600" size={32} />
                        <div>
                            <h3 className="text-xs font-black text-rose-800 uppercase tracking-wide">Premio ya entregado</h3>
                            <p className="text-[11px] font-bold text-rose-700/80 mt-1 uppercase">
                                Este premio físico ya fue entregado el {claimTokenRevokedAt.toLocaleDateString('es-ES')} a las {claimTokenRevokedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.
                            </p>
                        </div>
                    </div>
                ) : isExpired ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-center space-y-3 shadow-sm animate-in zoom-in-95">
                        <AlertTriangle className="mx-auto text-rose-600" size={32} />
                        <div>
                            <h3 className="text-xs font-black text-rose-800 uppercase tracking-wide">Código QR Expirado</h3>
                            <p className="text-[11px] font-bold text-rose-700/80 mt-1 uppercase">
                                ⚠️ Este código de reclamación ha expirado. Genera uno nuevo desde Mis Premios.
                            </p>
                        </div>
                    </div>
                ) : status === 'SOLICITADO' ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-center space-y-2 shadow-sm">
                        <Clock className="mx-auto text-amber-600 animate-pulse" size={32} />
                        <div>
                            <h3 className="text-xs font-black text-amber-800 uppercase tracking-wide">El premio aún está siendo preparado</h3>
                            <p className="text-[10px] font-bold text-amber-700/80 uppercase">
                                Por favor, prepara el premio físico para el cliente y márcalo como "Listo para retirar" para habilitar la entrega.
                            </p>
                        </div>
                    </div>
                ) : status === 'LISTO_PARA_RETIRAR' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-center space-y-2 shadow-sm animate-in fade-in">
                        <Sparkles className="mx-auto text-emerald-600 animate-bounce" size={32} />
                        <div>
                            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wide">¡Listo para retirar!</h3>
                            <p className="text-[10px] font-bold text-emerald-700/80 uppercase">
                                El cliente está listo para retirar este premio. Confirma la entrega física presionando el botón.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-bold text-center border border-rose-100">
                        {error}
                    </div>
                )}

                {/* Tarjeta de Datos */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6">
                    
                    {/* Detalles del Premio */}
                    <div className="flex gap-4 items-start">
                        <div className="size-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                            <Gift size={24} />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-pink-500 bg-pink-50 px-2 py-0.5 rounded-md">
                                {reward.tipoOrigen === 'PUNTOS' ? 'Canje / Misión' : 'Referido'}
                            </span>
                            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight mt-1">{reward.nombre}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{reward.descripcion}</p>
                        </div>
                    </div>

                    <hr className="border-slate-50" />

                    {/* Información del Negocio y Cliente */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Building size={16} className="text-slate-400" />
                            <div>
                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">NEGOCIO</span>
                                <span className="text-xs font-bold text-slate-700 uppercase">{reward.negocioNombre}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <User size={16} className="text-slate-400" />
                            <div>
                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">CLIENTE</span>
                                <span className="text-xs font-bold text-slate-700 uppercase">{reward.clienteNombre}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Phone size={16} className="text-slate-400" />
                            <div>
                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">TELÉFONO CLIENTE</span>
                                <span className="text-xs font-bold text-slate-700">{reward.clienteTelefono}</span>
                            </div>
                        </div>

                        {reward.claimCode && (
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={16} className="text-slate-400" />
                                <div>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">CÓDIGO DE RECLAMO MANUAL</span>
                                    <span className="text-sm font-black text-slate-800 font-mono tracking-wider">{reward.claimCode}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="border-slate-50" />

                    {/* Acciones de Negocio */}
                    {!claimTokenRevokedAt && !isExpired && (
                        <div className="pt-2">
                            {status === 'SOLICITADO' ? (
                                <button
                                    onClick={() => handleAction('READY')}
                                    disabled={loading}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border-0 shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : 'Marcar listo para retirar'}
                                </button>
                            ) : status === 'LISTO_PARA_RETIRAR' ? (
                                <button
                                    onClick={() => handleAction('DELIVER')}
                                    disabled={loading}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border-0 shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : 'Confirmar entrega física'}
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Historial de Auditoría de Escaneos */}
                {audits && audits.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Clock size={12} />
                            Historial de Escaneo y Auditoría
                        </h4>
                        
                        <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                            {audits.map((audit) => (
                                <div key={audit.id} className="text-[10px] border-b border-slate-50 pb-2.5 last:border-0 last:pb-0 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                            audit.accion === 'SCANNED' ? 'bg-slate-100 text-slate-600' :
                                            audit.accion === 'READY' ? 'bg-amber-50 text-amber-700' :
                                            audit.accion === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' :
                                            'bg-rose-50 text-rose-700'
                                        }`}>
                                            {audit.accion === 'SCANNED' ? 'Escaneado' :
                                             audit.accion === 'READY' ? 'Listo' :
                                             audit.accion === 'DELIVERED' ? 'Entregado' : audit.accion}
                                        </span>
                                        <span className="text-[9px] font-medium text-slate-400">
                                            {new Date(audit.createdAt).toLocaleDateString('es-ES')} {new Date(audit.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 font-semibold">
                                        Realizado por: <span className="text-slate-800">{audit.empleadoId || 'Sistema'}</span>
                                    </p>
                                    {audit.ip && (
                                        <p className="text-slate-400 text-[8px]">
                                            IP: {audit.ip} | Dispositivo: {audit.userAgent?.substring(0, 40)}...
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
