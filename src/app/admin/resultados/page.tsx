'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Plus, Trash2, Camera, Upload, 
    Loader2, Users, Scissors, 
    Check, X, Image as ImageIcon,
    ExternalLink, Eye, Sparkles,
    Calendar, User, ArrowLeftRight,
    MessageCircle, Pencil,
    Save
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { clsx } from 'clsx';
import MobileResults from '@/components/admin/mobile/MobileResults';
import ImageUploader from '@/components/ui/ImageUploader';

export default function ResultadosAdminPage() {
    const [resultados, setResultados] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'BEFORE_AFTER', // 'BEFORE_AFTER' o 'GALLERY'
        serviceId: '',
        staffId: '',
        beforeImage: '',
        afterImage: '',
        galleryUrls: '', 
        clientName: '',
        featured: false,
        published: true,
        showInLanding: true,
        date: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        setMounted(true);
        fetchData();
        const mainContainer = document.querySelector('.light-theme');
        let color = '';
        if (mainContainer) {
            color = getComputedStyle(mainContainer).getPropertyValue('--primary-color').trim();
        }
        if (!color) {
            color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        }
        if (color) {
            setPrimaryColor(color);
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resRes, staffRes, servRes] = await Promise.all([
                fetch('/api/resultados'),
                fetch('/api/staff'),
                fetch('/api/services')
            ]);

            if (resRes.ok) setResultados(await resRes.json());
            if (staffRes.ok) setStaff(await staffRes.json());
            if (servRes.ok) setServices(await servRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            type: 'BEFORE_AFTER',
            serviceId: '',
            staffId: '',
            beforeImage: '',
            afterImage: '',
            galleryUrls: '',
            clientName: '',
            featured: false,
            published: true,
            showInLanding: true,
            date: format(new Date(), 'yyyy-MM-dd')
        });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleEdit = (item: any) => {
        setFormData({
            title: item.title || '',
            description: item.description || '',
            type: item.type || 'BEFORE_AFTER',
            serviceId: item.serviceId || '',
            staffId: item.staffId || '',
            beforeImage: item.beforeImage || '',
            afterImage: item.afterImage || '',
            galleryUrls: Array.isArray(item.gallery) ? item.gallery.join(', ') : '',
            clientName: item.clientName || '',
            featured: item.featured === 1 || item.featured === true,
            published: item.published === 1 || item.published === true,
            showInLanding: item.showInLanding === 1 || item.showInLanding === true,
            date: item.date ? format(new Date(item.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
        });
        setIsEditing(true);
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este resultado?')) return;
        try {
            const res = await fetch(`/api/resultados?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                id: editingId,
                ...formData,
                gallery: formData.type === 'GALLERY' 
                    ? formData.galleryUrls.split(',').map(url => url.trim()).filter(url => url !== '')
                    : []
            };
            delete (payload as any).galleryUrls;

            const res = await fetch('/api/resultados', {
                method: isEditing ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                resetForm();
                fetchData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!mounted) return null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin mb-4" size={32} style={{ color: 'var(--primary-color)' }} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando Resultados...</p>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                input::placeholder, textarea::placeholder {
                    color: #64748b !important;
                }
                input, select, textarea {
                    color: #0f172a !important;
                    background-color: #ffffff !important;
                    color-scheme: light;
                }
                .text-slate-500 { color: #64748b !important; }
            `}} />
            <div className="flex flex-col min-h-screen bg-slate-50">
                {/* VISTA MÓVIL */}
                <div className="lg:hidden">
                    <MobileResults 
                        resultados={resultados}
                        primaryColor={primaryColor}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onNew={() => { resetForm(); setIsModalOpen(true); }}
                    />
                </div>

                {/* VISTA ESCRITORIO */}
                <div className="hidden lg:block p-10">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Gestión de <span style={{ color: primaryColor }}>Resultados</span></h1>
                            <p className="text-slate-500 font-medium mt-2">Administra tu portafolio de trabajos y antes/después</p>
                        </div>
                        <button 
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center gap-3 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-xl hover:scale-105 active:scale-95"
                            style={{ backgroundColor: primaryColor, boxShadow: `0 20px 30px -10px ${primaryColor}40` }}
                        >
                            <Plus size={20} strokeWidth={3} />
                            Nuevo Resultado
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {resultados.map((item) => (
                            <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-500">
                                <div className="relative aspect-video">
                                    <img 
                                        src={item.type === 'GALLERY' ? ((Array.isArray(item.gallery) && item.gallery.length > 0) ? item.gallery[0] : (item.galleryUrls?.split(',')[0] || '')) : (item.afterImage || '')} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        alt={item.title}
                                    />
                                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                                        <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-xl border border-white">
                                            {item.type === 'BEFORE_AFTER' ? 'Comparativa' : 'Galería'}
                                        </span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8 gap-4">
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition"
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="size-12 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition shadow-xl"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {item.service?.nombre}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {format(new Date(item.date), "dd MMM yyyy", { locale: es })}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{item.title}</h3>
                                    <p className="text-slate-500 text-sm line-clamp-2 italic">"{item.description}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modal de Creación/Edición */}
                {isModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300 border border-slate-200">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tighter uppercase italic">{isEditing ? 'Editar Trabajo' : 'Nuevo Trabajo'}</h2>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Gestión de Portafolio</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition text-slate-500 bg-slate-100">
                                    <X size={18} strokeWidth={3} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-white">
                                {/* TIPO DE RESULTADO */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic">1. Tipo</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, type: 'BEFORE_AFTER'})}
                                            className={clsx(
                                                "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group",
                                                formData.type === 'BEFORE_AFTER' ? "shadow-md" : "border-slate-100 bg-slate-50"
                                            )}
                                            style={formData.type === 'BEFORE_AFTER' ? { borderColor: 'var(--primary-color, #0ea5e9)', backgroundColor: 'color-mix(in srgb, var(--primary-color, #0ea5e9), transparent 95%)' } : {}}
                                        >
                                            <ArrowLeftRight className={formData.type === 'BEFORE_AFTER' ? "" : "text-slate-400"} style={formData.type === 'BEFORE_AFTER' ? { color: 'var(--primary-color, #0ea5e9)' } : {}} size={20} />
                                            <span className={clsx("text-[8px] font-black uppercase tracking-tighter text-center", formData.type === 'BEFORE_AFTER' ? "" : "text-slate-500")} style={formData.type === 'BEFORE_AFTER' ? { color: 'var(--primary-color, #0ea5e9)' } : {}}>Antes y Después</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, type: 'GALLERY'})}
                                            className={clsx(
                                                "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group",
                                                formData.type === 'GALLERY' ? "shadow-md" : "border-slate-100 bg-slate-50"
                                            )}
                                            style={formData.type === 'GALLERY' ? { borderColor: 'var(--primary-color, #0ea5e9)', backgroundColor: 'color-mix(in srgb, var(--primary-color, #0ea5e9), transparent 95%)' } : {}}
                                        >
                                            <ImageIcon className={formData.type === 'GALLERY' ? "" : "text-slate-400"} style={formData.type === 'GALLERY' ? { color: 'var(--primary-color, #0ea5e9)' } : {}} size={20} />
                                            <span className={clsx("text-[8px] font-black uppercase tracking-tighter text-center", formData.type === 'GALLERY' ? "" : "text-slate-500")} style={formData.type === 'GALLERY' ? { color: 'var(--primary-color, #0ea5e9)' } : {}}>Galería</span>
                                        </button>
                                    </div>
                                </div>

                                {/* DATOS BÁSICOS */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic">2. Título</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ej: Balayage Rubio..."
                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all font-black text-black placeholder:text-slate-500 text-xs"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic">3. Descripción</label>
                                    <textarea 
                                        rows={2}
                                        placeholder="Describe el proceso..."
                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all font-black text-black placeholder:text-slate-500 resize-none text-xs"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                {/* SELECCIÓN DE STAFF Y SERVICIO */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic">4. Servicio</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all font-black text-black appearance-none text-xs"
                                            value={formData.serviceId}
                                            onChange={e => setFormData({...formData, serviceId: e.target.value})}
                                        >
                                            <option value="" className="text-black bg-white">Elegir...</option>
                                            {services.map(s => <option key={s.id} value={s.id} className="text-black bg-white">{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic">5. Especialista</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all font-black text-black appearance-none text-xs"
                                            value={formData.staffId}
                                            onChange={e => setFormData({...formData, staffId: e.target.value})}
                                        >
                                            <option value="" className="text-black bg-white">Elegir...</option>
                                            {staff.map(s => <option key={s.id} value={s.id} className="text-black bg-white">{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* IMÁGENES SEGÚN TIPO */}
                                {formData.type === 'BEFORE_AFTER' ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic block">6. Antes (Subir Imagen)</label>
                                                <ImageUploader 
                                                    category="portfolio"
                                                    currentUrl={formData.beforeImage}
                                                    onUploadSuccess={(m) => setFormData(prev => ({ ...prev, beforeImage: m.url }))}
                                                    onRemove={() => setFormData(prev => ({ ...prev, beforeImage: "" }))}
                                                    aspect="square"
                                                    label="Subir Antes"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="O introduce URL manual..."
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all text-[10px] text-slate-600 font-semibold"
                                                    value={formData.beforeImage}
                                                    onChange={e => setFormData({...formData, beforeImage: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic block">7. Después (Subir Imagen)</label>
                                                <ImageUploader 
                                                    category="portfolio"
                                                    currentUrl={formData.afterImage}
                                                    onUploadSuccess={(m) => setFormData(prev => ({ ...prev, afterImage: m.url }))}
                                                    onRemove={() => setFormData(prev => ({ ...prev, afterImage: "" }))}
                                                    aspect="square"
                                                    label="Subir Después"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="O introduce URL manual..."
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all text-[10px] text-slate-600 font-semibold"
                                                    value={formData.afterImage}
                                                    onChange={e => setFormData({...formData, afterImage: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic block">6. Añadir a la Galería (Subir Imagen)</label>
                                            <ImageUploader 
                                                category="portfolio"
                                                onUploadSuccess={(m) => {
                                                    const urls = formData.galleryUrls ? formData.galleryUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
                                                    urls.push(m.url);
                                                    setFormData(prev => ({ ...prev, galleryUrls: urls.join(', ') }));
                                                }}
                                                aspect="landscape"
                                                label="Subir Imagen de Galería"
                                            />
                                        </div>

                                        {formData.galleryUrls.trim() !== '' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1 block">Imágenes en Galería ({formData.galleryUrls.split(',').map(u => u.trim()).filter(Boolean).length})</label>
                                                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                    {formData.galleryUrls.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => (
                                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 bg-white">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const urls = formData.galleryUrls.split(',').map(u => u.trim()).filter(Boolean);
                                                                    urls.splice(idx, 1);
                                                                    setFormData(prev => ({ ...prev, galleryUrls: urls.join(', ') }));
                                                                }}
                                                                className="absolute top-1 right-1 size-5 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 shadow-md border border-white"
                                                            >
                                                                <X size={10} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-900 ml-1 italic block">URLs Galería (Manual, separadas por comas)</label>
                                            <textarea 
                                                rows={1}
                                                placeholder="URL1, URL2..."
                                                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all font-black text-black placeholder:text-slate-500 text-[10px]"
                                                value={formData.galleryUrls}
                                                onChange={e => setFormData({...formData, galleryUrls: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* VISIBILIDAD */}
                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                                    <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} />
                                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-amber-400 transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                                        <span className="text-[9px] mt-1 font-black uppercase text-slate-500 text-center">Destacar</span>
                                    </label>
                                    <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.published} onChange={e => setFormData({...formData, published: e.target.checked})} />
                                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-cyan-500 transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" style={formData.published ? { backgroundColor: primaryColor } : {}}></div>
                                        <span className="text-[9px] mt-1 font-black uppercase text-slate-500 text-center">Público</span>
                                    </label>
                                    <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.showInLanding} onChange={e => setFormData({...formData, showInLanding: e.target.checked})} />
                                        <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                                        <span className="text-[9px] mt-1 font-black uppercase text-slate-500 text-center">Landing</span>
                                    </label>
                                </div>
                            </form>

                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-600 bg-white border border-slate-200">Cerrar</button>
                                <button onClick={(e) => handleSubmit(e as any)} disabled={saving} className="flex-[2] py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50" style={{ backgroundColor: primaryColor || '#0ea5e9' }}>{saving ? 'Guardando...' : 'Publicar'}</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
}
