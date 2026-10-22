'use client';

import { useState, useRef } from 'react';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import { createPromotion, updatePromotion } from '@/app/actions/promotionActions';
import ImageUploader from '@/components/ui/ImageUploader';

export default function PromotionForm({
    initialData,
    services,
    onClose,
    onSuccess,
}: {
    initialData?: any;
    services: { id: string; nombre: string; precio?: number | null }[];
    onClose: () => void;
    onSuccess: (data?: any) => void;
}) {
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);
    const servicesRef = useRef<HTMLDivElement>(null);

    // Convertir fechas a YYYY-MM-DDThh:mm (formato input datetime-local)
    const formatDate = (d?: string | Date) => {
        if (!d) return '';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [form, setForm] = useState({
        titulo: initialData?.titulo || '',
        descripcion: initialData?.descripcion || '',
        precioPromo: initialData?.precioPromo?.toString() || '',
        precioAnterior: initialData?.precioAnterior?.toString() || '',
        imageMediaId: initialData?.imageMediaId || null,
        imagenUrl: initialData?.imageMedia?.url || initialData?.imagenUrl || '',
        fechaInicio: formatDate(initialData?.fechaInicio) || '',
        fechaFin: formatDate(initialData?.fechaFin) || '',
        estado: initialData?.estado || 'activa',
        serviceIds: (initialData?.serviceIds && initialData.serviceIds.length > 0)
            ? initialData.serviceIds
            : (initialData?.services && initialData.services.length > 0)
                ? initialData.services.map((c: any) => c.id || c)
                : (initialData?.serviceId ? [initialData.serviceId] : []),
        diasValidos: initialData?.diasValidos
            ? (typeof initialData.diasValidos === 'string' ? initialData.diasValidos.split(',').map(Number) : initialData.diasValidos)
            : [1,2,3,4,5,6,0],
        horaInicioValida: initialData?.horaInicioValida || '',
        horaFinValida: initialData?.horaFinValida || '',
        tipoPromo: initialData?.tipoPromo || 'precio_especial'
    });

    const daysOfWeek = [
        { id: 1, label: 'Lun' },
        { id: 2, label: 'Mar' },
        { id: 3, label: 'Mié' },
        { id: 4, label: 'Jue' },
        { id: 5, label: 'Vie' },
        { id: 6, label: 'Sáb' },
        { id: 0, label: 'Dom' },
    ];

    const toggleDay = (id: number) => {
        setForm(prev => ({
            ...prev,
            diasValidos: prev.diasValidos.includes(id)
                ? prev.diasValidos.filter((d: number) => d !== id)
                : [...prev.diasValidos, id]
        }));
    };

    const handleServiceChange = (serviceId: string) => {
        const selectedSvc = services.find((s: any) => s.id === serviceId);
        const basePrice = selectedSvc?.precio !== undefined && selectedSvc?.precio !== null ? Number(selectedSvc.precio) : null;

        let newPrecioAnterior = basePrice !== null ? basePrice.toString() : form.precioAnterior;
        let newPrecioPromo = form.precioPromo;

        if (form.tipoPromo === 'cortesia_gratis') {
            newPrecioPromo = '0';
        } else if (form.tipoPromo === '2x1' && basePrice !== null) {
            newPrecioAnterior = (basePrice * 2).toString();
            newPrecioPromo = basePrice.toString();
        } else if (form.tipoPromo === 'descuento_segundo' && basePrice !== null) {
            newPrecioAnterior = (basePrice * 2).toString();
            newPrecioPromo = (basePrice * 1.5).toString();
        } else if (basePrice !== null && (!newPrecioPromo || parseFloat(newPrecioPromo) === 0)) {
            newPrecioPromo = Math.round(basePrice * 0.8).toString();
        }

        setForm(prev => ({
            ...prev,
            serviceIds: serviceId ? [serviceId] : [],
            precioAnterior: newPrecioAnterior,
            precioPromo: newPrecioPromo
        }));
    };

    const toggleServiceInPack = (serviceId: string) => {
        const isSelected = form.serviceIds.includes(serviceId);
        const updatedIds = isSelected 
            ? form.serviceIds.filter(id => id !== serviceId)
            : [...form.serviceIds, serviceId];
        
        const sumPrice = updatedIds.reduce((acc, id) => {
            const s = services.find(svc => svc.id === id);
            return acc + (s?.precio ? Number(s.precio) : 0);
        }, 0);

        setForm(prev => ({
            ...prev,
            serviceIds: updatedIds,
            precioAnterior: sumPrice > 0 ? sumPrice.toString() : prev.precioAnterior,
            precioPromo: sumPrice > 0 && (!prev.precioPromo || parseFloat(prev.precioPromo) >= sumPrice) 
                ? Math.round(sumPrice * 0.8).toString() 
                : prev.precioPromo
        }));
    };

    const handleTipoPromoChange = (newTipo: string) => {
        let newPrecioAnterior = form.precioAnterior;
        let newPrecioPromo = form.precioPromo;

        if (newTipo === 'combo_pack') {
            const sumPrice = form.serviceIds.reduce((acc, id) => {
                const s = services.find(svc => svc.id === id);
                return acc + (s?.precio ? Number(s.precio) : 0);
            }, 0);
            if (sumPrice > 0) {
                newPrecioAnterior = sumPrice.toString();
                newPrecioPromo = Math.round(sumPrice * 0.8).toString();
            }
        } else if (newTipo === 'cortesia_gratis') {
            newPrecioPromo = '0';
            if (form.serviceIds.length > 0) {
                const s = services.find(svc => svc.id === form.serviceIds[0]);
                if (s?.precio) newPrecioAnterior = s.precio.toString();
            }
        } else if (newTipo === '2x1') {
            if (form.serviceIds.length > 0) {
                const s = services.find(svc => svc.id === form.serviceIds[0]);
                const base = s?.precio ? Number(s.precio) : parseFloat(newPrecioAnterior || '0') / 2 || 0;
                if (base > 0) {
                    newPrecioAnterior = (base * 2).toString();
                    newPrecioPromo = base.toString();
                }
            }
        } else if (newTipo === 'descuento_segundo') {
            if (form.serviceIds.length > 0) {
                const s = services.find(svc => svc.id === form.serviceIds[0]);
                const base = s?.precio ? Number(s.precio) : 0;
                if (base > 0) {
                    newPrecioAnterior = (base * 2).toString();
                    newPrecioPromo = (base * 1.5).toString();
                }
            }
        }

        setForm(prev => ({
            ...prev,
            tipoPromo: newTipo,
            precioAnterior: newPrecioAnterior,
            precioPromo: newPrecioPromo
        }));
    };

    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.serviceIds.length === 0) {
            setError('Debes seleccionar al menos un servicio para aplicar la promoción.');
            setTimeout(() => {
                servicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }

        if (new Date(form.fechaFin) <= new Date(form.fechaInicio)) {
            return setError('La fecha de fin debe ser mayor a la fecha de inicio');
        }

        if (form.estado === 'activa' && !form.imagenUrl) {
            return setError('Una imagen es obligatoria si la promoción está activa');
        }

        setLoading(true);

        const payload = {
            titulo: form.titulo,
            descripcion: form.descripcion,
            precioPromo: parseFloat(form.precioPromo || '0'),
            precioAnterior: form.precioAnterior ? parseFloat(form.precioAnterior) : undefined,
            imagenUrl: form.imagenUrl,
            imageMediaId: form.imageMediaId,
            fechaInicio: new Date(form.fechaInicio).toISOString(),
            fechaFin: new Date(form.fechaFin).toISOString(),
            estado: form.estado,
            serviceIds: form.serviceIds,
            diasValidos: form.diasValidos.length > 0 ? form.diasValidos.join(',') : null,
            horaInicioValida: form.horaInicioValida || null,
            horaFinValida: form.horaFinValida || null,
            tipoPromo: form.tipoPromo
        };

        const res = isEdit
            ? await updatePromotion(initialData.id, payload)
            : await createPromotion(payload);

        if (res.success) {
            onSuccess();
        } else {
            setError(res.error || 'Ocurrió un error');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative scrollbar-none animate-in zoom-in-95 duration-350">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-950 bg-gray-50 hover:bg-gray-100 rounded-full transition-all border border-gray-200/40 cursor-pointer"
                >
                    <X size={18} />
                </button>

                <div className="p-8 md:p-10 space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight ">
                            {isEdit ? 'Editar Promoción' : 'Nueva Promoción'}
                        </h2>
                        <p className="text-gray-400 font-bold text-xs mt-1">
                            {isEdit ? 'Actualiza los datos de esta promoción' : 'Crea una nueva promoción de servicio único para tus clientes'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100/50">
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            {/* Tipo de Oferta */}
                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Tipo de Promoción</label>
                                <select
                                    value={form.tipoPromo}
                                    onChange={e => handleTipoPromoChange(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 font-bold transition-all outline-none focus:border-gray-400 cursor-pointer text-xs"
                                >
                                    <option value="precio_especial">🏷️ Precio Especial con Descuento ($)</option>
                                    <option value="combo_pack">📦 Pack / Combo de Tratamientos (Multi-servicio)</option>
                                    <option value="2x1">👥 2x1 / Promo Dúo (Parejas o Amigos)</option>
                                    <option value="cortesia_gratis">🎁 Consulta o Diagnóstico de Cortesía ($0)</option>
                                    <option value="descuento_segundo">👨‍👩‍👧 50% en 2do Paciente / Acompañante</option>
                                    <option value="3x1">🔥 3x1 (Pagas 1, llevan 3)</option>
                                </select>

                                {/* Mensajes de ayuda según el tipo */}
                                {form.tipoPromo === 'combo_pack' && (
                                    <p className="text-xs text-sky-700 font-bold mt-2 bg-sky-50 p-3 rounded-xl border border-sky-200">
                                        💡 <strong>Pack / Combo:</strong> Selecciona 2 o más servicios abajo. El sistema sumará sus precios normales para mostrar el valor real y calcular el ahorro total del paquete.
                                    </p>
                                )}
                                {form.tipoPromo === 'cortesia_gratis' && (
                                    <p className="text-xs text-emerald-700 font-bold mt-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                        🎁 <strong>Cortesía Inicial:</strong> La cita se agenda a $0.00. Ideal para captar pacientes en primera valoración, escaneo 3D o evaluación para ortodoncia/implantes.
                                    </p>
                                )}
                                {form.tipoPromo === '2x1' && (
                                    <p className="text-xs text-purple-700 font-bold mt-2 bg-purple-50 p-3 rounded-xl border border-purple-200">
                                        👥 <strong>2x1 en Pareja:</strong> El paciente paga 1 tratamiento y asisten 2 personas. El precio normal se duplica automáticamente para reflejar el valor total de ambas atenciones.
                                    </p>
                                )}
                                {form.tipoPromo === 'descuento_segundo' && (
                                    <p className="text-xs text-amber-700 font-bold mt-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                                        👨‍👩‍👧 <strong>Plan Familiar:</strong> El acompañante (hijo, pareja, familiar) recibe 50% de descuento en el mismo tratamiento.
                                    </p>
                                )}
                            </div>

                            {/* Selección de Servicio(s) */}
                            {form.tipoPromo === 'combo_pack' ? (
                                <div 
                                    ref={servicesRef}
                                    className={`p-5 rounded-3xl border transition-all duration-300 ${error.includes('servicio') ? 'border-red-500 bg-red-50/20 ring-4 ring-red-500/10' : 'border-gray-100 bg-gray-50/30'}`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            Servicios Incluidos en el Pack ({form.serviceIds.length} seleccionados)
                                        </label>
                                        <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                                            Multi-selección
                                        </span>
                                    </div>
                                    {services.length === 0 ? (
                                        <p className="text-xs text-gray-500 font-bold">No tienes servicios activos registrados.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                            {services.map((service: any) => {
                                                const isChecked = form.serviceIds.includes(service.id);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={service.id}
                                                        onClick={() => toggleServiceInPack(service.id)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
 isChecked 
 ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-xs ring-1 ring-sky-300' 
 : 'bg-white border-gray-200 text-gray-700 font-medium hover:border-gray-300'
 }`}
                                                    >
                                                        <span className="truncate pr-2">{service.nombre}</span>
                                                        <span className="shrink-0 font-bold text-xs text-gray-500">
                                                            ${service.precio ?? 0}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div 
                                    ref={servicesRef}
                                    className={`p-5 rounded-3xl border transition-all duration-300 ${error.includes('servicio') ? 'border-red-500 bg-red-50/20 ring-4 ring-red-500/10' : 'border-gray-100 bg-gray-50/30'}`}
                                >
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Servicio Participante</label>
                                    {services.length === 0 ? (
                                        <p className="text-xs text-gray-500 font-bold">No tienes servicios activos registrados.</p>
                                    ) : (
                                        <div className="relative">
                                            <select
                                                value={form.serviceIds[0] || ''}
                                                onChange={(e) => handleServiceChange(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 font-bold transition-all outline-none focus:border-gray-400 cursor-pointer text-xs uppercase tracking-wider"
                                            >
                                                <option value="">Selecciona el servicio...</option>
                                                {services.map((service: any) => (
                                                    <option key={service.id} value={service.id}>
                                                        {service.nombre} {service.precio !== undefined && service.precio !== null ? `($${service.precio})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Título</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Pack Sonrisa Blanca o 2x1 en Limpieza"
                                    value={form.titulo}
                                    onChange={e => setForm({ ...form, titulo: e.target.value })}
                                    className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                    style={ { '--tw-ring-color': 'color-mix(in srgb, var(--primary-color), transparent 80%)' } as any }
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Descripción</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Añade detalles de la promoción..."
                                    value={form.descripcion}
                                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                    className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                    style={ { '--tw-ring-color': 'color-mix(in srgb, var(--primary-color), transparent 80%)' } as any }
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Precio Promo ($)</label>
                                    {form.tipoPromo === 'cortesia_gratis' ? (
                                        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-emerald-800 font-bold text-sm flex items-center justify-between">
                                            <span>¡Cortesía!</span>
                                            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">$0.00</span>
                                        </div>
                                    ) : (
                                        <input
                                            required
                                            type="number"
                                            step="any"
                                            placeholder="Ej: 30"
                                            value={form.precioPromo}
                                            onChange={e => setForm({ ...form, precioPromo: e.target.value })}
                                            className="w-full font-bold border-transparent rounded-2xl px-5 py-4 transition-all outline-none"
                                            style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}
                                            onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    )}
                                    {form.tipoPromo === '2x1' && form.precioPromo && (
                                        <p className="text-xs text-slate-400 mt-1 font-bold">Valor real estimado: ${parseFloat(form.precioPromo) * 2}</p>
                                    )}
                                    {form.tipoPromo === 'combo_pack' && form.precioAnterior && form.precioPromo && (
                                        <p className="text-xs text-emerald-600 mt-1 font-bold">
                                            Ahorro del combo: ${(parseFloat(form.precioAnterior) - parseFloat(form.precioPromo)).toFixed(2)}
                                        </p>
                                    )}
                                    {form.tipoPromo === 'descuento_segundo' && (
                                        <p className="text-xs text-amber-600 mt-1 font-bold">Tarifa combinada para 2 personas</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Precio Normal</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="Opcional"
                                        value={form.precioAnterior}
                                        onChange={e => setForm({ ...form, precioAnterior: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                        onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Inicio</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={form.fechaInicio}
                                        onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                        onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Fin</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={form.fechaFin}
                                        onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                        onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>
                            </div>

                            {/* Días y Horarios */}
                            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-5">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-3">Disponibilidad Específica</h3>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Días Válidos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {daysOfWeek.map(day => {
                                            const isSelected = form.diasValidos.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border ${isSelected ? 'border-transparent text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                    style={isSelected ? { backgroundColor: 'var(--primary-color)' } : {}}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {form.diasValidos.length === 0 && <p className="text-red-500 text-xs mt-2 font-bold uppercase tracking-wide">Debes seleccionar al menos un día.</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Hora Inicio (Opcional)</label>
                                        <input
                                            type="time"
                                            value={form.horaInicioValida}
                                            onChange={e => setForm({ ...form, horaInicioValida: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-gray-900 font-bold transition-all outline-none focus:border-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Hora Fin (Opcional)</label>
                                        <input
                                            type="time"
                                            value={form.horaFinValida}
                                            onChange={e => setForm({ ...form, horaFinValida: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-gray-900 font-bold transition-all outline-none focus:border-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                                    <ImageIcon size={16} /> Imagen de la Promoción
                                </label>
                                <ImageUploader
                                    category="promotion"
                                    currentUrl={form.imagenUrl}
                                    onUploadSuccess={(media) => setForm({ ...form, imagenUrl: media.url, imageMediaId: media.id })}
                                    onRemove={() => setForm({ ...form, imagenUrl: '', imageMediaId: null })}
                                    label="Subir imagen de la promoción"
                                    aspect="landscape"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Estado</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'activa', label: 'Activa', icon: '✅', desc: 'Visible para clientes', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
                                        { value: 'borrador', label: 'Borrador', icon: '📝', desc: 'Solo visible para ti', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
                                        { value: 'caducada', label: 'Caducada', icon: '⛔', desc: 'Fuera de vigencia', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, estado: opt.value })}
                                            className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer select-none"
                                            style={{
                                                backgroundColor: form.estado === opt.value ? opt.bg : '#f9fafb',
                                                borderColor: form.estado === opt.value ? opt.border : '#e5e7eb',
                                                transform: form.estado === opt.value ? 'scale(1.03)' : 'scale(1)',
                                                boxShadow: form.estado === opt.value ? `0 4px 12px ${opt.color}30` : 'none',
                                            }}
                                        >
                                            <span className="text-xl">{opt.icon}</span>
                                            <span
                                                className="text-xs font-bold uppercase tracking-wide leading-none"
                                                style={{ color: form.estado === opt.value ? opt.color : '#6b7280' }}
                                            >
                                                {opt.label}
                                            </span>
                                            <span className="text-xs text-gray-400 text-center leading-tight">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white font-bold py-5 rounded-2xl uppercase tracking-wide text-sm transition-all shadow-xl"
                                style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 20px 25px -5px color-mix(in srgb, var(--primary-color), transparent 80%)' }}
                            >
                                <Save size={20} />
                                {loading ? 'Guardando...' : (isEdit ? 'Actualizar Promoción' : 'Crear Promoción')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

