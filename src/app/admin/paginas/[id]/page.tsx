'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import WysiwygEditor from '@/components/admin/WysiwygEditor';
import { ChevronLeft, Save, Globe, EyeOff, Loader2, Sparkles, FileText, Trash2, Upload, ImagePlus, Link2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import ImageUploader from '@/components/ui/ImageUploader';

export default function PaginaEdicion() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [featuredImage, setFeaturedImage] = useState<string | null>(null);
    const [imageMediaId, setImageMediaId] = useState<string | null>(null);
    const [status, setStatus] = useState<'draft' | 'published'>('draft');
    const [buttonText, setButtonText] = useState('');
    const [buttonUrl, setButtonUrl] = useState('');
    const [availableLinks, setAvailableLinks] = useState<{ canchas: any[], promociones: any[], cursos: any[] }>({ canchas: [], promociones: [], cursos: [] });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/admin/pages/links');
                if (res.ok) {
                    const data = await res.json();
                    setAvailableLinks(data);
                }
                
                const resPage = await fetch(`/api/admin/pages/${id}`);
                if (resPage.ok) {
                    const data = await resPage.json();
                    setTitle(data.title);
                    setContent(data.contentHtml);
                    setStatus(data.status);
                    setFeaturedImage(data.imageMedia?.url || data.featuredImage);
                    setImageMediaId(data.imageMediaId || null);
                    setButtonText(data.buttonText || '');
                    setButtonUrl(data.buttonUrl || '');
                }
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setFetching(false);
            }
        };
        init();
    }, [id]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/admin/pages/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                setFeaturedImage(data.url);
            }
        } catch (error) {
            console.error("Error uploading", error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/pages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, contentHtml: content, status, featuredImage, imageMediaId, buttonText, buttonUrl })
            });
            if (res.ok) {
                router.push('/admin/paginas');
                router.refresh();
            }
        } catch (error) {
            console.error("Error saving", error);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin" style={{ color: 'var(--primary-color)' }} size={48} /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/paginas" className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm">
                        <ChevronLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Editar Página</h1>
                        <p className="text-gray-500 font-medium">Define el título y contenido enriquecido.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white p-1.5 border border-gray-100 rounded-2xl shadow-sm">
                        <button type="button" onClick={() => setStatus('draft')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${status === 'draft' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>Borrador</button>
                        <button type="button" onClick={() => setStatus('published')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${status === 'published' ? '' : 'text-gray-400'}`} style={status === 'published' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' } : {}}>Publicada</button>
                    </div>
                    <button type="submit" form="page-form" disabled={loading} className="px-8 py-3.5 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Actualizar
                    </button>
                </div>
            </div>

            <form id="page-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Título de la Página</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Ej: Nuestra Escuela de Fútbol"
                                    autoComplete="off"
                                    data-lpignore="true"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 pl-8 pr-8 text-slate-900 font-bold transition-all outline-none"
                                    style={ { '--tw-ring-color': 'var(--primary-color)', '--tw-ring-opacity': '0.05' } as any }
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cuerpo del contenido</label>
                            <WysiwygEditor value={content} onChange={setContent} />
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 space-y-4 border border-gray-100">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Imagen de Portada</label>
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

                    <div className="bg-white rounded-[2.5rem] p-8 space-y-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-4">
                            <div className="size-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                <Link2 size={14} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest">Botón de Acción</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Call to Action al final</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Texto del Botón</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Agendar Sesión"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none"
                                    value={buttonText}
                                    onChange={(e) => setButtonText(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Destino del Botón</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none appearance-none pr-10"
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
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {(buttonUrl === 'CUSTOM' || (!buttonUrl.startsWith('/') && buttonUrl !== '')) && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">URL Personalizada</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    className="w-full bg-orange-50 border border-orange-100 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 outline-none"
                                    value={buttonUrl === 'CUSTOM' ? '' : buttonUrl}
                                    onChange={e => setButtonUrl(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
