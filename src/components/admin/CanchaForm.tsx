'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Dribbble, Users, DollarSign, Activity, Loader2, Plus, MapPin, ShieldAlert, Upload, Image as ImageIcon, Trash2, Link as LinkIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CanchaFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function CanchaForm({ onClose, onSuccess, initialData }: CanchaFormProps) {
    const [loading, setLoading] = useState(false);
    const [tiposCancha, setTiposCancha] = useState<any[]>([]);
    const [loadingTipos, setLoadingTipos] = useState(true);
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    const router = useRouter();
    const { data: session } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estados individuales para campos de la cancha
    const [nombre, setNombre] = useState(initialData?.nombre || '');
    const [tipo, setTipo] = useState(initialData?.tipo || 'Fútbol 5');
    const [tipoId, setTipoId] = useState(initialData?.tipoId || '');
    const [capacidad, setCapacidad] = useState(initialData?.capacidad?.toString() || '10');
    const [precioHora, setPrecioHora] = useState(initialData?.precioHora?.toString() || '');
    const [estaActiva, setEstaActiva] = useState(initialData?.estaActiva ?? true);
    const [ubicacionId, setUbicacionId] = useState(initialData?.ubicacionId || '');
    
    // Estados para extraInfo / marketing
    const [titulo1, setTitulo1] = useState(initialData?.extraInfo?.features?.[0]?.title || '');
    const [cuerpo1, setCuerpo1] = useState(initialData?.extraInfo?.features?.[0]?.content || '');
    const [titulo2, setTitulo2] = useState(initialData?.extraInfo?.features?.[1]?.title || '');
    const [cuerpo2, setCuerpo2] = useState(initialData?.extraInfo?.features?.[1]?.content || '');

    // Galería de Imágenes (inicializada desde initialData si existe)
    const [imagenes, setImagenes] = useState<string[]>(
        initialData?.imagenes?.map((img: any) => typeof img === 'string' ? img : img.url) || []
    );
    const [showUrlForm, setShowUrlForm] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTipos = async () => {
            try {
                const res = await fetch('/api/config/tipos-cancha');
                if (res.ok) {
                    const data = await res.json();
                    setTiposCancha(data);

                    if (!initialData && data.length > 0) {
                        setTipo(data[0].nombre);
                        setTipoId(data[0].id);
                        if (data[0].capacidadDefecto) setCapacidad(data[0].capacidadDefecto.toString());
                        if (data[0].precioDefecto) setPrecioHora(data[0].precioDefecto.toString());
                    }
                }
            } catch (err) {
                console.error("Error fetching types:", err);
            } finally {
                setLoadingTipos(false);
            }
        };
        fetchTipos();

        fetch('/api/config/ubicaciones')
            .then(r => r.ok ? r.json() : [])
            .then(data => setUbicaciones(data))
            .catch(() => { });
    }, [initialData]);

    const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedType = tiposCancha.find(t => t.id === selectedId);
        if (selectedType) {
            setTipoId(selectedId);
            setTipo(selectedType.nombre);
            if (selectedType.precioDefecto) setPrecioHora(selectedType.precioDefecto.toString());
            if (selectedType.capacidadDefecto) setCapacidad(selectedType.capacidadDefecto.toString());
        } else {
            setTipo(e.target.value);
            setTipoId('');
        }
    };

    // Subir imagen desde archivo local
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'service');

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    setImagenes(prev => [...prev, data.url]);
                }
            } else {
                // Fallback a Base64 si falla upload
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        setImagenes(prev => [...prev, reader.result as string]);
                    }
                };
                reader.readAsDataURL(file);
            }
        } catch (err) {
            console.error('Error al subir archivo:', err);
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Agregar imagen por URL
    const handleAddUrlImage = () => {
        if (!newUrl.trim()) return;
        setImagenes(prev => [...prev, newUrl.trim()]);
        setNewUrl('');
        setShowUrlForm(false);
    };

    const handleRemoveImage = (index: number) => {
        setImagenes(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = initialData ? `/api/canchas/${initialData.id}` : '/api/canchas';
            const method = initialData ? 'PATCH' : 'POST';

            const realNegocioId = session?.user ? (session.user as any).negocioId : '';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    tipo,
                    tipoId: tipoId || null,
                    capacidad: parseInt(capacidad) || 10,
                    precioHora: parseFloat(precioHora) || 0,
                    estaActiva,
                    ubicacionId: ubicacionId || null,
                    extraInfo: {
                        features: [
                            { title: titulo1, content: cuerpo1 },
                            { title: titulo2, content: cuerpo2 }
                        ]
                    },
                    imagenes,
                    ...(initialData ? {} : { negocioId: realNegocioId })
                }),
            });

            if (res.ok) {
                onSuccess();
                onClose();
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Ocurrió un error inesperado al procesar la solicitud.');
            }
        } catch (error) {
            console.error('Error:', error);
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData || !confirm('¿Estás seguro de eliminar esta cancha?')) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/canchas/${initialData.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                onSuccess();
                onClose();
                router.refresh();
            }
        } catch (error) {
            console.error('Error deleting cancha:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">{initialData ? 'Editar Cancha' : 'Nueva Cancha'}</h2>
                        <p className="text-emerald-100 text-xs">
                            {initialData ? 'Actualiza los datos de tu espacio' : 'Registra un nuevo espacio deportivo'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm border-l-4 border-l-rose-500">
                                <div className="flex items-start gap-3 w-full">
                                    <div className="p-2 bg-white text-rose-600 rounded-xl shadow-sm shrink-0 mt-0.5">
                                        <ShieldAlert size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-rose-900 leading-tight">Acción bloqueada</p>
                                        <p className="text-xs text-rose-700/80 mt-1 font-bold leading-relaxed">{error}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setError(null)}
                                        className="p-1 text-rose-300 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-100/50"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6 text-left">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="nombre" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Nombre de la cancha</label>
                                    <input
                                        id="nombre"
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-emerald-500 transition-colors text-gray-900 font-bold"
                                        placeholder="Ej: Cancha Central 1"
                                        value={nombre}
                                        onChange={e => setNombre(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label htmlFor="ubicacion" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <MapPin size={12} /> Sede / Ubicación
                                        </label>
                                        <Link href="/admin/configuracion" className="text-[10px] font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest flex items-center gap-1">
                                            <Plus size={10} /> + GESTIONAR SEDES
                                        </Link>
                                    </div>
                                    <select
                                        id="ubicacion"
                                        className="w-full px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none cursor-pointer text-gray-900 font-bold focus:border-violet-500 transition-colors"
                                        value={ubicacionId}
                                        onChange={e => setUbicacionId(e.target.value)}
                                    >
                                        <option value="">— Sin sede específica —</option>
                                        {ubicaciones.map((u: any) => (
                                            <option key={u.id} value={u.id}>
                                                {u.nombre}{u.direccion ? ` (${u.direccion})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label htmlFor="tipo" className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Tipo de deporte</label>
                                            <Link href="/admin/configuracion" className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                                                <Plus size={10} /> + EDITAR TIPOS
                                            </Link>
                                        </div>
                                        <select
                                            id="tipo"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none cursor-pointer text-gray-900 font-bold"
                                            value={tipoId || tipo}
                                            onChange={handleTipoChange}
                                        >
                                            {tiposCancha.length > 0 ? (
                                                tiposCancha.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="Básquet">Básquet</option>
                                                    <option value="Fútbol 5">Fútbol 5</option>
                                                    <option value="Fútbol 7">Fútbol 7</option>
                                                    <option value="Pádel">Pádel</option>
                                                    <option value="Tenis">Tenis</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="capacidad" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Capacidad (pers.)</label>
                                        <input
                                            id="capacidad"
                                            type="number"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-gray-900 font-bold"
                                            placeholder="10"
                                            value={capacidad}
                                            onChange={e => setCapacidad(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="precio" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Precio por hora ($)</label>
                                    <input
                                        id="precio"
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-gray-900 font-bold"
                                        placeholder="25.00"
                                        value={precioHora}
                                        onChange={e => setPrecioHora(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900 leading-none">Estado de la cancha</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Determina si estará disponible para reservar</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEstaActiva(!estaActiva)}
                                        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${estaActiva ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${estaActiva ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sección Marketing */}
                        <div className="pt-8 border-t border-gray-100 space-y-6 text-left">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-emerald-500 rounded-full" />
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">POR QUÉ ELEGIR ESTA CANCHA (MARKETING)</h3>
                            </div>
                            
                            <p className="text-[10px] text-gray-400 font-medium italic">Define dos bloques de texto que resalten las ventajas de esta cancha en el portal público.</p>

                            <div className="grid gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="size-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black flex items-center justify-center">1</span>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PRIMER BLOQUE</label>
                                    </div>
                                    <div className="grid gap-3">
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold text-gray-900"
                                            placeholder="Título (Ej: Superficie Pro)"
                                            value={titulo1}
                                            onChange={e => setTitulo1(e.target.value)}
                                        />
                                        <textarea
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-xs min-h-[80px] text-gray-900 font-medium"
                                            placeholder="Descripción corta de la ventaja..."
                                            value={cuerpo1}
                                            onChange={e => setCuerpo1(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-200/50">
                                    <div className="flex items-center gap-2">
                                        <span className="size-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center">2</span>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SEGUNDO BLOQUE</label>
                                    </div>
                                    <div className="grid gap-3">
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold text-gray-900"
                                            placeholder="Título (Ej: Iluminación LED)"
                                            value={titulo2}
                                            onChange={e => setTitulo2(e.target.value)}
                                        />
                                        <textarea
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-xs min-h-[80px] text-gray-900 font-medium"
                                            placeholder="Descripción corta de la ventaja..."
                                            value={cuerpo2}
                                            onChange={e => setCuerpo2(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🖼️ GALERÍA DE FOTOS (DISPONIBLE TANTO EN CREACIÓN COMO EN EDICIÓN) */}
                        <div className="pt-6 border-t border-gray-100 text-left space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block underline decoration-emerald-500/30 decoration-2">
                                    FOTOS DE ESTA CANCHA ({imagenes.length})
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                                    >
                                        {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                                        SUBIR FOTO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowUrlForm(!showUrlForm)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                    >
                                        <LinkIcon size={12} />
                                        URL
                                    </button>
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />

                            {showUrlForm && (
                                <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 flex gap-2 animate-in slide-in-from-top-2">
                                    <input
                                        type="url"
                                        placeholder="https://ejemplo.com/foto-cancha.jpg"
                                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-500"
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddUrlImage();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddUrlImage}
                                        className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Añadir
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {imagenes.map((url, idx) => (
                                    <div key={idx} className="aspect-video bg-gray-100 rounded-2xl relative overflow-hidden group shadow-sm border border-slate-200">
                                        <img src={url} alt={`Foto cancha ${idx + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(idx)}
                                                className="bg-white/20 hover:bg-red-500 text-white p-2 rounded-xl transition backdrop-blur-sm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {imagenes.length === 0 && (
                                    <div onClick={() => fileInputRef.current?.click()} className="col-span-full py-8 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-[2rem] hover:bg-emerald-50/30 hover:border-emerald-300 transition-all cursor-pointer">
                                        <ImageIcon size={28} className="mb-1 text-slate-300" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Añadir fotos a esta cancha</p>
                                        <span className="text-[8px] text-slate-400 mt-0.5">Haz clic para elegir un archivo de tu equipo</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex flex-col gap-3 pt-4">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-4 border border-gray-200 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition uppercase text-[10px] tracking-widest"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || uploadingImage}
                                    className="flex-[2] px-4 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-emerald-600 transition shadow-lg flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (initialData ? 'GUARDAR CAMBIOS' : 'REGISTRAR CANCHA')}
                                </button>
                            </div>

                            {initialData && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="w-full py-3 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 rounded-2xl transition-all"
                                >
                                    ELIMINAR ESTA CANCHA
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
