'use client';

import { useState } from 'react';
import { 
    Layout, 
    Globe, 
    Sliders, 
    Plus, 
    Check, 
    Star, 
    ExternalLink, 
    Edit2, 
    Trash2, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles, 
    Briefcase, 
    Layers, 
    Eye, 
    X,
    Filter,
    ShieldAlert
} from 'lucide-react';
import { clsx } from 'clsx';

interface BusinessType {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
}

interface LandingTemplate {
    id: string;
    businessTypeId: string;
    name: string;
    slug: string;
    description: string | null;
    component: string;
    previewImage: string | null;
    version: string;
    active: boolean;
    isDefault: boolean;
    sortOrder: number;
    businessType: BusinessType;
}

interface AdminTemplate {
    id: string;
    businessTypeId: string;
    name: string;
    component: string;
    layoutType: string;
    previewImage: string | null;
    version: string;
    active: boolean;
    isDefault: boolean;
    sortOrder: number;
    businessType: BusinessType;
}

interface Props {
    initialBusinessTypes: BusinessType[];
    initialLandingTemplates: LandingTemplate[];
    initialAdminTemplates: AdminTemplate[];
}

export default function PlantillasManagerClient({
    initialBusinessTypes,
    initialLandingTemplates,
    initialAdminTemplates
}: Props) {
    const [activeTab, setActiveTab] = useState<'landings' | 'admins'>('landings');
    const [selectedBusinessType, setSelectedBusinessType] = useState<string>('all');
    const [landings, setLandings] = useState<LandingTemplate[]>(initialLandingTemplates);
    const [admins, setAdmins] = useState<AdminTemplate[]>(initialAdminTemplates);
    const [businessTypes] = useState<BusinessType[]>(initialBusinessTypes);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [modalType, setModalType] = useState<'landing' | 'admin'>('landing');
    const [formData, setFormData] = useState({
        businessTypeId: initialBusinessTypes[0]?.id || '',
        name: '',
        slug: '',
        description: '',
        component: '',
        layoutType: 'SIDEBAR',
        previewImage: '',
        isDefault: false,
        active: true,
        sortOrder: 1
    });

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/superadmin/plantillas');
            if (res.ok) {
                const data = await res.json();
                setLandings(data.landingTemplates || []);
                setAdmins(data.adminTemplates || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            const res = await fetch('/api/superadmin/plantillas/seed', { method: 'POST' });
            if (res.ok) {
                showToast('Plantillas oficiales aseguradas exitosamente');
                await fetchAll();
            } else {
                showToast('Error al restaurar plantillas');
            }
        } catch (e) {
            showToast('Error de conexión con el servidor');
        } finally {
            setSeeding(false);
        }
    };

    const handleToggleActive = async (type: 'landing' | 'admin', item: any) => {
        try {
            const endpoint = `/api/superadmin/plantillas/${type}/${item.id}`;
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !item.active })
            });

            if (res.ok) {
                if (type === 'landing') {
                    setLandings(prev => prev.map(l => l.id === item.id ? { ...l, active: !l.active } : l));
                } else {
                    setAdmins(prev => prev.map(a => a.id === item.id ? { ...a, active: !a.active } : a));
                }
                showToast(`Plantilla ${!item.active ? 'activada' : 'desactivada'}`);
            }
        } catch (e) {
            console.error(e);
            showToast('Error al actualizar estado');
        }
    };

    const handleSetDefault = async (type: 'landing' | 'admin', item: any) => {
        try {
            const endpoint = `/api/superadmin/plantillas/${type}/${item.id}`;
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true })
            });

            if (res.ok) {
                if (type === 'landing') {
                    setLandings(prev => prev.map(l => {
                        if (l.businessTypeId === item.businessTypeId) {
                            return { ...l, isDefault: l.id === item.id };
                        }
                        return l;
                    }));
                } else {
                    setAdmins(prev => prev.map(a => {
                        if (a.businessTypeId === item.businessTypeId) {
                            return { ...a, isDefault: a.id === item.id };
                        }
                        return a;
                    }));
                }
                showToast(`Establecida como plantilla predeterminada para ${item.businessType?.name}`);
            }
        } catch (e) {
            console.error(e);
            showToast('Error al definir predeterminada');
        }
    };

    const handleDelete = async (type: 'landing' | 'admin', item: any) => {
        if (!confirm(`¿Estás seguro de eliminar la plantilla "${item.name}"?`)) return;

        try {
            const endpoint = `/api/superadmin/plantillas/${type}/${item.id}`;
            const res = await fetch(endpoint, { method: 'DELETE' });

            if (res.ok) {
                if (type === 'landing') {
                    setLandings(prev => prev.filter(l => l.id !== item.id));
                } else {
                    setAdmins(prev => prev.filter(a => a.id !== item.id));
                }
                showToast('Plantilla eliminada correctamente');
            }
        } catch (e) {
            console.error(e);
            showToast('Error al eliminar plantilla');
        }
    };

    const openCreateModal = (type: 'landing' | 'admin') => {
        setModalType(type);
        setEditingItem(null);
        setFormData({
            businessTypeId: businessTypes[0]?.id || '',
            name: '',
            slug: '',
            description: '',
            component: '',
            layoutType: 'SIDEBAR',
            previewImage: '',
            isDefault: false,
            active: true,
            sortOrder: 1
        });
        setIsModalOpen(true);
    };

    const openEditModal = (type: 'landing' | 'admin', item: any) => {
        setModalType(type);
        setEditingItem(item);
        setFormData({
            businessTypeId: item.businessTypeId,
            name: item.name,
            slug: item.slug || '',
            description: item.description || '',
            component: item.component,
            layoutType: item.layoutType || 'SIDEBAR',
            previewImage: item.previewImage || '',
            isDefault: item.isDefault,
            active: item.active,
            sortOrder: item.sortOrder || 1
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isEditing = Boolean(editingItem);
            const endpoint = isEditing
                ? `/api/superadmin/plantillas/${modalType}/${editingItem.id}`
                : `/api/superadmin/plantillas/${modalType}`;
            
            const method = isEditing ? 'PATCH' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showToast(isEditing ? 'Plantilla actualizada' : 'Plantilla creada con éxito');
                setIsModalOpen(false);
                await fetchAll();
            } else {
                const err = await res.json();
                alert(err.error || 'Error al guardar la plantilla');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    };

    const getDemoUrlForBusinessType = (slug: string) => {
        switch (slug) {
            case 'citas': return '/demo';
            case 'reservas': return '/canchas';
            case 'ordenes-servicio': return '/demo-lavado';
            case 'comandas': return '/restaurantes';
            case 'ecommerce': return '/tiendas';
            default: return '/demo';
        }
    };

    const filteredLandings = landings.filter(l => 
        selectedBusinessType === 'all' || l.businessTypeId === selectedBusinessType
    );

    const filteredAdmins = admins.filter(a => 
        selectedBusinessType === 'all' || a.businessTypeId === selectedBusinessType
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-5">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold">{toastMessage}</span>
                </div>
            )}

            {/* Cabecera Principal */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-2 max-w-2xl relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        <Sparkles size={12} />
                        Catálogo de Experiencias Web Citiox
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-black tracking-tight uppercase italic text-white">
                        Módulo de Plantillas <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Landings & Admins</span>
                    </h1>
                    <p className="text-xs lg:text-sm text-slate-400 font-medium leading-relaxed">
                        Gestiona, previsualiza y asigna las experiencias visuales oficiales según el vertical de negocio: Citas y Spas, Canchas, Lavanderías, Restaurantes y E-commerce.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="Restaura o asegura las plantillas oficiales predeterminadas"
                    >
                        <RefreshCw size={14} className={clsx(seeding && "animate-spin text-emerald-400")} />
                        {seeding ? 'Asegurando...' : 'Restaurar Oficiales'}
                    </button>
                    <button
                        onClick={() => openCreateModal(activeTab === 'landings' ? 'landing' : 'admin')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={16} />
                        Nueva {activeTab === 'landings' ? 'Landing' : 'Plantilla Admin'}
                    </button>
                </div>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Landings Registradas</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{landings.length}</span>
                        <span className="text-xs font-bold text-emerald-600">({landings.filter(l => l.active).length} activas)</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Paneles Admin Registrados</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{admins.length}</span>
                        <span className="text-xs font-bold text-cyan-600">({admins.filter(a => a.active).length} activos)</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Verticales Soportados</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{businessTypes.length}</span>
                        <span className="text-xs font-bold text-slate-400">tipos de negocio</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Predeterminadas Asignadas</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-amber-500">100%</span>
                        <span className="text-xs font-bold text-emerald-600">Completado</span>
                    </div>
                </div>
            </div>

            {/* Selector de Pestaña Principal (Landings vs Admins) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                    <button
                        onClick={() => setActiveTab('landings')}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            activeTab === 'landings'
                                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        )}
                    >
                        <Globe size={15} />
                        Plantillas de Landing ({landings.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('admins')}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            activeTab === 'admins'
                                ? "bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        )}
                    >
                        <Layout size={15} />
                        Paneles de Admin ({admins.length})
                    </button>
                </div>

                {/* Filtro por Tipo de Negocio */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                        <Filter size={12} /> Filtrar:
                    </span>
                    <button
                        onClick={() => setSelectedBusinessType('all')}
                        className={clsx(
                            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0",
                            selectedBusinessType === 'all'
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                        )}
                    >
                        Todos
                    </button>
                    {businessTypes.map(bt => (
                        <button
                            key={bt.id}
                            onClick={() => setSelectedBusinessType(bt.id)}
                            className={clsx(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5",
                                selectedBusinessType === bt.id
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                            )}
                        >
                            <span className="size-2 rounded-full" style={{ backgroundColor: bt.color || '#10b981' }} />
                            {bt.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Plantillas de LANDING */}
            {activeTab === 'landings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLandings.map((tpl) => {
                        const demoUrl = getDemoUrlForBusinessType(tpl.businessType?.slug);
                        return (
                            <div 
                                key={tpl.id}
                                className={clsx(
                                    "bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl group relative",
                                    tpl.isDefault ? "border-emerald-500/50 dark:border-emerald-500/40 ring-1 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800"
                                )}
                            >
                                {/* Imagen de portada con badges */}
                                <div className="h-44 w-full relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {tpl.previewImage ? (
                                        <img 
                                            src={tpl.previewImage} 
                                            alt={tpl.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <Globe size={40} className="opacity-30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                                    {/* Badges superiores */}
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                                        <span 
                                            className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md"
                                            style={{ backgroundColor: tpl.businessType?.color || '#10b981' }}
                                        >
                                            {tpl.businessType?.name || 'Vertical'}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {tpl.isDefault && (
                                                <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                                                    <Star size={11} className="fill-slate-950" /> Predeterminada
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleToggleActive('landing', tpl)}
                                                className={clsx(
                                                    "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md cursor-pointer transition-all",
                                                    tpl.active 
                                                        ? "bg-emerald-500/90 text-white" 
                                                        : "bg-rose-500/90 text-white"
                                                )}
                                            >
                                                {tpl.active ? 'Activa' : 'Inactiva'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Slug y componente sobre la imagen */}
                                    <div className="absolute bottom-3 left-3 right-3 text-white">
                                        <h3 className="font-black text-sm uppercase tracking-tight text-white drop-shadow-md">
                                            {tpl.name}
                                        </h3>
                                        <span className="text-[10px] text-slate-300 font-mono">
                                            Componente: &lt;{tpl.component}&gt;
                                        </span>
                                    </div>
                                </div>

                                {/* Cuerpo */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">
                                        {tpl.description || 'Sin descripción configurada.'}
                                    </p>

                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                            <span>Slug: <strong className="text-slate-700 dark:text-slate-300 font-mono">{tpl.slug}</strong></span>
                                            <span>v{tpl.version}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <a
                                                href={demoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider transition-all"
                                            >
                                                <ExternalLink size={12} /> Ver Demo
                                            </a>

                                            {!tpl.isDefault && (
                                                <button
                                                    onClick={() => handleSetDefault('landing', tpl)}
                                                    className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                                    title="Establecer como predeterminada para este tipo de negocio"
                                                >
                                                    Hacer Default
                                                </button>
                                            )}

                                            <button
                                                onClick={() => openEditModal('landing', tpl)}
                                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                                title="Editar plantilla"
                                            >
                                                <Edit2 size={13} />
                                            </button>

                                            <button
                                                onClick={() => handleDelete('landing', tpl)}
                                                className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-all cursor-pointer"
                                                title="Eliminar plantilla"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Grid de Plantillas de ADMIN */}
            {activeTab === 'admins' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAdmins.map((tpl) => {
                        return (
                            <div 
                                key={tpl.id}
                                className={clsx(
                                    "bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl group relative",
                                    tpl.isDefault ? "border-cyan-500/50 dark:border-cyan-500/40 ring-1 ring-cyan-500/20" : "border-slate-200 dark:border-slate-800"
                                )}
                            >
                                {/* Imagen de portada con badges */}
                                <div className="h-44 w-full relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {tpl.previewImage ? (
                                        <img 
                                            src={tpl.previewImage} 
                                            alt={tpl.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <Layout size={40} className="opacity-30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />

                                    {/* Badges superiores */}
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                                        <span 
                                            className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-md"
                                            style={{ backgroundColor: tpl.businessType?.color || '#06b6d4' }}
                                        >
                                            {tpl.businessType?.name || 'Vertical'}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            {tpl.isDefault && (
                                                <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                                                    <Star size={11} className="fill-slate-950" /> Predeterminado
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleToggleActive('admin', tpl)}
                                                className={clsx(
                                                    "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md cursor-pointer transition-all",
                                                    tpl.active 
                                                        ? "bg-cyan-500/90 text-white" 
                                                        : "bg-rose-500/90 text-white"
                                                )}
                                            >
                                                {tpl.active ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nombre y layout sobre la imagen */}
                                    <div className="absolute bottom-3 left-3 right-3 text-white">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white text-[9px] font-mono font-black uppercase tracking-wider">
                                                {tpl.layoutType}
                                            </span>
                                        </div>
                                        <h3 className="font-black text-sm uppercase tracking-tight text-white drop-shadow-md">
                                            {tpl.name}
                                        </h3>
                                        <span className="text-[10px] text-slate-300 font-mono">
                                            Componente: &lt;{tpl.component}&gt;
                                        </span>
                                    </div>
                                </div>

                                {/* Cuerpo */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>Formato de Panel:</span>
                                            <strong className="text-slate-900 dark:text-white uppercase text-[10px]">{tpl.layoutType}</strong>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>Arquitectura:</span>
                                            <strong className="text-cyan-600 font-mono text-[10px]">Capabilities Resolved</strong>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                            <span>Orden: #{tpl.sortOrder}</span>
                                            <span>v{tpl.version}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <a
                                                href="/superadmin/negocios"
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider transition-all"
                                            >
                                                <ExternalLink size={12} /> Probar en Negocio
                                            </a>

                                            {!tpl.isDefault && (
                                                <button
                                                    onClick={() => handleSetDefault('admin', tpl)}
                                                    className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                                    title="Establecer como predeterminada para este tipo de negocio"
                                                >
                                                    Hacer Default
                                                </button>
                                            )}

                                            <button
                                                onClick={() => openEditModal('admin', tpl)}
                                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                                title="Editar plantilla"
                                            >
                                                <Edit2 size={13} />
                                            </button>

                                            <button
                                                onClick={() => handleDelete('admin', tpl)}
                                                className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-all cursor-pointer"
                                                title="Eliminar plantilla"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Creación / Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl relative space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    {editingItem ? 'Editar Plantilla' : 'Nueva Plantilla'} ({modalType === 'landing' ? 'Landing' : 'Admin'})
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">Configura los parámetros visuales y técnicos</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Negocio</label>
                                <select
                                    value={formData.businessTypeId}
                                    onChange={e => setFormData({ ...formData, businessTypeId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                >
                                    {businessTypes.map(bt => (
                                        <option key={bt.id} value={bt.id}>{bt.name} ({bt.slug})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Nombre de la Plantilla</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Landing Minimalista Express"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            {modalType === 'landing' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Slug Identificador</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="Ej: landing-services-minimal"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Componente React</label>
                                <input
                                    type="text"
                                    value={formData.component}
                                    onChange={e => setFormData({ ...formData, component: e.target.value })}
                                    placeholder="Ej: HomeServicesClient, ShoeCareLanding, ServiceKanbanBoard"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            {modalType === 'admin' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tipo de Layout</label>
                                    <select
                                        value={formData.layoutType}
                                        onChange={e => setFormData({ ...formData, layoutType: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="SIDEBAR">SIDEBAR (Barra lateral estándar)</option>
                                        <option value="GRID">GRID (Matriz interactiva horaria)</option>
                                        <option value="KANBAN">KANBAN (Tablero de flujo por columnas)</option>
                                        <option value="KDS">KDS (Monitor de cocina / Despacho)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">URL Imagen de Vista Previa</label>
                                <input
                                    type="url"
                                    value={formData.previewImage}
                                    onChange={e => setFormData({ ...formData, previewImage: e.target.value })}
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {modalType === 'landing' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Descripción</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Breve resumen de la experiencia y casos de uso..."
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Marcar como Predeterminada para este vertical</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                                >
                                    {editingItem ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
