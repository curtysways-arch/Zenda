import { AlertTriangle, Home, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function VencidoPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                    <ShieldAlert size={48} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">Acceso Restringido</h1>
                    <p className="text-slate-500">
                        Tu suscripción ha vencido o el negocio se encuentra suspendido.
                        Contacta al administrador del sistema para restablecer el acceso.
                    </p>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-left">
                    <div className="flex gap-3">
                        <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                        <div>
                            <p className="text-rose-900 text-sm font-bold">Importante</p>
                            <p className="text-rose-800 text-xs">
                                No podrás gestionar reservas ni ver métricas hasta que regularices tu situación.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        href="mailto:admin@tudominio.com"
                        className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Mail size={18} />
                        Contactar Soporte
                    </Link>
                    <Link
                        href="/login"
                        className="text-slate-500 text-sm font-medium hover:text-slate-700 underline"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
