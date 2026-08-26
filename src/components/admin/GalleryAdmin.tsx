'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, Loader2, X } from 'lucide-react';

interface GalleryAdminProps {
    canchaId?: string;
    serviceId?: string;
    onCoverChange?: (mediaId: any, url: any) => void;
}

export default function GalleryAdmin({ canchaId, serviceId, onCoverChange }: GalleryAdminProps) {
    const targetId = canchaId || serviceId;
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newUrl, setNewUrl] = useState('');

    const fetchImages = async () => {
        try {
            const url = `/api/imagenes?${targetId ? `canchaId=${targetId}&tipo=CANCHA` : 'tipo=GALERIA'}`;
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
        fetchImages();
    }, [canchaId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUrl) return;
        setUploading(true);
        try {
            const res = await fetch('/api/imagenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: newUrl,
                    tipo: canchaId ? 'CANCHA' : 'GALERIA',
                    canchaId: canchaId || null
                })
            });
            if (res.ok) {
                setNewUrl('');
                setShowForm(false);
                fetchImages();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta imagen?')) return;
        try {
            await fetch(`/api/imagenes/${id}`, { method: 'DELETE' });
            setImages(images.filter(img => img.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-emerald-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Galería de Fotos</h3>
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                >
                    <Plus size={14} />
                    Añadir Foto
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nueva Imagen</span>
                        <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="url"
                            placeholder="https://ejemplo.com/foto.jpg"
                            className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-emerald-500"
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAdd(e as any);
                                }
                            }}
                            required
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={uploading}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {uploading ? 'Guardando...' : 'Añadir a Galería'}
                        </button>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Pega la URL de una imagen pública (JPG/PNG)</p>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img) => (
                    <div key={img.id} className="aspect-video bg-gray-100 rounded-2xl relative overflow-hidden group shadow-sm">
                        <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => handleDelete(img.id)}
                                className="bg-white/20 hover:bg-red-500 text-white p-2 rounded-xl transition backdrop-blur-sm"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {images.length === 0 && !showForm && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-300 border border-dashed border-gray-100 rounded-[2rem]">
                        <ImageIcon size={32} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No hay fotos en la galería</p>
                    </div>
                )}
            </div>
        </div>
    );
}
