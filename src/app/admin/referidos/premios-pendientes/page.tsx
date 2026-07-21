'use client';

import { useState, useEffect } from 'react';
import { Gift, Search, Sparkles, Check, X, Calendar, Clipboard, User, Phone, Loader2, Award, Clock, QrCode } from 'lucide-react';

interface PendingDelivery {
    id: string;
    tipoOrigen: 'REFERIDO' | 'PUNTOS';
    claimCode: string;
    createdAt: string;
    estado: string;
    Usuario: {
        id: string;
        nombre: string;
        phone: string;
        email: string | null;
    };
    premioNombre: string;
    detallesRecompensa: string;
    costoPuntos: number;
}

export default function PremiosPendientesPage() {
    const [deliveries, setDeliveries] = useState<PendingDelivery[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [confirmingDelivery, setConfirmingDelivery] = useState<PendingDelivery | null>(null);
    const [observaciones, setObservaciones] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Estado del buscador manual/QR
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [manualSearchLoading, setManualSearchLoading] = useState(false);
    const [manualError, setManualError] = useState<string | null>(null);

    const fetchDeliveries = async (query = '') => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/loyalty/pending-deliveries?search=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setDeliveries(data);
            }
        } catch (e) {
            console.error("Error fetching deliveries:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDeliveries(search);
    };

    const handleManualSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;

        setManualSearchLoading(true);
        setManualError(null);

        try {
            const res = await fetch(`/api/admin/loyalty/buscar-codigo?claimCode=${encodeURIComponent(manualCode.trim())}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Código de reclamo inválido o no encontrado');
            }

            // Redirigir a la ficha de verificación del premio firmada
            window.location.href = `/reward/${data.claimToken}?sig=${data.sig}`;
        } catch (err: any) {
            setManualError(err.message);
        } finally {
            setManualSearchLoading(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!confirmingDelivery) return;
        try {
            setActionLoading(true);
            const res = await fetch('/api/admin/loyalty/pending-deliveries', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rewardId: confirmingDelivery.id,
                    tipoOrigen: confirmingDelivery.tipoOrigen,
                    estado: 'ENTREGADO',
                    observaciones
                })
            });

            if (res.ok) {
                setMessage({ text: `🎉 ¡Premio "${confirmingDelivery.premioNombre}" entregado con éxito!`, type: 'success' });
                setConfirmingDelivery(null);
                setObservaciones('');
                fetchDeliveries(search);
            } else {
                const data = await res.json();
                setMessage({ text: data.error || 'Ocurrió un error al confirmar la entrega', type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Error de conexión con el servidor', type: 'error' });
        } finally {
            setActionLoading(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Cabecera Premium */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-pink-500 bg-pink-50 px-3 py-1 rounded-full inline-block mb-2">
                        Fidelización & Recompensas
                    </span>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        PREMIOS POR ENTREGAR <Gift className="text-pink-500 animate-pulse" size={28} />
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Gestiona, busca y confirma la entrega de premios físicos y manuales reclamados por los clientes.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="px-5 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider active:scale-[0.98] transition-all flex items-center gap-2 shadow-md border-0 cursor-pointer"
                    >
                        <QrCode size={16} />
                        Escanear / Buscar Código
                    </button>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl">
                        <Clock size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">
                            Pendientes: <strong className="text-pink-500 font-black">{deliveries.length}</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* Alertas */}
            {message && (
                <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center gap-3 animate-in fade-in duration-300 ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                    <Sparkles size={18} className={message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
                    {message.text}
                </div>
            )}

            {/* Barra de Búsqueda */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, teléfono o código (PX-...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-sm"
                    />
                </div>
                <button
                    type="submit"
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md"
                >
                    Buscar
                </button>
            </form>

            {/* Listado de Entregas */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-pink-500" size={40} />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargando pendientes...</p>
                </div>
            ) : deliveries.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-12 text-center max-w-md mx-auto mt-6">
                    <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                        <Gift size={28} />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Sin entregas pendientes</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        No se encontraron premios manuales en estado pendiente. Los clientes verán sus premios actualizados una vez los entregues.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deliveries.map((delivery) => (
                        <div 
                            key={delivery.id}
                            className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                        >
                            {/* Decoración de fondo */}
                            <div className="absolute -top-10 -right-10 size-24 rounded-full bg-slate-50/50 filter blur-xl pointer-events-none" />

                            <div>
                                {/* Cabecera de la tarjeta */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        delivery.tipoOrigen === 'PUNTOS' 
                                            ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                    }`}>
                                        {delivery.tipoOrigen === 'PUNTOS' ? 'Canje Puntos' : 'Campaña/Referido'}
                                    </span>
                                    <div className="flex items-center gap-1 text-[11px] font-black text-pink-600 bg-pink-50/60 px-3 py-1 rounded-xl">
                                        <Clipboard size={12} />
                                        <span>{delivery.claimCode}</span>
                                    </div>
                                </div>

                                {/* Título de Premio */}
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">
                                    {delivery.premioNombre}
                                </h3>

                                {delivery.tipoOrigen === 'PUNTOS' && (
                                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-1">
                                        🪙 Costo: {delivery.costoPuntos} PTS
                                    </p>
                                )}

                                {/* Datos del Cliente */}
                                <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-6">
                                    <div className="flex items-center gap-2.5 text-slate-700">
                                        <User size={14} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-800">{delivery.Usuario.nombre}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-slate-600">
                                        <Phone size={14} className="text-slate-400" />
                                        <span className="text-[11px] font-semibold">{delivery.Usuario.phone}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Botón de Entrega */}
                            <button
                                onClick={() => setConfirmingDelivery(delivery)}
                                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md mt-auto"
                            >
                                <Check size={14} strokeWidth={3} />
                                Confirmar Entrega
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Confirmación de Entrega */}
            {confirmingDelivery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-[400px] bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-5 border border-slate-100 animate-in zoom-in-95 duration-300">
                        {/* Cerrar */}
                        <button 
                            onClick={() => setConfirmingDelivery(null)}
                            className="absolute top-4 right-4 size-8 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>

                        <div className="text-center pt-4">
                            <div className="size-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto text-pink-500 mb-4 animate-bounce">
                                <Award size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                Entregar Premio
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                Estás confirmando la entrega física de <strong>{confirmingDelivery.premioNombre}</strong> a <strong>{confirmingDelivery.Usuario.nombre}</strong>.
                            </p>
                        </div>

                        {/* Input de Observaciones */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Observaciones / Notas
                            </label>
                            <textarea
                                placeholder="Ej: Entregado camiseta talla M con firma de conformidad."
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                rows={3}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                            />
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmingDelivery(null)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelivery}
                                className="flex-1 py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md"
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <>
                                        <Check size={14} strokeWidth={3} />
                                        Entregar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Búsqueda Manual / QR */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-[400px] bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-5 border border-slate-100 animate-in zoom-in-95 duration-300">
                        {/* Cerrar */}
                        <button 
                            onClick={() => {
                                setShowManualModal(false);
                                setManualCode('');
                                setManualError(null);
                            }}
                            className="absolute top-4 right-4 size-8 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors"
                        >
                            <X size={14} strokeWidth={2.5} />
                        </button>

                        <div className="text-center pt-4">
                            <div className="size-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto text-pink-500 mb-4">
                                <QrCode size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                Validar por Código
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                Escanea el QR del cliente con una cámara o escribe su código alfanumérico corto.
                            </p>
                        </div>

                        {/* Formulario de Búsqueda Manual */}
                        <form onSubmit={handleManualSearch} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Código de Reclamo Manual
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: CTX-7H9K-42"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold uppercase text-slate-800 font-mono tracking-wider focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-center"
                                    required
                                />
                            </div>

                            {manualError && (
                                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-semibold text-center">
                                    ⚠️ {manualError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={manualSearchLoading}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md"
                            >
                                {manualSearchLoading ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    'Buscar Premio'
                                )}
                            </button>
                        </form>
                        
                        <div className="bg-slate-50 p-4 rounded-2xl text-[10px] text-slate-400 font-medium text-center leading-relaxed">
                            💡 Para escanear de forma inalámbrica, puedes usar la cámara de cualquier celular logueado en la administración de Citiox y el link abrirá directamente la entrega.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
