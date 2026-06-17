"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
    X, Loader2, Save, Building2, Mail, Lock, Phone, MapPin, 
    Clock, Globe, Image as ImageIcon, DollarSign, Zap, 
    ShieldCheck, Check, Sparkles, Plus, Trash2, Copy, ExternalLink, 
    ArrowRight, ArrowLeft, Eye, Award, Smartphone
} from "lucide-react";
import { useRouter } from "next/navigation";
import PhoneInput from "../ui/PhoneInput";
import ImageUploader from "../ui/ImageUploader";
import { clsx } from "clsx";

interface NegocioModalProps {
    isOpen: boolean;
    onClose: () => void;
    negocio?: any; // Si existe, es edición
}

// Plantillas de servicios según tipo de negocio
const PLANTILLAS_SERVICIOS: Record<string, Array<{ nombre: string; duracion: number; precio: number }>> = {
    "Spa / Centro Estético": [
        { nombre: "Limpieza Facial Profunda", duracion: 60, precio: 45 },
        { nombre: "Masaje Relajante Corporal", duracion: 60, precio: 50 },
        { nombre: "Hidratación Facial con Colágeno", duracion: 45, precio: 35 }
    ],
    "Barbería": [
        { nombre: "Corte Clásico de Cabello", duracion: 30, precio: 15 },
        { nombre: "Corte + Afeitado de Barba", duracion: 50, precio: 25 },
        { nombre: "Perfilado y Diseño de Barba", duracion: 20, precio: 10 }
    ],
    "Salón de Belleza": [
        { nombre: "Corte de Dama y Estilo", duracion: 45, precio: 30 },
        { nombre: "Tinte Completo e Hidratación", duracion: 90, precio: 65 },
        { nombre: "Lavado y Secado Profesional", duracion: 30, precio: 20 }
    ],
    "Centro de Uñas": [
        { nombre: "Manicura Express con Gel", duracion: 40, precio: 18 },
        { nombre: "Pedicura Spa Exfoliante", duracion: 60, precio: 28 },
        { nombre: "Uñas Acrílicas Esculpidas", duracion: 90, precio: 45 }
    ],
    "Centro de Masajes": [
        { nombre: "Masaje Descontracturante", duracion: 60, precio: 55 },
        { nombre: "Masaje de Piedras Calientes", duracion: 75, precio: 70 },
        { nombre: "Masaje Tejido Profundo", duracion: 60, precio: 60 }
    ],
    "Odontología": [
        { nombre: "Limpieza Dental Profiláctica", duracion: 45, precio: 35 },
        { nombre: "Consulta Odontológica General", duracion: 30, precio: 20 },
        { nombre: "Blanqueamiento Dental", duracion: 60, precio: 120 }
    ],
    "Psicología": [
        { nombre: "Consulta Individual", duracion: 50, precio: 40 },
        { nombre: "Terapia de Pareja", duracion: 75, precio: 60 }
    ],
    "Fisioterapia": [
        { nombre: "Evaluación Fisioterapéutica", duracion: 45, precio: 30 },
        { nombre: "Sesión de Rehabilitación Física", duracion: 60, precio: 40 }
    ],
    "Clínica": [
        { nombre: "Consulta Médica General", duracion: 20, precio: 25 },
        { nombre: "Chequeo Preventivo Integral", duracion: 40, precio: 60 },
        { nombre: "Control de Especialidad", duracion: 30, precio: 35 }
    ],
    "Consultorio Médico": [
        { nombre: "Consulta Médica General", duracion: 20, precio: 25 },
        { nombre: "Control y Seguimiento", duracion: 30, precio: 20 }
    ],
    "Nutrición": [
        { nombre: "Evaluación Corporal y Dieta", duracion: 45, precio: 35 },
        { nombre: "Control Nutricional Quincenal", duracion: 30, precio: 20 }
    ],
    "Academia": [
        { nombre: "Clase Introductoria Práctica", duracion: 60, precio: 15 },
        { nombre: "Evaluación y Nivelación", duracion: 45, precio: 20 }
    ]
};

const CATEGORIAS_NEGOCIO = [
    "Spa / Centro Estético",
    "Barbería",
    "Salón de Belleza",
    "Centro de Uñas",
    "Centro de Masajes",
    "Clínica",
    "Consultorio Médico",
    "Odontología",
    "Psicología",
    "Nutrición",
    "Fisioterapia",
    "Academia",
    "Otro"
];

const PRESETS_COLOR_PRINCIPAL = [
    { name: "Emerald (Zenda)", hex: "#1dc95c" },
    { name: "Violeta Premium", hex: "#7C3AED" },
    { name: "Azul Real", hex: "#2563EB" },
    { name: "Rosa Cita", hex: "#EC4899" },
    { name: "Terracota", hex: "#D97706" },
    { name: "Dark Onyx", hex: "#1E293B" }
];

const PRESETS_COLOR_SECUNDARIO = [
    { name: "Hojas Oscuro", hex: "#112117" },
    { name: "Berenjena Oscuro", hex: "#1a102f" },
    { name: "Océano Profundo", hex: "#0b1528" },
    { name: "Medianoche", hex: "#020617" },
    { name: "Gris Carbón", hex: "#1e1e24" }
];

export default function NegocioModal({ isOpen, onClose, negocio }: NegocioModalProps) {
    const router = useRouter();
    const isEdit = !!negocio;
    
    // Estados generales
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [planes, setPlanes] = useState<any[]>([]);

    // Estados para navegación del Wizard
    const [creationMode, setCreationMode] = useState<"none" | "fast" | "assisted">("none");
    const [step, setStep] = useState(1);
    
    // Estado final de éxito
    const [creadoExitosamente, setCreadoExitosamente] = useState(false);
    const [negocioCreadoInfo, setNegocioCreadoInfo] = useState<any>(null);

    // Formulario unificado
    const [formData, setFormData] = useState({
        // Info Básica
        nombre: "",
        slug: "",
        whatsapp: "",
        propietario: "",
        emailContacto: "",
        direccion: "",
        ciudad: "",
        horarioApertura: "08:00",
        horarioCierre: "22:00",
        precioHora: "0",
        estado: "ACTIVO",
        plan_id: "",
        plan_status: "trial",

        // Admin
        adminEmail: "",
        adminPassword: "",
        adminNombre: "",

        // Branding
        tipoNegocio: "Spa / Centro Estético",
        logoUrl: "",
        bannerUrl: "",
        colorPrimario: "#1dc95c",
        colorSecundario: "#112117",
        heroTitulo: "",
        heroSubtitulo: "",
        moduloTorneos: false, // Portafolio de trabajos
        
        // Demo
        crearDemo: false
    });

    // Estado local para los servicios del wizard
    const [wizardServicios, setWizardServicios] = useState<Array<{ id: string; nombre: string; duracion: number; precio: number; imageUrl?: string; imageMediaId?: string | null }>>([]);
    const [newServicio, setNewServicio] = useState({ nombre: "", duracion: 30, precio: 0 });

    // Estado local para los profesionales del wizard
    const [wizardStaff, setWizardStaff] = useState<Array<{ id: string; name: string; role: string; servicesIds: string[] }>>([]);
    const [newStaff, setNewStaff] = useState({ name: "", role: "", servicesIds: [] as string[] });

    // Horarios de atención Lunes a Domingo por defecto L-S activos
    const [diasAtencion, setDiasAtencion] = useState<Record<number, boolean>>({
        1: true, // Lunes
        2: true, // Martes
        3: true, // Miércoles
        4: true, // Jueves
        5: true, // Viernes
        6: true, // Sábado
        0: false // Domingo (o 7)
    });

    useEffect(() => {
        setMounted(true);
        const fetchPlanes = async () => {
            try {
                const res = await fetch("/api/superadmin/planes");
                if (res.ok) {
                    const data = await res.json();
                    setPlanes(data);
                }
            } catch (err) {
                console.error("Error fetching planes:", err);
            }
        };
        fetchPlanes();
    }, []);

    // Reiniciar estados al abrir/cerrar
    useEffect(() => {
        if (negocio) {
            setFormData({
                nombre: negocio.nombre || "",
                slug: negocio.slug || "",
                whatsapp: negocio.whatsapp || "",
                direccion: negocio.direccion || "",
                ciudad: negocio.ciudad || "",
                propietario: negocio.propietario || "",
                emailContacto: negocio.emailContacto || "",
                horarioApertura: negocio.horarioApertura || "08:00",
                horarioCierre: negocio.horarioCierre || "22:00",
                precioHora: negocio.precioHora?.toString() || "0",
                estado: negocio.estado || "ACTIVO",
                logoUrl: negocio.logoUrl || "",
                moduloTorneos: negocio.moduloTorneos || false,
                adminEmail: "",
                adminPassword: "",
                adminNombre: "",
                plan_id: negocio.suscripcion?.planId || "",
                plan_status: negocio.suscripcion?.estado || "trial",
                tipoNegocio: negocio.configuracion?.tipoNegocio || "Spa / Centro Estético",
                colorPrimario: negocio.colorPrimario || "#1dc95c",
                colorSecundario: negocio.colorSecundario || "#112117",
                heroTitulo: negocio.heroTitulo || "",
                heroSubtitulo: negocio.heroSubtitulo || "",
                bannerUrl: negocio.Imagen?.find((i: any) => i.esBanner)?.url || "",
                crearDemo: false
            });
            setCreationMode("none");
            setCreadoExitosamente(false);
        } else {
            setFormData({
                nombre: "",
                slug: "",
                whatsapp: "",
                direccion: "",
                ciudad: "",
                propietario: "",
                emailContacto: "",
                horarioApertura: "08:00",
                horarioCierre: "22:00",
                precioHora: "0",
                estado: "ACTIVO",
                logoUrl: "",
                moduloTorneos: false,
                adminEmail: "",
                adminPassword: "",
                adminNombre: "",
                plan_id: "",
                plan_status: "trial",
                tipoNegocio: "Spa / Centro Estético",
                colorPrimario: "#1dc95c",
                colorSecundario: "#112117",
                heroTitulo: "",
                heroSubtitulo: "",
                bannerUrl: "",
                crearDemo: false
            });
            setWizardServicios([]);
            setWizardStaff([]);
            setDiasAtencion({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 0: false });
            setStep(1);
            setCreationMode("none");
            setCreadoExitosamente(false);
            setNegocioCreadoInfo(null);
        }
        setError(null);
    }, [negocio, isOpen]);

    // Autogenerar slug y frase principal al escribir nombre del negocio
    const handleNombreChange = (val: string) => {
        const generatedSlug = val.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
        
        setFormData(prev => ({
            ...prev,
            nombre: val,
            slug: generatedSlug,
            heroTitulo: prev.heroTitulo === "" || prev.heroTitulo === `Bienvenido a ${prev.nombre}` 
                ? `Bienvenido a ${val}` 
                : prev.heroTitulo,
            heroSubtitulo: prev.heroSubtitulo === "" 
                ? "Reserva tu cita de forma online en sencillos pasos." 
                : prev.heroSubtitulo
        }));
    };

    // Generar contraseña segura
    const handleGenerarPassword = () => {
        const num = Math.floor(1000 + Math.random() * 9000).toString();
        const pwd = `Zenda${num}`;
        setFormData(prev => ({ ...prev, adminPassword: pwd }));
    };

    // Precargar servicios cuando se cambia la categoría en el Paso 1
    const handleCategoriaChange = (cat: string) => {
        setFormData(prev => ({ ...prev, tipoNegocio: cat }));
        // Cargar los servicios por defecto de la plantilla
        const defaults = PLANTILLAS_SERVICIOS[cat] || [];
        setWizardServicios(defaults.map(d => ({
            id: crypto.randomUUID(),
            nombre: d.nombre,
            duracion: d.duracion,
            precio: d.precio
        })));
    };

    if (!isOpen || !mounted) return null;

    // Agregar servicio propio
    const handleAddServicioManual = () => {
        if (!newServicio.nombre.trim()) return;
        setWizardServicios(prev => [
            ...prev, 
            { 
                id: crypto.randomUUID(), 
                nombre: newServicio.nombre, 
                duracion: newServicio.duracion, 
                precio: newServicio.precio 
            }
        ]);
        setNewServicio({ nombre: "", duracion: 30, precio: 0 });
    };

    // Eliminar servicio de la lista local
    const handleRemoveServicio = (id: string) => {
        setWizardServicios(prev => prev.filter(s => s.id !== id));
        // Limpiar de los profesionales si estaba asociado
        setWizardStaff(prev => prev.map(st => ({
            ...st,
            servicesIds: st.servicesIds.filter(sid => sid !== id)
        })));
    };

    // Agregar profesional
    const handleAddStaffManual = () => {
        if (!newStaff.name.trim()) return;
        setWizardStaff(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: newStaff.name,
                role: newStaff.role || "Especialista",
                servicesIds: newStaff.servicesIds
            }
        ]);
        setNewStaff({ name: "", role: "", servicesIds: [] });
    };

    // Eliminar profesional de la lista local
    const handleRemoveStaff = (id: string) => {
        setWizardStaff(prev => prev.filter(s => s.id !== id));
    };

    // Alternar servicio en nuevo profesional
    const toggleServiceInStaff = (serviceId: string) => {
        setNewStaff(prev => {
            const exists = prev.servicesIds.includes(serviceId);
            return {
                ...prev,
                servicesIds: exists 
                    ? prev.servicesIds.filter(id => id !== serviceId)
                    : [...prev.servicesIds, serviceId]
            };
        });
    };

    // Enviar el formulario (Guardado final)
    const handleSaveSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = isEdit
                ? `/api/superadmin/negocios/${negocio.id}`
                : "/api/superadmin/negocios";

            const diasAtencionArray = Object.keys(diasAtencion)
                .map(Number)
                .filter(day => diasAtencion[day]);

            const payload = isEdit ? formData : {
                ...formData,
                diasAtencion: diasAtencionArray,
                servicios: wizardServicios,
                profesionales: wizardStaff
            };

            const res = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok) {
                if (isEdit) {
                    router.refresh();
                    onClose();
                } else {
                    // Mostrar pantalla final de éxito
                    setNegocioCreadoInfo(data);
                    setCreadoExitosamente(true);
                }
            } else {
                setError(data.error || "Algo salió mal al procesar los datos");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    // Copiar al portapapeles
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copiado al portapapeles.`);
    };

    // ==========================================
    // RENDER: PANTALLA EXITO COMERCIAL
    // ==========================================
    if (creadoExitosamente && negocioCreadoInfo) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const publicLink = `${appUrl}/${negocioCreadoInfo.slug}`;
        const adminLink = `${appUrl}/login`;
        const vencimientoTrial = new Date();
        vencimientoTrial.setDate(vencimientoTrial.getDate() + 14);

        const waMessageText = `👋 ¡Hola! Te compartimos los datos de tu nuevo sistema en Zenda para *${negocioCreadoInfo.nombre}*:\n\n🌐 *Página pública para tus clientes:* \n${publicLink}\n\n💻 *Acceso a tu panel administrativo:* \n${adminLink}\n\n🔐 *Credenciales de acceso:*\n- *Usuario:* ${formData.adminEmail || formData.emailContacto}\n- *Contraseña:* ${formData.adminPassword}\n\n⚡ *Plan asignado:* Plan PRO Trial (14 días gratis hasta el ${vencimientoTrial.toLocaleDateString()}).`;

        return createPortal(
            <div className="fixed inset-0 z-[999999] bg-[#080d0b] text-white overflow-y-auto">
                <div className="min-h-full flex items-center justify-center p-4 py-8">
                <div className="max-w-2xl w-full bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] p-8 md:p-12 space-y-8 relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
                    <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_20px_40px_rgba(16,185,129,0.1)] animate-bounce">
                            <Award size={40} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] italic">¡Listo para despegar!</span>
                            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic text-white leading-none">Negocio Creado</h2>
                        </div>
                        <p className="text-slate-400 text-sm max-w-md mx-auto">
                            Zenda ha configurado el branding, los servicios, los horarios y las credenciales. La plataforma está operativa para recibir citas en vivo.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Ficha Negocio */}
                        <div className="p-6 bg-slate-950/40 border border-white/5 rounded-[2.5rem] grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Nombre Comercial</span>
                                <span className="text-base font-black text-white uppercase italic">{negocioCreadoInfo.nombre}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Plan Actual</span>
                                <span className="text-sm font-black text-emerald-400 uppercase flex items-center gap-1.5 mt-0.5">
                                    <Zap size={14} className="fill-emerald-400" /> Plan PRO (Trial 14 días)
                                </span>
                                <span className="block text-[9px] text-slate-500 font-bold mt-0.5">Vence: {vencimientoTrial.toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Enlaces y Acceso */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic px-1">Enlaces de Acceso</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-4 bg-slate-950/20 border border-white/5 rounded-2xl">
                                    <div>
                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Página Pública</span>
                                        <span className="text-xs font-bold text-slate-300 break-all select-all">{publicLink}</span>
                                    </div>
                                    <button onClick={() => copyToClipboard(publicLink, "Enlace público")} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-950/20 border border-white/5 rounded-2xl">
                                    <div>
                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Panel de Control</span>
                                        <span className="text-xs font-bold text-slate-300 break-all select-all">{adminLink}</span>
                                    </div>
                                    <button onClick={() => copyToClipboard(adminLink, "Enlace del panel")} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all">
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Credenciales de Acceso */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic px-1">Credenciales Administrador</h4>
                            <div className="p-6 bg-slate-950/60 border border-white/5 rounded-[2.5rem] space-y-3 relative">
                                <button 
                                    onClick={() => copyToClipboard(`Usuario: ${formData.adminEmail || formData.emailContacto}\nContraseña: ${formData.adminPassword}`, "Credenciales")} 
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                                >
                                    <Copy size={18} />
                                </button>
                                <div>
                                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Correo de Acceso</span>
                                    <span className="text-sm font-bold text-white select-all">{formData.adminEmail || formData.emailContacto}</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Contraseña Temporal</span>
                                    <span className="text-sm font-black text-emerald-400 select-all tracking-wider font-mono">{formData.adminPassword}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Footer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                        <a 
                            href={publicLink} 
                            target="_blank" 
                            className="flex items-center justify-center gap-2 py-4 bg-slate-800 border border-white/5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all"
                        >
                            <ExternalLink size={14} /> Abrir Landing Pública
                        </a>
                        <a 
                            href={adminLink} 
                            target="_blank" 
                            className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Smartphone size={14} /> Abrir Panel Admin
                        </a>
                        <a 
                            href={`https://api.whatsapp.com/send?phone=${formData.whatsapp.replace(/\D/g, "")}&text=${encodeURIComponent(waMessageText)}`}
                            target="_blank"
                            className="md:col-span-2 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20"
                        >
                            <MessageSquareIcon size={14} /> Enviar datos por WhatsApp
                        </a>
                        <button 
                            onClick={() => {
                                router.refresh();
                                onClose();
                            }} 
                            className="md:col-span-2 py-3 bg-transparent text-slate-500 hover:text-slate-400 rounded-xl font-bold text-xs uppercase transition-all"
                        >
                            Volver al Listado de Negocios
                        </button>
                    </div>
                </div>
                </div>
            </div>,
            document.body
        );
    }

    // ==========================================
    // RENDER: EDICIÓN TRADICIONAL
    // ==========================================
    if (isEdit) {
        return createPortal(
            <div className="fixed inset-0 z-[999999] bg-white dark:bg-[#0d1511] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
                <div className="relative p-5 lg:p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20 shrink-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-6 bg-emerald-500 rounded-full" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic leading-none">Management</span>
                            </div>
                            <h3 className="text-xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                Editar <span className="text-emerald-500">Negocio</span>
                            </h3>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="size-11 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90 group"
                        >
                            <X strokeWidth={3} className="size-5 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>

                <form 
                    id="negocio-form-edit" 
                    onSubmit={handleSaveSubmit} 
                    className="flex-1 overflow-y-auto px-5 lg:px-20 py-8 space-y-8 bg-white dark:bg-[#0d1511] custom-scrollbar min-h-0"
                >
                    {error && (
                        <div className="max-w-4xl mx-auto p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-500 text-xs font-black uppercase tracking-widest flex items-center gap-4 italic animate-in slide-in-from-top-4">
                            <Zap size={20} fill="currentColor" />
                            {error}
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto space-y-10">
                        <SectionTitle icon={Building2} title="Información General" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Nombre del Negocio"
                                icon={Building2}
                                required
                                placeholder="Ej: Spa Belleza Real"
                                value={formData.nombre}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                            />
                            <InputField
                                label="Nombre en URL (slug)"
                                icon={Globe}
                                required
                                placeholder="ej: spa-belleza"
                                value={formData.slug}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                            />
                            <InputField
                                label="Propietario / Responsable"
                                icon={ShieldCheck}
                                placeholder="Ej: Juan Pérez"
                                value={formData.propietario}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, propietario: e.target.value }))}
                            />
                            <InputField
                                label="Email de Contacto"
                                icon={Mail}
                                type="email"
                                placeholder="ejemplo@negocio.com"
                                value={formData.emailContacto}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, emailContacto: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PhoneInput
                                label="WhatsApp de Contacto"
                                value={formData.whatsapp}
                                onChange={(val) => setFormData(prev => ({ ...prev, whatsapp: val }))}
                                placeholder="Ej: 9XXXXXXXX"
                            />
                            <InputField
                                label="Precio Base ($/hora)"
                                icon={DollarSign}
                                type="number"
                                value={formData.precioHora}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, precioHora: e.target.value }))}
                            />
                        </div>

                        <SectionTitle icon={MapPin} title="Ubicación y Visual" color="blue" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField
                                label="Dirección del Centro"
                                icon={MapPin}
                                placeholder="Av. Siempre Viva 123"
                                value={formData.direccion}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                            />
                            <InputField
                                label="Ciudad"
                                icon={MapPin}
                                placeholder="Ej: Buenos Aires"
                                value={formData.ciudad}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, ciudad: e.target.value }))}
                            />
                        </div>
                        <InputField
                            label="URL del Logo (Opcional)"
                            icon={ImageIcon}
                            placeholder="https://ejemplo.com/logo.png"
                            value={formData.logoUrl}
                            onChange={(e: any) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                        />

                        <SectionTitle icon={Clock} title="Configuración de Horarios" color="amber" />
                        <div className="grid grid-cols-2 gap-6">
                            <InputField
                                label="Hora Apertura"
                                icon={Clock}
                                type="time"
                                value={formData.horarioApertura}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, horarioApertura: e.target.value }))}
                            />
                            <InputField
                                label="Hora Cierre"
                                icon={Clock}
                                type="time"
                                value={formData.horarioCierre}
                                onChange={(e: any) => setFormData(prev => ({ ...prev, horarioCierre: e.target.value }))}
                            />
                        </div>

                        <SectionTitle icon={Zap} title="Suscripción y Estado" color="emerald" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Estado del Negocio</label>
                                <select
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border border-transparent rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white shadow-inner dark:shadow-none appearance-none italic"
                                    value={formData.estado}
                                    onChange={e => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                                >
                                    <option value="ACTIVO" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>ACTIVO (Público)</option>
                                    <option value="SUSPENDIDO" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>SUSPENDIDO (No accesible)</option>
                                    <option value="TESTING" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>MODO PRUEBA (Interno)</option>
                                </select>
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-1 ml-1">Estado Suscripción</label>
                                <select
                                    className="w-full px-6 py-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-800 text-sm font-bold text-amber-700 dark:text-amber-400 appearance-none italic"
                                    value={formData.plan_status}
                                    onChange={e => setFormData(prev => ({ ...prev, plan_status: e.target.value }))}
                                >
                                    <option value="trial" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>PERIODO DE PRUEBA</option>
                                    <option value="active" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>ACTIVO / PAGADO</option>
                                    <option value="expired" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>EXPIRADO / CANCELADO</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-1 ml-1">Plan de Suscripción</label>
                                <select
                                    className="w-full px-6 py-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-800 text-sm font-bold text-emerald-700 dark:text-amber-400 appearance-none italic"
                                    value={formData.plan_id}
                                    onChange={e => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
                                >
                                    <option value="" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>Sin Plan Asignado</option>
                                    {planes.map(p => (
                                        <option key={p.id} value={p.id} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>{p.name} (${p.price}/mes)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="p-6 lg:px-20 lg:py-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row gap-4 bg-slate-50 dark:bg-slate-950/40 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-8 py-5 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] border border-slate-100 dark:border-white/5 transition-all italic active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        form="negocio-form-edit"
                        type="submit"
                        disabled={loading}
                        className="flex-[2] flex items-center justify-center gap-3 bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-700 transition shadow-[0_20px_40px_rgba(16,185,129,0.3)] disabled:opacity-50 active:scale-95 italic"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <Save size={20} strokeWidth={3} />}
                        Guardar Cambios
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    // ==========================================
    // RENDER: PANTALLA SELECCIÓN DE MODO
    // ==========================================
    if (creationMode === "none") {
        return createPortal(
            <div className="fixed inset-0 z-[999999] bg-[#050b08] text-white flex flex-col items-center justify-center p-4">
                <div className="max-w-3xl w-full bg-slate-950/80 border border-white/5 rounded-[3.5rem] p-8 md:p-14 space-y-12 relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
                    {/* Ambient Glow */}
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 size-10 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all group"
                    >
                        <X size={18} className="group-hover:rotate-90 transition-transform" />
                    </button>

                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="h-1.5 w-8 bg-emerald-500 rounded-full" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] italic">Zenda Superadmin</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic leading-none text-white">Nuevo Negocio</h2>
                        <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
                            Elige el método de creación de negocio. La configuración asistida dejará el sistema pre-configurado y listo para demostraciones inmediatamente.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Creación Rápida */}
                        <div 
                            onClick={() => setCreationMode("fast")}
                            className="p-8 bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 hover:border-emerald-500/20 rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden flex flex-col justify-between min-h-[220px]"
                        >
                            <div className="space-y-4">
                                <div className="w-12 h-12 bg-white/5 text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 rounded-2xl flex items-center justify-center transition-all">
                                    <Building2 size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase tracking-tight italic group-hover:text-emerald-400 transition-colors">Creación Rápida</h3>
                                    <p className="text-xs text-slate-400 leading-relaxed">Solo nombre, teléfono y propietario. Ideal para altas rápidas de uso inmediato.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest mt-6">
                                Comenzar <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        {/* Configuración Asistida */}
                        <div 
                            onClick={() => {
                                setCreationMode("assisted");
                                handleCategoriaChange("Spa / Centro Estético"); // Cargar plantilla inicial
                            }}
                            className="p-8 bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] hover:from-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-[0_15px_30px_rgba(16,185,129,0.05)]"
                        >
                            <div className="absolute top-4 right-4">
                                <span className="px-2 py-0.5 bg-emerald-500 text-black font-black text-[8px] tracking-widest uppercase rounded">Recomendado</span>
                            </div>
                            <div className="space-y-4">
                                <div className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Sparkles size={24} fill="black" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase tracking-tight italic text-emerald-400 group-hover:text-emerald-300">Configuración Asistida</h3>
                                    <p className="text-xs text-slate-300 leading-relaxed">Configura branding, colores corporativos, horarios comerciales, servicios predefinidos y profesionales.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 group-hover:text-white uppercase tracking-widest mt-6">
                                Abrir Wizard Setup <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // ==========================================
    // RENDER: CREACIÓN RÁPIDA (MODO FAST)
    // ==========================================
    if (creationMode === "fast") {
        return createPortal(
            <div className="fixed inset-0 z-[999999] bg-white dark:bg-[#0d1511] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between">
                    <div>
                        <button 
                            onClick={() => setCreationMode("none")} 
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline mb-1"
                        >
                            <ArrowLeft size={12} /> Volver a opciones
                        </button>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">Creación Rápida</h3>
                    </div>
                    <button onClick={onClose} className="size-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto px-6 py-8 max-w-3xl mx-auto w-full space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-3">
                            <Zap size={16} /> {error}
                        </div>
                    )}

                    <InputField 
                        label="Nombre del Negocio" 
                        icon={Building2} 
                        required 
                        placeholder="Ej: Barbería Vintage" 
                        value={formData.nombre} 
                        onChange={(e: any) => handleNombreChange(e.target.value)} 
                    />
                    
                    <InputField 
                        label="Slug de URL" 
                        icon={Globe} 
                        required 
                        placeholder="ej: barberia-vintage" 
                        value={formData.slug} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} 
                    />

                    <PhoneInput 
                        label="WhatsApp de Contacto" 
                        value={formData.whatsapp} 
                        onChange={(val) => setFormData(prev => ({ ...prev, whatsapp: val }))} 
                        placeholder="Ej: 9XXXXXXXX" 
                    />

                    <InputField 
                        label="Propietario / Responsable" 
                        icon={ShieldCheck} 
                        required
                        placeholder="Ej: Alejandro Magno" 
                        value={formData.propietario} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, propietario: e.target.value, adminNombre: e.target.value }))} 
                    />

                    <InputField 
                        label="Email del Administrador" 
                        icon={Mail} 
                        type="email" 
                        required 
                        placeholder="ejemplo@negocio.com" 
                        value={formData.adminEmail} 
                        onChange={(e: any) => setFormData(prev => ({ ...prev, adminEmail: e.target.value, emailContacto: e.target.value }))} 
                    />

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Contraseña Administrador</label>
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ingresa o genera una contraseña"
                                    value={formData.adminPassword}
                                    onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                                    className="w-full !pl-16 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl outline-none font-bold text-sm text-slate-900 dark:text-white"
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={handleGenerarPassword} 
                                className="px-5 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-white transition-all active:scale-95"
                            >
                                Generar
                            </button>
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 dark:border-white/5 flex gap-4 bg-slate-50 dark:bg-slate-950/20 shrink-0">
                    <button onClick={() => setCreationMode("none")} className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl font-black text-[10px] uppercase tracking-wider text-slate-400">
                        Atrás
                    </button>
                    <button 
                        onClick={() => handleSaveSubmit()}
                        disabled={loading || !formData.nombre || !formData.adminEmail || !formData.adminPassword} 
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Crear Negocio (PRO Trial)
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    // ==========================================
    // RENDER: CONFIGURACIÓN ASISTIDA (WIZARD)
    // ==========================================
    const totalSteps = 7;
    const progressPercent = Math.min(100, Math.floor((step / totalSteps) * 100));

    return createPortal(
        <div className="fixed inset-0 z-[999999] bg-[#070c09] text-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
            
            {/* Cabecera Wizard Premium */}
            <div className="p-5 lg:p-6 border-b border-white/5 bg-slate-950/40 flex flex-col gap-4 shrink-0 relative">
                <div className="absolute top-0 left-0 h-1 bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black tracking-widest uppercase rounded border border-emerald-500/20">Configuración Asistida</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paso {step} de {totalSteps}</span>
                        </div>
                        <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight italic text-white leading-none mt-1">
                            Creación de <span className="text-emerald-400">Negocio</span>
                        </h3>
                    </div>
                    <button 
                        onClick={() => {
                            if (confirm("¿Estás seguro de salir? Perderás todo el progreso de este asistente.")) {
                                onClose();
                            }
                        }} 
                        className="size-10 bg-white/5 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Layout Principal Wizard */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Lado Izquierdo: Formulario */}
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-20 bg-slate-950/20 custom-scrollbar min-h-0 text-left">
                    <div className="max-w-2xl mx-auto space-y-8">
                        {error && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 animate-pulse">
                                <Zap size={16} /> {error}
                            </div>
                        )}

                        {/* PASO 1: BÁSICOS Y CATEGORÍA */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Información Básica</h3>
                                    <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">Define el perfil comercial e industrial de tu negocio.</p>
                                </div>

                                <InputField 
                                    label="Nombre del Negocio" 
                                    icon={Building2} 
                                    required 
                                    placeholder="Ej: Spa Belleza Celestial" 
                                    value={formData.nombre} 
                                    onChange={(e: any) => handleNombreChange(e.target.value)} 
                                />

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Tipo de Negocio / Especialidad</label>
                                    <select
                                        value={formData.tipoNegocio}
                                        onChange={(e) => handleCategoriaChange(e.target.value)}
                                        className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl outline-none focus:border-emerald-500/30 text-sm font-bold text-white italic"
                                    >
                                        {CATEGORIAS_NEGOCIO.map(cat => (
                                            <option key={cat} value={cat} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>{cat}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-slate-500 font-bold italic ml-1">Esto cargará plantillas de servicios autocompletados.</p>
                                </div>

                                <InputField 
                                    label="Slug de URL (autogenerado)" 
                                    icon={Globe} 
                                    required 
                                    placeholder="ej: spa-belleza-celestial" 
                                    value={formData.slug} 
                                    onChange={(e: any) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} 
                                />

                                <PhoneInput 
                                    label="WhatsApp de Gestión" 
                                    value={formData.whatsapp} 
                                    onChange={(val) => setFormData(prev => ({ ...prev, whatsapp: val }))} 
                                    placeholder="Ej: 9XXXXXXXX" 
                                />

                                <InputField 
                                    label="Nombre del Propietario" 
                                    icon={ShieldCheck} 
                                    required
                                    placeholder="Ej: María José Riquelme" 
                                    value={formData.propietario} 
                                    onChange={(e: any) => setFormData(prev => ({ ...prev, propietario: e.target.value, adminNombre: e.target.value }))} 
                                />

                                <InputField 
                                    label="Email del Propietario / Administrador" 
                                    icon={Mail} 
                                    type="email" 
                                    required 
                                    placeholder="ejemplo@negocio.com" 
                                    value={formData.adminEmail} 
                                    onChange={(e: any) => setFormData(prev => ({ ...prev, adminEmail: e.target.value, emailContacto: e.target.value }))} 
                                />

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Contraseña Administrador</label>
                                    <div className="flex gap-3">
                                        <div className="relative flex-1 group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Crea o autogenera la contraseña"
                                                value={formData.adminPassword}
                                                onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                                                className="w-full !pl-16 pr-5 py-4 bg-slate-900 border border-white/5 rounded-2xl outline-none font-bold text-sm text-white"
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={handleGenerarPassword} 
                                            className="px-5 py-4 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <Sparkles size={12} fill="black" /> Generar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 2: BRANDING */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Branding e Identidad</h3>
                                    <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">Personaliza la visualización de tu marca.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Logo Corporativo (Cuadrado)</span>
                                        <ImageUploader 
                                            category="logo" 
                                            currentUrl={formData.logoUrl} 
                                            onUploadSuccess={(m) => setFormData(prev => ({ ...prev, logoUrl: m.url }))} 
                                            onRemove={() => setFormData(prev => ({ ...prev, logoUrl: "" }))}
                                            aspect="square"
                                            label="Subir Logo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Banner de Portada (Apaisado)</span>
                                        <ImageUploader 
                                            category="banner" 
                                            currentUrl={formData.bannerUrl} 
                                            onUploadSuccess={(m) => setFormData(prev => ({ ...prev, bannerUrl: m.url }))} 
                                            onRemove={() => setFormData(prev => ({ ...prev, bannerUrl: "" }))}
                                            aspect="landscape"
                                            label="Subir Portada"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Color Primario */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Color Principal (Botones/Links)</label>
                                        <div className="flex gap-3">
                                            <input 
                                                type="color" 
                                                value={formData.colorPrimario} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, colorPrimario: e.target.value }))} 
                                                className="w-16 h-12 bg-transparent border-0 outline-none rounded-xl cursor-pointer"
                                            />
                                            <input 
                                                type="text" 
                                                value={formData.colorPrimario} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, colorPrimario: e.target.value }))} 
                                                className="flex-1 px-4 py-3 bg-slate-900 border border-white/5 rounded-xl font-mono text-xs uppercase"
                                            />
                                        </div>
                                        {/* Presets */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {PRESETS_COLOR_PRINCIPAL.map(p => (
                                                <button 
                                                    key={p.hex} 
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, colorPrimario: p.hex }))}
                                                    className="size-6 rounded-full border border-white/10 relative" 
                                                    style={{ backgroundColor: p.hex }}
                                                    title={p.name}
                                                >
                                                    {formData.colorPrimario === p.hex && <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Color Secundario */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Color Secundario (Fondo App)</label>
                                        <div className="flex gap-3">
                                            <input 
                                                type="color" 
                                                value={formData.colorSecundario} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, colorSecundario: e.target.value }))} 
                                                className="w-16 h-12 bg-transparent border-0 outline-none rounded-xl cursor-pointer"
                                            />
                                            <input 
                                                type="text" 
                                                value={formData.colorSecundario} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, colorSecundario: e.target.value }))} 
                                                className="flex-1 px-4 py-3 bg-slate-900 border border-white/5 rounded-xl font-mono text-xs uppercase"
                                            />
                                        </div>
                                        {/* Presets */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {PRESETS_COLOR_SECUNDARIO.map(p => (
                                                <button 
                                                    key={p.hex} 
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, colorSecundario: p.hex }))}
                                                    className="size-6 rounded-full border border-white/10 relative" 
                                                    style={{ backgroundColor: p.hex }}
                                                    title={p.name}
                                                >
                                                    {formData.colorSecundario === p.hex && <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <InputField 
                                    label="Frase Principal (Título Hero)" 
                                    icon={Sparkles} 
                                    placeholder="Ej: Agenda tu bienestar hoy" 
                                    value={formData.heroTitulo} 
                                    onChange={(e: any) => setFormData(prev => ({ ...prev, heroTitulo: e.target.value }))} 
                                />

                                <InputField 
                                    label="Frase Secundaria (Subtítulo Hero)" 
                                    icon={Sparkles} 
                                    placeholder="Ej: Los mejores especialistas a un clic" 
                                    value={formData.heroSubtitulo} 
                                    onChange={(e: any) => setFormData(prev => ({ ...prev, heroSubtitulo: e.target.value }))} 
                                />
                            </div>
                        )}

                        {/* PASO 3: HORARIOS */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Horarios de Atención</h3>
                                    <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">Define el rango operativo y días de apertura.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <InputField 
                                        label="Hora de Apertura" 
                                        type="time" 
                                        icon={Clock} 
                                        value={formData.horarioApertura} 
                                        onChange={(e: any) => setFormData(prev => ({ ...prev, horarioApertura: e.target.value }))} 
                                    />
                                    <InputField 
                                        label="Hora de Cierre" 
                                        type="time" 
                                        icon={Clock} 
                                        value={formData.horarioCierre} 
                                        onChange={(e: any) => setFormData(prev => ({ ...prev, horarioCierre: e.target.value }))} 
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Días Hábiles de Atención</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { num: 1, label: "Lunes" },
                                            { num: 2, label: "Martes" },
                                            { num: 3, label: "Miércoles" },
                                            { num: 4, label: "Jueves" },
                                            { num: 5, label: "Viernes" },
                                            { num: 6, label: "Sábado" },
                                            { num: 0, label: "Domingo" }
                                        ].map(day => (
                                            <button
                                                key={day.num}
                                                type="button"
                                                onClick={() => setDiasAtencion(prev => ({ ...prev, [day.num]: !prev[day.num] }))}
                                                className={clsx(
                                                    "py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all active:scale-95",
                                                    diasAtencion[day.num] 
                                                        ? "bg-emerald-500 text-black border-emerald-500 font-black shadow-md shadow-emerald-500/10" 
                                                        : "bg-slate-900 text-slate-500 border-white/5 hover:border-white/10"
                                                )}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 4: SERVICIOS */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Servicios</h3>
                                    <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">Carga los tratamientos y servicios iniciales.</p>
                                </div>

                                {/* Sugerencias rápidas */}
                                {PLANTILLAS_SERVICIOS[formData.tipoNegocio] && (
                                    <div className="p-6 bg-slate-900/30 border border-white/5 rounded-[2rem] space-y-3">
                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Sugerencias rápidas para tu categoría</span>
                                        <div className="flex flex-wrap gap-2">
                                            {PLANTILLAS_SERVICIOS[formData.tipoNegocio].map((s, idx) => {
                                                const yaAñadido = wizardServicios.some(ws => ws.nombre.toLowerCase() === s.nombre.toLowerCase());
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        disabled={yaAñadido}
                                                        onClick={() => setWizardServicios(prev => [
                                                            ...prev,
                                                            { id: crypto.randomUUID(), nombre: s.nombre, duracion: s.duracion, precio: s.precio }
                                                        ])}
                                                        className={clsx(
                                                            "px-4 py-2 text-xs rounded-xl font-bold border transition-all flex items-center gap-1.5",
                                                            yaAñadido 
                                                                ? "bg-slate-950 text-slate-600 border-transparent cursor-not-allowed" 
                                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20 active:scale-95"
                                                        )}
                                                    >
                                                        <Plus size={12} /> {s.nombre} ({s.precio})
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Lista de servicios agregados */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Servicios a registrar (Mín. 1)</label>
                                    {wizardServicios.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-3xl text-slate-500">
                                            Aún no has agregado ningún servicio. Usa las sugerencias de arriba o introduce uno nuevo abajo.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {wizardServicios.map(serv => (
                                                <div key={serv.id} className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-3 group">
                                                    {/* Miniatura imagen */}
                                                    <ServiceImageUploader
                                                        currentUrl={serv.imageUrl}
                                                        onUploadSuccess={(media) => setWizardServicios(prev => prev.map(ws => ws.id === serv.id ? { ...ws, imageUrl: media.url, imageMediaId: media.id } : ws))}
                                                        onRemove={() => setWizardServicios(prev => prev.map(ws => ws.id === serv.id ? { ...ws, imageUrl: undefined, imageMediaId: null } : ws))}
                                                    />
                                                    <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                                                        <input 
                                                            type="text"
                                                            inputMode="text"
                                                            value={serv.nombre} 
                                                            onChange={(e) => setWizardServicios(prev => prev.map(ws => ws.id === serv.id ? { ...ws, nombre: e.target.value } : ws))}
                                                            className="col-span-1 bg-transparent border-0 outline-none text-xs font-black uppercase italic"
                                                            style={{ color: '#f1f5f9' }}
                                                            placeholder="Nombre"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={serv.duracion} 
                                                                onChange={(e) => setWizardServicios(prev => prev.map(ws => ws.id === serv.id ? { ...ws, duracion: parseInt(e.target.value) || 0 } : ws))}
                                                                className="w-14 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 outline-none text-xs font-bold text-right"
                                                                style={{ color: '#cbd5e1' }}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-[10px] text-slate-500">min</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <span className="text-[10px] text-slate-500">$</span>
                                                            <input 
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={serv.precio} 
                                                                onChange={(e) => setWizardServicios(prev => prev.map(ws => ws.id === serv.id ? { ...ws, precio: parseFloat(e.target.value) || 0 } : ws))}
                                                                className="w-14 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 outline-none text-xs font-black text-right"
                                                                style={{ color: '#34d399' }}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveServicio(serv.id)}
                                                        className="text-slate-500 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Formulario para nuevo servicio */}
                                <div className="p-5 bg-slate-900/10 border border-white/5 rounded-3xl space-y-4">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Crear Servicio Manual</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del servicio" 
                                            value={newServicio.nombre} 
                                            onChange={(e) => setNewServicio(prev => ({ ...prev, nombre: e.target.value }))}
                                            className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-slate-600"
                                        />
                                        <select 
                                            value={newServicio.duracion} 
                                            onChange={(e) => setNewServicio(prev => ({ ...prev, duracion: parseInt(e.target.value) }))}
                                            className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-white"
                                        >
                                            <option value={15} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>15 minutos</option>
                                            <option value={30} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>30 minutos</option>
                                            <option value={45} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>45 minutos</option>
                                            <option value={60} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>60 minutos / 1 hora</option>
                                            <option value={90} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>90 minutos / 1.5 horas</option>
                                            <option value={120} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>120 minutos / 2 horas</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="Precio ($)" 
                                                value={newServicio.precio || ""} 
                                                onChange={(e) => setNewServicio(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                                                className="flex-1 px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-slate-600"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddServicioManual}
                                                className="px-4 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase transition-all hover:bg-emerald-700 active:scale-95"
                                            >
                                                Añadir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 5: STAFF */}
                        {step === 5 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Profesionales (Staff)</h3>
                                        <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">Crea los miembros del equipo que brindan los servicios.</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setWizardStaff([]);
                                            setStep(6);
                                        }}
                                        className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl uppercase tracking-widest font-black"
                                    >
                                        Omitir este paso
                                    </button>
                                </div>

                                {/* Lista de profesionales locales */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Profesionales registrados</label>
                                    {wizardStaff.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-3xl text-slate-500">
                                            No se han registrado profesionales aún. Agrega uno abajo o presiona "Omitir" si atiende el propio negocio.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {wizardStaff.map(st => (
                                                <div key={st.id} className="p-5 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between gap-4 group">
                                                    <div>
                                                        <span className="text-sm font-black text-white uppercase italic">{st.name}</span>
                                                        <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">{st.role}</span>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {st.servicesIds.map(sid => {
                                                                const sObj = wizardServicios.find(s => s.id === sid);
                                                                return sObj ? (
                                                                    <span key={sid} className="px-2 py-0.5 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest rounded-md text-slate-300">
                                                                        {sObj.nombre}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveStaff(st.id)}
                                                        className="text-slate-500 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Formulario para agregar profesional */}
                                <div className="p-6 bg-slate-900/10 border border-white/5 rounded-3xl space-y-4">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Crear Profesional</span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del profesional" 
                                            value={newStaff.name} 
                                            onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                                            className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-slate-600"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Especialidad / Rol (ej: Estilista)" 
                                            value={newStaff.role} 
                                            onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
                                            className="px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-slate-600"
                                        />
                                    </div>

                                    {/* Selección de servicios para el profesional */}
                                    <div className="space-y-2">
                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Servicios que realiza</span>
                                        {wizardServicios.length === 0 ? (
                                            <p className="text-[10px] text-slate-500 font-bold italic">Debes agregar servicios primero en el paso anterior.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {wizardServicios.map(serv => {
                                                    const seleccionado = newStaff.servicesIds.includes(serv.id);
                                                    return (
                                                        <button
                                                            key={serv.id}
                                                            type="button"
                                                            onClick={() => toggleServiceInStaff(serv.id)}
                                                            className={clsx(
                                                                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all",
                                                                seleccionado 
                                                                    ? "bg-indigo-600 text-white border-indigo-600" 
                                                                    : "bg-slate-900 text-slate-500 border-white/5 hover:border-white/10"
                                                            )}
                                                        >
                                                            {serv.nombre}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAddStaffManual}
                                        disabled={!newStaff.name.trim() || newStaff.servicesIds.length === 0}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                    >
                                        Agregar Profesional
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PASO 6: RESUMEN Y CONFIRMACIÓN */}
                        {step === 6 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Resumen y Opciones</h3>
                                    <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-wider">Verifica que todos los datos comerciales sean correctos antes del despliegue.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 bg-slate-900/40 border border-white/5 rounded-[2.5rem] grid grid-cols-2 gap-6">
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Negocio</span>
                                            <span className="text-base font-black text-white uppercase italic leading-none">{formData.nombre}</span>
                                            <span className="block text-[9px] text-slate-400 font-bold mt-1">/{formData.slug}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Categoría</span>
                                            <span className="text-sm font-black text-emerald-400 uppercase italic leading-none">{formData.tipoNegocio}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Contacto</span>
                                            <span className="text-xs font-bold text-slate-300">{formData.whatsapp}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Usuario Administrador</span>
                                            <span className="text-xs font-bold text-slate-300 break-all">{formData.adminEmail || formData.emailContacto}</span>
                                        </div>
                                    </div>

                                    {/* Stats rápidos */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-900/20 border border-white/5 rounded-2xl text-center">
                                            <span className="text-xl font-black text-white italic">{wizardServicios.length}</span>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Servicios</span>
                                        </div>
                                        <div className="p-4 bg-slate-900/20 border border-white/5 rounded-2xl text-center">
                                            <span className="text-xl font-black text-white italic">{wizardStaff.length}</span>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Especialistas</span>
                                        </div>
                                        <div className="p-4 bg-slate-900/20 border border-white/5 rounded-2xl text-center">
                                            <span className="text-xl font-black text-white italic">
                                                {Object.values(diasAtencion).filter(Boolean).length}
                                            </span>
                                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Días Hábiles</span>
                                        </div>
                                    </div>

                                    {/* Checkbox negocio demo */}
                                    <div 
                                        onClick={() => setFormData(prev => ({ ...prev, crearDemo: !prev.crearDemo }))}
                                        className={clsx(
                                            "flex items-center justify-between p-6 rounded-[2.5rem] border cursor-pointer transition-colors group",
                                            formData.crearDemo 
                                                ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" 
                                                : "bg-slate-900/20 border-white/5 hover:bg-slate-900/40"
                                        )}
                                    >
                                        <div className="flex gap-4 items-center">
                                            <div className={clsx("size-11 rounded-2xl flex items-center justify-center transition-all", formData.crearDemo ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-400")}>
                                                <Award size={20} fill={formData.crearDemo ? "black" : "none"} />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-sm font-black text-white uppercase tracking-widest block italic leading-none">Crear como Negocio Demo</span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-1 block">Genera automáticamente imágenes, servicios plantilla, un profesional y reservas simuladas para demostraciones inmediatas.</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`w-12 h-6 rounded-full transition-all duration-500 relative shrink-0 ${formData.crearDemo ? 'bg-emerald-500' : 'bg-slate-800'}`}
                                        >
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-sm ${formData.crearDemo ? 'left-6.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lado Derecho: Live Preview (Solo Desktop, Pasos 2 en adelante) */}
                <div className="hidden lg:flex w-96 border-l border-white/5 bg-slate-950/40 p-8 flex-col items-center justify-center shrink-0">
                    <div className="space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Smartphone size={14} className="text-slate-400" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vista previa móvil en tiempo real</span>
                        </div>

                        {/* Teléfono Mockup */}
                        <div className="w-[280px] h-[540px] bg-slate-950 border-4 border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between text-left" style={{ backgroundColor: formData.colorSecundario }}>
                            {/* Parlante superior */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                                <div className="w-10 h-1 bg-slate-700 rounded-full" />
                            </div>

                            {/* Contenido Landing Mockup */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pt-10 space-y-5">
                                {/* Navbar */}
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-2">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} alt="logo" className="w-6 h-6 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-black font-black uppercase italic">
                                                {formData.nombre ? formData.nombre.charAt(0) : "Z"}
                                            </div>
                                        )}
                                        <span className="text-xs font-black uppercase tracking-tight text-white max-w-[130px] truncate">{formData.nombre || "Mi Spa"}</span>
                                    </div>
                                </div>

                                {/* Banner & Hero */}
                                <div className="relative rounded-2xl overflow-hidden aspect-[2.2] bg-slate-900 border border-white/5 flex items-end">
                                    {formData.bannerUrl ? (
                                        <img src={formData.bannerUrl} alt="banner" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent" />
                                    )}
                                    <div className="relative p-4 z-10">
                                        <h4 className="text-sm font-black uppercase italic text-white leading-tight break-words">{formData.heroTitulo || `Bienvenido a ${formData.nombre || 'Zenda'}`}</h4>
                                    </div>
                                </div>

                                {/* Frase secundaria */}
                                <p className="text-[10px] text-slate-400 font-bold leading-normal">{formData.heroSubtitulo || "Reserva tus tratamientos de manera ágil."}</p>

                                {/* Simular Servicios */}
                                <div className="space-y-2">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Nuestros Servicios</span>
                                    {wizardServicios.length === 0 ? (
                                        <div className="p-3 text-center bg-white/5 rounded-xl text-[9px] text-slate-500 italic">No hay servicios añadidos</div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {wizardServicios.slice(0, 3).map(s => (
                                                <div key={s.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                                                    <div>
                                                        <span className="block text-[9px] font-black text-white uppercase italic max-w-[130px] truncate">{s.nombre}</span>
                                                        <span className="block text-[8px] text-slate-500">{s.duracion} min</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-emerald-400">${s.precio}</span>
                                                </div>
                                            ))}
                                            {wizardServicios.length > 3 && (
                                                <span className="block text-center text-[8px] text-slate-500 font-bold uppercase mt-1">Y {wizardServicios.length - 3} servicios más...</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Botón Reserva */}
                            <div className="p-4 bg-slate-950/20 border-t border-white/5">
                                <button 
                                    type="button" 
                                    className="w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-center shadow-lg transition-transform active:scale-95" 
                                    style={{ backgroundColor: formData.colorPrimario, color: "#fff" }}
                                >
                                    Reservar Ahora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Navegación Wizard */}
            <div className="p-5 lg:px-20 lg:py-6 border-t border-white/5 flex gap-4 bg-slate-950/40 shrink-0">
                <button
                    type="button"
                    disabled={step === 1 || loading}
                    onClick={() => setStep(prev => prev - 1)}
                    className="flex-1 py-4 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-30 active:scale-95 flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={14} /> Atrás
                </button>
                {step < totalSteps - 1 ? (
                    <button
                        type="button"
                        disabled={
                            (step === 1 && (!formData.nombre || !formData.adminEmail || !formData.adminPassword)) ||
                            (step === 4 && wizardServicios.length === 0)
                        }
                        onClick={() => setStep(prev => prev + 1)}
                        className="flex-[2] py-4 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
                    >
                        Siguiente <ArrowRight size={14} />
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSaveSubmit()}
                        className="flex-[2] py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Confirmar y Crear (PRO Trial)
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}

// ==========================================
// UPLOADER COMPACTO PARA SERVICIOS (FUERA DEL COMPONENTE PRINCIPAL)
// ==========================================
function ServiceImageUploader({
    currentUrl,
    onUploadSuccess,
    onRemove
}: {
    currentUrl?: string;
    onUploadSuccess: (media: { id: string; url: string }) => void;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentUrl || null);

    const handleFile = async (file: File) => {
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('category', 'service');
            const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Error al subir');
            const media = await res.json();
            setPreview(media.url);
            onUploadSuccess(media);
        } catch {
            setPreview(currentUrl || null);
        } finally {
            setUploading(false);
            URL.revokeObjectURL(objectUrl);
        }
    };

    return (
        <div className="relative shrink-0">
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                title={preview ? 'Cambiar imagen' : 'Subir imagen del servicio'}
                className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all flex items-center justify-center"
                style={{ background: preview ? undefined : 'rgba(255,255,255,0.04)' }}
            >
                {preview ? (
                    <img src={preview} alt="servicio" className="w-full h-full object-cover" />
                ) : uploading ? (
                    <Loader2 size={14} className="animate-spin text-emerald-400" />
                ) : (
                    <div className="flex flex-col items-center gap-0.5">
                        <ImageIcon size={14} className="text-slate-600" />
                        <span className="text-[7px] text-slate-600 font-black uppercase tracking-wider">Img</span>
                    </div>
                )}
            </div>
            {preview && !uploading && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreview(null); onRemove(); }}
                    className="absolute -top-1.5 -right-1.5 size-4 bg-rose-500 hover:bg-rose-400 rounded-full flex items-center justify-center transition-colors shadow-md"
                    title="Quitar imagen"
                >
                    <X size={8} className="text-white" />
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
        </div>
    );
}

// ==========================================
// COMPONENTES AUXILIARES DECLARADOS FUERA (EVITA PÉRDIDA DE FOCUS)
// ==========================================
function SectionTitle({ icon: Icon, title, color = "emerald" }: { icon: any; title: string; color?: "emerald" | "blue" | "amber" | "indigo" }) {
    const colorClasses: Record<string, string> = {
        emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
    };
    
    return (
        <div className="flex items-center gap-3 pt-4 pb-1">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center", colorClasses[color] || colorClasses.emerald)}>
                <Icon size={16} strokeWidth={2.5} />
            </div>
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] italic">{title}</h4>
            <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
        </div>
    );
}

function InputField({ label, icon: Icon, ...props }: any) {
    return (
        <div className="space-y-1.5 text-left">
            {label && <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 ml-1">{label}</label>}
            <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
                {Icon && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors z-[20] flex items-center justify-center">
                        <Icon size={18} strokeWidth={2.5} />
                    </div>
                )}
                <input
                    {...props}
                    className="relative w-full !pl-16 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500/30 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white shadow-inner dark:shadow-none placeholder:text-slate-300 dark:placeholder:text-slate-700 italic"
                />
            </div>
        </div>
    );
}

function MessageSquareIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    );
}
