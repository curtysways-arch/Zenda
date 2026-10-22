'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import WysiwygEditor from '@/components/admin/WysiwygEditor';
import { ChevronLeft, Save, Globe, EyeOff, Loader2, Sparkles, FileText, Trash2, Upload, ImagePlus, Link2, ChevronDown, Layout } from 'lucide-react';
import Link from 'next/link';
import ImageUploader from '@/components/ui/ImageUploader';

export default function PaginaEditor() {
    const router = useRouter();
    const params = useParams();
    const isEditing = !!params.id;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [featuredImage, setFeaturedImage] = useState<string | null>(null);
    const [imageMediaId, setImageMediaId] = useState<string | null>(null);
    const [status, setStatus] = useState<'draft' | 'published'>('draft');
    const [posicion, setPosicion] = useState<'top' | 'bottom'>('top');
    const [orden, setOrden] = useState<number>(1);
    const [buttonText, setButtonText] = useState('');
    const [buttonUrl, setButtonUrl] = useState('');
    const [availableLinks, setAvailableLinks] = useState<{ canchas: any[], promociones: any[], cursos: any[] }>({ canchas: [], promociones: [], cursos: [] });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditing);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const init = async () => {
            // Cargar links disponibles
            try {
                const res = await fetch('/api/admin/pages/links');
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLinks(data);
                }
            } catch (e) {
                console.error("Error fetching links", e);
            }

            // Si está editando, cargar la página
            if (isEditing) {
                try {
                    setFetching(true);
                    const resPage = await fetch(`/api/admin/pages/${params.id}`);
                    if (resPage.ok) {
                        const data = await resPage.json();
                         setTitle(data.title);
                         setContent(data.contentHtml);
                         setStatus(data.status);
                         setPosicion(data.posicion || (data.slug === 'como-funciona' ? 'top' : 'bottom'));
                         setOrden(data.orden ?? 1);
                         setFeaturedImage(data.imageMedia?.url || data.featuredImage);
                         setImageMediaId(data.imageMediaId || null);
                         setButtonText(data.buttonText || '');
                         setButtonUrl(data.buttonUrl || '');
                    }
                } catch (error) {
                    console.error("Error fetching page data", error);
                } finally {
                    setFetching(false);
                }
            }
        };

        init();
    }, [isEditing, params.id]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/pages/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setFeaturedImage(data.url);
            }
        } catch (error) {
            console.error("Error uploading image", error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) {
            alert('El título y contenido son requeridos.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(isEditing ? `/api/admin/pages/${params.id}` : '/api/admin/pages', {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    contentHtml: content,
                    status,
                    posicion,
                    orden: Number(orden) || 1,
                    featuredImage,
                    imageMediaId,
                    buttonText,
                    buttonUrl
                })
            });

            if (res.ok) {
                router.push('/admin/paginas');
                router.refresh();
            } else {
                const data = await res.json();
                alert(`${data.error}: ${data.details || 'Revisa los campos e intenta de nuevo'}`);
            }
        } catch (error: any) {
            console.error("Error saving page", error);
            alert('Error al guardar: ' + (error.message || 'Error de conexión con el servidor'));
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary-color)' }} />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Header compacto */}
            <div className="flex items-center justify-between gap-3 mb-4 px-1">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/paginas"
                        className="p-2.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm shrink-0"
                    >
                        <ChevronLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                            {isEditing ? 'Editar Página' : 'Nueva Página'}
                        </h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">Editor de contenido</p>
                    </div>
                </div>

                {/* Toggle estado */}
                <div className="flex bg-white p-1 border border-slate-100 rounded-2xl shadow-sm shrink-0">
                    <button
                        type="button"
                        onClick={() => setStatus('draft')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${status === 'draft' ? 'bg-orange-50 text-orange-600' : 'text-slate-400'}`}
                    >
                        <EyeOff size={10} />
                        <span className="hidden sm:inline">Borrador</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus('published')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${status === 'published' ? 'shadow-sm' : 'text-slate-400'}`}
                        style={status === 'published' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' } : {}}
                    >
                        <Globe size={10} />
                        <span className="hidden sm:inline">Publicada</span>
                    </button>
                </div>
            </div>

            <form id="page-form" onSubmit={handleSubmit} className="space-y-3">
                {/* Título */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Título de la Página</label>
                    <input
                        type="text"
                        placeholder="Ej: Nuestra Escuela de Spa"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-slate-900 font-bold text-sm transition-all outline-none focus:border-slate-300"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                {/* Editor de contenido */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Cuerpo del Contenido</label>
                    <WysiwygEditor value={content} onChange={setContent} />
                </div>

                {/* Imagen de portada */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Imagen de Portada <span className="text-slate-300">(Opcional)</span></label>
                    <ImageUploader
                        category="page"
                        currentUrl={featuredImage || ''}
                        onUploadSuccess={(media) => {
                            setFeaturedImage(media.url);
                            setImageMediaId(media.id);
                        }}
                        onRemove={() => {
                            setFeaturedImage(null);
                            setImageMediaId(null);
                        }}
                        label="Subir portada"
                        aspect="landscape"
                    />
                </div>

                {/* Ubicación en la Landing */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                        <Layout size={14} className="text-purple-600" />
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-900 block">Ubicación en la Landing</label>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Zona donde aparecerá la sección</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setPosicion('top')}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                                posicion === 'top'
                                    ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100/60'
                            }`}
                        >
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                ⬆️ Zona Superior
                            </span>
                            <span className="text-xs text-slate-500 font-medium leading-tight">
                                Arriba, bajo el banner
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPosicion('bottom')}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                                posicion === 'bottom'
                                    ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100/60'
                            }`}
                        >
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                ⬇️ Zona Inferior
                            </span>
                            <span className="text-xs text-slate-500 font-medium leading-tight">
                                Abajo del catálogo
                            </span>
                        </button>
                    </div>

                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">Orden numérico</span>
                            <span className="text-xs text-slate-400 font-medium block">Prioridad en su zona</span>
                        </div>
                        <input
                            type="number"
                            min={1}
                            max={99}
                            value={orden}
                            onChange={(e) => setOrden(parseInt(e.target.value) || 1)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-center text-xs font-bold text-slate-900 outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Botón de acción */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Link2 size={13} className="text-orange-400" />
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Botón de Acción <span className="text-slate-300">(Opcional)</span></label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase text-slate-400">Texto</span>
                            <input
                                type="text"
                                placeholder="Ver más..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none"
                                value={buttonText}
                                onChange={e => setButtonText(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase text-slate-400">Destino</span>
                            <div className="relative">
                                <select
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none appearance-none pr-6"
                                    value={buttonUrl}
                                    onChange={e => setButtonUrl(e.target.value)}
                                >
                                    <option value="">WhatsApp por defecto</option>
                                    <option value="/">Página de Inicio</option>
                                    <option value="/#promociones">Sección Promociones</option>
                                    
                                    {availableLinks?.canchas?.length > 0 && <optgroup label="Servicios" />}
                                    {availableLinks?.canchas?.map(c => (
                                        <option key={c.id} value={`/servicio/${c.id}`}>{c.nombre}</option>
                                    ))}
                                    
                                    {availableLinks?.promociones?.length > 0 && <optgroup label="Promociones Específicas" />}
                                    {availableLinks?.promociones?.map(p => (
                                        <option key={p.id} value={`/promo/${p.id}`}>{p.titulo || p.title}</option>
                                    ))}
                                    
                                    {availableLinks?.cursos?.length > 0 && <optgroup label="Cursos y Talleres" />}
                                    {availableLinks?.cursos?.map(c => (
                                        <option key={c.id} value={`/cursos/${c.id}`}>{c.name}</option>
                                    ))}
                                    
                                    <option value="CUSTOM">Escribir URL Personalizada...</option>
                                </select>
                                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    {(buttonUrl === 'CUSTOM' || (!buttonUrl.startsWith('/') && buttonUrl !== '')) && (
                        <input
                            type="text"
                            placeholder="https://..."
                            className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 outline-none animate-in fade-in"
                            value={buttonUrl === 'CUSTOM' ? '' : buttonUrl}
                            onChange={e => setButtonUrl(e.target.value)}
                        />
                    )}
                </div>
            </form>

            {/* Barra de acción fija en la parte inferior */}
            <div className="fixed bottom-16 left-0 right-0 px-4 z-40">
                <button
                    type="submit"
                    form="page-form"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 text-white rounded-2xl font-bold text-xs uppercase tracking-wide transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isEditing ? 'Actualizar Página' : 'Guardar Página'}
                </button>
            </div>
        </div>
    );
}
