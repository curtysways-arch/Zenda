import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ArrowLeft, Shield } from 'lucide-react';

export default async function PrivacidadPage() {
    const config = await prisma.globalConfig.findUnique({
        where: { clave: 'POLITICA_PRIVACIDAD' }
    });

    const content = config?.valor || `
# Política de Privacidad de CitiOx

En CitiOx, respetamos su privacidad y estamos comprometidos a proteger sus datos personales. Esta política explica cómo recopilamos, usamos y resguardamos su información.

## 1. Información que Recopilamos
Recopilamos información necesaria para la gestión y reserva de citas, servicios y membresías, incluyendo nombres, correos electrónicos, números de teléfono de contacto y detalles de las transacciones.

## 2. Uso de la Información
La información recopilada se utiliza para:
- Proporcionar y mantener el servicio de reservas y administración.
- Enviar notificaciones automáticas por WhatsApp para confirmación de reservas y recordatorios.
- Procesar pagos de manera segura a través de pasarelas certificadas.
- Mejorar la experiencia del usuario y personalizar el servicio.

## 3. Protección de Datos
Implementamos altos estándares de seguridad técnica y organizativa para proteger sus datos contra el acceso no autorizado, pérdida o alteración. Todo el tráfico de datos se cifra mediante SSL.

## 4. Compartir Información
CitiOx no vende, alquila ni comparte sus datos personales con terceros para fines comerciales. Solo se comparte información esencial con proveedores de servicios autorizados para operar la plataforma.

## 5. Derechos del Usuario
Usted tiene derecho a conocer, rectificar, cancelar u oponerse al tratamiento de sus datos personales. Puede ejercer estos derechos enviando una solicitud a nuestro equipo de soporte.

## 6. Cookies y Seguimiento
Utilizamos cookies para mejorar la navegación y analizar el rendimiento del sitio. Usted puede desactivar las cookies en la configuración de su navegador.

## 7. Cambios en la Política
Podemos actualizar nuestra Política de Privacidad periódicamente. Le notificaremos cualquier cambio publicando la nueva versión en esta página.

## 8. Cumplimiento Legal
CitiOx cumple con las normativas locales e internacionales de protección de datos personales.

## 9. Contacto
Para cualquier duda o comentario sobre su privacidad, envíenos un correo electrónico a los canales de soporte oficiales.
    `;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
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
                        Política de Privacidad
                    </h1>
                    <p className="text-slate-500 font-medium italic">Última actualización: 29 de Marzo, 2026</p>
                </header>

                <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-slate-200 border border-slate-100 prose prose-slate max-w-none prose-headings:italic prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-h2:text-cyan-500 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                    <div className="whitespace-pre-wrap font-medium text-slate-700 leading-relaxed">
                        {content}
                    </div>
                </div>

                <footer className="mt-20 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-4 text-center md:text-left">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Tus datos están seguros</h4>
                        <p className="text-xs text-slate-400 font-medium">Cumplimos con los más altos estándares éticos y legales en el manejo de tu información.</p>
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
