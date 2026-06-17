'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Image as ImageIcon, Plus, Trash2, Loader2, AlertCircle,
    CheckCircle2, Upload, Star, X
} from 'lucide-react';

interface BannerImage {
    id: string;
    url: string;
    esBanner: boolean;
    createdAt: string;
}

interface BannerGalleryAdminProps {
    /** Si se proporciona, al guardar también se sincroniza bannerUrl en configuracion del negocio */
    onPrimaryChange?: (url: string | null) => void;
}

export default function BannerGalleryAdmin({ onPrimaryChange }: BannerGalleryAdminProps) {
    const [banners, setBanners] = useState<BannerImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [addingUrl, setAddingUrl] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchBanners = async () => {
        try {
            const res = await fetch('/api/imagenes?tipo=BANNER');
            if (res.ok) {
                const data = await res.json();
                setBanners(data);
                // Notificar la portada primaria (la primera)
                if (onPrimaryChange) {
                    onPrimaryChange(data.length > 0 ? data[0].url : null);
                }
            }
        } catch (e) {
            console.error('Error fetching banners:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const showMessage = (type: 'success' | 'error', text: string) => {
        if (type === 'success') {
            setSuccess(text);
            setError(null);
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(text);
            setSuccess(null);
            setTimeout(() => setError(null), 4000);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            showMessage('error', 'El archivo no puede superar los 10MB');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            // 1. Subir archivo
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'banner');

            const uploadRes = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const data = await uploadRes.json();
                throw new Error(data.error || 'Error al subir imagen');
            }

            const uploaded = await uploadRes.json();

            // 2. Registrar en tabla Imagen
            const saveRes = await fetch('/api/imagenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: uploaded.url,
                    tipo: 'BANNER',
                    esBanner: true,
                }),
            });

            if (!saveRes.ok) throw new Error('Error al guardar imagen en base de datos');

            showMessage('success', 'Imagen de portada añadida correctamente');
            await fetchBanners();
        } catch (e: any) {
            showMessage('error', e.message || 'Error al procesar la imagen');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUrlAdd = async () => {
        const url = urlInput.trim();
        if (!url) return;

        // Validar que sea una URL
        try { new URL(url); } catch {
            showMessage('error', 'Por favor ingresa una URL válida');
            return;
        }

        setAddingUrl(true);
        try {
            const res = await fetch('/api/imagenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    tipo: 'BANNER',
                    esBanner: true,
                }),
            });

            if (!res.ok) throw new Error('Error al guardar imagen');

            showMessage('success', 'Imagen de portada añadida correctamente');
            setUrlInput('');
            setShowUrlInput(false);
            await fetchBanners();
        } catch (e: any) {
            showMessage('error', e.message || 'Error al guardar la URL');
        } finally {
            setAddingUrl(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta imagen de portada?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/imagenes/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar imagen');

            showMessage('success', 'Imagen eliminada');
            const updated = banners.filter(b => b.id !== id);
            setBanners(updated);
            if (onPrimaryChange) {
                onPrimaryChange(updated.length > 0 ? updated[0].url : null);
            }
        } catch (e: any) {
            showMessage('error', e.message || 'Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <style>{`
                .banner-gallery-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                    margin-top: 16px;
                }

                .banner-card {
                    position: relative;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 2px solid #f1f5f9;
                    background: #f8fafc;
                    aspect-ratio: 16/9;
                    cursor: default;
                    transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                }

                .banner-card:hover {
                    border-color: #e2e8f0;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.10);
                }

                .banner-card img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .banner-card-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    padding: 10px 12px;
                }

                .banner-card:hover .banner-card-overlay {
                    opacity: 1;
                }

                .banner-primary-badge {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    background: linear-gradient(135deg, #f59e0b, #f97316);
                    color: white;
                    font-size: 9px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    padding: 3px 8px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .banner-delete-btn {
                    background: rgba(239, 68, 68, 0.9);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.15s;
                    backdrop-filter: blur(4px);
                }

                .banner-delete-btn:hover {
                    background: rgb(220, 38, 38);
                }

                .banner-add-card {
                    border: 2px dashed #d1d5db;
                    border-radius: 16px;
                    background: #f9fafb;
                    aspect-ratio: 16/9;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #9ca3af;
                }

                .banner-add-card:hover {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.04);
                    color: #10b981;
                    transform: translateY(-2px);
                }

                .banner-add-card span {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                .banner-url-input-row {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                    align-items: center;
                }

                .banner-url-input-row input {
                    flex: 1;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 10px;
                    padding: 9px 14px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #1e293b;
                    outline: none;
                    transition: border-color 0.2s;
                    background: #fff;
                }

                .banner-url-input-row input:focus {
                    border-color: #10b981;
                }

                .banner-url-btn {
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 9px 18px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: background 0.15s;
                    white-space: nowrap;
                }

                .banner-url-btn:hover {
                    background: #059669;
                }

                .banner-url-cancel {
                    background: transparent;
                    color: #94a3b8;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 10px;
                    padding: 9px 14px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .banner-url-cancel:hover {
                    background: #f1f5f9;
                    color: #475569;
                }

                .banner-upload-options {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                    flex-wrap: wrap;
                }

                .banner-upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 9px 16px;
                    font-size: 12px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: background 0.15s, transform 0.15s;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                .banner-upload-btn:hover {
                    background: #059669;
                    transform: translateY(-1px);
                }

                .banner-url-toggle {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: transparent;
                    color: #64748b;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 10px;
                    padding: 9px 16px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                .banner-url-toggle:hover {
                    border-color: #10b981;
                    color: #10b981;
                }

                .banner-alert {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-top: 12px;
                }

                .banner-alert.success {
                    background: #f0fdf4;
                    color: #16a34a;
                    border: 1px solid #bbf7d0;
                }

                .banner-alert.error {
                    background: #fef2f2;
                    color: #dc2626;
                    border: 1px solid #fecaca;
                }

                .banner-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 24px;
                    border: 2px dashed #e5e7eb;
                    border-radius: 16px;
                    background: #fafafa;
                    text-align: center;
                    gap: 8px;
                    margin-top: 16px;
                    color: #9ca3af;
                }

                .banner-empty p {
                    font-size: 13px;
                    font-weight: 600;
                    margin: 0;
                    color: #6b7280;
                }

                .banner-empty span {
                    font-size: 11px;
                    margin: 0;
                    color: #9ca3af;
                }

                .banner-count-badge {
                    display: inline-flex;
                    align-items: center;
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 20px;
                    margin-left: 6px;
                }
            `}</style>

            <div>
                {/* Header con contador */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                            Imágenes de portada
                        </span>
                        {!loading && (
                            <span className="banner-count-badge">
                                {banners.length} {banners.length === 1 ? 'imagen' : 'imágenes'}
                            </span>
                        )}
                    </div>
                </div>

                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 0 }}>
                    La primera imagen se usará como portada principal en el perfil público.
                </p>

                {/* Mensajes */}
                {success && (
                    <div className="banner-alert success">
                        <CheckCircle2 size={14} />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="banner-alert error">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                {/* Estado cargando */}
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: '#9ca3af' }}>
                        <Loader2 size={20} className="animate-spin" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Cargando imágenes...</span>
                    </div>
                ) : (
                    <>
                        {/* Galería */}
                        {banners.length === 0 ? (
                            <div className="banner-empty">
                                <ImageIcon size={32} style={{ color: '#d1d5db' }} />
                                <p>No hay imágenes de portada</p>
                                <span>Añade imágenes para mostrarlas en tu perfil público</span>
                            </div>
                        ) : (
                            <div className="banner-gallery-grid">
                                {banners.map((banner, idx) => (
                                    <div key={banner.id} className="banner-card">
                                        <img
                                            src={banner.url}
                                            alt={`Portada ${idx + 1}`}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://placehold.co/400x225/f1f5f9/94a3b8?text=Imagen+${idx + 1}`;
                                            }}
                                        />
                                        {/* Badge portada principal */}
                                        {idx === 0 && (
                                            <div className="banner-primary-badge">
                                                <Star size={8} fill="white" />
                                                Principal
                                            </div>
                                        )}
                                        {/* Overlay con botón eliminar */}
                                        <div className="banner-card-overlay">
                                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700 }}>
                                                #{idx + 1}
                                            </span>
                                            <button
                                                className="banner-delete-btn"
                                                onClick={() => handleDelete(banner.id)}
                                                disabled={deletingId === banner.id}
                                                title="Eliminar imagen"
                                            >
                                                {deletingId === banner.id
                                                    ? <Loader2 size={13} className="animate-spin" />
                                                    : <Trash2 size={13} />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Acciones para añadir */}
                        {!showUrlInput ? (
                            <div className="banner-upload-options">
                                {/* Botón subir archivo */}
                                <button
                                    type="button"
                                    className="banner-upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                                    ) : (
                                        <><Upload size={14} /> Subir imagen</>
                                    )}
                                </button>

                                {/* Botón añadir URL */}
                                <button
                                    type="button"
                                    className="banner-url-toggle"
                                    onClick={() => setShowUrlInput(true)}
                                    disabled={uploading}
                                >
                                    <Plus size={14} /> Añadir por URL
                                </button>
                            </div>
                        ) : (
                            /* Input URL */
                            <div className="banner-url-input-row">
                                <input
                                    type="url"
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUrlAdd()}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    className="banner-url-btn"
                                    onClick={handleUrlAdd}
                                    disabled={addingUrl || !urlInput.trim()}
                                >
                                    {addingUrl ? <Loader2 size={13} className="animate-spin" /> : 'Añadir'}
                                </button>
                                <button
                                    type="button"
                                    className="banner-url-cancel"
                                    onClick={() => { setShowUrlInput(false); setUrlInput(''); }}
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        )}

                        {/* Input file oculto */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            style={{ display: 'none' }}
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                        />
                    </>
                )}
            </div>
        </>
    );
}
