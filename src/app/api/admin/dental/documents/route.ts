import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDentalContext, jsonError, cleanText, findOwnedRecord, resolveRecord } from '@/modules/dental/server/context';
import { clinicalUrlOwner, deleteClinicalFile } from '@/modules/dental/server/clinicalFiles';

export const dynamic = 'force-dynamic';

const TYPES = ['RADIOGRAFIA', 'FOTO_CLINICA', 'EXAMEN', 'CONSENTIMIENTO', 'RECETA', 'OTRO'];

/** Solo se aceptan archivos subidos por la plataforma (rutas propias) o URLs https. */
function isSafeUrl(url: string) {
  return url.startsWith('/') ? !url.startsWith('//') : /^https:\/\//i.test(url);
}

export async function GET(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const { searchParams } = new URL(req.url);
    const where: any = { negocioId };
    const clinicalRecordId = searchParams.get('clinicalRecordId');
    if (clinicalRecordId) {
      const rec = await findOwnedRecord(negocioId, clinicalRecordId);
      if (!rec) return jsonError('Historia clínica no encontrada.', 404);
      where.clinicalRecordId = rec.id;
    }
    const tipo = searchParams.get('tipo');
    if (tipo && TYPES.includes(tipo)) where.tipo = tipo;

    const documents = await prisma.clinicalDocument.findMany({
      where,
      include: {
        ClinicalRecord: { select: { id: true, clienteId: true, Cliente: { select: { id: true, nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    return NextResponse.json({ success: true, documents });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/documents:', err);
    return jsonError('No se pudieron cargar los archivos.', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const titulo = cleanText(body.titulo, 150);
    const archivoUrl = cleanText(body.archivoUrl, 1000);
    if (!titulo) return jsonError('Ponle un nombre al archivo.');
    if (!archivoUrl || !isSafeUrl(archivoUrl)) return jsonError('El archivo no es válido.');
    const owner = clinicalUrlOwner(archivoUrl);
    if (owner && owner !== negocioId) return jsonError('El archivo no pertenece a la clínica.', 403);

    const record = await resolveRecord(negocioId, body);
    if (!record) return jsonError('Paciente o historia clínica no encontrados.', 404);

    let mediaId: string | null = null;
    if (body.mediaId) {
      const media = await prisma.media.findUnique({ where: { id: String(body.mediaId) } }).catch(() => null);
      // Solo se enlaza si el registro de Media existe; si no, se guarda únicamente la URL.
      mediaId = media ? String(body.mediaId) : null;
    }

    const size = Number(body.tamanoBytes);
    const doc = await prisma.clinicalDocument.create({
      data: {
        negocioId,
        clinicalRecordId: record.id,
        mediaId,
        tipo: TYPES.includes(body.tipo) ? body.tipo : 'OTRO',
        titulo,
        descripcion: cleanText(body.descripcion, 500),
        archivoUrl,
        mimeType: cleanText(body.mimeType, 100),
        tamanoBytes: Number.isFinite(size) && size > 0 ? Math.round(size) : null,
      },
    });

    await prisma.clinicalRecord.update({ where: { id: record.id }, data: { updatedAt: new Date() } }).catch(() => {});

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (err) {
    console.error('Error en POST /api/admin/dental/documents:', err);
    return jsonError('No se pudo guardar el archivo.', 500);
  }
}

/** PATCH — renombrar o cambiar el tipo de un archivo. */
export async function PATCH(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    const existing = await prisma.clinicalDocument.findUnique({ where: { id }, select: { negocioId: true } });
    if (!existing || existing.negocioId !== negocioId) return jsonError('Archivo no encontrado.', 404);

    const data: Record<string, unknown> = {};
    if (body.titulo !== undefined) {
      const t = cleanText(body.titulo, 150);
      if (!t) return jsonError('El nombre no puede quedar vacío.');
      data.titulo = t;
    }
    if (body.tipo !== undefined) {
      if (!TYPES.includes(body.tipo)) return jsonError('Tipo de archivo no válido.');
      data.tipo = body.tipo;
    }
    if (body.descripcion !== undefined) data.descripcion = cleanText(body.descripcion, 500);

    const doc = await prisma.clinicalDocument.update({ where: { id }, data });
    return NextResponse.json({ success: true, document: doc });
  } catch (err) {
    console.error('Error en PATCH /api/admin/dental/documents:', err);
    return jsonError('No se pudo actualizar el archivo.', 500);
  }
}

/** DELETE — quita el archivo de la ficha del paciente. */
export async function DELETE(req: NextRequest) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;

    const id = new URL(req.url).searchParams.get('id') || '';
    const existing = await prisma.clinicalDocument.findUnique({ where: { id }, select: { negocioId: true, archivoUrl: true } });
    if (!existing || existing.negocioId !== negocioId) return jsonError('Archivo no encontrado.', 404);

    await prisma.clinicalDocument.delete({ where: { id } });
    // Los archivos privados se borran del disco; los antiguos de /api/media se conservan.
    await deleteClinicalFile(existing.archivoUrl);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error en DELETE /api/admin/dental/documents:', err);
    return jsonError('No se pudo eliminar el archivo.', 500);
  }
}
