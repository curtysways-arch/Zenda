/**
 * Red de repartidores de Citiox.
 *
 * Cada negocio tiene su propio registro del repartidor (OperableResource +
 * ResourceProfile). La identidad del repartidor en toda la red es su teléfono
 * (últimos 9 dígitos), así un repartidor aprobado en un negocio puede sumarse a
 * otro sin volver a subir sus documentos: el nuevo negocio solo los revisa.
 *
 * Estados por negocio (ResourceProfile.verificationStatus):
 *   INVITED              → invitado, aún no completa su registro
 *   PENDING_VERIFICATION → documentos enviados, el negocio debe revisarlos
 *   APPROVED             → forma parte del equipo (active=false = en pausa)
 *   REJECTED             → el negocio pidió corregir algo (puede reenviar)
 *   SUSPENDED            → bloqueado por Citiox en toda la red
 */
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const db = prisma as any;

export const INVITE_DAYS = 7;
export const VEHICLE_TYPES = ['MOTO', 'AUTO', 'BICICLETA', 'A_PIE', 'CAMION'] as const;

export type DriverGroup = 'POR_REVISAR' | 'ACTIVO' | 'INVITADO' | 'PAUSADO' | 'RECHAZADO' | 'BLOQUEADO';

const DOC_FIELDS = ['cedulaFrenteUrl', 'cedulaReversoUrl', 'licenciaUrl', 'matriculaUrl', 'fotoVehiculoUrl', 'selfieUrl'] as const;
const PROFILE_COPY_FIELDS = [
    'documento', 'fechaNacimiento', 'direccion', 'email', 'contactoEmergencia', 'fotografiaUrl', 'licencia',
    'vehiculo', 'marca', 'modelo', 'color', 'placa', 'anio', 'tipoVehiculo', ...DOC_FIELDS,
] as const;

/** Clave de identidad del repartidor: últimos 9 dígitos del teléfono. */
export function phoneKey(phone?: string | null): string | null {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length < 9) return null;
    return d.slice(-9);
}

/** Formato internacional para enlaces de WhatsApp (Ecuador por defecto). */
export function waNumber(phone: string): string {
    const d = phone.replace(/\D/g, '');
    if (d.startsWith('593')) return d;
    if (d.startsWith('0') && d.length === 10) return `593${d.slice(1)}`;
    if (d.length === 9) return `593${d}`;
    return d;
}

export function appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function meta(r: any): Record<string, any> {
    const m = r?.metadata;
    if (!m) return {};
    if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
    return m;
}

export function groupOf(r: any): DriverGroup {
    const s = r?.profile?.verificationStatus;
    if (s === 'SUSPENDED') return 'BLOQUEADO';
    // Repartidor de la red que aún no acepta: sus documentos no se comparten hasta que confirme
    if (s === 'PENDING_VERIFICATION') return meta(r).origen === 'RED_CITIOX' && !meta(r).confirmadoEn ? 'INVITADO' : 'POR_REVISAR';
    if (s === 'INVITED') return 'INVITADO';
    if (s === 'REJECTED') return 'RECHAZADO';
    if (s === 'APPROVED' || !s) return r?.active ? 'ACTIVO' : 'PAUSADO';
    return 'PAUSADO';
}

/** Todos los registros de repartidor (en cualquier negocio) con ese teléfono. */
export async function findNetworkRecords(phone: string) {
    const key = phoneKey(phone);
    if (!key) return [];
    const rows = await db.operableResource.findMany({
        where: { category: 'DELIVERY_DRIVER', profile: { telefono: { contains: key.slice(-7) } } },
        include: { profile: true, negocio: { select: { id: true, nombre: true, ciudad: true } } },
    });
    return rows.filter((r: any) => phoneKey(r.profile?.telefono) === key && !meta(r).removedAt);
}

/** El mejor expediente aprobado del repartidor en la red (para reutilizar sus documentos). */
function bestApproved(records: any[]) {
    return records
        .filter((r) => r.profile?.verificationStatus === 'APPROVED' && r.profile?.activo !== false)
        .sort((a, b) => new Date(b.profile.updatedAt).getTime() - new Date(a.profile.updatedAt).getTime())[0] || null;
}

function copyProfile(p: any) {
    const out: Record<string, any> = {};
    for (const f of PROFILE_COPY_FIELDS) if (p?.[f]) out[f] = p[f];
    return out;
}

function newToken() {
    return crypto.randomUUID();
}

function expiry() {
    return new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
}

export function inviteMessage(opts: { nombre: string; negocio: string; url: string; join: boolean }) {
    const first = opts.nombre.split(' ')[0];
    return opts.join
        ? [
            `Hola ${first} 👋`,
            ``,
            `*${opts.negocio}* quiere sumarte a su equipo de repartidores en Citiox.`,
            ``,
            `Como ya estás verificado en Citiox, no tienes que volver a subir documentos. Confirma aquí:`,
            opts.url,
        ].join('\n')
        : [
            `Hola ${first} 👋`,
            ``,
            `*${opts.negocio}* te invita a ser parte de su equipo de repartidores.`,
            ``,
            `Regístrate y sube tus documentos aquí (toma unos 5 minutos):`,
            opts.url,
            ``,
            `El enlace vence en ${INVITE_DAYS} días.`,
        ].join('\n');
}

function waLink(phone: string, text: string) {
    return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}

/**
 * Invita a un repartidor a un negocio.
 * - Si ya está aprobado en otro negocio: se copia su expediente y queda "Por revisar".
 * - Si es nuevo: queda "Invitado" hasta que complete su registro.
 */
export async function inviteDriver(negocioId: string, input: { nombre?: string; telefono: string; tipoVehiculo?: string }) {
    const key = phoneKey(input.telefono);
    if (!key) throw new HttpError(400, 'Escribe un número de celular completo.');

    const records = await findNetworkRecords(input.telefono);
    const here = records.find((r: any) => r.negocioId === negocioId);
    if (here) {
        const g = groupOf(here);
        const msg: Record<DriverGroup, string> = {
            ACTIVO: 'Este repartidor ya está en tu equipo.',
            PAUSADO: 'Este repartidor ya está en tu equipo (en pausa). Puedes reactivarlo.',
            POR_REVISAR: 'Este repartidor ya envió sus documentos: revísalos en "Por revisar".',
            INVITADO: 'Ya invitaste a este número. Puedes reenviarle la invitación.',
            RECHAZADO: 'Este repartidor está pendiente de corregir sus datos. Puedes reenviarle el enlace.',
            BLOQUEADO: 'Este repartidor está bloqueado por Citiox.',
        };
        throw new HttpError(409, msg[g], { resourceId: here.id, group: g });
    }

    if (records.some((r: any) => r.profile?.verificationStatus === 'SUSPENDED')) {
        throw new HttpError(403, 'Este repartidor está bloqueado en la red de Citiox.');
    }

    const negocio = await db.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true } });
    const approved = bestApproved(records);
    const join = Boolean(approved);
    const nombre = (approved?.name || input.nombre || '').trim();
    if (!nombre) throw new HttpError(400, 'Escribe el nombre del repartidor.');

    const token = newToken();
    const resource = await db.operableResource.create({
        data: {
            negocioId,
            name: nombre,
            avatar: approved?.avatar || null,
            resourceType: 'HUMAN',
            category: 'DELIVERY_DRIVER',
            active: false,
            estado: 'FUERA_DE_SERVICIO',
            metadata: { origen: join ? 'RED_CITIOX' : 'INVITACION', invitadoEn: new Date().toISOString() },
            profile: {
                create: {
                    ...(join ? copyProfile(approved.profile) : {}),
                    telefono: input.telefono.trim(),
                    tipoVehiculo: (join ? approved.profile.tipoVehiculo : input.tipoVehiculo) || 'MOTO',
                    verificationStatus: join ? 'PENDING_VERIFICATION' : 'INVITED',
                    activo: false,
                },
            },
            invitation: {
                create: { negocioId, telefono: input.telefono.trim(), token, expiresAt: expiry(), status: 'PENDING' },
            },
        },
        include: { profile: true },
    });

    const url = `${appUrl()}/invite/${token}`;
    const text = inviteMessage({ nombre, negocio: negocio?.nombre || 'Tu negocio', url, join });
    return {
        kind: join ? ('JOIN' as const) : ('NEW' as const),
        resourceId: resource.id,
        nombre,
        inviteUrl: url,
        whatsappUrl: waLink(input.telefono, text),
        otrosNegocios: join ? records.filter((r: any) => groupOf(r) === 'ACTIVO').length : 0,
    };
}

/** Genera un enlace nuevo (7 días) para un repartidor invitado o rechazado. */
export async function resendInvite(negocioId: string, resourceId: string) {
    const r = await db.operableResource.findFirst({
        where: { id: resourceId, negocioId, category: 'DELIVERY_DRIVER' },
        include: { profile: true, invitation: true, negocio: { select: { nombre: true } } },
    });
    if (!r) throw new HttpError(404, 'Repartidor no encontrado.');
    const token = newToken();
    if (r.invitation) {
        await db.deliveryInvitation.update({ where: { id: r.invitation.id }, data: { token, expiresAt: expiry(), status: 'PENDING', usedAt: null } });
    } else {
        await db.deliveryInvitation.create({ data: { negocioId, resourceId, telefono: r.profile?.telefono || '', token, expiresAt: expiry(), status: 'PENDING' } });
    }
    const url = `${appUrl()}/invite/${token}`;
    const join = r.profile?.verificationStatus === 'PENDING_VERIFICATION' && meta(r).origen === 'RED_CITIOX';
    const text = inviteMessage({ nombre: r.name, negocio: r.negocio?.nombre || 'Tu negocio', url, join });
    return { inviteUrl: url, whatsappUrl: r.profile?.telefono ? waLink(r.profile.telefono, text) : null };
}

/** Decisiones del negocio sobre un repartidor. */
export async function decide(negocioId: string, resourceId: string, action: 'approve' | 'reject' | 'pause' | 'resume' | 'remove', motivo?: string) {
    const r = await db.operableResource.findFirst({
        where: { id: resourceId, negocioId, category: 'DELIVERY_DRIVER' },
        include: { profile: true, negocio: { select: { nombre: true } }, invitation: true },
    });
    if (!r) throw new HttpError(404, 'Repartidor no encontrado.');
    if (r.profile?.verificationStatus === 'SUSPENDED' && action !== 'remove') {
        throw new HttpError(403, 'Este repartidor está bloqueado por Citiox.');
    }
    const phone = r.profile?.telefono || '';
    const negocioNombre = r.negocio?.nombre || 'Tu negocio';
    const first = (r.name || '').split(' ')[0];
    let text = '';

    if (action === 'approve') {
        if (groupOf(r) !== 'POR_REVISAR') throw new HttpError(400, 'Este repartidor aún no ha enviado o compartido sus documentos.');
        await db.operableResource.update({
            where: { id: resourceId },
            data: { active: true, estado: 'DISPONIBLE', profile: { update: { verificationStatus: 'APPROVED', activo: true, motivoRechazo: null } } },
        });
        text = `Hola ${first} 🎉\n\n¡Ya eres parte del equipo de repartidores de *${negocioNombre}*!\n\nEntra a tu app de repartidor con tu número de celular:\n${appUrl()}/driver`;
    } else if (action === 'reject') {
        const reason = (motivo || '').trim() || 'Revisa que tus documentos se vean claros y completos.';
        await db.operableResource.update({
            where: { id: resourceId },
            data: { active: false, estado: 'FUERA_DE_SERVICIO', profile: { update: { verificationStatus: 'REJECTED', activo: false, motivoRechazo: reason } } },
        });
        // Reabrir su enlace para que pueda corregir
        const { inviteUrl } = await resendInvite(negocioId, resourceId);
        text = `Hola ${first}.\n\n*${negocioNombre}* revisó tu registro y necesita que corrijas algo:\n\n• ${reason}\n\nCorrige tus datos aquí:\n${inviteUrl}`;
    } else if (action === 'pause') {
        await db.operableResource.update({ where: { id: resourceId }, data: { active: false, estado: 'FUERA_DE_SERVICIO' } });
    } else if (action === 'resume') {
        if (r.profile?.verificationStatus !== 'APPROVED') throw new HttpError(400, 'Primero aprueba sus documentos.');
        await db.operableResource.update({ where: { id: resourceId }, data: { active: true, estado: 'DISPONIBLE' } });
    } else if (action === 'remove') {
        await db.operableResource.update({
            where: { id: resourceId },
            data: { active: false, estado: 'FUERA_DE_SERVICIO', metadata: { ...meta(r), removedAt: new Date().toISOString() } },
        });
        if (r.invitation && r.invitation.status === 'PENDING') {
            await db.deliveryInvitation.update({ where: { id: r.invitation.id }, data: { status: 'CANCELLED' } });
        }
    }

    return { ok: true, whatsappUrl: text && phone ? waLink(phone, text) : null };
}

/** Equipo de repartidores del negocio, agrupado por estado. */
export async function listTeam(negocioId: string) {
    const rows = await db.operableResource.findMany({
        where: { negocioId, category: 'DELIVERY_DRIVER' },
        include: { profile: true, invitation: true },
        orderBy: { updatedAt: 'desc' },
    });
    const visible = rows.filter((r: any) => !meta(r).removedAt);
    const ids = visible.map((r: any) => r.id);

    const [done, inProgress] = ids.length
        ? await Promise.all([
            db.deliveryAssignment.groupBy({ by: ['resourceId'], where: { resourceId: { in: ids }, estado: 'COMPLETADO' }, _count: { id: true } }),
            db.deliveryAssignment.groupBy({ by: ['resourceId'], where: { resourceId: { in: ids }, estado: { in: ['ASIGNADO', 'ACEPTADO', 'EN_RUTA', 'LLEGO'] } }, _count: { id: true } }),
        ])
        : [[], []];
    const doneMap = new Map(done.map((d: any) => [d.resourceId, d._count.id]));
    const progMap = new Map(inProgress.map((d: any) => [d.resourceId, d._count.id]));

    return visible.map((r: any) => {
        const p = r.profile || {};
        const inv = r.invitation;
        const grupo = groupOf(r);
        const compartido = grupo !== 'INVITADO';
        return {
            id: r.id,
            nombre: r.name,
            avatar: r.avatar || p.selfieUrl || p.fotografiaUrl || null,
            telefono: p.telefono || '',
            grupo,
            esperandoAceptacion: grupo === 'INVITADO' && p.verificationStatus === 'PENDING_VERIFICATION',
            estadoOperativo: r.estado,
            origen: meta(r).origen || 'INVITACION',
            vehiculo: { tipo: p.tipoVehiculo || 'MOTO', marca: p.marca, modelo: p.modelo, color: p.color, placa: p.placa, anio: p.anio },
            datos: compartido ? { documento: p.documento, fechaNacimiento: p.fechaNacimiento, direccion: p.direccion, email: p.email, contactoEmergencia: p.contactoEmergencia } : {},
            documentos: !compartido ? {} : {
                selfieUrl: p.selfieUrl || p.fotografiaUrl || null,
                cedulaFrenteUrl: p.cedulaFrenteUrl || null,
                cedulaReversoUrl: p.cedulaReversoUrl || null,
                licenciaUrl: p.licenciaUrl || null,
                matriculaUrl: p.matriculaUrl || null,
                fotoVehiculoUrl: p.fotoVehiculoUrl || null,
            },
            motivoRechazo: p.motivoRechazo || null,
            invitacion: inv ? { estado: inv.status, vence: inv.expiresAt, vencida: new Date(inv.expiresAt).getTime() < Date.now(), url: `${appUrl()}/invite/${inv.token}` } : null,
            entregas: doneMap.get(r.id) || 0,
            enCurso: progMap.get(r.id) || 0,
            actualizado: r.updatedAt,
        };
    });
}

/**
 * Repartidores aprobados en otros negocios de la red que podrían sumarse.
 * Solo se muestra información básica (sin teléfono ni documentos) hasta que se unan.
 */
export async function recommendations(negocioId: string, limit = 12) {
    const negocio = await db.negocio.findUnique({ where: { id: negocioId }, select: { ciudad: true } });
    const ciudad = String(negocio?.ciudad || '').trim().toLowerCase();

    const rows = await db.operableResource.findMany({
        where: { category: 'DELIVERY_DRIVER', profile: { verificationStatus: 'APPROVED', activo: true } },
        include: { profile: true, negocio: { select: { id: true, ciudad: true } } },
    });
    const mine = await db.operableResource.findMany({
        where: { negocioId, category: 'DELIVERY_DRIVER' },
        select: { profile: { select: { telefono: true } } },
    });
    const myKeys = new Set(mine.map((m: any) => phoneKey(m.profile?.telefono)).filter(Boolean));

    const byKey = new Map<string, any[]>();
    for (const r of rows) {
        const key = phoneKey(r.profile?.telefono);
        if (!key || myKeys.has(key) || meta(r).removedAt) continue;
        if (meta(r).disponibleNuevosNegocios === false) continue;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(r);
    }

    // Repartidores bloqueados por Citiox en algún negocio quedan fuera
    const blocked = await db.resourceProfile.findMany({ where: { verificationStatus: 'SUSPENDED' }, select: { telefono: true } });
    const blockedKeys = new Set(blocked.map((b: any) => phoneKey(b.telefono)).filter(Boolean));

    const allIds = rows.map((r: any) => r.id);
    const done = allIds.length
        ? await db.deliveryAssignment.groupBy({ by: ['resourceId'], where: { resourceId: { in: allIds }, estado: 'COMPLETADO' }, _count: { id: true } })
        : [];
    const doneMap = new Map(done.map((d: any) => [d.resourceId, d._count.id]));

    const list = Array.from(byKey.entries())
        .filter(([key]) => !blockedKeys.has(key))
        .map(([, recs]) => {
            const best = recs.sort((a, b) => new Date(b.profile.updatedAt).getTime() - new Date(a.profile.updatedAt).getTime())[0];
            const ciudades = Array.from(new Set(recs.map((r) => String(r.negocio?.ciudad || '').trim()).filter(Boolean)));
            const parts = String(best.name || '').trim().split(/\s+/);
            return {
                candidateId: best.id,
                nombre: parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0],
                avatar: best.avatar || best.profile.selfieUrl || null,
                vehiculo: best.profile.tipoVehiculo || 'MOTO',
                ciudades,
                mismaCiudad: Boolean(ciudad) && ciudades.some((c) => c.toLowerCase() === ciudad),
                negocios: recs.length,
                entregas: recs.reduce((s, r) => s + (doneMap.get(r.id) || 0), 0),
                desde: recs.reduce((min, r) => (new Date(r.createdAt) < min ? new Date(r.createdAt) : min), new Date()),
            };
        })
        .sort((a, b) => Number(b.mismaCiudad) - Number(a.mismaCiudad) || b.entregas - a.entregas || b.negocios - a.negocios);

    return list.slice(0, limit);
}

/** Invita a un repartidor recomendado (se resuelve su teléfono en el servidor). */
export async function inviteRecommended(negocioId: string, candidateId: string) {
    const r = await db.operableResource.findFirst({
        where: { id: candidateId, category: 'DELIVERY_DRIVER', profile: { verificationStatus: 'APPROVED' } },
        include: { profile: true },
    });
    if (!r?.profile?.telefono) throw new HttpError(404, 'Este repartidor ya no está disponible.');
    return inviteDriver(negocioId, { nombre: r.name, telefono: r.profile.telefono, tipoVehiculo: r.profile.tipoVehiculo });
}

/** Consulta rápida por teléfono para el formulario de invitación (sin datos sensibles). */
export async function lookup(negocioId: string, telefono: string) {
    const records = await findNetworkRecords(telefono);
    if (!records.length) return { existe: false };
    const here = records.find((r: any) => r.negocioId === negocioId);
    const approved = bestApproved(records);
    return {
        existe: true,
        enMiEquipo: here ? groupOf(here) : null,
        verificado: Boolean(approved),
        bloqueado: records.some((r: any) => r.profile?.verificationStatus === 'SUSPENDED'),
        nombre: approved?.name || records[0]?.name || null,
        vehiculo: approved?.profile?.tipoVehiculo || null,
        negocios: records.filter((r: any) => groupOf(r) === 'ACTIVO').length,
    };
}

export class HttpError extends Error {
    constructor(public status: number, message: string, public extra?: Record<string, any>) {
        super(message);
    }
}
