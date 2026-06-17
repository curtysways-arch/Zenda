'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Scissors, DollarSign, Activity, Loader2, Plus, MapPin, ShieldAlert, ArrowUpCircle, Clock, Image as ImageIcon, Trash2, GripVertical } from 'lucide-react';
import { useSession } from 'next-auth/react';

import GalleryAdmin from './GalleryAdmin';
import TempGalleryUploader from './TempGalleryUploader';
import ImageUploader from '@/components/ui/ImageUploader';

interface ServiceFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

interface FeatureBlock {
    title: string;
    content: string;
}

export default function ServiceForm({ onClose, onSuccess, initialData }: ServiceFormProps) {
    const [mounted, setMounted] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#059669');

    useEffect(() => {
        setMounted(true);
        const adminWrapper = document.querySelector('.light-theme');
        if (adminWrapper) {
            const color = getComputedStyle(adminWrapper).getPropertyValue('--primary-color').trim();
            if (color) {
                setPrimaryColor(color);
            }
        } else {
            const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
            if (color) {
                setPrimaryColor(color);
            }
        }
        return () => setMounted(false);
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [tiposCancha, setTiposCancha] = useState<any[]>([]);
    const [loadingTipos, setLoadingTipos] = useState(true);
    const [ubicaciones, setUbicaciones] = useState<any[]>([]);
    const router = useRouter();
    const { data: session } = useSession();

    // Estados individuales para mayor estabilidad
    const [nombre, setNombre] = useState(initialData?.nombre || '');
    const [tipo, setTipo] = useState(initialData?.tipo || '');
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [duracion, setDuracion] = useState(initialData?.duracion?.toString() || '60');
    const [precio, setPrecio] = useState(initialData?.precio?.toString() || '');
    const [estaActivo, setEstaActivo] = useState(initialData?.estaActivo ?? true);
    const [ubicacionId, setUbicacionId] = useState(initialData?.ubicacionId || '');

    // Imagen principal y su ID en el nuevo sistema
    const [imageMediaId, setImageMediaId] = useState<string | null>(initialData?.imageMediaId || null);
    const [imagenUrl, setImagenUrl] = useState(
        initialData?.imageMedia?.url || initialData?.imagenes?.[0]?.url || ''
    );

    // Bloques de marketing dinámicos
    const initialBlocks: FeatureBlock[] = initialData?.extraInfo?.features?.length > 0
        ? initialData.extraInfo.features
        : [{ title: '', content: '' }];
    const [features, setFeatures] = useState<FeatureBlock[]>(initialBlocks);

    // Estado para imágenes de galería temporales
    const [tempGalleryMedia, setTempGalleryMedia] = useState<any[]>([]);

    // Función para limpiar imágenes temporales al cancelar
    const cleanTempGallery = async () => {
        if (tempGalleryMedia.length === 0) return;
        try {
            await Promise.all(
                tempGalleryMedia.map(media =>
                    fetch('/api/media/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: media.url })
                    })
                )
            );
        } catch (e) {
            console.error('Error cleaning temporary gallery images:', e);
        }
    };

    const handleCancel = async () => {
        await cleanTempGallery();
        onClose();
    };
    useEffect(() => {
        const fetchTipos = async () => {
            try {
                const res = await fetch('/api/config/categories');
                if (res.ok) {
                    const data = await res.json();
                    setTiposCancha(data);
                    
                    if (initialData) {
                        // Mapeo retrocompatible si solo tiene tipo y no categoryId
                        if (!initialData.categoryId && initialData.tipo) {
                            const matched = data.find((t: any) => t.nombre.toLowerCase() === initialData.tipo.toLowerCase());
                            if (matched) {
                                setCategoryId(matched.id);
                            }
                        }
                    } else if (data.length > 0) {
                        setTipo(data[0].nombre);
                        setCategoryId(data[0].id);
                        if (data[0].duracionDefecto) setDuracion(data[0].duracionDefecto.toString());
                        if (data[0].precioDefecto) setPrecio(data[0].precioDefecto.toString());
                    }
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
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
            setCategoryId(selectedId);
            setTipo(selectedType.nombre);
            if (selectedType.precioDefecto) setPrecio(selectedType.precioDefecto.toString());
            if (selectedType.duracionDefecto) setDuracion(selectedType.duracionDefecto.toString());
        } else {
            setTipo(e.target.value);
            setCategoryId('');
        }
    };

    // --- Gestión de bloques de marketing ---
    const addBlock = () => setFeatures(prev => [...prev, { title: '', content: '' }]);
    const removeBlock = (idx: number) => setFeatures(prev => prev.filter((_, i) => i !== idx));
    const updateBlock = (idx: number, field: 'title' | 'content', value: string) => {
        setFeatures(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const realNegocioId = session?.user ? (session.user as any).negocioId : '';

            if (!initialData && !realNegocioId) {
                setError('No se pudo obtener el ID del negocio. Por favor recarga la página.');
                setLoading(false);
                return;
            }

            const url = initialData ? `/api/services/${initialData.id}` : '/api/services';
            const method = initialData ? 'PATCH' : 'POST';

            const payload: any = {
                nombre,
                tipo,
                categoryId: categoryId || null,
                duracion: parseInt(duracion),
                precio: parseFloat(precio),
                estaActivo,
                ubicacionId: ubicacionId || null,
                imageMediaId,
                extraInfo: {
                    features: features.filter(f => f.title.trim() || f.content.trim())
                },
            };

            if (!initialData) {
                payload.negocioId = realNegocioId;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const created = await res.json();
                // Si se subieron imágenes de galería temporales, asociarlas al servicio recién creado
                if (!initialData && tempGalleryMedia.length > 0) {
                    const galleryIds = tempGalleryMedia.map(m => m.id);

                    // 1. Registrar cada imagen en la tabla Imagen (legacy) para que aparezca en la galería
                    await Promise.all(
                        tempGalleryMedia.map(media =>
                            fetch('/api/imagenes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    url: media.url,
                                    tipo: 'SERVICE',
                                    serviceId: created.id,
                                    esBanner: false,
                                }),
                            }).catch(() => {})
                        )
                    );

                    // 2. Guardar el orden en extraInfo.galleryOrder
                    await fetch(`/api/services/${created.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            extraInfo: { galleryOrder: galleryIds },
                        }),
                    }).catch(() => {});
                }

                // Si se colocó o actualizó una imagen URL legacy (y no se usó el nuevo media)
                if (!imageMediaId && imagenUrl.trim() && (created?.id || initialData?.id)) {
                    const targetId = initialData ? initialData.id : created.id;
                    const originalUrl = initialData?.imagenes?.[0]?.url || '';
                    if (imagenUrl.trim() !== originalUrl) {
                        await fetch('/api/imagenes', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                url: imagenUrl.trim(),
                                tipo: 'SERVICE',
                                serviceId: targetId,
                                esBanner: true
                            })
                        }).catch(() => {});
                    }
                }
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
        if (!initialData || !confirm('¿Estás seguro de eliminar este servicio?')) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/services/${initialData.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                onSuccess();
                onClose();
                router.refresh();
            }
        } catch (error) {
            console.error('Error deleting service:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300"
            style={{ '--primary-color': primaryColor } as any}
        >
            <div className="light-theme bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-300">
                <div className="p-6 text-white flex justify-between items-center shrink-0" style={{ backgroundColor: 'var(--primary-color)' }}>
                    <div>
                        <h2 className="text-xl font-bold !text-white">{initialData ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                        <p className="!text-white/80 text-xs">
                            {initialData ? 'Actualiza los datos de tu servicio' : 'Registra un nuevo servicio de belleza'}
                        </p>
                    </div>
                    <button type="button" onClick={handleCancel} className="p-2 hover:bg-white/20 rounded-full transition !text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Alerta de Error */}
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

                                {(error.toLowerCase().includes('plan') || error.toLowerCase().includes('límite')) && (
                                    <div className="flex items-center gap-2 pt-1 border-t border-rose-100 mt-1">
                                        <Link
                                            href="/admin/plan"
                                            className="group/btn flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-xl hover:bg-slate-900 transition-all shadow-md shadow-rose-600/20 active:scale-95 uppercase tracking-widest"
                                        >
                                            <ArrowUpCircle size={14} className="group-hover/btn:rotate-12 transition-transform" />
                                            Mejorar mi Plan ahora
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Formulario de Metadatos */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="nombre" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Nombre del servicio</label>
                                    <input
                                        id="nombre"
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none transition-colors text-gray-900"
                                        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgb(243, 244, 246)'}
                                        placeholder="Ej: Masaje Relajante 60 min"
                                        value={nombre}
                                        onChange={e => setNombre(e.target.value)}
                                    />
                                </div>

                                {/* ══ SECCIÓN IMÁGENES (portada + galería juntas) ══ */}
                                <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <ImageIcon size={11} /> Imágenes del servicio
                                    </p>

                                    {/* Portada */}
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold mb-1.5">Portada principal</p>
                                        <ImageUploader
                                            category="service"
                                            currentUrl={imagenUrl}
                                            onUploadSuccess={(media) => {
                                                setImagenUrl(media.url);
                                                setImageMediaId(media.id);
                                            }}
                                            onRemove={() => {
                                                setImagenUrl('');
                                                setImageMediaId(null);
                                            }}
                                            label="Subir imagen de servicio"
                                            aspect="landscape"
                                        />
                                    </div>

                                    {/* Galería adicional */}
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold mb-1.5">Fotos adicionales · Galería</p>
                                        {initialData ? (
                                            <GalleryAdmin 
                                                serviceId={initialData.id} 
                                                onCoverChange={(mediaId, url) => {
                                                    setImageMediaId(mediaId);
                                                    setImagenUrl(url);
                                                }}
                                            />
                                        ) : (
                                            <TempGalleryUploader
                                                images={tempGalleryMedia}
                                                onAdd={(media) => setTempGalleryMedia(prev => [...prev, media])}
                                                onRemove={(mediaId) => setTempGalleryMedia(prev => prev.filter(m => m.id !== mediaId))}
                                            />
                                        )}
                                    </div>
                                </div>

                                {ubicaciones.length > 0 && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label htmlFor="ubicacion" className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                <MapPin size={12} /> Sede / Ubicación
                                            </label>
                                            <Link href="/admin/config" className="text-[10px] font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest flex items-center gap-1">
                                                <Plus size={10} /> Gestionar sedes
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
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label htmlFor="tipo" className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Categoría</label>
                                            <Link href="/admin/config" className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--primary-color)' }}>
                                                <Plus size={10} /> Editar categorías
                                            </Link>
                                        </div>
                                        <select
                                            id="tipo"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none cursor-pointer text-gray-900 font-bold"
                                            value={categoryId || tipo}
                                            onChange={handleTipoChange}
                                        >
                                            {tiposCancha.length > 0 ? (
                                                tiposCancha.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option>Masaje</option>
                                                    <option>Facial</option>
                                                    <option>Corporal</option>
                                                    <option>Spa</option>
                                                    <option>Bienestar</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="duracion" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Duración (min.)</label>
                                        <input
                                            id="duracion"
                                            type="number"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-gray-900 font-medium"
                                            placeholder="60"
                                            value={duracion}
                                            onChange={e => setDuracion(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="precio" className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Precio del servicio ($)</label>
                                    <input
                                        id="precio"
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-gray-900 font-medium"
                                        placeholder="25.00"
                                        value={precio}
                                        onChange={e => setPrecio(e.target.value)}
                                    />
                                </div>

                                {initialData && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-900 leading-none">Estado del servicio</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Determina si estará disponible para reservar</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEstaActivo(!estaActivo)}
                                            className={`w-12 h-6 rounded-full transition-all duration-300 relative ${estaActivo ? '' : 'bg-gray-300'}`}
                                            style={estaActivo ? { backgroundColor: 'var(--primary-color)' } : {}}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${estaActivo ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bloques de Marketing Dinámicos */}
                        <div className="pt-8 border-t border-gray-100 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-6 w-1 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Por qué elegir este servicio</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={addBlock}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                    <Plus size={12} /> Añadir bloque
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-400 font-medium italic -mt-2">
                                Resalta las ventajas de tu servicio en el portal público. Puedes añadir o quitar bloques.
                            </p>

                            <div className="grid gap-4">
                                {features.map((block, idx) => (
                                    <div key={idx} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-3 relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className="size-5 rounded-full text-[10px] font-black flex items-center justify-center"
                                                style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}
                                            >
                                                {idx + 1}
                                            </span>
                                            {features.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeBlock(idx)}
                                                    className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Eliminar bloque"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold"
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgb(226, 232, 240)'}
                                            placeholder={`Título ${idx + 1} (Ej: Relajación Profunda)`}
                                            value={block.title}
                                            onChange={e => updateBlock(idx, 'title', e.target.value)}
                                        />
                                        <textarea
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs min-h-[70px]"
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                                            onBlur={(e) => e.target.style.borderColor = 'rgb(226, 232, 240)'}
                                            placeholder="Descripción corta de la ventaja..."
                                            value={block.content}
                                            onChange={e => updateBlock(idx, 'content', e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {features.length < 6 && (
                                <button
                                    type="button"
                                    onClick={addBlock}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-gray-300 hover:text-gray-500 transition-all"
                                >
                                    <Plus size={14} /> Añadir otro bloque
                                </button>
                            )}
                        </div>

                        {/* Acciones principales */}
                        <div className="flex flex-col gap-3 pt-4">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 px-4 py-4 border border-gray-200 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition uppercase text-[10px] tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] px-4 py-4 text-white font-bold rounded-2xl transition shadow-lg flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
                                    style={{ backgroundColor: 'var(--primary-color)' }}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : (initialData ? 'Guardar Cambios' : 'Registrar Servicio')}
                                </button>
                            </div>

                            {initialData && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="w-full py-3 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 rounded-2xl transition-all"
                                >
                                    ELIMINAR ESTE SERVICIO
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
