"use client";

import { useState } from "react";
import {
    Building2,
    Phone,
    MapPin,
    Globe,
    ShieldCheck,
    Zap,
    Clock,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Power,
    ShieldAlert,
    CalendarCheck2,
    User,
    Mail,
    ChevronRight,
    History,
    CreditCard,
    ArrowUpCircle,
    ArrowDownCircle,
    Settings,
    Trash2,
    RefreshCw,
    X,
    FileText,
    Upload,
    Eye
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface BusinessDetailClientProps {
    negocio: any;
    planes: any[];
}

export default function BusinessDetailClient({ negocio, planes }: BusinessDetailClientProps) {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState<'info' | 'subscription' | 'payments'>('info');

    const [resetPasswordModal, setResetPasswordModal] = useState<{
        show: boolean;
        usuarioId: string;
        userName: string;
        userEmail: string;
        generatedPass: string;
        isSaved: boolean;
    }>({
        show: false,
        usuarioId: '',
        userName: '',
        userEmail: '',
        generatedPass: '',
        isSaved: false
    });

    useEffect(() => {
        if (tabParam === 'subscription' || tabParam === 'payments' || tabParam === 'info') {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    const handleOpenResetModal = (usuario: any) => {
        const prefix = "Acceso";
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const generatedPass = `${prefix}${randomNum}`;

        setResetPasswordModal({
            show: true,
            usuarioId: usuario.id,
            userName: usuario.nombre || 'Administrador',
            userEmail: usuario.email || '',
            generatedPass,
            isSaved: false
        });
    };

    const handleConfirmResetPassword = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/superadmin/usuarios/${resetPasswordModal.usuarioId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: resetPasswordModal.generatedPass })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al restablecer la contraseña");

            setResetPasswordModal(prev => ({ ...prev, isSaved: true }));
            setSuccess("Contraseña restablecida con éxito.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const [formData, setFormData] = useState({
        nombre: negocio.nombre,
        propietario: negocio.propietario || '',
        emailContacto: negocio.emailContacto || '',
        whatsapp: negocio.whatsapp || '',
        direccion: negocio.direccion || '',
        ciudad: negocio.ciudad || '',
        estado: negocio.estado || 'ACTIVO'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingPlan, setPendingPlan] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<{ action: string, text: string, extraData?: any } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        monto: '',
        metodoPago: 'TRANSFERENCIA',
        referencia: '',
        comprobante: ''
    });

    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

    const router = useRouter();

    const currentSub = negocio.Suscripcion || null;
    const currentPlan = currentSub?.Plan || null;
    const history = negocio.SubscriptionHistory || [];
    const payments = negocio.Payment || [];

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error("No se pudo actualizar el negocio");

            setSuccess("Datos del negocio actualizados correctamente.");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePlanChangeConfirm = async () => {
        if (!pendingPlan) return;
        setLoading(true);
        setSuccess(null);
        setError(null);
        try {
            const res = await fetch(`/api/superadmin/suscripciones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    negocioId: negocio.id,
                    planId: pendingPlan.id,
                    action: 'CHANGE_PLAN',
                    isAnnual: billingPeriod === 'annual'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al cambiar el plan");

            setSuccess(`Plan cambiado a ${pendingPlan.name} exitosamente.`);
            setShowConfirmModal(false);
            setPendingPlan(null);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string, extraData: any = {}) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/superadmin/suscripciones`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    negocioId: negocio.id,
                    planId: currentPlan?.id,
                    action,
                    ...extraData
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Error al realizar accion: ${action}`);

            setSuccess("Acción completada con éxito.");
            setShowConfirmModal(false);
            setPendingAction(null);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSolicitudAction = async (solicitudId: string, action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT' && !confirm('¿Estás seguro de rechazar esta solicitud?')) return;
        
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/superadmin/solicitudes/${solicitudId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al procesar la solicitud");

            setSuccess(action === 'APPROVE' ? "Solicitud aprobada con éxito." : "Solicitud rechazada.");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSuspendBusiness = async () => {
        const action = formData.estado === 'SUSPENDIDO' ? 'Activar' : 'Suspender';
        if (confirm(`¿Estás seguro de que deseas ${action.toLowerCase()} este negocio?`)) {
            setLoading(true);
            try {
                const nuevoEstado = formData.estado === 'SUSPENDIDO' ? 'ACTIVO' : 'SUSPENDIDO';
                const res = await fetch(`/api/superadmin/negocios/${negocio.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estado: nuevoEstado })
                });

                if (!res.ok) throw new Error("Error al cambiar el estado del negocio");

                setFormData({ ...formData, estado: nuevoEstado });
                setSuccess(`Negocio ${nuevoEstado === 'ACTIVO' ? 'activado' : 'suspendido'} correctamente.`);
                router.refresh();
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAddPayment = async () => {
        if (!paymentForm.monto) {
            alert("Por favor ingresa un monto.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/superadmin/pagos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    negocioId: negocio.id,
                    planId: currentPlan?.id,
                    ...paymentForm
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al registrar el pago");
            }

            setSuccess("Pago registrado exitosamente.");
            setShowPaymentModal(false);
            setPaymentForm({ monto: '', metodoPago: 'TRANSFERENCIA', referencia: '', comprobante: '' });
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (estado: string) => {
        const s = estado?.toUpperCase();
        switch (s) {
            case 'ACTIVA':
            case 'ACTIVO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'SUSPENDIDO':
            case 'SUSPENDIDA': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'TRIAL': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'EXPIRADA': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Navegación por Módulos (Tabs) */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-[2rem] w-fit border border-slate-100">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'info'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <Building2 size={16} />
                    Información del Negocio
                </button>
                <button
                    onClick={() => setActiveTab('subscription')}
                    className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'subscription'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <Zap size={16} />
                    Suscripción Actual
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'payments'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                >
                    <History size={16} />
                    Historial y Pagos
                </button>
            </div>

            {/* Contenido Modular */}
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase">Perfil Administrativo</h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Datos de contacto y ubicación física</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Comercial</label>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full px-6 py-4 !bg-slate-50 border border-slate-200 rounded-2xl font-bold !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:!bg-white transition-all uppercase animate-in fade-in"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Propietario / Representante</label>
                                        <input
                                            type="text"
                                            value={formData.propietario}
                                            onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                                            className="w-full px-6 py-4 !bg-slate-50 border border-slate-200 rounded-2xl font-bold !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:!bg-white transition-all animate-in fade-in"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp de Gestión</label>
                                        <input
                                            type="text"
                                            value={formData.whatsapp}
                                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                            className="w-full px-6 py-4 !bg-slate-50 border border-slate-200 rounded-2xl font-bold !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:!bg-white transition-all animate-in fade-in"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Principal</label>
                                        <input
                                            type="email"
                                            value={formData.emailContacto}
                                            onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                                            className="w-full px-6 py-4 !bg-slate-50 border border-slate-200 rounded-2xl font-bold !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:!bg-white transition-all animate-in fade-in"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ciudad</label>
                                        <input
                                            type="text"
                                            value={formData.ciudad}
                                            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                                            className="w-full px-6 py-4 !bg-slate-50 border border-slate-200 rounded-2xl font-bold !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:!bg-white transition-all uppercase animate-in fade-in"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección Exacta</label>
                                        <input
                                            type="text"
                                            value={formData.direccion}
                                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                            className="w-full px-6 py-4 !bg-slate-50 border border-slate-200 rounded-2xl font-bold !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:!bg-white transition-all uppercase animate-in fade-in"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-50">
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-sm"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Actualizar Información
                                    </button>
                                </div>
                            </div>

                            {/* Card de Usuarios y Accesos de Ingreso */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase">Usuarios y Accesos de Ingreso</h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Cuentas para ingresar al panel del negocio</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {negocio.Usuario && negocio.Usuario.length > 0 ? (
                                        negocio.Usuario.map((user: any) => (
                                            <div key={user.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white hover:shadow-md transition-all group">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 text-sm">{user.nombre || 'Administrador'}</span>
                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded-md uppercase tracking-wider">
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 md:flex-row md:gap-4 text-xs font-bold text-slate-400">
                                                        <span className="flex items-center gap-1 select-all">
                                                            <Mail size={12} />
                                                            {user.email}
                                                        </span>
                                                        {user.phone && (
                                                            <span className="flex items-center gap-1 select-all">
                                                                <Phone size={12} />
                                                                {user.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleOpenResetModal(user)}
                                                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm flex items-center gap-2"
                                                >
                                                    <RefreshCw size={14} />
                                                    Resetear Contraseña
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                            <User className="mx-auto text-slate-200 mb-2" size={32} />
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No hay usuarios administradores registrados para este negocio</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center space-y-6">
                                <div className="p-4 bg-rose-50 text-rose-600 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                                    <ShieldAlert size={40} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 uppercase">Estado del Acceso</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Control de suspensión inmediata</p>
                                </div>
                                <div className={`py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${getStatusBadge(formData.estado)}`}>
                                    {formData.estado}
                                </div>
                                <button
                                    onClick={handleSuspendBusiness}
                                    className={`w-full py-5 rounded-3xl font-black uppercase text-xs tracking-widest transition-all ${formData.estado === 'SUSPENDIDO'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                                        : 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20'
                                        }`}
                                >
                                    {formData.estado === 'SUSPENDIDO' ? 'Reactivar Negocio' : 'Suspender Negocio'}
                                </button>
                            </div>

                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4">
                                <div className="flex items-center gap-3 text-indigo-400">
                                    <Settings size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Configuraciones rápidas</span>
                                </div>
                                <button className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left flex items-center justify-between group">
                                    <span className="text-xs font-bold uppercase">Resetear Contraseña</span>
                                    <Power size={18} className="text-white/40 group-hover:text-white" />
                                </button>
                                <button className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-left flex items-center justify-between group">
                                    <span className="text-xs font-bold uppercase">Eliminar Negocio</span>
                                    <Trash2 size={18} className="text-white/40 group-hover:text-rose-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div className="space-y-8 max-w-7xl mx-auto">
                        {/* Solicitudes de Cambio Pendientes */}
                        {currentSub?.pagoPendiente && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] p-8 shadow-xl shadow-amber-900/5 ring-4 ring-amber-500/10 mb-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-amber-600 text-white rounded-[1.5rem] shadow-lg shadow-amber-600/20">
                                            <AlertCircle size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-xl font-black text-amber-900 uppercase">Solicitud de Cambio Pendiente</h4>
                                                <span className="px-2 py-0.5 bg-white text-amber-600 text-[8px] font-black rounded-md border border-amber-200 uppercase tracking-widest animate-pulse">Confirmar Pago</span>
                                            </div>
                                            <div className="flex flex-wrap gap-4">
                                                <p className="text-xs font-bold text-amber-700/80 uppercase tracking-widest flex items-center gap-1">
                                                    Plan: <span className="text-amber-900 font-black">
                                                        {planes.find(p => p.id === currentSub.solicitudPlanId)?.name || 'Plan Solicitado'}
                                                    </span>
                                                </p>
                                                <p className="text-xs font-bold text-amber-700/80 uppercase tracking-widest flex items-center gap-1">
                                                    Ciclo: <span className="text-amber-900 font-black">{currentSub.metodoPago?.includes('ANNUAL') ? 'ANUAL (-20%)' : 'MENSUAL'}</span>
                                                </p>
                                                <p className="text-xs font-bold text-amber-700/80 uppercase tracking-widest flex items-center gap-1 italic">
                                                    Fecha: <span className="text-amber-900 font-black">{new Date(currentSub.updatedAt).toLocaleDateString()}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleSolicitudAction(currentSub.id, 'REJECT')}
                                            disabled={loading}
                                            className="px-6 py-4 bg-white border-2 border-amber-200 text-amber-700 font-black rounded-3xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all uppercase tracking-widest text-[9px] shadow-sm"
                                        >
                                            Rechazar
                                        </button>
                                        <button 
                                            onClick={() => handleSolicitudAction(currentSub.id, 'APPROVE')}
                                            disabled={loading}
                                            className="px-8 py-4 bg-amber-600 text-white font-black rounded-3xl hover:bg-slate-900 transition-all shadow-xl shadow-amber-600/20 uppercase tracking-widest text-[9px] flex items-center gap-2"
                                        >
                                            <CheckCircle2 size={16} />
                                            Aprobar Ahora
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Status Actual */}
                            <div className="lg:col-span-2">
                                <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                                    <div className="absolute -top-20 -right-20 p-20 opacity-5 bg-white rounded-full"></div>

                                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-300">Suscripción Activa</span>
                                                {currentSub?.estado === 'trial' && (
                                                    <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-[9px] font-black uppercase tracking-widest text-amber-300">Periodo de Prueba</span>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-indigo-300/60 font-bold uppercase text-[10px] tracking-widest">Plan Actual</p>
                                                <h4 className="text-5xl font-black uppercase tracking-tight italic text-white flex items-center gap-4">
                                                    {currentPlan?.name || 'Gratis'}
                                                    <Zap className="text-amber-400 fill-amber-400" size={32} />
                                                </h4>
                                            </div>
                                            <div className="flex gap-10 pt-6 border-t border-white/10">
                                                <div>
                                                    <span className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 italic text-indigo-300">Próximo Pago</span>
                                                    <span className="text-lg font-black text-indigo-400">{currentSub?.fechaFin ? new Date(currentSub.fechaFin).toLocaleDateString() : '--/--/--'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-600 rounded-[2.5rem] p-8 space-y-6 flex flex-col justify-center shadow-inner">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 opacity-60 italic">Costo Mensual</span>
                                                <div className="p-2 bg-white/20 rounded-xl">
                                                    <CreditCard size={20} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="text-4xl font-black text-white flex items-baseline gap-2">
                                                ${currentPlan?.price || 0}
                                                <span className="text-xs font-bold opacity-60 uppercase tracking-widest">/ Mes</span>
                                            </div>
                                            <div className="pt-2">
                                                <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] mb-3 italic">Ciclo de Cobro</p>
                                                <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5">
                                                    <button 
                                                        onClick={() => setBillingPeriod('monthly')}
                                                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${billingPeriod === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                    >
                                                        Mensual
                                                    </button>
                                                    <button 
                                                        onClick={() => setBillingPeriod('annual')}
                                                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${billingPeriod === 'annual' ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                                    >
                                                        Anual -20%
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 bg-white rounded-[2.5rem] border border-slate-100 p-8">
                                    <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                                <Zap size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 uppercase">Upgrade / Downgrade</h4>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Selecciona un nuevo plan para el negocio</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {planes.map(plan => {
                                            const monthlyPrice = plan.price;
                                            const annualPrice = Math.floor((monthlyPrice * 12 * 0.8) / 12);
                                            const currentPrice = billingPeriod === 'annual' ? annualPrice : monthlyPrice;

                                            return (
                                                <button
                                                    key={plan.id}
                                                    onClick={() => {
                                                        setPendingPlan(plan);
                                                        setShowConfirmModal(true);
                                                    }}
                                                    disabled={loading || currentPlan?.id === plan.id}
                                                    className={`p-6 rounded-[2.5rem] border-2 text-left transition-all flex items-center justify-between group ${currentPlan?.id === plan.id
                                                        ? 'bg-slate-900 border-slate-900 shadow-xl'
                                                        : 'bg-white border-slate-100 hover:border-indigo-600'
                                                        }`}
                                                >
                                                    <div className="space-y-1">
                                                        <div className={`text-[10px] font-black uppercase tracking-widest ${currentPlan?.id === plan.id ? 'text-indigo-400' : 'text-slate-400'}`}>
                                                            Plan {billingPeriod === 'annual' ? 'Anual (-20%)' : 'Mensual'}
                                                        </div>
                                                        <div className={`text-xl font-black uppercase italic ${currentPlan?.id === plan.id ? 'text-white' : 'text-slate-900'}`}>{plan.name}</div>
                                                        <div className={`text-2xl font-black ${currentPlan?.id === plan.id ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                            ${currentPrice}
                                                            <span className="text-[10px] ml-1 opacity-60">/mes</span>
                                                        </div>
                                                    </div>
                                                    {currentPlan?.id === plan.id ? (
                                                        <div className="p-3 bg-indigo-600 text-white rounded-full">
                                                            <CheckCircle2 size={24} />
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-slate-50 text-slate-400 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                            <ChevronRight size={24} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Controles de Tiempo */}
                            <div className="space-y-8">
                                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6 text-center">
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                                        <Clock size={40} />
                                    </div>
                                    <h4 className="font-black text-slate-900 uppercase">Ajustar Tiempos</h4>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => {
                                                setPendingAction({ action: 'RENEW', text: 'Esto añadirá exactamente 1 mes adicional a la suscripción actual.' });
                                                setShowConfirmModal(true);
                                            }}
                                            className="w-full py-5 bg-indigo-50 text-indigo-600 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        >
                                            Añadir +1 Mes
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPendingAction({ action: 'RENEW_ANNUAL', text: 'Esto extenderá la suscripción por un año completo (365 días) desde su fecha actual.' });
                                                setShowConfirmModal(true);
                                            }}
                                            className="w-full py-5 bg-emerald-50 text-emerald-600 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <Zap size={14} className="fill-emerald-600 group-hover:fill-white" />
                                            Añadir +1 Año
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPendingAction({ action: 'EXTEND', text: 'Esto otorgará 7 días de cortesía adicionales a la fecha de expiración.', extraData: { dias: 7 } });
                                                setShowConfirmModal(true);
                                            }}
                                            className="w-full py-5 bg-slate-50 text-slate-600 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm"
                                        >
                                            Cortesía +7 días
                                        </button>
                                    </div>
                                </div>

                                {currentSub?.estado === 'trial' && (
                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] p-8 text-center space-y-4">
                                        <div className="p-3 bg-white text-amber-500 rounded-2xl w-fit mx-auto shadow-sm">
                                            <AlertCircle size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <h5 className="font-black text-amber-900 uppercase tracking-tight italic">Trial Activo</h5>
                                            <p className="text-xs text-amber-800 font-bold leading-relaxed">
                                                Termina el {new Date(currentSub.trial_fin).toLocaleDateString()}.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setPendingAction({ action: 'START_TRIAL', text: 'Esto reiniciará el periodo de prueba por 15 días adicionales.', extraData: { dias: 15 } });
                                                setShowConfirmModal(true);
                                            }}
                                            className="w-full py-4 bg-white border border-amber-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-amber-900 hover:bg-amber-100 transition-all font-bold"
                                        >
                                            Reiniciar Trial (15 días)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Historial de Cambios */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-8">
                                    <div className="p-3 bg-slate-50 text-slate-500 rounded-2xl">
                                        <History size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase">Historial de Plan</h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Log de todas las suscripciones y cambios</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {history.length > 0 ? history.map((h: any) => (
                                        <div key={h.id} className="flex items-center justify-between p-6 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className={`p-3 rounded-2xl group-hover:scale-110 transition-transform ${h.tipo_cambio === 'upgrade' ? 'bg-emerald-50 text-emerald-600' :
                                                    h.tipo_cambio === 'downgrade' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                    {h.tipo_cambio === 'upgrade' ? <ArrowUpCircle size={22} /> :
                                                        h.tipo_cambio === 'downgrade' ? <ArrowDownCircle size={22} /> : <RefreshCw size={22} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                                            {h.Plan_SubscriptionHistory_plan_nuevo_idToPlan?.name || 'S/N'}
                                                        </span>
                                                        {h.Plan_SubscriptionHistory_plan_anterior_idToPlan && (
                                                            <>
                                                                <ChevronRight size={14} className="text-slate-300" />
                                                                <span className="text-xs text-slate-400 font-bold strike-through opacity-50 italic">era {h.Plan_SubscriptionHistory_plan_anterior_idToPlan.name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${h.tipo_cambio === 'upgrade' ? 'text-emerald-600' : 'text-indigo-400'
                                                            }`}>{h.tipo_cambio}</span>
                                                        <span className="text-[10px] font-bold text-slate-300">ADMIN: {h.admin_id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-slate-900">{new Date(h.fecha_cambio).toLocaleDateString()}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(h.fecha_cambio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                            <History className="mx-auto text-slate-200 mb-4" size={48} />
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sin historial de cambios registrado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Registro de Pagos Real */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-6 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 uppercase">Pagos Recibidos</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monitoreo de ingresos</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPaymentModal(true)}
                                        className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-600/20"
                                        title="Registrar Pago"
                                    >
                                        <Upload size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {payments.length > 0 ? payments.map((p: any) => (
                                        <div key={p.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                            <div>
                                                <div className="text-base font-black text-slate-900">${p.monto}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-100 px-2 py-0.5 rounded-full">Recibido</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.fecha_pago).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            {p.comprobante && (
                                                <button
                                                    onClick={() => window.open(p.comprobante, '_blank')}
                                                    className="p-3 bg-white text-indigo-600 rounded-2xl border border-slate-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title="Ver Comprobante"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 opacity-40">
                                            <CreditCard className="mx-auto mb-3" size={32} />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Aún no hay pagos <br /> registrados</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20">
                                <h4 className="font-black text-base uppercase tracking-tight mb-4 italic">Resumen Facturación</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="opacity-60 font-bold uppercase tracking-widest text-[10px]">Total Histórico</span>
                                        <span className="font-black text-2xl">${payments.reduce((acc: any, p: any) => acc + (p.monto || 0), 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-t border-white/10 pt-4">
                                        <span className="opacity-60 font-bold uppercase tracking-widest text-[10px]">Plan Activo</span>
                                        <span className="font-black text-emerald-400">${currentPlan?.price || 0}/mes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Pago Manual */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowPaymentModal(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 animate-in zoom-in-95 overflow-hidden border border-white">
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <CreditCard size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">Registrar Pago Manual</h3>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monto del Pago (USD)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={paymentForm.monto}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, monto: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Referencia / Observaciones</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Transferencia Banco X..."
                                    value={paymentForm.referencia}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, referencia: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Link del Comprobante (URL)</label>
                                <input
                                    type="text"
                                    placeholder="http://..."
                                    value={paymentForm.comprobante}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, comprobante: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:bg-white transition-all"
                                />
                                <p className="text-[9px] text-slate-400 font-bold px-1 italic uppercase tracking-tighter">* Por ahora usa un link de Drive, S3 o similar</p>
                            </div>

                            <button
                                onClick={handleAddPayment}
                                disabled={loading}
                                className="w-full py-5 bg-emerald-600 text-white font-black rounded-[2rem] hover:bg-slate-900 transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Guardar Registro de Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación Universal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in transition-all" onClick={() => { setShowConfirmModal(false); setPendingPlan(null); setPendingAction(null); }}></div>
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 overflow-hidden border border-white">
                        <div className="p-8 pb-0 flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl">
                                {pendingPlan ? <RefreshCw size={32} className="animate-spin" /> : <ShieldCheck size={32} />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                    {pendingPlan ? 'Confirmar Cambio de Plan' : 'Confirmar Acción'}
                                </h3>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest italic">Verifica los detalles antes de aplicar</p>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-slate-50 rounded-[2.5rem] p-6 space-y-4 border border-slate-100/50">
                                {pendingPlan ? (
                                    <>
                                        <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Negocio</span>
                                            <span className="font-black text-slate-900 uppercase">{formData.nombre}</span>
                                        </div>

                                        <div className="flex items-center justify-between py-2">
                                            <div className="text-center">
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Plan Actual</span>
                                                <div className="px-4 py-2 bg-white rounded-xl text-[10px] font-black border border-slate-100 uppercase italic">
                                                    {currentPlan?.name || 'Gratis'}
                                                </div>
                                            </div>
                                            <ChevronRight className="text-indigo-400" size={24} />
                                            <div className="text-center">
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Plan Nuevo</span>
                                                <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-600/20 uppercase">
                                                    {pendingPlan.name}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                                            <div>
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Estimado</span>
                                                <span className="text-xl font-black text-slate-900">
                                                    ${billingPeriod === 'annual' ? Math.floor(pendingPlan.price * 12 * 0.8) : pendingPlan.price}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nueva Expiración</span>
                                                <span className="text-[11px] font-black text-indigo-600">
                                                    {(() => {
                                                        const d = new Date(currentSub?.fechaFin || new Date());
                                                        if (billingPeriod === 'annual') {
                                                            d.setFullYear(d.getFullYear() + 1);
                                                        } else {
                                                            d.setMonth(d.getMonth() + 1);
                                                        }
                                                        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 space-y-2">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aviso del Sistema</p>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase italic">
                                            {pendingAction?.text}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setShowConfirmModal(false); setPendingPlan(null); setPendingAction(null); }}
                                    className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px] shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={pendingPlan ? handlePlanChangeConfirm : () => handleAction(pendingAction!.action, pendingAction!.extraData)}
                                    disabled={loading}
                                    className="flex-1 px-8 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Confirmar Acción
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Resetear Contraseña */}
            {resetPasswordModal.show && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" 
                        onClick={() => {
                            if (!loading) {
                                setResetPasswordModal(prev => ({ ...prev, show: false }));
                            }
                        }}
                    ></div>
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 animate-in zoom-in-95 overflow-hidden border border-white">
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">Restablecer Acceso</h3>
                            </div>
                            {!loading && (
                                <button 
                                    onClick={() => setResetPasswordModal(prev => ({ ...prev, show: false }))} 
                                    className="text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            )}
                        </div>

                        <div className="p-8 space-y-6">
                            {!resetPasswordModal.isSaved ? (
                                <>
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                            Estás a punto de cambiar la contraseña de ingreso para el usuario <strong className="text-slate-900">{resetPasswordModal.userName}</strong> ({resetPasswordModal.userEmail}).
                                        </p>
                                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs font-bold leading-normal">
                                            ⚠️ Por seguridad, no es posible ver la contraseña actual del cliente ya que está cifrada de manera irreversible. Al confirmar, se guardará una nueva contraseña.
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nueva Contraseña Temporal</label>
                                        <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg text-slate-900 flex justify-between items-center select-all">
                                            <span>{resetPasswordModal.generatedPass}</span>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(resetPasswordModal.generatedPass);
                                                    setSuccess("Copiado al portapapeles");
                                                }}
                                                className="text-[10px] bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 font-bold"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConfirmResetPassword}
                                        disabled={loading}
                                        className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2rem] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                        Confirmar Nueva Contraseña
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-4 text-center">
                                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 uppercase">¡Contraseña Actualizada!</h4>
                                            <p className="text-xs text-slate-400 font-bold mt-1">La contraseña ha sido guardada encriptada y ya está activa.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Credenciales de Ingreso</label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-4">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider">Email:</span>
                                                <span className="font-black text-slate-900 select-all">{resetPasswordModal.userEmail}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs border-t border-slate-150 pt-4">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider">Contraseña:</span>
                                                <span className="font-black text-indigo-600 select-all">{resetPasswordModal.generatedPass}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`Email: ${resetPasswordModal.userEmail}\nContraseña: ${resetPasswordModal.generatedPass}`);
                                                setSuccess("Datos copiados al portapapeles");
                                            }}
                                            className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[9px] text-center"
                                        >
                                            Copiar Todo
                                        </button>
                                        <button
                                            onClick={() => setResetPasswordModal(prev => ({ ...prev, show: false }))}
                                            className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-[9px] text-center shadow-lg shadow-indigo-600/20"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mensajes Flotantes de Respuesta */}
            {(success || error) && (
                <div className="fixed bottom-8 right-8 z-[300] animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className={`p-4 pr-10 rounded-2xl flex items-center gap-4 shadow-2xl border-2 ${success ? 'bg-emerald-600 text-white border-white/20' : 'bg-rose-600 text-white border-white/20'
                        }`}>
                        <div className="p-2 bg-white/20 rounded-xl">
                            {success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight text-sm leading-none">{success ? 'Operación Exitosa' : 'Ocurrió un Error'}</p>
                            <p className="text-[10px] font-bold opacity-80 mt-1">{success || error}</p>
                        </div>
                        <button onClick={() => { setSuccess(null); setError(null) }} className="absolute top-2 right-4 text-white/50 hover:text-white transition-colors text-xl font-bold">×</button>
                    </div>
                </div>
            )}
        </div>
    );
}
