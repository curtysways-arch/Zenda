import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ share_code: string }> }
) {
    try {
        const { share_code } = await params;
        const body = await req.json();
        const { player_name, status } = body;

        if (!player_name || !status) {
            return NextResponse.json({ error: 'Nombre y estado requeridos' }, { status: 400 });
        }

        const partido = await (prisma as any).sharedMatch.findUnique({
            where: { share_code }
        });

        if (!partido) {
            return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
        }

        const player = await (prisma as any).sharedMatchPlayer.upsert({
            where: {
                match_id_player_name: {
                    match_id: partido.id,
                    player_name: player_name.trim()
                }
            },
            update: {
                status
            },
            create: {
                match_id: partido.id,
                player_name: player_name.trim(),
                status
            }
        });

        return NextResponse.json({ success: true, player });

    } catch (error) {
        console.error('Error uniendo al partido:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
