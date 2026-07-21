"use client";

import { useState, useEffect } from "react";
import {
    X,
    Package,
    Zap,
    Calendar,
    Save,
    Loader2,
    Clock,
    Trophy,
    MapPin,
    FileText,
    Dribbble,
    Star,
    Users,
    Tags,
    MessageCircle,
    Palette
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PlanModalProps {
    plan?: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function PlanModal({ plan, isOpen, onClose }: PlanModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "0" as any,
        trial_days: "0" as any,
        max_fields: "5" as any,
        maxStaff: "1" as any,
        max_reservations_per_month: "100" as any,
        tournaments_enabled: false,
        automatic_discounts_enabled: false,
        courses_module: false,
        max_locations: "1" as any,
        is_recommended: false,
        activo: true,
        // WhatsApp
        whatsapp_notifications: false,
        whatsapp_otp: false,
        whatsapp_reminders: false,
        whatsapp_campaigns: false,
        // Branding
        remove_zenda_branding: false,
        custom_colors: false,
        custom_logo: false,
        custom_phrases: false,
        // Otros
        analytics: false,
        automation: false,
        citas_activacion: "1" as any,
    });

    useEffect(() => {
        if (isOpen) {
            const featuresObj = plan?.features 
                ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) 
                : {};
            
            const featuresMapped = Array.isArray(featuresObj) 
                ? featuresObj.reduce((acc: any, f: string) => ({ ...acc, [f]: true }), {}) 
                : featuresObj;

            setFormData({
                name: plan?.name || plan?.nombre || "",
                description: plan?.description || "",
                price: plan?.price || plan?.precioMensual || 0,
                trial_days: plan?.trial_days || 0,
                max_fields: plan?.max_fields || plan?.limiteCanchas || 5,
                maxStaff: plan?.maxStaff || 1,
                max_reservations_per_month: plan?.max_reservations_per_month || plan?.limiteReservas || 100,
                tournaments_enabled: plan?.tournaments_enabled ?? false,
                automatic_discounts_enabled: plan?.automatic_discounts_enabled ?? false,
                courses_module: plan?.courses_module ?? false,
                max_locations: plan?.max_locations || 1,
                is_recommended: plan?.is_recommended ?? false,
                activo: plan ? (plan.activo ?? true) : true,
                // WhatsApp
                whatsapp_notifications: featuresMapped?.whatsapp_notifications ?? false,
                whatsapp_otp: featuresMapped?.whatsapp_otp ?? false,
                whatsapp_reminders: featuresMapped?.whatsapp_reminders ?? false,
                whatsapp_campaigns: featuresMapped?.whatsapp_campaigns ?? false,
                // Branding
                remove_zenda_branding: featuresMapped?.remove_zenda_branding ?? false,
                custom_colors: featuresMapped?.custom_colors ?? false,
                custom_logo: featuresMapped?.custom_logo ?? false,
                custom_phrases: featuresMapped?.custom_phrases ?? false,
                // Otros
                analytics: featuresMapped?.analytics ?? false,
                automation: featuresMapped?.automation ?? false,
                citas_activacion: featuresMapped?.citas_activacion ?? 1,
            });
        }
    }, [plan, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = plan
                ? `/api/superadmin/planes/${plan.id}`
                : "/api/superadmin/planes";

            const method = plan ? "PATCH" : "POST";

            const payload = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price.toString()),
                trial_days: parseInt(formData.trial_days.toString()),
                max_fields: parseInt(formData.max_fields.toString()),
                maxStaff: parseInt(formData.maxStaff.toString()),
                max_reservations_per_month: parseInt(formData.max_reservations_per_month.toString()),
                tournaments_enabled: formData.tournaments_enabled,
                automatic_discounts_enabled: formData.automatic_discounts_enabled,
                courses_module: formData.courses_module,
                max_locations: parseInt(formData.max_locations.toString()),
                is_recommended: formData.is_recommended,
                activo: formData.activo,
                features: {
                    whatsapp_notifications: formData.whatsapp_notifications,
                    whatsapp_otp: formData.whatsapp_otp,
                    whatsapp_reminders: formData.whatsapp_reminders,
                    whatsapp_campaigns: formData.whatsapp_campaigns,
                    remove_zenda_branding: formData.remove_zenda_branding,
                    custom_colors: formData.custom_colors,
                    custom_logo: formData.custom_logo,
                    custom_phrases: formData.custom_phrases,
                    analytics: formData.analytics,
                    automation: formData.automation,
                    citas_activacion: parseInt(formData.citas_activacion?.toString() || "1"),
                }
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.refresh();
                onClose();
            } else {
                const data = await res.json();
                let errorMessage = data.error || "Error al procesar la solicitud";

                if (data.details) errorMessage += `\n\nDetalles: ${data.details}`;
                if (data.stack) errorMessage += `\n\nStack: ${data.stack}`;
                if (data.prismaCode) errorMessage += `\nCódigo: ${data.prismaCode}`;
                if (data.prismaMeta) errorMessage += `\nMeta: ${JSON.stringify(data.prismaMeta)}`;

                alert(errorMessage);
            }
        } catch (error) {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Package size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {plan ? "Editar Plan" : "Nuevo Plan de Suscripción"}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Información Básica */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 pb-2" style={{ color: '#000' }}>Información Básica</h4>

                            <div className="space-y-2">
                                <label className="text-sm font-black ml-1" style={{ color: '#000' }}>Nombre del Plan</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ej: Plan Pro, Plan Básico..."
                                    style={{ color: '#000', backgroundColor: '#fff' }}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-black placeholder:text-slate-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-black ml-1 flex items-center gap-2" style={{ color: '#000' }}>
                                    <FileText size={14} className="text-slate-900" />
                                    Descripción
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Resume los beneficios de este plan..."
                                    style={{ color: '#000', backgroundColor: '#fff' }}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold resize-none placeholder:text-slate-500"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-black ml-1" style={{ color: '#000' }}>Precio ($)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        style={{ color: '#4338ca', backgroundColor: '#fff' }}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black ml-1 flex items-center gap-2" style={{ color: '#000' }}>
                                        <Clock size={14} className="text-amber-700" />
                                        Días Trial
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        style={{ color: '#000', backgroundColor: '#fff' }}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                        value={formData.trial_days}
                                        onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black ml-1 flex items-center gap-2" style={{ color: '#000' }} title="Número de citas para empezar a correr la suscripción">
                                        <Star size={14} className="text-indigo-600" />
                                        Citas Inic.
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        style={{ color: '#000', backgroundColor: '#fff' }}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                        value={formData.citas_activacion}
                                        onChange={(e) => setFormData({ ...formData, citas_activacion: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Control de WhatsApp */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#000' }}>
                                    <MessageCircle size={16} className="text-indigo-600" />
                                    Control de WhatsApp
                                </h4>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <MessageCircle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Notificaciones de Citas</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Confirmaciones automáticas</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.whatsapp_notifications}
                                            onChange={(e) => setFormData({ ...formData, whatsapp_notifications: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Recordatorios de Citas</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Recordatorio previo a la cita</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.whatsapp_reminders}
                                            onChange={(e) => setFormData({ ...formData, whatsapp_reminders: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Códigos OTP</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Validación por WhatsApp</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.whatsapp_otp}
                                            onChange={(e) => setFormData({ ...formData, whatsapp_otp: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Tags size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Campañas de Marketing</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Mensajes masivos/promociones</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.whatsapp_campaigns}
                                            onChange={(e) => setFormData({ ...formData, whatsapp_campaigns: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Límites y Características */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-widest border-b border-slate-200 pb-2" style={{ color: '#000' }}>Límites y Módulos</h4>

                            <div className="space-y-2">
                                <label className="text-sm font-black flex items-center gap-2 ml-1" style={{ color: '#000' }}>
                                    <Zap size={14} className="text-amber-700" />
                                    Citas Mensuales
                                </label>
                                <input
                                    type="number"
                                    style={{ color: '#000', backgroundColor: '#fff' }}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                    value={formData.max_reservations_per_month}
                                    onChange={(e) => setFormData({ ...formData, max_reservations_per_month: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-black flex items-center gap-1.5 ml-1" style={{ color: '#000' }}>
                                        <Users size={14} className="text-indigo-800" />
                                        Máx. Especialistas
                                    </label>
                                    <input
                                        type="number"
                                        style={{ color: '#000', backgroundColor: '#fff' }}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                        value={formData.maxStaff}
                                        onChange={(e) => setFormData({ ...formData, maxStaff: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black flex items-center gap-1.5 ml-1" style={{ color: '#000' }}>
                                        <MapPin size={14} className="text-emerald-800" />
                                        Máx. Sucursales
                                    </label>
                                    <input
                                        type="number"
                                        style={{ color: '#000', backgroundColor: '#fff' }}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                        value={formData.max_locations}
                                        onChange={(e) => setFormData({ ...formData, max_locations: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black flex items-center gap-1.5 ml-1" style={{ color: '#000' }}>
                                        <Package size={14} className="text-pink-800" />
                                        Máx. Servicios
                                    </label>
                                    <input
                                        type="number"
                                        style={{ color: '#000', backgroundColor: '#fff' }}
                                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-black"
                                        value={formData.max_fields}
                                        onChange={(e) => setFormData({ ...formData, max_fields: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 mt-2 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                                        <Star size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black" style={{ color: '#000' }}>Portafolio de Trabajos</p>
                                        <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>¿Habilitar galería antes/después?</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.tournaments_enabled}
                                        onChange={(e) => setFormData({ ...formData, tournaments_enabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-800 rounded-lg">
                                        <Tags size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black" style={{ color: '#000' }}>Módulo de Promociones</p>
                                        <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>¿HABILITAR MÓDULO DE PROMOCIONES?</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.automatic_discounts_enabled}
                                        onChange={(e) => setFormData({ ...formData, automatic_discounts_enabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black" style={{ color: '#000' }}>Academia y Talleres</p>
                                        <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>¿Habilitar inscripciones a cursos?</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.courses_module}
                                        onChange={(e) => setFormData({ ...formData, courses_module: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border-2 border-indigo-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
                                        <Star size={18} fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black" style={{ color: '#000' }}>Recomendado</p>
                                        <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e1b4b' }}>¿Destacar en la landing page?</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.is_recommended}
                                        onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-indigo-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Branding y Marca */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#000' }}>
                                    <Palette size={16} className="text-indigo-600" />
                                    Branding y Marca
                                </h4>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Star size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Quitar Marca CitiOx</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Remover marca "Powered by CitiOx"</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.remove_zenda_branding}
                                            onChange={(e) => setFormData({ ...formData, remove_zenda_branding: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Palette size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Colores Personalizados</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Personalizar colores de la app</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.custom_colors}
                                            onChange={(e) => setFormData({ ...formData, custom_colors: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Package size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Logo Personalizado</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Usar logotipo propio en el portal</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.custom_logo}
                                            onChange={(e) => setFormData({ ...formData, custom_logo: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Frases Personalizadas</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Editar frases y mensajes del portal</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.custom_phrases}
                                            onChange={(e) => setFormData({ ...formData, custom_phrases: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Reportes y Analíticas</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Reportes avanzados de uso</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.analytics}
                                            onChange={(e) => setFormData({ ...formData, analytics: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black" style={{ color: '#000' }}>Automatizaciones</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: '#1e293b' }}>Campañas automáticas y seguimientos</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.automation}
                                            onChange={(e) => setFormData({ ...formData, automation: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            type="submit"
                            className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Save size={20} />
                            )}
                            {plan ? "Guardar Cambios" : "Crear Plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
