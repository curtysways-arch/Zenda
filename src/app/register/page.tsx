import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";
import { ArrowLeft, CalendarCheck, Smartphone, Gift, MessageCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "Crea tu negocio | Citiox",
    description: "Tu página de reservas, agenda y app para clientes, lista en minutos.",
};

const BENEFITS = [
    { icon: CalendarCheck, title: "Reservas las 24 horas", text: "Tus clientes reservan solos desde tu página." },
    { icon: Smartphone, title: "Tu propia app", text: "Se instala en el celular de tus clientes con tu logo." },
    { icon: Gift, title: "Club de puntos", text: "Premia a quienes vuelven y traen amigos." },
    { icon: MessageCircle, title: "Avisos por WhatsApp", text: "Confirmaciones y recordatorios automáticos." },
];

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Panel de marca (escritorio) */}
            <aside className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-10 xl:p-14 relative overflow-hidden">
                <div className="absolute -top-32 -right-32 size-96 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute -bottom-40 -left-24 size-96 rounded-full bg-violet-600/20 blur-3xl" />

                <Link href="/" className="relative inline-flex items-center gap-2.5 w-fit">
                    <img src="/citiox-icon.png" alt="" className="size-9 rounded-lg bg-white/10 object-contain" />
                    <span className="text-lg font-bold">Citiox</span>
                </Link>

                <div className="relative max-w-md">
                    <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
                        Tu negocio en línea, <span className="text-cyan-300">listo en minutos.</span>
                    </h2>
                    <p className="text-slate-400 mt-3">Página de reservas, agenda, app y club de clientes en un solo lugar.</p>
                    <ul className="mt-8 space-y-4">
                        {BENEFITS.map((b) => (
                            <li key={b.title} className="flex gap-3">
                                <span className="size-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><b.icon size={17} className="text-cyan-300" /></span>
                                <span>
                                    <span className="block text-sm font-semibold">{b.title}</span>
                                    <span className="block text-sm text-slate-400">{b.text}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Citiox · Booking &amp; App Solutions</p>
            </aside>

            {/* Formulario */}
            <main className="flex flex-col min-h-screen">
                <header className="flex items-center justify-between px-5 sm:px-8 h-16">
                    <Link href="/" className="lg:invisible inline-flex items-center gap-2">
                        <img src="/citiox-icon.png" alt="" className="size-8 rounded-lg object-contain" />
                        <span className="font-bold text-slate-900">Citiox</span>
                    </Link>
                    <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                        <ArrowLeft size={15} /> Volver
                    </Link>
                </header>
                <div className="flex-1 flex items-start sm:items-center justify-center px-5 sm:px-8 pb-10">
                    <div className="w-full max-w-xl">
                        <Suspense fallback={null}>
                            <RegisterForm />
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
}
