import { Check, Lock, Shield, Crown } from 'lucide-react';
import Link from 'next/link';

interface PlanStatusCardProps {
    planName: string;
    estado: string;
    daysLeft: number;
    features?: Record<string, boolean | number>;
    limits?: {
        ordersMonthly?: number;
        MAX_ORDERS_MONTHLY?: number;
        appointmentsMonthly?: number;
        maxAppointmentsMonthly?: number;
        MAX_APPOINTMENTS_MONTHLY?: number;
        professionals?: number;
        maxStaff?: number;
        MAX_STAFF?: number;
        users?: number;
        MAX_USERS?: number;
        tables?: number;
        MAX_TABLES?: number;
        products?: number;
        MAX_PRODUCTS?: number;
        [key: string]: any;
    };
    usage?: {
        ordersMonthly?: number;
        orders?: number;
        appointmentsMonthly?: number;
        citas?: number;
        staff?: number;
        professionals?: number;
        users?: number;
        tables?: number;
        products?: number;
        [key: string]: any;
    };
    tipoNegocio?: string;
    capabilities?: Record<string, boolean>;
}

export default function PlanStatusCard({ 
    planName, 
    estado, 
    daysLeft, 
    features = {}, 
    limits, 
    usage, 
    tipoNegocio = 'RESERVA', 
    capabilities 
}: PlanStatusCardProps) {
    const isTrial = estado === 'trial';
    const isExpired = estado === 'expired' || estado === 'downgraded';
    const isActive = estado === 'active' || estado === 'activa';
    const isGracePeriod = estado === 'grace_period';
    const isPaymentPending = estado === 'payment_pending';
    
    const tUpper = (tipoNegocio || '').toUpperCase();
    const isRestaurant = tUpper.includes('RESTAURANT') || tUpper.includes('BAR') || tUpper.includes('GASTRONOMIA');
    const isCourts = tUpper.includes('SPORT') || tUpper.includes('CANCHA');
    const isStore = tUpper.includes('TIENDA') || tUpper.includes('STORE') || tUpper.includes('PRODUCTO');

    // Métrica 1: Pedidos (Restaurante), Canchas (Deporte), Productos (Tienda) o Citas (Servicios/Spa)
    let metric1Label = 'Citas este Mes';
    let metric1Usage = usage?.appointmentsMonthly ?? usage?.citas ?? 0;
    let metric1Limit = limits?.appointmentsMonthly ?? limits?.MAX_APPOINTMENTS_MONTHLY ?? limits?.maxAppointmentsMonthly ?? (features['max_appointments_monthly'] as number) ?? 500;

    if (isRestaurant) {
        metric1Label = 'Pedidos este Mes';
        metric1Usage = usage?.ordersMonthly ?? usage?.orders ?? 0;
        metric1Limit = limits?.ordersMonthly ?? limits?.MAX_ORDERS_MONTHLY ?? (features['ordersMonthly'] as number) ?? (features['max_orders_monthly'] as number) ?? 1000;
    } else if (isCourts) {
        metric1Label = 'Canchas / Espacios';
        metric1Usage = usage?.tables ?? 0;
        metric1Limit = limits?.courts ?? limits?.MAX_COURTS ?? 5;
    } else if (isStore) {
        metric1Label = 'Productos en Catálogo';
        metric1Usage = usage?.products ?? 0;
        metric1Limit = limits?.products ?? limits?.MAX_PRODUCTS ?? 500;
    }

    const metric1IsUnlimited = metric1Limit >= 99999 || metric1Limit === -1;
    const metric1Pct = metric1IsUnlimited 
        ? 5 
        : metric1Limit > 0 
            ? Math.min(100, Math.round((metric1Usage / metric1Limit) * 100)) 
            : 0;

    // Métrica 2: Staff / Meseros / Usuarios
    let metric2Label = 'Profesionales';
    let metric2Usage = usage?.staff ?? usage?.professionals ?? usage?.users ?? 0;
    let metric2Limit = limits?.professionals ?? limits?.MAX_STAFF ?? limits?.users ?? limits?.MAX_USERS ?? (features['max_staff'] as number) ?? 1;

    if (isRestaurant) {
        metric2Label = 'Staff / Meseros';
        metric2Usage = usage?.staff ?? usage?.professionals ?? usage?.users ?? 0;
        metric2Limit = limits?.users ?? limits?.MAX_USERS ?? limits?.professionals ?? limits?.MAX_STAFF ?? (features['max_staff'] as number) ?? 5;
    } else if (isCourts) {
        metric2Label = 'Staff de Turno';
        metric2Usage = usage?.staff ?? 0;
        metric2Limit = limits?.professionals ?? limits?.MAX_STAFF ?? 3;
    } else if (isStore) {
        metric2Label = 'Usuarios de Caja';
        metric2Usage = usage?.users ?? usage?.staff ?? 0;
        metric2Limit = limits?.users ?? limits?.MAX_USERS ?? 2;
    }

    const metric2IsUnlimited = metric2Limit >= 999 || metric2Limit === -1;
    const metric2Pct = metric2IsUnlimited 
        ? 5 
        : metric2Limit > 0 
            ? Math.min(100, Math.round((metric2Usage / metric2Limit) * 100)) 
            : 0;

    return (
        <div className="relative rounded-[3.5rem] p-8 md:p-10 bg-slate-900 !text-white shadow-2xl overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"
                 style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 85%)' }} />
            
            <div className="relative space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] italic text-slate-400">PLAN ACTUAL</span>
                        <h3 className="!text-white text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-tight italic flex items-center gap-2 drop-shadow-md">
                            <span className="truncate">{planName}</span>
                            {(planName.toUpperCase().includes('PRO') || planName.toUpperCase().includes('BUSINESS') || planName.toUpperCase().includes('CRECIMIENTO')) && (
                                <Crown size={24} className="text-amber-400 shrink-0" />
                            )}
                        </h3>
                    </div>
                    {isTrial && (
                        <div className="shrink-0 bg-white/10 px-3 py-1.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm">
                            TRIAL
                        </div>
                    )}
                    {isExpired && (
                        <div className="shrink-0 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-400 backdrop-blur-sm">
                            LIMITADO
                        </div>
                    )}
                    {isActive && (
                        <div className="shrink-0 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400 backdrop-blur-sm">
                            ACTIVO
                        </div>
                    )}
                    {isGracePeriod && (
                        <div className="shrink-0 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-400 backdrop-blur-sm">
                            PERIODO DE GRACIA
                        </div>
                    )}
                    {isPaymentPending && (
                        <div className="shrink-0 bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-400 backdrop-blur-sm">
                            PAGO PENDIENTE
                        </div>
                    )}
                </div>

                {/* Trial/Grace Countdown */}
                {(isTrial || isGracePeriod) && (
                    <div className="bg-white/5 rounded-3xl p-5 border border-white/10 space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                                    {isGracePeriod ? 'Vence en' : 'Días Restantes de Trial'}
                                </p>
                                <p className="text-4xl font-black italic tracking-tighter text-white">
                                    {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                                </p>
                            </div>
                            <Link href="/admin/plan" className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:opacity-90 transition-opacity">
                                Mejorar
                            </Link>
                        </div>
                        {isTrial && (
                            <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold leading-normal border-t border-white/5 pt-3">
                                ⚡ Al finalizar, pasarás automáticamente al plan gratuito <strong className="text-white">BEGIN</strong> sin bloqueos de cuenta.
                            </div>
                        )}
                    </div>
                )}

                {/* Métricas y Consumo Real */}
                <div className="space-y-4">
                    {/* Indicador 1 */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>{metric1Label}</span>
                            <span className="text-white font-mono font-bold">
                                <span className="text-amber-400">{metric1Usage}</span> / {metric1IsUnlimited ? 'Ilimitados' : metric1Limit.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                    width: `${metric1Pct}%`, 
                                    backgroundColor: 'var(--primary-color)' 
                                }} 
                            />
                        </div>
                    </div>

                    {/* Indicador 2 */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>{metric2Label}</span>
                            <span className="text-white font-mono font-bold">
                                <span className="text-amber-400">{metric2Usage}</span> / {metric2IsUnlimited ? 'Ilimitados' : metric2Limit.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                    width: `${metric2Pct}%`, 
                                    backgroundColor: 'var(--primary-color)' 
                                }} 
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Features / Beneficios Activos por Vertical */}
                <div className="space-y-3 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Beneficios Activos</p>
                    {isRestaurant ? (
                        <div className="grid grid-cols-2 gap-3">
                            <FeatureItem label="Menú QR" active={capabilities?.PRODUCTS !== false} />
                            <FeatureItem label="Comandas Cocina" active={capabilities?.KITCHEN ?? true} />
                            <FeatureItem label="Control Mesas" active={capabilities?.TABLES ?? true} />
                            <FeatureItem label="Punto de Venta" active={capabilities?.POS ?? true} />
                            <FeatureItem label="Notificaciones WA" active={!!features['whatsapp_notifications'] || capabilities?.NOTIFICATIONS === true} />
                            <FeatureItem label="Multi Staff" active={metric2Limit > 1} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <FeatureItem label="Notificaciones WA" active={!!features['whatsapp_notifications']} />
                            <FeatureItem label="Recordatorios WA" active={!!features['whatsapp_reminders']} />
                            <FeatureItem label="WhatsApp OTP" active={!!features['whatsapp_otp']} />
                            <FeatureItem label="Automatizaciones" active={!!features['automation']} />
                            <FeatureItem label="Branding Propio" active={!!features['remove_zenda_branding']} />
                            <FeatureItem label="Multi Staff" active={!!features['multi_staff'] || metric2Limit > 1} />
                        </div>
                    )}
                </div>

                <Link
                    href="/admin/plan"
                    className="w-full flex justify-center items-center gap-2 p-4 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 hover:brightness-110 border border-white/10 bg-white/5 backdrop-blur-sm"
                >
                    <Shield size={16} /> Gestionar Plan
                </Link>
            </div>
        </div>
    );
}

function FeatureItem({ label, active }: { label: string, active: boolean }) {
    return (
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${active ? 'text-slate-300' : 'text-slate-600'}`}>
            {active ? (
                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Check size={10} strokeWidth={4} />
                </div>
            ) : (
                <div className="p-1 rounded-full bg-slate-800 text-slate-500 shrink-0">
                    <Lock size={10} strokeWidth={3} />
                </div>
            )}
            <span className="truncate">{label}</span>
        </div>
    );
}

