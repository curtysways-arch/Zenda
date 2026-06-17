'use client';

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Plus, Trash2, Loader2, X, Star, Move, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface GalleryAdminProps {
  serviceId?: string;
  onUploadSuccess?: (media: any) => void;
  onCoverChange?: (mediaId: string | null, url: string) => void;
}

export default function GalleryAdmin({ serviceId, onCoverChange }: GalleryAdminProps) {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Estado del servicio para saber cuál es la portada y su orden de galería
    const [serviceData, setServiceData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchServiceData = async () => {
        if (!serviceId) return null;
        try {
            const res = await fetch(`/api/services`);
            if (res.ok) {
                const data = await res.json();
                const matched = data.find((s: any) => s.id === serviceId);
                if (matched) {
                    setServiceData(matched);
                    return matched;
                }
            }
        } catch (e) {
            console.error('Error fetching service data:', e);
        }
        return null;
    };

    const fetchImages = async () => {
        try {
            const url = `/api/imagenes?${serviceId ? `serviceId=${serviceId}&tipo=SERVICE` : 'tipo=GALERIA'}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setImages(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchImages();
        fetchServiceData();
    }, [serviceId]);

    // Ordenar imágenes del cliente según el orden guardado en extraInfo
    const getOrderedImages = () => {
        if (!serviceId || !serviceData?.extraInfo?.galleryOrder) return images;
        const order = serviceData.extraInfo.galleryOrder;
        const sorted = [...images];
        sorted.sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });
        return sorted;
    };

    const orderedImages = getOrderedImages();

    // Guardar orden de la galería
    const saveNewOrder = async (newOrderedImages: any[]) => {
        if (!serviceId) return;
        const orderedIds = newOrderedImages.map(img => img.id);
        
        try {
            const res = await fetch(`/api/services/${serviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    extraInfo: {
                        galleryOrder: orderedIds
                    }
                })
            });
            if (res.ok) {
                // Actualizar estado local del servicio
                setServiceData((prev: any) => ({
                    ...prev,
                    extraInfo: {
                        ...(prev?.extraInfo || {}),
                        galleryOrder: orderedIds
                    }
                }));
            }
        } catch (e) {
            console.error('Error saving order:', e);
        }
    };

    // Subir archivos reales
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setUploading(true);
        setError(null);
        setUploadProgress(10);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    throw new Error(`Formato no permitido para ${file.name}. Usa JPG, PNG o WEBP.`);
                }
                
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`El archivo ${file.name} excede el límite de 10MB.`);
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', serviceId ? 'service' : 'gallery');

                setUploadProgress(Math.round(((i + 0.3) / files.length) * 100));

                const uploadRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const errData = await uploadRes.json();
                    throw new Error(errData.error || 'Error al subir la imagen');
                }

                const media = await uploadRes.json();
                
                const assocRes = await fetch(`/api/imagenes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: media.url,
                        serviceId: serviceId || null,
                        tipo: serviceId ? 'SERVICE' : 'GALERIA',
                        esBanner: false
                    })
                });
                if (!assocRes.ok) throw new Error('Error al registrar la imagen en la galería');
            }

            setUploadProgress(100);
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(null);
                setShowForm(false);
                fetchImages();
                fetchServiceData();
            }, 500);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error en la subida de imágenes');
            setUploading(false);
            setUploadProgress(null);
        }
    };

    // Establecer imagen como portada principal
    const handleSetAsCover = async (imageUrl: string) => {
        if (!serviceId) return;

        try {
            const res = await fetch(`/api/services/${serviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coverImageUrl: imageUrl // pasamos la url
                })
            });

            if (res.ok) {
                // Recargar datos
                const updatedService = await fetchServiceData();
                if (updatedService && onCoverChange) {
                    onCoverChange(updatedService.imageMediaId, updatedService.imageMedia?.url || '');
                }
            } else {
                alert('No se pudo establecer como portada. Asegúrate de que la imagen se haya subido mediante el nuevo sistema.');
            }
        } catch (e) {
            console.error('Error setting cover:', e);
        }
    };

    // Borrado de imagen
    const handleDelete = async (id: string, imageUrl: string) => {
        if (!confirm('¿Eliminar esta imagen?')) return;
        try {
            // 1. Llamar al DELETE de imagenes legacy
            const res = await fetch(`/api/imagenes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // 2. Si era la portada actual del servicio, limpiar el imageMediaId en el servicio
                if (serviceId && serviceData?.imageMedia?.url === imageUrl) {
                    await fetch(`/api/services/${serviceId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageMediaId: null
                        })
                    });
                    if (onCoverChange) {
                        onCoverChange(null, '');
                    }
                }
                
                // 3. Borrar físicamente el Media del disco si fue subido en el nuevo sistema
                const mediaRegRes = await fetch('/api/media/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: imageUrl }) // pasaremos la url para buscar y borrar
                }).catch(() => null);

                setImages(images.filter(img => img.id !== id));
                fetchServiceData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- LÓGICA DRAG & DROP HTML5 ---
    const handleDragStart = (e: React.DragEvent, idx: number) => {
        setDraggedIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === idx) return;

        const updated = [...orderedImages];
        const draggedItem = updated[draggedIdx];
        updated.splice(draggedIdx, 1);
        updated.splice(idx, 0, draggedItem);
        
        setDraggedIdx(idx);
        setImages(updated);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
        saveNewOrder(images);
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-slate-300" size={32} style={{ color: 'var(--primary-color)' }} />
            </div>
        );
    }

    const coverUrl = serviceData?.imageMedia?.url;

    return (
        <div className="space-y-4">
            {/* Input oculto */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
            />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-slate-400" /> Galería de Fotos
                    </h3>
                    {serviceId && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Arrastra para ordenar · Hover para opciones
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition active:scale-95 shadow-sm disabled:opacity-50"
                    style={{ color: 'var(--primary-color)' }}
                >
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                    {uploading ? 'Subiendo...' : 'Añadir Fotos'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-600">
                    <AlertCircle size={14} className="shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest flex-1">{error}</p>
                    <button type="button" onClick={() => setError(null)} className="text-rose-300 hover:text-rose-500"><X size={12} /></button>
                </div>
            )}

            {/* Progreso */}
            {uploading && uploadProgress !== null && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--primary-color)' }}
                    />
                </div>
            )}

            {/* Grid de imágenes */}
            <div className="grid grid-cols-3 gap-3">
                {orderedImages.map((img, idx) => {
                    const isCover = coverUrl === img.url;
                    return (
                        <div
                            key={img.id}
                            draggable={!!serviceId}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`aspect-[4/3] bg-slate-50 rounded-2xl border border-slate-100/80 relative overflow-hidden group shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${serviceId ? 'cursor-grab active:cursor-grabbing' : ''} ${draggedIdx === idx ? 'opacity-40 border-2 border-emerald-500' : ''}`}
                        >
                            <img src={getImageUrl(img.url, 'medium')} alt="Gallery" className="w-full h-full object-cover" />

                            {/* Badge portada */}
                            {isCover && (
                                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                                    <Star size={8} className="fill-white" /> Portada
                                </div>
                            )}

                            {/* Drag handle */}
                            {serviceId && (
                                <div className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <Move size={11} />
                                </div>
                            )}

                            {/* Overlay acciones */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2.5 gap-1.5">
                                {serviceId && !isCover && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetAsCover(img.url)}
                                        className="w-full py-1 bg-white/20 hover:bg-emerald-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1"
                                    >
                                        <Star size={9} /> Usar de portada
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(img.id, img.url)}
                                    className="w-full py-1 bg-white/20 hover:bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={9} /> Eliminar
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Botón añadir inline en el grid */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 group"
                >
                    {uploading ? (
                        <Loader2 size={20} className="animate-spin text-slate-400" />
                    ) : (
                        <>
                            <div className="size-8 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-400 transition">
                                <Plus size={16} />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {orderedImages.length === 0 ? 'Añadir foto' : 'Más fotos'}
                            </span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
