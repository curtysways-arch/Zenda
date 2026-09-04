'use client';

import { useState, useMemo } from 'react';
import {
    Plus,
    Package,
    Check,
    AlertCircle,
    X,
    Search,
    Shield,
    SlidersHorizontal,
    Star,
    Layers,
    Boxes,
    ChevronRight,
    UtensilsCrossed,
    Scissors,
    Trophy,
    Shirt,
    ShoppingBag,
    Briefcase,
    Calendar,
    Users,
    Laptop,
    Truck,
    Store,
    LayoutGrid,
    QrCode,
    Utensils,
    Monitor,
    UserCheck,
    Clock,
    CalendarDays,
    GraduationCap,
    BookOpen,
    Award,
    FileText,
    Camera,
    Activity,
    Tag,
    Ticket,
    MessageSquare,
    BarChart3,
    ShoppingCart,
    CreditCard,
    Bell,
    Globe,
    Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlanFamilyData {
    id: string;
    code: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    active: boolean;
    displayOrder: number;
    businessTypes?: { id: string; name: string; slug: string }[];
    plans: any[];
    activeBusinessesCount: number;
}

interface ModuleData {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon: string;
    active: boolean;
}

interface DependencyData {
    moduleCode: string;
    dependsOnCode: string;
}

interface SuperadminPlanManagerProps {
    initialFamilies: PlanFamilyData[];
    allModules: ModuleData[];
    dependencies: DependencyData[];
}

const FAMILY_ICONS: Record<string, any> = {
    UtensilsCrossed,
    Scissors,
    Trophy,
    Shirt,
    ShoppingBag,
    Briefcase
};

const MODULE_CATEGORIES: Record<string, { label: string; icon: any; modules: string[] }> = {
    CORE: {
        label: 'Core & Presencia',
        icon: Globe,
        modules: ['LANDING', 'CUSTOMERS', 'USERS', 'NOTIFICATIONS']
    },
    COMMERCE: {
        label: 'Comercio & Ventas',
        icon: ShoppingBag,
        modules: ['PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS', 'PAYMENTS', 'DELIVERY', 'PICKUP']
    },
    RESTAURANT: {
        label: 'Restaurante & Gastronomía',
        icon: UtensilsCrossed,
        modules: ['TABLES', 'QR_TABLE', 'KITCHEN', 'KDS', 'POS']
    },
    SERVICES: {
        label: 'Citas & Servicios',
        icon: Scissors,
        modules: ['APPOINTMENTS', 'SERVICES', 'STAFF', 'REMINDERS']
    },
    COURTS: {
        label: 'Canchas & Deportes',
        icon: Trophy,
        modules: ['COURTS', 'SCHEDULES', 'COURSES', 'STUDENTS', 'INSTRUCTORS']
    },
    LAUNDRY: {
        label: 'Lavandería & Cuidado',
        icon: Shirt,
        modules: ['LAUNDRY_ORDERS', 'INSPECTION_PHOTOS', 'WORKFLOW']
    },
    MARKETING: {
        label: 'Marketing & Fidelización',
        icon: Tag,
        modules: ['PROMOTIONS', 'COUPONS', 'LOYALTY', 'COMMUNICATION_CENTER']
    },
    OPERATIONS: {
        label: 'Operaciones & Reportes',
        icon: Boxes,
        modules: ['INVENTORY', 'REPORTS']
    }
};

export default function SuperadminPlanManager({
    initialFamilies,
    allModules,
    dependencies
}: SuperadminPlanManagerProps) {
    const router = useRouter();
    const [families, setFamilies] = useState<PlanFamilyData[]>(initialFamilies);
    const [selectedFamilyId, setSelectedFamilyId] = useState<string>(initialFamilies[0]?.id || '');
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [dependencyWarning, setDependencyWarning] = useState<string | null>(null);

    // Estado del Formulario de Plan
    const [planForm, setPlanForm] = useState({
        name: '',
        slug: '',
        description: '',
        price: '9.99',
        billingPeriod: 'monthly',
        currency: 'USD',
        trial_days: '15',
        displayOrder: 1,
        featured: false,
        isDefault: false,
        isPublic: true,
        activo: true,
        selectedModules: new Set<string>(),
        limits: {
            MAX_USERS: 2,
            MAX_PRODUCTS: 50,
            MAX_TABLES: 10,
            MAX_COURTS: 2,
            MAX_STAFF: 2,
            MAX_APPOINTMENTS_MONTHLY: 100,
            MAX_ORDERS_MONTHLY: 300
        } as Record<string, any>
    });

    // Estado del Formulario de Familia
    const [familyForm, setFamilyForm] = useState({
        code: '',
        name: '',
        slug: '',
        description: '',
        icon: 'Briefcase'
    });

    const activeFamily = useMemo(() => {
        return families.find(f => f.id === selectedFamilyId) || families[0];
    }, [families, selectedFamilyId]);

    // Abrir Modal de Creación
    const handleOpenCreatePlan = () => {
        setEditingPlan(null);
        setDependencyWarning(null);

        // Módulos por defecto sugeridos según la familia
        const defaultMods = new Set<string>(['LANDING', 'CUSTOMERS']);
        if (activeFamily?.code === 'RESTAURANTE') {
            ['PRODUCTS', 'CATEGORIES', 'TABLES', 'QR_TABLE', 'ORDERS'].forEach(m => defaultMods.add(m));
        } else if (activeFamily?.code === 'SERVICIOS') {
            ['SERVICES', 'STAFF', 'APPOINTMENTS'].forEach(m => defaultMods.add(m));
        } else if (activeFamily?.code === 'CANCHAS') {
            ['COURTS', 'SCHEDULES', 'APPOINTMENTS'].forEach(m => defaultMods.add(m));
        } else if (activeFamily?.code === 'LAVANDERIA') {
            ['SERVICES', 'LAUNDRY_ORDERS', 'WORKFLOW'].forEach(m => defaultMods.add(m));
        } else if (activeFamily?.code === 'TIENDA') {
            ['PRODUCTS', 'CATEGORIES', 'CART', 'ORDERS'].forEach(m => defaultMods.add(m));
        }

        setPlanForm({
            name: `${activeFamily?.name.split(' ')[0] || 'Plan'} Inicio`,
            slug: `${activeFamily?.slug || 'plan'}-inicio`,
            description: `Plan ideal para lanzar tu negocio en ${activeFamily?.name || ''}`,
            price: '9.99',
            billingPeriod: 'monthly',
            currency: 'USD',
            trial_days: '15',
            displayOrder: (activeFamily?.plans.length || 0) + 1,
            featured: false,
            isDefault: activeFamily?.plans.length === 0,
            isPublic: true,
            activo: true,
            selectedModules: defaultMods,
            limits: {
                MAX_USERS: 2,
                MAX_PRODUCTS: 50,
                MAX_TABLES: 10,
                MAX_COURTS: 2,
                MAX_STAFF: 2,
                MAX_APPOINTMENTS_MONTHLY: 100,
                MAX_ORDERS_MONTHLY: 300
            }
        });
        setIsPlanModalOpen(true);
    };

    // Abrir Modal de Edición
    const handleOpenEditPlan = (plan: any) => {
        setEditingPlan(plan);
        setDependencyWarning(null);

        const currentMods = new Set<string>();
        if (plan.planEntitlements) {
            plan.planEntitlements.forEach((pe: any) => {
                if (pe.enabled && pe.module?.code) {
                    currentMods.add(pe.module.code);
                }
            });
        }

        const limitsMap: Record<string, any> = {};
        if (plan.planLimits) {
            plan.planLimits.forEach((pl: any) => {
                limitsMap[pl.limitKey] = pl.limitValue;
            });
        }

        setPlanForm({
            name: plan.name,
            slug: plan.slug || '',
            description: plan.description || '',
            price: String(plan.price),
            billingPeriod: plan.billingPeriod || 'monthly',
            currency: plan.currency || 'USD',
            trial_days: String(plan.trial_days || 0),
            displayOrder: plan.displayOrder || 1,
            featured: Boolean(plan.featured),
            isDefault: Boolean(plan.isDefault),
            isPublic: plan.isPublic !== undefined ? Boolean(plan.isPublic) : true,
            activo: plan.activo !== undefined ? Boolean(plan.activo) : true,
            selectedModules: currentMods,
            limits: {
                MAX_USERS: limitsMap.MAX_USERS ?? 2,
                MAX_PRODUCTS: limitsMap.MAX_PRODUCTS ?? 50,
                MAX_TABLES: limitsMap.MAX_TABLES ?? 10,
                MAX_COURTS: limitsMap.MAX_COURTS ?? 2,
                MAX_STAFF: limitsMap.MAX_STAFF ?? 2,
                MAX_APPOINTMENTS_MONTHLY: limitsMap.MAX_APPOINTMENTS_MONTHLY ?? 100,
                MAX_ORDERS_MONTHLY: limitsMap.MAX_ORDERS_MONTHLY ?? 300
            }
        });
        setIsPlanModalOpen(true);
    };

    // Toggle de módulo con resolución bidireccional estricta de dependencias
    const handleToggleModule = (moduleCode: string) => {
        setDependencyWarning(null);
        const next = new Set(planForm.selectedModules);

        if (next.has(moduleCode)) {
            // Intento de desactivar: verificar si otros módulos activos dependen de este
            const dependentModules = dependencies
                .filter(d => d.dependsOnCode === moduleCode && next.has(d.moduleCode))
                .map(d => d.moduleCode);

            if (dependentModules.length > 0) {
                setDependencyWarning(`⚠️ No se puede desactivar ${moduleCode} porque los siguientes módulos activos dependen de él: ${dependentModules.join(', ')}.`);
                return;
            }

            next.delete(moduleCode);
        } else {
            // Intento de activar: auto-activar todas las dependencias requeridas
            next.add(moduleCode);

            const requiredDeps = dependencies
                .filter(d => d.moduleCode === moduleCode)
                .map(d => d.dependsOnCode);

            if (requiredDeps.length > 0) {
                requiredDeps.forEach(dep => next.add(dep));
                setDependencyWarning(`ℹ️ Se activaron automáticamente las dependencias requeridas para ${moduleCode}: ${requiredDeps.join(', ')}.`);
            }
        }

        setPlanForm(prev => ({ ...prev, selectedModules: next }));
    };

    // Guardar Plan (POST / PATCH)
    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setDependencyWarning(null);

        try {
            const payload = {
                name: planForm.name,
                slug: planForm.slug,
                description: planForm.description,
                price: parseFloat(planForm.price),
                billingPeriod: planForm.billingPeriod,
                currency: planForm.currency,
                trial_days: parseInt(planForm.trial_days, 10),
                displayOrder: planForm.displayOrder,
                featured: planForm.featured,
                isDefault: planForm.isDefault,
                isPublic: planForm.isPublic,
                familyId: activeFamily?.id,
                activo: planForm.activo,
                modules: Array.from(planForm.selectedModules),
                limits: planForm.limits
            };

            const url = editingPlan 
                ? `/api/superadmin/planes/${editingPlan.id}` 
                : `/api/superadmin/planes`;
            const method = editingPlan ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al guardar el plan');
            }

            setIsPlanModalOpen(false);
            // Refrescar datos
            const famRes = await fetch('/api/superadmin/plan-families');
            const famData = await famRes.json();
            if (famData.families) setFamilies(famData.families);
            router.refresh();
        } catch (err: any) {
            setDependencyWarning(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Guardar Nueva Familia (POST /api/superadmin/plan-families)
    const handleSaveFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/superadmin/plan-families', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(familyForm)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al crear la familia');

            setIsFamilyModalOpen(false);
            const famRes = await fetch('/api/superadmin/plan-families');
            const famData = await famRes.json();
            if (famData.families) {
                setFamilies(famData.families);
                setSelectedFamilyId(data.id);
            }
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            
            {/* 1. Header y Resumen de Familias */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Planes & Familias de Solución
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Gestiona los planes comerciales organizados por vertical con motor universal de capacidades y límites.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setFamilyForm({ code: '', name: '', slug: '', description: '', icon: 'Briefcase' });
                            setIsFamilyModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                        <Plus size={16} />
                        Nueva Familia
                    </button>
                    <button
                        onClick={handleOpenCreatePlan}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                        <Plus size={16} />
                        Crear Plan en {activeFamily?.name.split(' ')[0] || ''}
                    </button>
                </div>
            </div>

            {/* 2. Selector de Familias (Tarjetas de Solución Comercial) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {families.map(fam => {
                    const active = fam.id === selectedFamilyId;
                    const IconComponent = FAMILY_ICONS[fam.icon] || Briefcase;

                    return (
                        <button
                            key={fam.id}
                            onClick={() => setSelectedFamilyId(fam.id)}
                            className={`p-5 rounded-3xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                                active
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/15 scale-[1.02]'
                                    : 'bg-white text-slate-800 border-slate-200/80 hover:border-indigo-200 hover:shadow-md'
                            }`}
                        >
                            <div className="space-y-3">
                                <div className={`size-10 rounded-2xl flex items-center justify-center ${
                                    active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                    <IconComponent size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm tracking-tight">{fam.name}</h3>
                                    <p className={`text-[11px] font-medium mt-0.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                                        {fam.plans?.length || 0} planes configurados
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-extrabold">
                                <span className={active ? 'text-indigo-400' : 'text-slate-500'}>
                                    {fam.activeBusinessesCount} negocios
                                </span>
                                <ChevronRight size={14} className={active ? 'text-white' : 'text-slate-400'} />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 3. Listado de Planes de la Familia Seleccionada */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            Familia: {activeFamily?.code}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                            Planes para {activeFamily?.name}
                        </h3>
                    </div>

                    <button
                        onClick={handleOpenCreatePlan}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                        <Plus size={15} /> Añadir Plan a {activeFamily?.name.split(' ')[0]}
                    </button>
                </div>

                {activeFamily?.plans?.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Package size={40} className="mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">No hay planes creados en esta familia</p>
                        <button
                            onClick={handleOpenCreatePlan}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs"
                        >
                            Crear Primer Plan
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {activeFamily?.plans?.map(plan => {
                            const modulesCount = plan.planEntitlements?.filter((pe: any) => pe.enabled).length || 0;

                            return (
                                <div
                                    key={plan.id}
                                    className={`rounded-3xl p-6 border transition-all flex flex-col justify-between group ${
                                        plan.featured
                                            ? 'border-2 border-indigo-600 bg-indigo-50/20 shadow-xl shadow-indigo-600/10'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {plan.isDefault && (
                                                    <span className="px-2.5 py-0.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                                                        Por Defecto
                                                    </span>
                                                )}
                                                {plan.featured && (
                                                    <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                        <Star size={10} className="fill-slate-950" /> Destacado
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                plan.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {plan.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {plan.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">
                                                {plan.description || 'Sin descripción'}
                                            </p>
                                        </div>

                                        <div className="pt-2">
                                            <span className="text-3xl font-black text-slate-950">${plan.price}</span>
                                            <span className="text-xs text-slate-400 font-bold"> / {plan.billingPeriod || 'mes'}</span>
                                        </div>

                                        <div className="py-2 border-y border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                                            <span>Módulos incluidos</span>
                                            <span className="text-indigo-600 font-black">{modulesCount} activos</span>
                                        </div>

                                        {/* Lista corta de módulos */}
                                        <div className="space-y-1.5 pt-1">
                                            {plan.planEntitlements?.slice(0, 5).map((pe: any) => (
                                                <div key={pe.id} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                                    <Check size={14} className="text-emerald-500 shrink-0" />
                                                    <span className="truncate">{pe.module?.name || pe.module?.code}</span>
                                                </div>
                                            ))}
                                            {modulesCount > 5 && (
                                                <p className="text-[11px] font-bold text-slate-400 pt-1">
                                                    + {modulesCount - 5} módulos más
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-4 border-t border-slate-100 flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenEditPlan(plan)}
                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all text-center cursor-pointer"
                                        >
                                            Editar Plan
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ================= MODAL DE PLAN BUILDER (CONSTRUCTOR UNIVERSAL) ================= */}
            {isPlanModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Header del Modal */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    Familia: {activeFamily?.name}
                                </span>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                                    {editingPlan ? `Editar Plan: ${editingPlan.name}` : 'Crear Nuevo Plan'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsPlanModalOpen(false)}
                                className="size-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Banner de Advertencia de Dependencias */}
                        {dependencyWarning && (
                            <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 px-6">
                                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                <span>{dependencyWarning}</span>
                            </div>
                        )}

                        {/* Cuerpo del Formulario */}
                        <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Sección 1: Datos Básicos */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">1. Datos Comerciales del Plan</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Plan</label>
                                        <input
                                            type="text"
                                            required
                                            value={planForm.name}
                                            onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                            placeholder="ej. Restaurante Crecimiento"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label>
                                        <input
                                            type="text"
                                            value={planForm.slug}
                                            onChange={e => setPlanForm({ ...planForm, slug: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                            placeholder="ej. restaurante-crecimiento"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={planForm.description}
                                        onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                        placeholder="Descripción comercial para los clientes"
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Precio Público ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={planForm.price}
                                            onChange={e => setPlanForm({ ...planForm, price: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Periodicidad</label>
                                        <select
                                            value={planForm.billingPeriod}
                                            onChange={e => setPlanForm({ ...planForm, billingPeriod: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                        >
                                            <option value="monthly">Mensual</option>
                                            <option value="annual">Anual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Días de Prueba</label>
                                        <input
                                            type="number"
                                            value={planForm.trial_days}
                                            onChange={e => setPlanForm({ ...planForm, trial_days: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Orden Visual</label>
                                        <input
                                            type="number"
                                            value={planForm.displayOrder}
                                            onChange={e => setPlanForm({ ...planForm, displayOrder: parseInt(e.target.value, 10) || 1 })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-6 pt-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={planForm.featured}
                                            onChange={e => setPlanForm({ ...planForm, featured: e.target.checked })}
                                            className="rounded size-4 text-indigo-600"
                                        />
                                        Plan Destacado (Badge popular)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={planForm.isDefault}
                                            onChange={e => setPlanForm({ ...planForm, isDefault: e.target.checked })}
                                            className="rounded size-4 text-indigo-600"
                                        />
                                        Plan por Defecto (Asignación automática)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={planForm.isPublic}
                                            onChange={e => setPlanForm({ ...planForm, isPublic: e.target.checked })}
                                            className="rounded size-4 text-indigo-600"
                                        />
                                        Visible Públicamente
                                    </label>
                                </div>
                            </div>

                            {/* Sección 2: Módulos Agrupados por Categoría Canónica */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                                            2. Módulos y Capacidades Incluidas
                                        </h4>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {planForm.selectedModules.size} módulos activos para este plan
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {Object.entries(MODULE_CATEGORIES).map(([catKey, cat]) => {
                                        const catModules = allModules.filter(m => cat.modules.includes(m.code));
                                        if (catModules.length === 0) return null;

                                        const IconCat = cat.icon;

                                        return (
                                            <div key={catKey} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                                <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                                                    <IconCat size={16} className="text-indigo-600" />
                                                    <span>{cat.label}</span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                    {catModules.map(mod => {
                                                        const isChecked = planForm.selectedModules.has(mod.code);

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={mod.code}
                                                                onClick={() => handleToggleModule(mod.code)}
                                                                className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                                                    isChecked
                                                                        ? 'bg-white border-indigo-600 shadow-xs ring-1 ring-indigo-600'
                                                                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="font-extrabold text-xs text-slate-900 truncate">
                                                                        {mod.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 font-mono">
                                                                        {mod.code}
                                                                    </p>
                                                                </div>
                                                                <div className={`size-5 rounded-md flex items-center justify-center shrink-0 ${
                                                                    isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                                                                }`}>
                                                                    {isChecked && <Check size={12} strokeWidth={3} />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sección 3: Límites Universales */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    3. Límites Universales del Plan (-1 = Ilimitado)
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Usuarios / Equipo</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_USERS}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_USERS: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Productos Catálogo</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_PRODUCTS}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_PRODUCTS: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mesas (Restaurante)</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_TABLES}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_TABLES: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Canchas (Deportes)</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_COURTS}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_COURTS: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Profesionales (Servicios)</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_STAFF}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_STAFF: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Citas Mensuales</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_APPOINTMENTS_MONTHLY}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_APPOINTMENTS_MONTHLY: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Pedidos Mensuales</label>
                                        <input
                                            type="number"
                                            value={planForm.limits.MAX_ORDERS_MONTHLY}
                                            onChange={e => setPlanForm({
                                                ...planForm,
                                                limits: { ...planForm.limits, MAX_ORDERS_MONTHLY: parseInt(e.target.value, 10) }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPlanModalOpen(false)}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : (editingPlan ? 'Actualizar Plan' : 'Crear Plan')}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL CREAR FAMILIA ================= */}
            {isFamilyModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Nueva Familia de Planes</h3>
                            <button onClick={() => setIsFamilyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveFamily} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Solución</label>
                                <input
                                    type="text"
                                    required
                                    value={familyForm.name}
                                    onChange={e => setFamilyForm({
                                        ...familyForm,
                                        name: e.target.value,
                                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
                                    })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-600"
                                    placeholder="ej. Gimnasios & Fitness"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Código Único (UPPERCASE)</label>
                                <input
                                    type="text"
                                    required
                                    value={familyForm.code}
                                    onChange={e => setFamilyForm({ ...familyForm, code: e.target.value.toUpperCase() })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-600"
                                    placeholder="FITNESS"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Slug URL</label>
                                <input
                                    type="text"
                                    required
                                    value={familyForm.slug}
                                    onChange={e => setFamilyForm({ ...familyForm, slug: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-600"
                                    placeholder="fitness"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    value={familyForm.description}
                                    onChange={e => setFamilyForm({ ...familyForm, description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-indigo-600"
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFamilyModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                >
                                    {loading ? 'Creando...' : 'Crear Familia'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
