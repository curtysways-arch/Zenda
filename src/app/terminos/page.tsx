import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ArrowLeft, FileText } from 'lucide-react';

export default async function TerminosPage() {
    const config = await prisma.globalConfig.findUnique({
        where: { clave: 'TERMINOS_CONDICIONES' }
    });

    const content = config?.valor || `
# Términos y Condiciones de Uso

Bienvenido a CitiOx. Al utilizar nuestra plataforma, usted acepta los siguientes términos y condiciones. Por favor, léalos detenidamente.

## 1. Aceptación de los Términos
Al registrarse y utilizar CitiOx, usted acepta estar legalmente vinculado por estos términos, que rigen su relación con nuestra plataforma.

## 2. Descripción del Servicio
CitiOx proporciona herramientas de gestión y reservas para spas, estéticas, salones de belleza, barberías y negocios de servicios, incluyendo pero no limitado a: gestión de reservas de citas, automatización por WhatsApp, pasarelas de pago y administración de especialistas.

## 3. Registro de Cuenta
Para utilizar el servicio, debe crear una cuenta proporcionando información veraz y completa. Usted es responsable de mantener la confidencialidad de sus credenciales.

## 4. Uso del Servicio
Usted se compromete a no utilizar el servicio para fines ilegales o no autorizados. No debe interferir o interrumpir la integridad o el rendimiento del servicio.

## 5. Pagos y Suscripciones
CitiOx ofrece diversos planes de suscripción. Los pagos se realizan de forma mensual o anual según el plan elegido. El impago puede resultar en la suspensión o cancelación del servicio.

## 6. Propiedad Intelectual
Todo el contenido y la tecnología de CitiOx son propiedad exclusiva de la plataforma o de sus licenciantes y están protegidos por las leyes de propiedad intelectual.

## 7. Limitación de Responsabilidad
CitiOx no será responsable de ningún daño indirecto, incidental, especial o consecuente resultante del uso o la imposibilidad de usar el servicio.

## 8. Modificaciones
Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor tan pronto como se publiquen en la plataforma.

## 9. Contacto
Si tiene alguna pregunta sobre estos Términos, por favor contáctenos a través de los canales de soporte oficiales.
    `;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
                <div className="max-w-4xl mx-auto px-6 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-cyan-500 transition-colors group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/logo-citiox.png" alt="CitiOx Logo" className="w-6 h-6 object-contain" />
                        <span className="text-sm font-black italic tracking-tighter uppercase text-slate-900">
                            CitiOx
                        </span>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <header className="mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-cyan-100">
                        Legal
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter italic uppercase">
                        Términos de Servicio
                    </h1>
                    <p className="text-slate-500 font-medium italic">Última actualización: 29 de Marzo, 2026</p>
                </header>

                <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-slate-200 border border-slate-100 prose prose-slate max-w-none prose-headings:italic prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-h2:text-cyan-500 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                    <div className="whitespace-pre-wrap font-medium text-slate-700">
                        {content}
                    </div>
                </div>

                <footer className="mt-20 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">¿Tienes dudas legales?</h4>
                        <p className="text-xs text-slate-400 font-medium">Nuestro equipo está listo para ayudarte con cualquier consulta técnica o legal.</p>
                    </div>
                    <Link 
                        href="/register"
                        className="bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-cyan-200/50 hover:brightness-110 transition-all active:scale-95"
                    >
                        Empezar ahora
                    </Link>
                </footer>
            </main>
        </div>
    );
}
