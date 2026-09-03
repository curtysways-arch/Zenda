import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { redirect } from 'next/navigation';
import { Calendar, Users, Target, Search } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPartidosPage() {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
        redirect('/login');
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
        redirect('/admin');
    }

    let partidos: any[] = [];
    try {
        partidos = await (prisma as any).sharedMatch?.findMany({
            where: { businessId: negocioId },
            include: { players: true },
            orderBy: { fecha: 'desc' }
        }) || [];
    } catch (_) {
        partidos = [];
    }

    return (
        <div className="p-8 max-w-7xl mx-auto font-sans text-slate-900">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">
                        Competencias & Retos
                    </span>
                    <h1 className="text-3xl font-black tracking-tight uppercase italic">Partidos Compartidos</h1>
                    <p className="text-slate-500 text-xs font-semibold">Partidos públicos asociados a la reserva de tus canchas.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden p-6 space-y-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar partido..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl outline-none transition-all text-xs font-bold"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha y Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancha</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ocupación</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {partidos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold">
                                        No hay partidos compartidos registrados aún.
                                    </td>
                                </tr>
                            ) : (
                                partidos.map((partido) => (
                                    <tr key={partido.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-xs">{new Date(partido.fecha).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-xs">Cancha 1 (Cristal)</td>
                                        <td className="px-6 py-4 font-bold text-xs">4 / 4 Jugadores</td>
                                        <td className="px-6 py-4 text-right font-black text-xs text-emerald-600">CONFIRMADO</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
