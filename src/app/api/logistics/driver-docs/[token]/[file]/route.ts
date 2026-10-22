import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { groupOf } from '@/lib/logistics/driverNetwork';
import { DOC_FIELDS, isPublicDoc, mimeOf, readDoc, urlVariants, validNames } from '@/lib/logistics/driverDocs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Sirve un documento de repartidor solo a quien puede verlo:
 *  - la foto de perfil (selfie): cualquiera (se muestra al cliente que recibe el pedido);
 *  - el propio repartidor mientras completa o corrige su registro (invitación vigente);
 *  - el negocio que lo tiene en su equipo o en revisión (nunca antes de que el
 *    repartidor acepte unirse, en el caso de la red Citiox);
 *  - el superadmin de Citiox.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string; file: string }> }) {
    const { token, file } = await params;
    if (!validNames(token, file)) return new NextResponse('No encontrado', { status: 404 });

    let allowed = isPublicDoc(file);

    if (!allowed) {
        const session = await getEffectiveAdminSession().catch(() => null);
        const u = session?.user as any;
        const role = String(u?.role || '').toUpperCase();
        const superadmin = role === 'SUPERADMIN' || (Array.isArray(u?.roles) && u.roles.includes('SUPERADMIN'));

        if (superadmin && !u?.isDelegated) {
            allowed = true;
        } else if (u?.negocioId && role !== 'STAFF' && role !== 'PROFESIONAL' && !u?.isExpired) {
            const variants = urlVariants(token, file);
            const profiles = await (prisma as any).resourceProfile.findMany({
                where: { OR: DOC_FIELDS.map((f) => ({ [f]: { in: variants } })) },
                include: { resource: true },
            });
            allowed = profiles.some((p: any) => {
                const r = { ...p.resource, profile: p };
                return (
                    r.negocioId === u.negocioId &&
                    !(r.metadata as any)?.removedAt &&
                    groupOf(r) !== 'INVITADO'
                );
            });
        }

        if (!allowed) {
            const inv = await (prisma as any).deliveryInvitation.findUnique({
                where: { token },
                select: { status: true, expiresAt: true },
            });
            allowed = !!inv && inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date();
        }
    }

    if (!allowed) return new NextResponse('No autorizado', { status: 403 });

    const buf = await readDoc(token, file);
    if (!buf) return new NextResponse('No encontrado', { status: 404 });

    return new NextResponse(new Uint8Array(buf), {
        headers: {
            'Content-Type': mimeOf(file),
            'Cache-Control': isPublicDoc(file) ? 'public, max-age=86400' : 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': 'inline',
        },
    });
}
