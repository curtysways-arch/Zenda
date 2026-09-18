import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getSessionNegocioId() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  let negocioId = (session.user as any).negocioId;
  if (!negocioId && session.user.email) {
    const u = await prisma.usuario.findUnique({ where: { email: session.user.email } });
    negocioId = u?.negocioId;
  }
  return negocioId || null;
}

export async function GET(req: NextRequest) {
  try {
    const negocioId = await getSessionNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clinicalRecordId = searchParams.get('clinicalRecordId');
    const tipo = searchParams.get('tipo');

    const whereClause: any = { negocioId };
    if (clinicalRecordId) {
      whereClause.clinicalRecordId = clinicalRecordId;
    }
    if (tipo) {
      whereClause.tipo = tipo;
    }

    const documents = await prisma.clinicalDocument.findMany({
      where: whereClause,
      include: {
        ClinicalRecord: {
          include: {
            Cliente: { select: { id: true, nombre: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, documents });
  } catch (err: any) {
    console.error('Error en GET /api/admin/dental/documents:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const negocioId = await getSessionNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { clinicalRecordId, mediaId, tipo, titulo, descripcion, archivoUrl, mimeType, tamanoBytes } = body;

    if (!clinicalRecordId || !titulo || !archivoUrl) {
      return NextResponse.json({ error: 'clinicalRecordId, titulo y archivoUrl son requeridos' }, { status: 400 });
    }

    // Verificar seguridad: registro clínico pertenece al negocio
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      select: { id: true, negocioId: true }
    });

    if (!record || record.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const doc = await prisma.clinicalDocument.create({
      data: {
        negocioId,
        clinicalRecordId,
        mediaId: mediaId || null,
        tipo: tipo || 'OTRO',
        titulo,
        descripcion: descripcion || null,
        archivoUrl,
        mimeType: mimeType || null,
        tamanoBytes: tamanoBytes || null
      }
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (err: any) {
    console.error('Error en POST /api/admin/dental/documents:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
