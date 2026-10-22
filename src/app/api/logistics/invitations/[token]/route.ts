import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeDocUrl, isDocOfToken } from '@/lib/logistics/driverDocs';

export const dynamic = 'force-dynamic';

const db = prisma as any;

function meta(r: any): Record<string, any> {
  const m = r?.metadata;
  if (!m) return {};
  if (typeof m === 'string') { try { return JSON.parse(m); } catch { return {}; } }
  return m;
}

async function load(token: string) {
  return db.deliveryInvitation.findUnique({
    where: { token },
    include: {
      negocio: { select: { id: true, nombre: true, logoUrl: true, colorPrimario: true, ciudad: true } },
      resource: { include: { profile: true } },
    },
  });
}

/**
 * Modo del enlace:
 *  - REGISTRO   → repartidor nuevo: completa datos y documentos
 *  - CORREGIR   → el negocio pidió corregir algo: vuelve a enviar
 *  - UNIRSE     → ya verificado en Citiox: solo confirma que se une
 *  - EN_REVISION / APROBADO → solo informa el estado
 */
function modeOf(inv: any): 'REGISTRO' | 'CORREGIR' | 'UNIRSE' | 'EN_REVISION' | 'APROBADO' {
  const p = inv.resource?.profile;
  const s = p?.verificationStatus;
  if (s === 'APPROVED') return 'APROBADO';
  if (s === 'REJECTED') return 'CORREGIR';
  if (s === 'INVITED') return 'REGISTRO';
  if (s === 'PENDING_VERIFICATION') {
    const joining = meta(inv.resource).origen === 'RED_CITIOX' && !meta(inv.resource).confirmadoEn;
    return joining ? 'UNIRSE' : 'EN_REVISION';
  }
  return 'EN_REVISION';
}

// ─── GET: datos de la invitación ──────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const inv = await load(token);
    if (!inv || inv.status === 'CANCELLED' || meta(inv.resource).removedAt) {
      return NextResponse.json({ error: 'Esta invitación ya no está disponible. Pide al negocio que te envíe una nueva.' }, { status: 404 });
    }
    const mode = modeOf(inv);
    const editable = mode === 'REGISTRO' || mode === 'CORREGIR' || mode === 'UNIRSE';
    if (editable && new Date() > new Date(inv.expiresAt)) {
      await db.deliveryInvitation.update({ where: { id: inv.id }, data: { status: 'EXPIRED' } });
      return NextResponse.json({ error: 'Este enlace venció. Pide al negocio que te reenvíe la invitación.' }, { status: 410 });
    }

    const p = inv.resource?.profile || {};
    return NextResponse.json({
      mode,
      negocio: inv.negocio,
      expiresAt: inv.expiresAt,
      telefono: inv.telefono,
      motivoRechazo: p.motivoRechazo || null,
      repartidor: {
        nombre: inv.resource?.name || '',
        tipoVehiculo: p.tipoVehiculo || 'MOTO',
        // Para corregir: devolvemos lo que ya envió (no hace falta volver a escribir todo)
        datos: mode === 'CORREGIR' ? {
          documento: p.documento || '', fechaNacimiento: p.fechaNacimiento || '', direccion: p.direccion || '', email: p.email || '',
          contactoEmergencia: p.contactoEmergencia || '', marca: p.marca || '', modelo: p.modelo || '', color: p.color || '',
          placa: p.placa || '', anio: p.anio || '',
          cedulaFrenteUrl: normalizeDocUrl(p.cedulaFrenteUrl) || '', cedulaReversoUrl: normalizeDocUrl(p.cedulaReversoUrl) || '', licenciaUrl: normalizeDocUrl(p.licenciaUrl) || '',
          matriculaUrl: normalizeDocUrl(p.matriculaUrl) || '', fotoVehiculoUrl: normalizeDocUrl(p.fotoVehiculoUrl) || '', selfieUrl: normalizeDocUrl(p.selfieUrl) || '',
        } : null,
        documentosEnArchivo: mode === 'UNIRSE' ? ['Cédula', p.licenciaUrl ? 'Licencia' : null, p.fotoVehiculoUrl ? 'Foto del vehículo' : null, p.selfieUrl ? 'Foto de perfil' : null].filter(Boolean) : [],
      },
    });
  } catch (error) {
    console.error('[LOGISTICS/INVITATIONS/[token] GET]', error);
    return NextResponse.json({ error: 'Error cargando la invitación' }, { status: 500 });
  }
}

// ─── POST: enviar registro o confirmar unión ─────────────────────────────────
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json().catch(() => ({}));
    const inv = await load(token);
    if (!inv || inv.status === 'CANCELLED' || meta(inv.resource).removedAt) {
      return NextResponse.json({ error: 'Esta invitación ya no está disponible.' }, { status: 404 });
    }
    if (new Date() > new Date(inv.expiresAt)) {
      return NextResponse.json({ error: 'Este enlace venció. Pide al negocio que te reenvíe la invitación.' }, { status: 410 });
    }
    const mode = modeOf(inv);

    // Repartidor ya verificado: solo confirma
    if (body.action === 'confirmar') {
      if (mode !== 'UNIRSE') return NextResponse.json({ error: 'Esta invitación no necesita confirmación.' }, { status: 400 });
      await db.$transaction([
        db.operableResource.update({ where: { id: inv.resourceId }, data: { metadata: { ...meta(inv.resource), confirmadoEn: new Date().toISOString() } } }),
        db.deliveryInvitation.update({ where: { id: inv.id }, data: { status: 'USED', usedAt: new Date() } }),
      ]);
      return NextResponse.json({ ok: true, mode: 'EN_REVISION' });
    }

    if (body.action === 'rechazar') {
      if (mode !== 'UNIRSE') return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
      await db.$transaction([
        db.operableResource.update({ where: { id: inv.resourceId }, data: { active: false, metadata: { ...meta(inv.resource), removedAt: new Date().toISOString(), rechazadoPorRepartidor: true } } }),
        db.deliveryInvitation.update({ where: { id: inv.id }, data: { status: 'CANCELLED' } }),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (mode !== 'REGISTRO' && mode !== 'CORREGIR') {
      return NextResponse.json({ error: 'Tu registro ya fue enviado.' }, { status: 400 });
    }

    const s = (v: any, max = 120) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);
    const tipoVehiculo = ['MOTO', 'AUTO', 'BICICLETA', 'A_PIE', 'CAMION'].includes(body.tipoVehiculo) ? body.tipoVehiculo : 'MOTO';
    const motorizado = tipoVehiculo === 'MOTO' || tipoVehiculo === 'AUTO' || tipoVehiculo === 'CAMION';

    const name = s(body.name, 80);
    if (!name) return NextResponse.json({ error: 'Escribe tu nombre completo.' }, { status: 400 });
    if (!s(body.documento, 20)) return NextResponse.json({ error: 'Escribe tu número de cédula.' }, { status: 400 });
    if (!body.selfieUrl) return NextResponse.json({ error: 'Falta tu foto de perfil.' }, { status: 400 });
    if (!body.cedulaFrenteUrl || !body.cedulaReversoUrl) return NextResponse.json({ error: 'Faltan las fotos de tu cédula (frente y reverso).' }, { status: 400 });
    if (motorizado && !body.licenciaUrl) return NextResponse.json({ error: 'Falta la foto de tu licencia de conducir.' }, { status: 400 });
    if (motorizado && !s(body.placa, 15)) return NextResponse.json({ error: 'Escribe la placa de tu vehículo.' }, { status: 400 });
    if (tipoVehiculo !== 'A_PIE' && !body.fotoVehiculoUrl) return NextResponse.json({ error: 'Falta la foto de tu vehículo.' }, { status: 400 });

    // Solo se aceptan archivos subidos para esta invitación
    const docs = ['cedulaFrenteUrl', 'cedulaReversoUrl', 'licenciaUrl', 'matriculaUrl', 'fotoVehiculoUrl', 'selfieUrl'] as const;
    const clean: Record<string, string | null> = {};
    for (const d of docs) {
      const v = body[d] ? String(body[d]) : '';
      // Solo archivos subidos con ESTA invitación (antes bastaba cualquier ruta /uploads/drivers/)
      clean[d] = v && isDocOfToken(v, token) ? normalizeDocUrl(v) : null;
    }

    const updated = await db.$transaction([
      db.operableResource.update({
        where: { id: inv.resourceId },
        data: {
          name,
          avatar: clean.selfieUrl,
          profile: {
            update: {
              verificationStatus: 'PENDING_VERIFICATION',
              activo: false,
              motivoRechazo: null,
              documento: s(body.documento, 20),
              fechaNacimiento: s(body.fechaNacimiento, 20),
              direccion: s(body.direccion, 200),
              email: s(body.email, 120),
              contactoEmergencia: s(body.contactoEmergencia, 120),
              tipoVehiculo,
              vehiculo: tipoVehiculo,
              marca: s(body.marca, 40),
              modelo: s(body.modelo, 40),
              color: s(body.color, 30),
              placa: s(body.placa, 15)?.toUpperCase() || null,
              anio: s(body.anio, 4),
              fotografiaUrl: clean.selfieUrl,
              ...clean,
            },
          },
        },
      }),
      db.deliveryInvitation.update({ where: { id: inv.id }, data: { status: 'USED', usedAt: new Date() } }),
    ]);

    console.log('[LOGISTICS_EVENT] DriverSubmittedVerification', { resourceId: inv.resourceId, negocioId: inv.negocioId });
    return NextResponse.json({ ok: true, mode: 'EN_REVISION', resourceId: updated[0].id });
  } catch (error) {
    console.error('[LOGISTICS/INVITATIONS/[token] POST]', error);
    return NextResponse.json({ error: 'No pudimos guardar tu registro. Intenta de nuevo.' }, { status: 500 });
  }
}
