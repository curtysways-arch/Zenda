'use client';

import { useState } from 'react';
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
    services: { id: string; nombre: string }[];
    onClose: () => void;
    onSuccess: (data?: any) => void;
}) {
    const isEdit = !!initialData;
    const [loading, setLoading] = useState(false);

    // Convertir fechas a YYYY-MM-DDThh:mm (formato input datetime-local)
    const formatDate = (d?: string) => {
        if (!d) return '';
        const date = new Date(d);
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
        serviceIds: initialData?.services?.map((c: any) => c.id) || [],
        diasValidos: initialData?.diasValidos ? initialData.diasValidos.split(',').map(Number) : [1,2,3,4,5,6,0],
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

    const toggleService = (id: string) => {
        setForm(prev => ({
            ...prev,
            serviceIds: prev.serviceIds.includes(id)
                ? prev.serviceIds.filter(s => s !== id)
                : [...prev.serviceIds, id]
        }));
    };

    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

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

        if (form.serviceIds.length === 0) {
            return setError('Debes seleccionar al menos un servicio para aplicar la promoción.');
        }

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
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8 md:p-10 space-y-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                            {isEdit ? 'Editar Promoción' : 'Nueva Promoción'}
                        </h2>
                        <p className="text-gray-500 font-medium text-sm">
                            {isEdit ? 'Actualiza los datos de esta promoción' : 'Crea una nueva promoción para tus clientes'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Título</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Promo Ritual Relajante de Verano"
                                    value={form.titulo}
                                    onChange={e => setForm({ ...form, titulo: e.target.value })}
                                    className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                    style={ { '--tw-ring-color': 'color-mix(in srgb, var(--primary-color), transparent 80%)' } as any }
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Descripción</label>
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

                            <div>
                                <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Tipo de Oferta</label>
                                <select
                                    value={form.tipoPromo}
                                    onChange={e => setForm({ ...form, tipoPromo: e.target.value })}
                                    className="w-full bg-gray-50 border-transparent rounded-2xl px-5 py-4 text-gray-900 font-medium transition-all outline-none"
                                    style={ { '--tw-ring-color': 'color-mix(in srgb, var(--primary-color), transparent 80%)' } as any }
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgb(249, 250, 251)'; e.target.style.boxShadow = 'none'; }}
                                >
                                    <option value="precio_especial">Precio Especial ($)</option>
                                    <option value="2x1">2x1 (Pagas 1, llevan 2)</option>
                                    <option value="3x1">3x1 (Pagas 1, llevan 3)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Precio Promo ($)</label>
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        placeholder="Ej: 30"
                                        value={form.precioPromo}
                                        onChange={e => setForm({ ...form, precioPromo: e.target.value })}
                                        className="w-full font-black border-transparent rounded-2xl px-5 py-4 transition-all outline-none"
                                        style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}
                                        onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--primary-color), transparent 80%)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                    {form.tipoPromo === '2x1' && form.precioPromo && (
                                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Precio real autocalculado: ${parseFloat(form.precioPromo) * 2}</p>
                                    )}
                                    {form.tipoPromo === '3x1' && form.precioPromo && (
                                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Precio real autocalculado: ${parseFloat(form.precioPromo) * 3}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Precio Normal</label>
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
                                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Inicio</label>
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
                                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Fin</label>
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
                                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3">Disponibilidad Específica</h3>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Días Válidos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {daysOfWeek.map(day => {
                                            const isSelected = form.diasValidos.includes(day.id);
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => toggleDay(day.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${isSelected ? 'border-transparent text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                    style={isSelected ? { backgroundColor: 'var(--primary-color)' } : {}}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {form.diasValidos.length === 0 && <p className="text-red-500 text-[10px] mt-2 font-bold uppercase tracking-widest">Debes seleccionar al menos un día.</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Hora Inicio (Opcional)</label>
                                        <input
                                            type="time"
                                            value={form.horaInicioValida}
                                            onChange={e => setForm({ ...form, horaInicioValida: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-gray-900 font-bold transition-all outline-none focus:border-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Hora Fin (Opcional)</label>
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
                                <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-2">
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
                                <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-3">Estado</label>
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
                                                className="text-[11px] font-black uppercase tracking-wide leading-none"
                                                style={{ color: form.estado === opt.value ? opt.color : '#6b7280' }}
                                            >
                                                {opt.label}
                                            </span>
                                            <span className="text-[9px] text-gray-400 text-center leading-tight">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Servicios Participantes</label>
                                {services.length === 0 ? (
                                    <p className="text-sm text-gray-500">No tienes servicios activos registrados.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2">
                                        {services.map(service => (
                                            <label key={service.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={form.serviceIds.includes(service.id)}
                                                    onChange={() => toggleService(service.id)}
                                                    className="w-5 h-5 rounded-md border-gray-300"
                                                    style={{ accentColor: 'var(--primary-color)' }}
                                                />
                                                <span className="text-sm font-bold text-gray-800">{service.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm transition-all shadow-xl"
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

