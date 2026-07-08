'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gift, ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ImageUploader from '@/components/ui/ImageUploader';

export default function ReferralCampaignForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tipoRecompensa, setTipoRecompensa] = useState('SERVICIO_GRATIS');
    const [valorRecompensa, setValorRecompensa] = useState('');
    const [referidosRequeridos, setReferidosRequeridos] = useState(5);
    const [limitePremios, setLimitePremios] = useState<string>('');
    const [isIlimitado, setIsIlimitado] = useState(true);
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState('');
    const [rankingActivo, setRankingActivo] = useState(false);
    
    // Nuevos campos de fidelización
    const [tipoCampana, setTipoCampana] = useState('CLIENTES_NUEVOS');
    const [estado, setEstado] = useState('ACTIVA');
    const [diasInactividad, setDiasInactividad] = useState<string>('');
    const [maxPremiosPorCliente, setMaxPremiosPorCliente] = useState<string>('');
    const [permitirRepetir, setPermitirRepetir] = useState(false);
    const [prioridad, setPrioridad] = useState(0);
    const [combinable, setCombinable] = useState(false);
    const [imagenUrl, setImagenUrl] = useState('');

    // Doble nivel: Incentivo para el invitado
    const [hasIncentivo, setHasIncentivo] = useState(false);
    const [tipoIncentivo, setTipoIncentivo] = useState('DESCUENTO');
    const [valorIncentivo, setValorIncentivo] = useState('');

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);

        if (editId) {
            fetchCampaignDetails(editId);
        }
    }, [editId]);

    const fetchCampaignDetails = async (id: string) => {
        try {
            setFetchLoading(true);
            const res = await fetch(`/api/admin/referrals/campaigns/${id}`);
            if (res.ok) {
                const data = await res.json();
                setNombre(data.nombre || '');
                setDescripcion(data.descripcion || '');
                setImagenUrl(data.imagenUrl || '');
                setTipoRecompensa(data.tipoRecompensa || 'SERVICIO_GRATIS');
                setValorRecompensa(data.valorRecompensa || '');
                setReferidosRequeridos(data.referidosRequeridos || 5);
                setFechaInicio(data.fechaInicio ? new Date(data.fechaInicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                setFechaFin(data.fechaFin ? new Date(data.fechaFin).toISOString().split('T')[0] : '');
                setRankingActivo(data.rankingActivo || false);

                setTipoCampana(data.tipoCampana || 'CLIENTES_NUEVOS');
                setEstado(data.estado || (data.activa ? 'ACTIVA' : 'PAUSADA'));
                setDiasInactividad(data.diasInactividad !== null ? String(data.diasInactividad) : '');
                setMaxPremiosPorCliente(data.maxPremiosPorCliente !== null ? String(data.maxPremiosPorCliente) : '');
                setPermitirRepetir(data.permitirRepetir || false);
                setPrioridad(data.prioridad || 0);
                setCombinable(data.combinable || false);

                if (data.limitePremios !== null) {
                    setLimitePremios(String(data.limitePremios));
                    setIsIlimitado(false);
                } else {
                    setLimitePremios('');
                    setIsIlimitado(true);
                }

                if (data.tipoIncentivo && data.valorIncentivo) {
                    setHasIncentivo(true);
                    setTipoIncentivo(data.tipoIncentivo);
                    setValorIncentivo(data.valorIncentivo);
                }
            } else {
                alert("No se pudo cargar la información de la campaña.");
                router.push('/admin/referidos');
            }
        } catch (err) {
            console.error("Error al buscar detalles:", err);
        } finally {
            setFetchLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !valorRecompensa || !referidosRequeridos) {
            alert("Por favor completa los campos obligatorios.");
            return;
        }

        setLoading(true);
        const payload = {
            nombre,
            descripcion,
            imagenUrl,
            tipoRecompensa,
            valorRecompensa,
            referidosRequeridos: parseInt(String(referidosRequeridos)),
            limitePremios: isIlimitado ? null : (limitePremios ? parseInt(limitePremios) : null),
            fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
            fechaFin: fechaFin ? new Date(fechaFin).toISOString() : null,
            rankingActivo,
            tipoIncentivo: hasIncentivo ? tipoIncentivo : null,
            valorIncentivo: hasIncentivo ? valorIncentivo : null,
            tipoCampana,
            estado,
            diasInactividad: tipoCampana === 'CLIENTES_INACTIVOS' && diasInactividad ? parseInt(diasInactividad) : null,
            maxPremiosPorCliente: maxPremiosPorCliente ? parseInt(maxPremiosPorCliente) : null,
            permitirRepetir,
            prioridad: parseInt(String(prioridad)) || 0,
            combinable
        };

        try {
            const url = editId ? `/api/admin/referrals/campaigns/${editId}` : '/api/admin/referrals/campaigns';
            const method = editId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/admin/referidos');
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Ocurrió un error al guardar la campaña.");
            }
        } catch (err) {
            console.error("Error al guardar campaña:", err);
            alert("Error de conexión al servidor.");
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} style={{ color: primaryColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest">Cargando detalles...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/referidos"
                    className="size-11 bg-white hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors shadow-sm"
                >
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                        <Gift style={{ color: primaryColor }} size={22} />
                        {editId ? 'Editar Campaña de Referidos' : 'Nueva Campaña de Referidos'}
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {editId ? 'Modifica los valores y reglas de tu campaña' : 'Define las reglas, premios e incentivos de tu nueva campaña'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-3xl bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pb-3 border-b border-slate-100 flex items-center gap-2">
                    <Sparkles size={16} style={{ color: primaryColor }} />
                    Datos generales y Meta
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Campaña *</label>
                        <select
                            value={tipoCampana}
                            onChange={(e) => setTipoCampana(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        >
                            <option value="CLIENTES_NUEVOS">Referir clientes nuevos</option>
                            <option value="CLIENTES_EXISTENTES">Referir clientes existentes</option>
                            <option value="CLIENTES_INACTIVOS">Reactivar clientes inactivos</option>
                            <option value="CUMPLEANOS">Cumpleaños</option>
                            <option value="PRIMERA_RESERVA_MES">Primera reserva del mes</option>
                            <option value="CUALQUIER_RESERVA">Cualquier reserva</option>
                            <option value="COMPLETAR_RESERVAS">Completar X reservas</option>
                            <option value="GASTAR_DOLARES">Gastar X dólares</option>
                            <option value="FLASH">Campaña Flash</option>
                            <option value="TEMPORADA">Campaña de Temporada</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado de la Campaña *</label>
                        <select
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        >
                            <option value="ACTIVA">🟢 Activa</option>
                            <option value="PAUSADA">🟡 Pausada</option>
                            <option value="FINALIZADA">🔴 Finalizada</option>
                        </select>
                    </div>

                    {tipoCampana === 'CLIENTES_INACTIVOS' && (
                        <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Días de inactividad requeridos *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                value={diasInactividad}
                                onChange={(e) => setDiasInactividad(e.target.value)}
                                placeholder="Ej. 60 (Días sin realizar reservas para considerarlo inactivo)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                                style={{ '--focus-color': primaryColor } as any}
                            />
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la campaña *</label>
                        <input
                            type="text"
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej. Recomienda a 5 amigos y obtén un masaje gratis"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción (opcional)</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Explica a tus clientes de qué trata la campaña, plazos, etc."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors min-h-[100px]"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Imagen de la Campaña (Opcional)</label>
                        <ImageUploader 
                            category="promotion"
                            currentUrl={imagenUrl}
                            onUploadSuccess={(media) => setImagenUrl(media.url)}
                            onRemove={() => setImagenUrl('')}
                        />
                        <span className="text-[9px] text-slate-400 font-medium pl-1 mt-1 block">Esta imagen se mostrará en la tarjeta de la campaña y en su página de detalles de lujo.</span>
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            {tipoCampana === 'COMPLETAR_RESERVAS' ? 'Reservas requeridas *' :
                             tipoCampana === 'GASTAR_DOLARES' ? 'Monto de gasto requerido ($) *' :
                             tipoCampana === 'CLIENTES_NUEVOS' || tipoCampana === 'CLIENTES_EXISTENTES' || tipoCampana === 'CLIENTES_INACTIVOS' ? 'Referidos requeridos *' :
                             'Reservas requeridas para ganar *'}
                        </label>
                        <input
                            type="number"
                            required
                            min={1}
                            value={referidosRequeridos}
                            onChange={(e) => setReferidosRequeridos(Math.max(1, parseInt(e.target.value) || 0))}
                            placeholder={
                                tipoCampana === 'GASTAR_DOLARES' ? "Ej. 100" :
                                tipoCampana === 'COMPLETAR_RESERVAS' ? "Ej. 10" :
                                "Ej. 5"
                            }
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Recompensa (Referidor) *</label>
                        <select
                            value={tipoRecompensa}
                            onChange={(e) => setTipoRecompensa(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        >
                            <option value="SERVICIO_GRATIS">Servicio gratis</option>
                            <option value="DESCUENTO">Descuento porcentual / fijo</option>
                            <option value="PRODUCTO">Producto gratis</option>
                            <option value="DINERO">Saldo a favor</option>
                            <option value="PUNTOS">Puntos acumulables</option>
                            <option value="REGALO">Regalo personalizado</option>
                            <option value="OTRO">Otro beneficio</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor de la Recompensa (Referidor) *</label>
                        <input
                            type="text"
                            required
                            value={valorRecompensa}
                            onChange={(e) => setValorRecompensa(e.target.value)}
                            placeholder="Ej. Corte de cabello gratis, Masaje de 30 min, $10 de saldo"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>
                </div>

                {/* INCENTIVO DEL INVITADO (Doble Recompensa) */}
                <div className="pt-4 space-y-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                Incentive de bienvenida (Doble Nivel)
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                Otorga un beneficio al amigo invitado para incentivar su primera reserva
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={hasIncentivo}
                            onChange={(e) => setHasIncentivo(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 accent-[var(--primary-color)] cursor-pointer"
                            style={{ color: primaryColor } as any}
                            id="hasIncentivo"
                        />
                    </div>

                    {hasIncentivo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-3xl border border-slate-150 animate-in slide-in-from-top-4 duration-300">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Incentivo (Invitado)</label>
                                <select
                                    value={tipoIncentivo}
                                    onChange={(e) => setTipoIncentivo(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                                    style={{ '--focus-color': primaryColor } as any}
                                >
                                    <option value="DESCUENTO">Descuento porcentual (ej. 10%, 15%)</option>
                                    <option value="DESCUENTO_FIJO">Descuento de monto fijo (ej. $5, $10)</option>
                                    <option value="BEBIDA">Bebida o cortesía de bienvenida (ej. Café, Copa de cava)</option>
                                    <option value="SERVICIO">Servicio extra de cortesía (ej. Masaje capilar extra)</option>
                                    <option value="REGALO">Regalo físico o kit de bienvenida (ej. Crema mini)</option>
                                    <option value="OTRO">Otro beneficio personalizado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor del Incentivo (Invitado)</label>
                                <input
                                    type="text"
                                    required={hasIncentivo}
                                    value={valorIncentivo}
                                    onChange={(e) => setValorIncentivo(e.target.value)}
                                    placeholder={
                                        tipoIncentivo === 'DESCUENTO' ? "Ej. 10% de descuento en tu primer servicio" :
                                        tipoIncentivo === 'DESCUENTO_FIJO' ? "Ej. $5 de descuento en el total de tu reserva" :
                                        tipoIncentivo === 'BEBIDA' ? "Ej. Copa de vino espumoso o café de cortesía al llegar" :
                                        tipoIncentivo === 'SERVICIO' ? "Ej. Masaje capilar hidratante de 10 min gratis" :
                                        tipoIncentivo === 'REGALO' ? "Ej. Crema hidratante mini de regalo" :
                                        "Ej. Describe el incentivo o beneficio especial"
                                    }
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                                    style={{ '--focus-color': primaryColor } as any}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* LIMITACIONES Y VIGENCIA */}
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight pt-4 pb-3 border-b border-slate-100">
                    Vigencia y Límites
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Inicio</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Fin (opcional)</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Límite Total de Premios (Todos los clientes)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                disabled={isIlimitado}
                                value={limitePremios}
                                onChange={(e) => setLimitePremios(e.target.value)}
                                placeholder="Ej. 100"
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors disabled:opacity-50"
                                style={{ '--focus-color': primaryColor } as any}
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isIlimitado}
                                    onChange={(e) => {
                                        setIsIlimitado(e.target.checked);
                                        if (e.target.checked) setLimitePremios('');
                                    }}
                                    className="w-4 h-4 accent-[var(--primary-color)] cursor-pointer"
                                    style={{ color: primaryColor } as any}
                                    id="ilimitado"
                                />
                                <label htmlFor="ilimitado" className="text-xs font-bold text-slate-500 cursor-pointer select-none">Ilimitado</label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Máximo Premios por Cliente</label>
                        <input
                            type="number"
                            value={maxPremiosPorCliente}
                            onChange={(e) => setMaxPremiosPorCliente(e.target.value)}
                            placeholder="Ej. 2 (Dejar vacío para sin límite)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Prioridad de Ejecución</label>
                        <input
                            type="number"
                            value={prioridad}
                            onChange={(e) => setPrioridad(parseInt(e.target.value) || 0)}
                            placeholder="Ej. 0 (Prioridad mayor corre primero)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] transition-colors"
                            style={{ '--focus-color': primaryColor } as any}
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                        <input
                            type="checkbox"
                            checked={permitirRepetir}
                            onChange={(e) => setPermitirRepetir(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 accent-[var(--primary-color)] cursor-pointer"
                            style={{ color: primaryColor } as any}
                            id="permitirRepetir"
                        />
                        <div>
                            <label htmlFor="permitirRepetir" className="text-xs font-bold text-slate-800 cursor-pointer select-none">Permitir repetir campaña</label>
                            <span className="text-[10px] text-slate-400 block font-semibold leading-none mt-1">El cliente puede completar la meta más de una vez</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                        <input
                            type="checkbox"
                            checked={combinable}
                            onChange={(e) => setCombinable(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 accent-[var(--primary-color)] cursor-pointer"
                            style={{ color: primaryColor } as any}
                            id="combinable"
                        />
                        <div>
                            <label htmlFor="combinable" className="text-xs font-bold text-slate-800 cursor-pointer select-none">Campaña Combinable</label>
                            <span className="text-[10px] text-slate-400 block font-semibold leading-none mt-1">Se puede ganar junto con otras campañas activas</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                        <input
                            type="checkbox"
                            checked={rankingActivo}
                            onChange={(e) => setRankingActivo(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 accent-[var(--primary-color)] cursor-pointer"
                            style={{ color: primaryColor } as any}
                            id="rankingActivo"
                        />
                        <div>
                            <label htmlFor="rankingActivo" className="text-xs font-bold text-slate-800 cursor-pointer select-none">Mostrar Ranking (Top Embajadores)</label>
                            <span className="text-[10px] text-slate-400 block font-semibold leading-none mt-1">Permite a los clientes ver el top del negocio</span>
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <Link
                        href="/admin/referidos"
                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-transform active:scale-95"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                        style={{
                            backgroundColor: primaryColor,
                            boxShadow: `0 10px 15px -3px ${primaryColor}33`
                        }}
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={14} />
                        ) : (
                            <Save size={14} />
                        )}
                        {editId ? 'Guardar Cambios' : 'Crear Campaña'}
                    </button>
                </div>
            </form>
        </div>
    );
}
