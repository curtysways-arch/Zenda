import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Stethoscope, Sparkles, Smile, Activity, Award, Heart,
  ShieldCheck, Zap, Star, ArrowLeft, Calendar, Phone, MessageCircle,
  CheckCircle2, ChevronRight
} from 'lucide-react';

const SPECIALTIES = [
  {
    title: 'Odontología General & Preventiva',
    desc: 'Evaluaciones completas, profilaxis con ultrasonido, sellantes y prevención de caries. Mantenemos tu salud bucal con revisiones periódicas personalizadas.',
    icon: Stethoscope,
    highlight: 'Prevención',
    benefits: ['Limpieza dental profesional', 'Detección temprana de caries', 'Sellantes preventivos', 'Radiografías diagnósticas'],
    color: '#0284c7',
  },
  {
    title: 'Estética & Blanqueamiento',
    desc: 'Diseño de sonrisa integral, carillas de resina/porcelana y blanqueamiento dental led de última generación para una sonrisa perfecta.',
    icon: Sparkles,
    highlight: 'Estética',
    benefits: ['Diseño de sonrisa digital', 'Carillas de porcelana', 'Blanqueamiento LED', 'Remodelado dental estético'],
    color: '#7c3aed',
  },
  {
    title: 'Ortodoncia & Alineadores',
    desc: 'Brackets metálicos, estéticos y alineadores invisibles para una alineación dental perfecta. Corrección de mordidas y apiñamientos.',
    icon: Smile,
    highlight: 'Alineación',
    benefits: ['Brackets tradicionales', 'Alineadores transparentes', 'Corrección de mordida', 'Contención post-tratamiento'],
    color: '#059669',
  },
  {
    title: 'Endodoncia Microscópica',
    desc: 'Tratamiento de conductos sin dolor con instrumentación rotatoria mecanizada y microscopía dental de alta resolución.',
    icon: Activity,
    highlight: 'Cuidado Pulpar',
    benefits: ['Sin dolor', 'Alta precisión microscópica', 'Instrumentación rotatoria', 'Recuperación rápida'],
    color: '#dc2626',
  },
  {
    title: 'Rehabilitación & Implantes',
    desc: 'Coronas de zirconio, prótesis fijas y reposición definitiva de piezas dentales perdidas con implantes de titanio de alta calidad.',
    icon: Award,
    highlight: 'Restauración',
    benefits: ['Implantes de titanio', 'Coronas de zirconio', 'Prótesis fijas y removibles', 'Rehabilitación completa'],
    color: '#d97706',
  },
  {
    title: 'Odontopediatría',
    desc: 'Atención especializada, lúdica y sin traumas para la salud bucal de los más pequeños. Consultorios ambientados para niños.',
    icon: Heart,
    highlight: 'Niños',
    benefits: ['Atención sin estrés', 'Sellantes pediátricos', 'Flúor tópico', 'Educación de higiene bucal'],
    color: '#db2777',
  },
  {
    title: 'Periodoncia & Encías',
    desc: 'Diagnóstico y tratamiento de enfermedades de las encías. Control de periodontitis y gingivitis con técnicas mínimamente invasivas.',
    icon: ShieldCheck,
    highlight: 'Encías',
    benefits: ['Raspado y alisado radicular', 'Cirugía periodontal', 'Control de placa', 'Mantenimiento periodontal'],
    color: '#0891b2',
  },
  {
    title: 'Urgencias Odontológicas',
    desc: 'Atención prioritaria para dolores agudos, traumas dentales y situaciones de emergencia que requieren respuesta inmediata.',
    icon: Zap,
    highlight: 'Urgencias',
    benefits: ['Atención same-day', 'Control del dolor', 'Trauma dental', 'Abscesos dentales'],
    color: '#ea580c',
  },
  {
    title: 'Cirugía Oral',
    desc: 'Extracciones simples y complejas, exodoncias de terceros molares (muelas del juicio) y cirugías orales menores.',
    icon: Star,
    highlight: 'Cirugía',
    benefits: ['Extracción de muelas del juicio', 'Cirugía sin bisturí', 'Sedación consciente', 'Seguimiento post-quirúrgico'],
    color: '#6d28d9',
  },
];

export default async function EspecialidadesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const negocio = await prisma.negocio.findUnique({
    where: { slug },
  });

  if (!negocio) notFound();

  const primaryColor = (negocio as any).colorPrimario || '#0284c7';
  const businessName = negocio.nombre || 'Clínica Dental';
  const whatsapp = (negocio as any).whatsapp || '';
  const cleanPhone = whatsapp.replace(/\D/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola, quiero más información sobre los tratamientos en ${businessName}`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={`/${slug}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Volver</span>
          </Link>
          <span className="text-sm font-bold text-slate-900">{businessName}</span>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-bold shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Agendar
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span
            className="inline-block text-xs font-extrabold tracking-wide uppercase px-4 py-1.5 rounded-full"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            Áreas de Atención
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Especialidades<br />
            <span style={{ color: primaryColor }}>Odontológicas Integrales</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Contamos con procedimientos de vanguardia para dar respuesta a cada necesidad clínica de tu boca y encías. Tecnología avanzada con trato humano.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href={`/${slug}/servicios`}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-sm shadow-lg transition-all hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              <Calendar className="w-4 h-4" />
              Ver Servicios y Precios
            </Link>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border-2 font-bold text-sm transition-all hover:scale-105"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Phone className="w-4 h-4" />
                Consultar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Specialties Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SPECIALTIES.map((esp, idx) => {
              const IconComp = esp.icon;
              return (
                <div
                  key={idx}
                  className="group relative bg-white rounded-3xl border border-slate-100 p-8 hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col"
                >
                  <div
                    className="absolute top-0 left-8 right-8 h-1 rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ backgroundColor: esp.color }}
                  />

                  <div className="flex items-center justify-between mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 duration-300"
                      style={{ backgroundColor: `${esp.color}18`, color: esp.color }}
                    >
                      <IconComp className="w-7 h-7" />
                    </div>
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full border"
                      style={{ backgroundColor: `${esp.color}10`, color: esp.color, borderColor: `${esp.color}30` }}
                    >
                      {esp.highlight}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                    {esp.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">
                    {esp.desc}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {esp.benefits.map((b, bi) => (
                      <li key={bi} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <CheckCircle2
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: esp.color }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/${slug}/servicios`}
                    className="flex items-center justify-between px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-200 mt-auto"
                    style={{ backgroundColor: `${esp.color}10`, color: esp.color }}
                  >
                    <span>Agendar cita</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <span
            className="inline-block text-xs font-extrabold tracking-wide uppercase px-4 py-1.5 rounded-full"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            ¿No encuentras lo que buscas?
          </span>
          <h2 className="text-3xl font-bold text-slate-900">
            Contáctanos y te orientamos
          </h2>
          <p className="text-slate-500">
            Nuestro equipo de especialistas te indicará el tratamiento ideal para tu caso particular. Primera consulta de evaluación disponible.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-full text-white font-bold text-sm shadow-xl transition-all hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                <MessageCircle className="w-5 h-5" />
                Escribir por WhatsApp
              </a>
            )}
            <Link
              href={`/${slug}`}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 font-bold text-sm transition-all hover:scale-105 text-slate-700 border-slate-200"
            >
              Ver Inicio
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm">{businessName}</p>
            <p className="text-slate-400 text-xs mt-0.5">Especialidades Odontológicas Integrales</p>
          </div>
          <div className="flex gap-4">
            <Link href={`/${slug}`} className="text-slate-400 hover:text-white text-xs transition-colors">Inicio</Link>
            <Link href={`/${slug}/servicios`} className="text-slate-400 hover:text-white text-xs transition-colors">Servicios</Link>
            <Link href={`/${slug}/paginas`} className="text-slate-400 hover:text-white text-xs transition-colors">Páginas</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}