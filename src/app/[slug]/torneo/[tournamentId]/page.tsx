import { getNegocioBySlug } from '@/lib/services';
import { notFound } from 'next/navigation';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { PublicTournamentClient } from './PublicTournamentClient';
import prisma from '@/lib/prisma';

export default async function PublicTournamentPage({
    params
}: {
    params: Promise<{ slug: string, tournamentId: string }>
}) {
    const { slug, tournamentId } = await params;

    const negocio = await getNegocioBySlug(slug);
    if (!negocio) notFound();

    const torneo = await prisma.tournament.findUnique({
        where: { id: tournamentId, businessId: negocio.id },
        include: {
            teams: true,
            matches: {
                include: { teamA: true, teamB: true },
                orderBy: [{ round: 'asc' }, { fecha: 'asc' }]
            },
            standings: {
                include: { team: true },
                orderBy: [{ puntos: 'desc' }, { golesFavor: 'desc' }]
            }
        }
    });

    if (!torneo) notFound();

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Hero Section */}
            <div className="bg-emerald-600 text-white pt-20 pb-16 px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                    <Trophy size={400} />
                </div>
                <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                        <Trophy size={32} className="text-white drop-shadow-md" />
                    </div>
                    <span className="bg-white/20 text-white backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                        {torneo.estado === 'activo' ? 'EN JUEGO' : torneo.estado === 'finalizado' ? 'FINALIZADO' : 'PRÓXIMAMENTE'}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-sm">{torneo.nombre}</h1>
                    <p className="text-emerald-50 text-lg md:text-xl font-medium max-w-2xl opacity-90">
                        {torneo.descripcion || 'Sigue los resultados, estadísticas y el calendario completo del torneo.'}
                    </p>
                    <Link href={`/${slug}`} className="mt-8 text-sm font-bold bg-white text-emerald-600 px-6 py-3 rounded-xl hover:bg-emerald-50 transition shadow-lg">
                        Volver a {negocio.nombre}
                    </Link>
                </div>
            </div>

            {/* Tabs delegated to Client Component */}
            <div className="flex-1 -mt-8 relative z-20 px-4 md:px-8 pb-20">
                <div className="max-w-4xl mx-auto">
                    <PublicTournamentClient torneo={torneo} />
                </div>
            </div>
        </main>
    );
}
