import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SharedMatchClient } from './SharedMatchClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getServerSession } from "next-auth";

export const dynamic = 'force-dynamic';

export default async function PartidoCompartidoPage({
    params
}: {
    params: Promise<{ share_code: string }>;
}) {
    const { share_code } = await params;

    const partido = await (prisma as any).sharedMatch.findUnique({
        where: { share_code },
        include: {
            reserva: {
                include: {
                    cancha: true,
                    cliente: true
                }
            },
            negocio: true,
            players: {
                orderBy: { createdAt: 'asc' }
            },
            games: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!partido) {
        notFound();
    }

    let isAdmin = false;
    const session = await getServerSession();

    if (session?.user) {
        const user = session.user as any;
        if (user.role === 'SUPERADMIN' || user.negocioId === partido.businessId) {
            isAdmin = true;
        }
    }
    
    if (!isAdmin) {
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;
        if (token) {
            try {
                const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
                const verification = await jwtVerify(token, secret);
                if (verification.payload.telefono === partido.reserva?.cliente?.telefono) {
                    isAdmin = true;
                }
            } catch (e) {
                // Ignore token errors
            }
        }
    }

    const cancha = partido.reserva?.cancha;
    const precioPorJugador = partido.precio_total / (partido.jugadores_necesarios || 1);

    const matchInfo = {
        id: partido.id,
        fecha: format(partido.fecha, "EEEE d 'de' MMMM", { locale: es }),
        hora: `${partido.hora_inicio} - ${partido.hora_fin} hs`,
        cancha_nombre: cancha?.nombre || 'Cancha',
        direccion: partido.negocio?.direccion || 'Ubicación',
        precio_total: partido.precio_total,
        precio_por_jugador: precioPorJugador,
        dividir_pago: partido.dividir_pago,
        jugadores_necesarios: partido.jugadores_necesarios,
        estado_partido: partido.estado_partido,
        equipo_a_nombre: partido.equipo_a_nombre,
        equipo_b_nombre: partido.equipo_b_nombre,
        equipo_a_goles: partido.equipo_a_goles,
        equipo_b_goles: partido.equipo_b_goles,
        games: partido.games?.map((g: any) => ({
            id: g.id,
            nombre: g.nombre,
            estado: g.estado,
            equipo_a_nombre: g.equipo_a_nombre,
            equipo_b_nombre: g.equipo_b_nombre,
            equipo_a_goles: g.equipo_a_goles,
            equipo_b_goles: g.equipo_b_goles,
            createdAt: g.createdAt
        })) || [],
        reserva_estado: partido.reserva?.estado,
        expiresAt: partido.reserva?.expiresAt ? partido.reserva.expiresAt.toISOString() : null,
        jugadores: partido.players?.map((p: any) => ({
            id: p.id,
            nombre: p.player_name,
            estado: p.status,
            ya_pago: p.ya_pago,
            equipo: p.equipo,
            fecha: p.createdAt
        })) || []
    };

    return (
        <SharedMatchClient
            matchInfo={matchInfo}
            shareCode={share_code}
            businessName={partido.negocio?.nombre || 'Canchas'}
            isAdmin={isAdmin}
        />
    );
}
