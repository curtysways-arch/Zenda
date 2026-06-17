import { Check, Lock, Shield, Crown } from 'lucide-react';
import Link from 'next/link';

interface PlanStatusCardProps {
    planName: string;
    estado: string;
    daysLeft: number;
    features: Record<string, boolean | number>;
}

export default function PlanStatusCard({ planName, estado, daysLeft, features }: PlanStatusCardProps) {
    const isTrial = estado === 'trial';
    const isExpired = estado === 'expired' || estado === 'downgraded';
    const isActive = estado === 'active' || estado === 'activa';
    const isGracePeriod = estado === 'grace_period';
    const isPaymentPending = estado === 'payment_pending';
    
    const maxAppointments = (features['max_appointments_monthly'] as number) || 0;
    const maxStaff = (features['max_staff'] as number) || 0;

    return (
        <div className="relative rounded-[3.5rem] p-8 md:p-10 bg-slate-900 text-white shadow-2xl overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"
                 style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 85%)' }} />
            
            <div className="relative space-y-8">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] italic text-slate-400">PLAN ACTUAL</span>
                        <h3 className="text-3xl font-black uppercase tracking-tighter leading-none italic flex items-center gap-2">
                            {planName} 
                            {(planName.includes('PRO') || planName.includes('BUSINESS')) && <Crown size={24} className="text-amber-500" />}
                        </h3>
                    </div>
                    {isTrial && (
                        <div className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm">
                            TRIAL
                        </div>
                    )}
                    {isExpired && (
                        <div className="bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-400 backdrop-blur-sm">
                            LIMITADO
                        </div>
                    )}
                    {isActive && (
                        <div className="bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400 backdrop-blur-sm">
                            ACTIVO
                        </div>
                    )}
                    {isGracePeriod && (
                        <div className="bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-400 backdrop-blur-sm">
                            PERIODO DE GRACIA
                        </div>
                    )}
                    {isPaymentPending && (
                        <div className="bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-400 backdrop-blur-sm">
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

                {/* Limits */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Límite Citas</span>
                            <span>{maxAppointments >= 999999 ? 'Ilimitadas' : maxAppointments}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-slate-600 w-1/3" style={{ backgroundColor: 'var(--primary-color)' }} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Profesionales</span>
                            <span>{maxStaff >= 999 ? 'Ilimitados' : maxStaff}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-slate-600 w-1/4" style={{ backgroundColor: 'var(--primary-color)' }} />
                        </div>
                    </div>
                </div>

                {/* Quick Features */}
                <div className="space-y-3 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Beneficios Activos</p>
                    <div className="grid grid-cols-2 gap-3">
                        <FeatureItem label="Notificaciones WA" active={!!features['whatsapp_notifications']} />
                        <FeatureItem label="Recordatorios WA" active={!!features['whatsapp_reminders']} />
                        <FeatureItem label="WhatsApp OTP" active={!!features['whatsapp_otp']} />
                        <FeatureItem label="Automatizaciones" active={!!features['automation']} />
                        <FeatureItem label="Branding Propio" active={!!features['remove_zenda_branding']} />
                        <FeatureItem label="Multi Staff" active={!!features['multi_staff']} />
                    </div>
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
                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check size={10} strokeWidth={4} />
                </div>
            ) : (
                <div className="p-1 rounded-full bg-slate-800 text-slate-500">
                    <Lock size={10} strokeWidth={3} />
                </div>
            )}
            {label}
        </div>
    );
}
