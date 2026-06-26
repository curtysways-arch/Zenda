"use client";

import { useState } from "react";
import {
    Phone,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info,
    Bell,
    Key,
    User,
    Shield,
    TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import PhoneInput from "@/components/ui/PhoneInput";

interface GlobalConfig {
    id: string;
    clave: string;
    valor: string;
}

interface ConfigClientProps {
    initialConfigs: GlobalConfig[];
}

const DEFAULT_TERMINOS = `# Términos y Condiciones de Uso

Bienvenido a SpaSaaS. Al utilizar nuestra plataforma, usted acepta los siguientes términos y condiciones. Por favor, léalos detenidamente.

## 1. Aceptación de los Términos
Al registrarse y utilizar SpaSaaS, usted acepta estar legalmente vinculado por estos términos, que rigen su relación con nuestra plataforma.

## 2. Descripción del Servicio
SpaSaaS proporciona herramientas de gestión para centros de estética, spas y salones de belleza, incluyendo pero no limitado a: gestión de reservas, automatización por WhatsApp, pasarelas de pago y administración de especialistas.

## 3. Registro de Cuenta
Para utilizar el servicio, debe crear una cuenta proporcionando información veraz y completa. Usted es responsable de mantener la confidencialidad de sus credenciales.

## 4. Uso del Servicio
Usted se compromete a no utilizar el servicio para fines ilegales o no autorizados. No debe interferir o interrumpir la integridad o el rendimiento del servicio.

## 5. Pagos y Suscripciones
SpaSaaS ofrece diversos planes de suscripción. Los pagos se realizan de forma mensual o anual según el plan elegido. El impago puede resultar en la suspensión o cancelación del servicio.

## 6. Propiedad Intelectual
Todo el contenido y la tecnología de SpaSaaS son propiedad exclusiva de la plataforma o de sus licenciantes y están protegidos por las leyes de propiedad intelectual.

## 7. Limitación de Responsabilidad
SpaSaaS no será responsable de ningún daño indirecto, incidental, especial o consecuente resultante del uso o la imposibilidad de usar el servicio.

## 8. Modificaciones
Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor tan pronto como se publiquen en la plataforma.

## 9. Contacto
Si tiene alguna pregunta sobre estos Términos, por favor contáctenos a través de los canales de soporte oficiales.`;

const DEFAULT_PRIVACIDAD = `# Política de Privacidad de SpaSaaS

En SpaSaaS, respetamos su privacidad y estamos comprometidos a proteger sus datos personales. Esta política explica cómo recopilamos, usamos y resguardamos su información.

## 1. Información que Recopilamos
Recopilamos información necesaria para la gestión de bienestar y belleza, incluyendo nombres, correos electrónicos, números de teléfono de contacto y detalles de las transacciones.

## 2. Uso de la Información
La información recopilada se utiliza para:
- Proporcionar y mantener el servicio.
- Enviar notificaciones automáticas por WhatsApp para confirmación de reservas.
- Procesar pagos de manera segura a través de pasarelas certificadas.
- Mejorar la experiencia del usuario y personalizar el servicio.

## 3. Protección de Datos
Implementamos altos estándares de seguridad técnica y organizativa para proteger sus datos contra el acceso no autorizado, pérdida o alteración. Todo el tráfico de datos se cifra mediante SSL.

## 4. Compartir Información
SpaSaaS no vende, alquila ni comparte sus datos personales con terceros para fines comerciales. Solo se comparte información esencial con proveedores de servicios autorizados para operar la plataforma.

## 5. Derechos del Usuario
Usted tiene derecho a conocer, rectificar, cancelar u oponerse al tratamiento de sus datos personales. Puede ejercer estos derechos enviando una solicitud a nuestro equipo de soporte.

## 6. Cookies y Seguimiento
Utilizamos cookies para mejorar la navegación y analizar el rendimiento del sitio. Usted puede desactivar las cookies en la configuración de su navegador.

## 7. Cambios en la Política
Podemos actualizar nuestra Política de Privacidad periódicamente. Le notificaremos cualquier cambio publicando la nueva versión en esta página.

## 8. Cumplimiento Legal
SpaSaaS cumple con las normativas locales e internacionales de protección de datos personales.

## 9. Contacto
Para cualquier duda o comentario sobre su privacidad, envíenos un correo electrónico a los canales de soporte oficiales.`;

export default function ConfigClient({ initialConfigs }: ConfigClientProps) {
    const [configs, setConfigs] = useState(initialConfigs);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();

    const getConfigValue = (clave: string) => {
        const value = configs.find(c => c.clave === clave)?.valor;
        if (!value) {
            if (clave === "TERMINOS_CONDICIONES") return DEFAULT_TERMINOS;
            if (clave === "POLITICA_PRIVACIDAD") return DEFAULT_PRIVACIDAD;
            return "";
        }
        return value;
    };

    const updateLocalConfig = (clave: string, valor: string) => {
        setConfigs(prev => {
            const index = prev.findIndex(c => c.clave === clave);
            if (index >= 0) {
                const newConfigs = [...prev];
                newConfigs[index] = { ...newConfigs[index], valor };
                return newConfigs;
            } else {
                return [...prev, { id: "", clave, valor }];
            }
        });
    };

    const handleSave = async (clave: string) => {
        const valor = getConfigValue(clave);

        if (clave === "NUMERO_WHATSAPP_ADMIN") {
            const cleaned = valor.replace(/\D/g, '');
            if (cleaned.length < 10) {
                setError("El número de WhatsApp es demasiado corto.");
                return;
            }
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/superadmin/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clave, valor })
            });

            if (!res.ok) throw new Error("No se pudo guardar la configuración");

            setSuccess(`Configuración '${clave}' actualizada correctamente.`);
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Sección WhatsApp */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Phone size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Contacto de Ventas y Soporte</h3>
                        <p className="text-sm text-slate-500 font-medium">Define el número de WhatsApp para solicitudes de planes.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-4 items-end">
                        <PhoneInput
                            label="Número de WhatsApp del Administrador"
                            value={getConfigValue("NUMERO_WHATSAPP_ADMIN")}
                            onChange={(val) => updateLocalConfig("NUMERO_WHATSAPP_ADMIN", val)}
                            className="flex-1"
                        />
                        <button
                            onClick={() => handleSave("NUMERO_WHATSAPP_ADMIN")}
                            disabled={loading}
                            className="h-[60px] px-8 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest text-xs mb-[2px]"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sección Estrategia Comercial */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Estrategia Comercial</h3>
                        <p className="text-sm text-slate-500 font-medium">Ajusta los beneficios y promociones globales de la plataforma.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ConfigField
                            label="Porcentaje de Descuento Anual (%)"
                            clave="DESCUENTO_ANUAL_PORCENTAJE"
                            value={getConfigValue("DESCUENTO_ANUAL_PORCENTAJE") || "20"}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("DESCUENTO_ANUAL_PORCENTAJE", v)}
                            loading={loading}
                            icon={<TrendingUp size={18} />}
                        />
                        <ConfigField
                            label="Precio Suscripción Fundadores (USD)"
                            clave="FOUNDER_LOCKED_PRICE"
                            value={getConfigValue("FOUNDER_LOCKED_PRICE") || "15.0"}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("FOUNDER_LOCKED_PRICE", v)}
                            loading={loading}
                            icon={<TrendingUp size={18} />}
                        />
                        <ConfigField
                            label="Límite Máximo de Fundadores"
                            clave="FOUNDER_MAX"
                            value={getConfigValue("FOUNDER_MAX") || "25"}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("FOUNDER_MAX", v)}
                            loading={loading}
                            icon={<TrendingUp size={18} />}
                        />
                    </div>
                </div>
            </div>

            {/* Sección WhatsApp Integration */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Phone size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">WhatsApp API & Bot</h3>
                        <p className="text-sm text-slate-500 font-medium">Configura el canal principal y los límites del bot central.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigField
                            label="WhatsApp Webhook URL"
                            clave="WA_WEBHOOK_URL"
                            value={getConfigValue("WA_WEBHOOK_URL")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("WA_WEBHOOK_URL", v)}
                            loading={loading}
                            icon={<Shield size={18} />}
                        />
                        <ConfigField
                            label="WhatsApp Access Token"
                            clave="WA_ACCESS_TOKEN"
                            value={getConfigValue("WA_ACCESS_TOKEN")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("WA_ACCESS_TOKEN", v)}
                            loading={loading}
                            icon={<Key size={18} />}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ConfigField
                            label="Límite OTP por Hora"
                            clave="WA_OTP_LIMIT_HOUR"
                            value={getConfigValue("WA_OTP_LIMIT_HOUR") || "5"}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("WA_OTP_LIMIT_HOUR", v)}
                            loading={loading}
                        />
                        <ConfigField
                            label="Rate Limit (Mensajes/Min)"
                            clave="WA_RATE_LIMIT_MIN"
                            value={getConfigValue("WA_RATE_LIMIT_MIN") || "20"}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("WA_RATE_LIMIT_MIN", v)}
                            loading={loading}
                        />
                        <ConfigField
                            label="Tiempo Expiración Reserva (Min)"
                            clave="WA_RESERVA_EXPIRY_MIN"
                            value={getConfigValue("WA_RESERVA_EXPIRY_MIN") || "10"}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("WA_RESERVA_EXPIRY_MIN", v)}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Sección Firebase FCM */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Firebase Cloud Messaging (FCM)</h3>
                        <p className="text-sm text-slate-500 font-medium">Configuración de credenciales para notificaciones push globales.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigField
                            label="Firebase API Key"
                            clave="NEXT_PUBLIC_FIREBASE_API_KEY"
                            value={getConfigValue("NEXT_PUBLIC_FIREBASE_API_KEY")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("NEXT_PUBLIC_FIREBASE_API_KEY", v)}
                            loading={loading}
                            icon={<Key size={18} />}
                        />
                        <ConfigField
                            label="Firebase Project ID"
                            clave="NEXT_PUBLIC_FIREBASE_PROJECT_ID"
                            value={getConfigValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("NEXT_PUBLIC_FIREBASE_PROJECT_ID", v)}
                            loading={loading}
                            icon={<Shield size={18} />}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigField
                            label="Auth Domain"
                            clave="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
                            value={getConfigValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", v)}
                            loading={loading}
                        />
                        <ConfigField
                            label="Messaging Sender ID"
                            clave="NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
                            value={getConfigValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", v)}
                            loading={loading}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ConfigField
                            label="Firebase App ID"
                            clave="NEXT_PUBLIC_FIREBASE_APP_ID"
                            value={getConfigValue("NEXT_PUBLIC_FIREBASE_APP_ID")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("NEXT_PUBLIC_FIREBASE_APP_ID", v)}
                            loading={loading}
                        />
                        <ConfigField
                            label="FCM VAPID Key (Public)"
                            clave="NEXT_PUBLIC_FIREBASE_VAPID_KEY"
                            value={getConfigValue("NEXT_PUBLIC_FIREBASE_VAPID_KEY")}
                            onSave={handleSave}
                            onChange={(v: string) => updateLocalConfig("NEXT_PUBLIC_FIREBASE_VAPID_KEY", v)}
                            loading={loading}
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                        <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-6">
                            Configuración Privada (Server-Side)
                        </h4>
                        <div className="grid grid-cols-1 gap-6">
                            <ConfigField
                                label="Firebase Client Email"
                                clave="FIREBASE_CLIENT_EMAIL"
                                value={getConfigValue("FIREBASE_CLIENT_EMAIL")}
                                onSave={handleSave}
                                onChange={(v: string) => updateLocalConfig("FIREBASE_CLIENT_EMAIL", v)}
                                loading={loading}
                                icon={<User size={18} />}
                            />
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    Firebase Private Key
                                </label>
                                <div className="flex gap-4">
                                    <textarea
                                        rows={4}
                                        value={getConfigValue("FIREBASE_PRIVATE_KEY")}
                                        onChange={(e) => updateLocalConfig("FIREBASE_PRIVATE_KEY", e.target.value)}
                                        placeholder="-----BEGIN PRIVATE KEY-----\n..."
                                        className="flex-1 px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-rose-100 focus:bg-white focus:border-rose-600 transition-all"
                                    />
                                    <button
                                        onClick={() => handleSave("FIREBASE_PRIVATE_KEY")}
                                        disabled={loading}
                                        className="h-fit px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-rose-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest text-xs"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección Legal y Cumplimiento */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Legal y Cumplimiento</h3>
                        <p className="text-sm text-slate-500 font-medium">Gestiona el contenido legal que se muestra a los usuarios.</p>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Términos y Condiciones */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Términos y Condiciones de Servicio
                        </label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <textarea
                                rows={10}
                                value={getConfigValue("TERMINOS_CONDICIONES")}
                                onChange={(e) => updateLocalConfig("TERMINOS_CONDICIONES", e.target.value)}
                                placeholder="Escribe aquí los términos del servicio..."
                                className="flex-1 px-5 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-sm !text-slate-900 focus:outline-none focus:ring-4 focus:ring-amber-100 focus:bg-white focus:border-amber-600 transition-all leading-relaxed"
                            />
                            <div className="md:w-auto">
                                <button
                                    onClick={() => handleSave("TERMINOS_CONDICIONES")}
                                    disabled={loading}
                                    className="w-full h-fit px-8 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-amber-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {loading ? "Guardando..." : "Guardar Términos"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Política de Privacidad */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Política de Privacidad
                        </label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <textarea
                                rows={10}
                                value={getConfigValue("POLITICA_PRIVACIDAD")}
                                onChange={(e) => updateLocalConfig("POLITICA_PRIVACIDAD", e.target.value)}
                                placeholder="Escribe aquí la política de privacidad..."
                                className="flex-1 px-5 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-sm !text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 transition-all leading-relaxed"
                            />
                            <div className="md:w-auto">
                                <button
                                    onClick={() => handleSave("POLITICA_PRIVACIDAD")}
                                    disabled={loading}
                                    className="w-full h-fit px-8 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {loading ? "Guardando..." : "Guardar Privacidad"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <span className="font-bold text-sm">{success}</span>
                </div>
            )}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 flex items-center gap-3">
                    <AlertCircle size={20} className="text-rose-500" />
                    <span className="font-bold text-sm">{error}</span>
                </div>
            )}
        </div>
    );
}

function ConfigField({ label, clave, value, onChange, onSave, loading, icon }: any) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest px-1 text-slate-700">
                {label}
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    {icon && (
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-indigo-600 transition-colors text-slate-400">
                            {icon}
                        </div>
                    )}
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className={`w-full pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 transition-all text-sm placeholder:text-slate-400 !text-slate-900 !bg-white`}
                        style={{ paddingLeft: icon ? '48px' : '16px' }}
                    />
                </div>
                <button
                    onClick={() => onSave(clave)}
                    disabled={loading}
                    className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all disabled:opacity-50 border-2 border-slate-100"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
            </div>
        </div>
    );
}
