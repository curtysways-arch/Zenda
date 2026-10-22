import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { phoneKey, groupOf } from '@/lib/logistics/driverNetwork';
import { DOC_FIELDS, normalizeDocUrl } from '@/lib/logistics/driverDocs';

export const dynamic = 'force-dynamic';

const db = prisma as any;

type GlobalStatus = 'ACTIVO' | 'EN_REVISION' | 'INVITADO' | 'RECHAZADO' | 'PAUSADO' | 'BLOQUEADO';

function countDocs(p: any) {
    return DOC_FIELDS.filter((f) => !!p?.[f]).length;
}

/**
 * GET → todos los repartidores de la red Citiox agrupados por persona (últimos 9 dígitos
 * del teléfono), con sus negocios, estado global, documentos y entregas completadas.
 * La ruta está protegida por el middleware (solo superadmin).
 */
export async function GET() {
    try {
        const resources = await db.operableResource.findMany({
            where: { category: 'DELIVERY_DRIVER' },
            include: {
                profile: true,
                negocio: { select: { id: true, nombre: true, slug: true, logoUrl: true, ciudad: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Entregas completadas por ficha de repartidor
        const done: Record<string, number> = {};
        try {
            const rows = await db.deliveryAssignment.groupBy({
                by: ['resourceId'],
                where: { estado: 'COMPLETADO' },
                _count: { _all: true },
            });
            for (const r of rows) done[r.resourceId] = r._count._all;
        } catch {}

        const people = new Map<string, any>();
        for (const r of resources) {
            if ((r.metadata as any)?.removedAt) continue;
            const key = phoneKey(r.profile?.telefono) || `id:${r.id}`;
            if (!people.has(key)) people.set(key, { key, records: [] as any[] });
            people.get(key).records.push(r);
        }

        const drivers = Array.from(people.values()).map(({ key, records }) => {
            // Ficha "principal": la que tiene más documentos (y aprobada si hay empate)
            const best = [...records].sort((a, b) => {
                const d = countDocs(b.profile) - countDocs(a.profile);
                if (d) return d;
                return (b.profile?.verificationStatus === 'APPROVED' ? 1 : 0) - (a.profile?.verificationStatus === 'APPROVED' ? 1 : 0);
            })[0];
            const p = best.profile || {};
            const groups = records.map((r: any) => groupOf(r));

            let status: GlobalStatus;
            if (groups.every((g: string) => g === 'BLOQUEADO')) status = 'BLOQUEADO';
            else if (groups.includes('ACTIVO')) status = 'ACTIVO';
            else if (groups.includes('POR_REVISAR')) status = 'EN_REVISION';
            else if (groups.includes('PAUSADO')) status = 'PAUSADO';
            else if (groups.includes('RECHAZADO')) status = 'RECHAZADO';
            else status = 'INVITADO';

            const documentos: Record<string, string | null> = {};
            for (const f of DOC_FIELDS) documentos[f] = normalizeDocUrl(p[f]);

            return {
                key,
                name: best.name,
                phone: p.telefono || '',
                email: p.email || '',
                documento: p.documento || '',
                tipoVehiculo: p.tipoVehiculo || 'MOTO',
                vehiculo: [p.marca, p.modelo, p.color].filter(Boolean).join(' ') || p.vehiculo || '',
                placa: p.placa || '',
                ciudad: best.negocio?.ciudad || '',
                selfieUrl: normalizeDocUrl(p.selfieUrl),
                status,
                motivoBloqueo: status === 'BLOQUEADO' ? p.motivoRechazo || null : null,
                disponibleRed: !records.some((r: any) => (r.metadata as any)?.disponibleNuevosNegocios === false),
                creadoEn: records[0].createdAt,
                entregas: records.reduce((s: number, r: any) => s + (done[r.id] || 0), 0),
                documentos,
                docsCount: countDocs(p),
                negocios: records.map((r: any) => ({
                    resourceId: r.id,
                    negocioId: r.negocioId,
                    nombre: r.negocio?.nombre || 'Negocio',
                    slug: r.negocio?.slug || null,
                    logoUrl: r.negocio?.logoUrl || null,
                    estado: groupOf(r),
                    origen: (r.metadata as any)?.origen || 'INVITACION',
                    entregas: done[r.id] || 0,
                    desde: r.createdAt,
                })),
            };
        });

        drivers.sort((a, b) => {
            const order: Record<GlobalStatus, number> = { EN_REVISION: 0, ACTIVO: 1, PAUSADO: 2, INVITADO: 3, RECHAZADO: 4, BLOQUEADO: 5 };
            return order[a.status as GlobalStatus] - order[b.status as GlobalStatus] || a.name.localeCompare(b.name);
        });

        const count = (s: GlobalStatus) => drivers.filter((d) => d.status === s).length;
        return NextResponse.json({
            success: true,
            drivers,
            stats: {
                total: drivers.length,
                ACTIVO: count('ACTIVO'),
                EN_REVISION: count('EN_REVISION'),
                INVITADO: count('INVITADO'),
                PAUSADO: count('PAUSADO'),
                RECHAZADO: count('RECHAZADO'),
                BLOQUEADO: count('BLOQUEADO'),
                negocios: new Set(resources.map((r: any) => r.negocioId)).size,
                entregas: Object.values(done).reduce((s, n) => s + n, 0),
            },
        });
    } catch (error: any) {
        console.error('[SUPERADMIN DRIVERS GET ERROR]', error);
        return NextResponse.json({ error: 'Error cargando repartidores' }, { status: 500 });
    }
}

/**
 * POST { action: 'TOGGLE_GLOBAL_BLOCK', driverPhone, globalStatus: 'BLOQUEADO' | 'ACTIVO', motivo }
 * Bloquea a la persona en todos los negocios (guarda el estado previo para restaurarlo).
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, driverPhone, globalStatus, motivo } = body;

        if (action === 'TOGGLE_GLOBAL_BLOCK') {
            const key = phoneKey(driverPhone);
            if (!key) return NextResponse.json({ error: 'Teléfono de repartidor requerido' }, { status: 400 });

            const candidates = await db.resourceProfile.findMany({ where: { telefono: { contains: key.slice(-8) } } });
            const profiles = candidates.filter((p: any) => phoneKey(p.telefono) === key);
            const isBlock = globalStatus === 'BLOQUEADO';
            if (isBlock && !String(motivo || '').trim()) {
                return NextResponse.json({ error: 'Escribe el motivo del bloqueo.' }, { status: 400 });
            }

            for (const prof of profiles) {
                if (isBlock && prof.verificationStatus === 'SUSPENDED') continue;
                const prev = String(prof.observaciones || '').startsWith('prev:') ? String(prof.observaciones).slice(5) : 'APPROVED';
                await db.resourceProfile.update({
                    where: { id: prof.id },
                    data: isBlock
                        ? {
                              activo: false,
                              verificationStatus: 'SUSPENDED',
                              motivoRechazo: String(motivo).trim().slice(0, 300),
                              // Estado previo para restaurarlo al desbloquear
                              observaciones: `prev:${prof.verificationStatus}`,
                          }
                        : {
                              // Vuelve a su estado anterior (no se aprueba a quien no estaba aprobado)
                              activo: prev === 'APPROVED',
                              verificationStatus: prev,
                              motivoRechazo: null,
                              observaciones: null,
                          },
                });
            }

            return NextResponse.json({
                success: true,
                updated: profiles.length,
                message: isBlock ? 'Repartidor bloqueado en toda la red' : 'Repartidor desbloqueado',
            });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error: any) {
        console.error('[SUPERADMIN DRIVERS POST ERROR]', error);
        return NextResponse.json({ error: 'No se pudo completar la acción' }, { status: 500 });
    }
}
