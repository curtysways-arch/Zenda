'use client';

import { useState, useEffect } from 'react';
import { X, UploadCloud, CreditCard, Landmark, CheckCircle2, Loader2, MessageCircle, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    planId: string;
    planName: string;
    planPrice: number;
    primaryColor?: string;
    isRenewal?: boolean;
}

interface DbAccount {
    id: string;
    banco: string;
    numeroCuenta: string;
    nombreCuenta: string;
    logo: string | null;
}

export default function UpgradeModal({ isOpen, onClose, planId, planName, planPrice, primaryColor = '#1dc95c', isRenewal = false }: UpgradeModalProps) {
    const router = useRouter();
    const [metodo, setMetodo] = useState<'TRANSFERENCIA' | 'DEUNA' | ''>('');
    const [referencia, setReferencia] = useState('');
    const [comprobanteBase64, setComprobanteBase64] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Cuentas dinámicas de la base de datos
    const [dbAccounts, setDbAccounts] = useState<DbAccount[]>([]);
    const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchPublicAccounts = async () => {
                setLoadingAccounts(true);
                try {
                    const res = await fetch('/api/public/cuentas-pago');
                    if (res.ok) {
                        const data = await res.json();
                        setDbAccounts(data);
                        // Si hay cuentas predefinidas, forzar selección de la primera
                        if (data.length > 0) {
                            setSelectedAccountIndex(0);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching dynamic bank accounts:', error);
                } finally {
                    setLoadingAccounts(false);
                }
            };
            fetchPublicAccounts();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setComprobanteBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/billing/request-upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    metodoPago: metodo,
                    referencia,
                    comprobanteUrl: comprobanteBase64,
                    monto: planPrice
                })
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onClose();
                    router.refresh();
                }, 3000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-slate-100 flex flex-col max-h-[90vh]">
                
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">
                        {isRenewal ? 'Renovar Plan' : 'Mejorar Plan'}
                    </h2>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {isRenewal ? `Renovar ${planName} — 1 mes más` : `Activar ${planName} - $${planPrice}/mes`}
                    </p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                        <X size={24} />
                    </button>
                </div>

                {success ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter italic">¡Solicitud Enviada!</h3>
                        <p className="text-slate-500 font-medium">Estamos verificando tu pago. Tu plan se activará pronto.</p>
                    </div>
                ) : (
                    <div className="p-6 md:p-8 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Opciones de Pago */}
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">1. Selecciona el método</h3>
                                
                                <div className="space-y-3">
                                    <button 
                                        type="button"
                                        onClick={() => setMetodo('TRANSFERENCIA')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${metodo === 'TRANSFERENCIA' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className={`p-3 rounded-xl ${metodo === 'TRANSFERENCIA' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Landmark size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-900 uppercase text-sm">Transferencia</p>
                                            <p className="text-xs text-slate-500 font-medium">Pichincha, Guayaquil, etc.</p>
                                        </div>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={() => setMetodo('DEUNA')}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${metodo === 'DEUNA' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <div className={`p-3 rounded-xl ${metodo === 'DEUNA' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <CreditCard size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-900 uppercase text-sm">DeUna / Pago Seguro</p>
                                            <p className="text-xs text-slate-500 font-medium">Escanea el QR</p>
                                        </div>
                                    </button>
                                </div>

                                {metodo && (
                                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 text-sm text-slate-700 space-y-4">
                                        {metodo === 'TRANSFERENCIA' ? (
                                            loadingAccounts ? (
                                                <div className="flex items-center justify-center p-6 gap-2">
                                                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando Cuentas...</span>
                                                </div>
                                            ) : dbAccounts.length > 0 ? (
                                                <div className="space-y-4">
                                                    {/* Selector de cuenta si hay más de una */}
                                                    {dbAccounts.length > 1 && (
                                                        <div className="space-y-1">
                                                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Selecciona el Banco</label>
                                                            <div className="relative">
                                                                <select
                                                                    value={selectedAccountIndex}
                                                                    onChange={e => setSelectedAccountIndex(Number(e.target.value))}
                                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-colors text-xs font-bold uppercase cursor-pointer appearance-none pr-10"
                                                                >
                                                                    {dbAccounts.map((acc, idx) => (
                                                                        <option key={acc.id} value={idx}>
                                                                            {acc.banco} - {acc.nombreCuenta.split('-')[0]}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Detalle de la cuenta seleccionada */}
                                                    {(() => {
                                                        const activeAcc = dbAccounts[selectedAccountIndex] || dbAccounts[0];
                                                        if (!activeAcc) return null;
                                                        return (
                                                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
                                                                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-1">
                                                                    {activeAcc.logo && (
                                                                        <div className="size-10 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center bg-slate-50 flex-shrink-0">
                                                                            <img src={activeAcc.logo} alt={activeAcc.banco} className="w-full h-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Banco</span>
                                                                        <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{activeAcc.banco}</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                                    <div>
                                                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nombre/Tipo</span>
                                                                        <span className="font-bold text-slate-700 uppercase">{activeAcc.nombreCuenta}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Número de Cuenta</span>
                                                                        <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 tracking-wide text-xs">{activeAcc.numeroCuenta}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                /* Fallback original si no hay cuentas registradas en base de datos */
                                                <>
                                                    <p><span className="font-bold text-xs uppercase text-slate-400 block tracking-widest mb-1">Banco de Depósito</span></p>
                                                    <p><span className="font-bold">Banco:</span> Banco Pichincha</p>
                                                    <p><span className="font-bold">Tipo:</span> Ahorros</p>
                                                    <p><span className="font-bold">Cuenta:</span> 2200000000</p>
                                                    <p><span className="font-bold">Titular:</span> Zenda App S.A.</p>
                                                </>
                                            )
                                        ) : (
                                            /* DeUna rendering */
                                            <div className="flex flex-col items-center justify-center p-2 text-center">
                                                {(() => {
                                                    // Si el Súper Admin registró una cuenta con preset 'DeUna', podemos intentar extraer su logo/QR
                                                    const deunaAccount = dbAccounts.find(acc => acc.banco.toLowerCase().includes('deuna') || acc.nombreCuenta.toLowerCase().includes('deuna'));
                                                    if (deunaAccount && deunaAccount.logo) {
                                                        return (
                                                            <div className="flex flex-col items-center">
                                                                <p className="font-bold text-xs mb-3 text-slate-800 uppercase tracking-widest">Escanea desde tu app DeUna:</p>
                                                                <div className="size-44 bg-white border border-slate-200 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-lg relative p-2">
                                                                    <img src={deunaAccount.logo} alt="QR DeUna" className="w-full h-full object-contain rounded-2xl" />
                                                                </div>
                                                                <div className="mt-3 text-center">
                                                                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Celular/Titular</span>
                                                                    <span className="text-xs font-mono font-bold text-slate-700">{deunaAccount.numeroCuenta} - {deunaAccount.nombreCuenta}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="flex flex-col items-center">
                                                            <p className="font-bold mb-3 text-xs text-slate-800 uppercase tracking-widest">Escanea desde tu app DeUna:</p>
                                                            <div className="w-32 h-32 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                                                                <span className="text-slate-400 text-xs font-bold uppercase">QR AQUÍ</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Formulario de Comprobante */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">2. Envía tu comprobante</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-2">Comprobante (Foto/Captura)</label>
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                required
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`w-full p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors ${comprobanteBase64 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                                <UploadCloud size={32} className={comprobanteBase64 ? 'text-emerald-500' : 'text-slate-400'} />
                                                <span className="text-sm font-bold text-slate-600">
                                                    {comprobanteBase64 ? 'Comprobante Adjunto' : 'Subir archivo o tomar foto'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-700 mb-2">No. Referencia (Opcional)</label>
                                        <input 
                                            type="text" 
                                            value={referencia}
                                            onChange={e => setReferencia(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-colors font-medium text-slate-900"
                                            placeholder="Ej: 12345678"
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading || !metodo || !comprobanteBase64}
                                    className="w-full flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black active:scale-95"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Solicitud'}
                                </button>
                            </form>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-500 text-sm">
                            <MessageCircle size={16} />
                            <span>¿Necesitas ayuda? <a href="#" className="font-bold underline text-slate-700">Contáctanos por WhatsApp</a></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
