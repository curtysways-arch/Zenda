'use client';

import { useState, useRef } from 'react';
import { Plus, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface TempGalleryUploaderProps {
    images: any[];
    onAdd: (media: any) => void;
    onRemove: (mediaId: string) => void;
}

export default function TempGalleryUploader({ images, onAdd, onRemove }: TempGalleryUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
                    throw new Error(`Formato no válido: ${file.name}. Usa JPG, PNG o WEBP.`);
                }
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`${file.name} supera los 10MB.`);
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', 'service');

                const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Error al subir la imagen');
                }

                const media = await res.json();
                onAdd(media);
            }
        } catch (err: any) {
            setError(err.message || 'Error en la carga');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async (media: any) => {
        // Borrar físicamente del servidor
        fetch('/api/media/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: media.url }),
        }).catch(() => {});
        onRemove(media.id);
    };

    return (
        <div className="space-y-3">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
            />

            {/* Grid de imágenes + botón añadir */}
            <div className="grid grid-cols-3 gap-3">
                {images.map((media) => (
                    <div
                        key={media.id}
                        className="aspect-[4/3] rounded-2xl overflow-hidden relative group bg-gray-100"
                    >
                        <img
                            src={getImageUrl(media.url, 'thumb')}
                            alt="Galería"
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemove(media)}
                            className="absolute top-1.5 right-1.5 size-6 bg-black/60 hover:bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <X size={11} />
                        </button>
                    </div>
                ))}

                {/* Botón añadir imagen */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-400 hover:bg-violet-50/30 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                    {uploading ? (
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                    ) : (
                        <>
                            <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:text-violet-500">
                                <Plus size={16} />
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                {images.length === 0 ? 'Añadir foto' : 'Más fotos'}
                            </span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <p className="text-[10px] text-rose-600 font-bold px-1">{error}</p>
            )}

            {images.length === 0 && (
                <p className="text-[10px] text-gray-400 font-medium px-1">
                    Opcional · Puedes añadir fotos de galería para este servicio
                </p>
            )}
        </div>
    );
}
