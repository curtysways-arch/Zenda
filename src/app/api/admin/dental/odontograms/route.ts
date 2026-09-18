import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getSessionNegocioIdAndUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { negocioId: null, userName: null, staffId: null };

  let negocioId = (session.user as any).negocioId;
  let userName = session.user.name || session.user.email || 'Profesional';
  let staffId: string | null = null;

  if (!negocioId && session.user.email) {
    const u = await prisma.usuario.findUnique({ where: { email: session.user.email } });
    negocioId = u?.negocioId;
  }

  if (negocioId && session.user.email) {
    const st = await prisma.staff.findFirst({
      where: { businessId: negocioId, Usuario: { email: session.user.email } },
      select: { id: true, name: true }
    });
    if (st) {
      staffId = st.id;
      userName = st.name;
    }
  }

  return { negocioId: negocioId || null, userName, staffId };
}

export async function GET(req: NextRequest) {
  try {
    const { negocioId } = await getSessionNegocioIdAndUser();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clinicalRecordId = searchParams.get('clinicalRecordId');

    if (!clinicalRecordId) {
      return NextResponse.json({ error: 'clinicalRecordId es requerido' }, { status: 400 });
    }

    // Verificar seguridad: registro clínico pertenece al negocio
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      select: { id: true, negocioId: true }
    });

    if (!record || record.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Acceso no autorizado al odontograma' }, { status: 403 });
    }

    const odontograms = await prisma.dentalOdontogram.findMany({
      where: { clinicalRecordId, negocioId },
      include: {
        Staff: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, odontograms });
  } catch (err: any) {
    console.error('Error en GET /api/admin/dental/odontograms:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { negocioId, userName, staffId } = await getSessionNegocioIdAndUser();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { clinicalRecordId, tipo, titulo, piezas, especificaciones } = body;

    if (!clinicalRecordId || !piezas) {
      return NextResponse.json({ error: 'clinicalRecordId y piezas son requeridos' }, { status: 400 });
    }

    // Aislamiento por negocio
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      select: { id: true, negocioId: true }
    });

    if (!record || record.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    // Calcular el siguiente número de snapshot para trazabilidad inmutable
    const lastSnapshot = await prisma.dentalOdontogram.findFirst({
      where: { clinicalRecordId, negocioId },
      orderBy: { snapshotNumber: 'desc' },
      select: { snapshotNumber: true }
    });

    const nextSnapshotNumber = (lastSnapshot?.snapshotNumber || 0) + 1;

    const odontogram = await prisma.dentalOdontogram.create({
      data: {
        negocioId,
        clinicalRecordId,
        tipo: tipo || 'PERMANENTE',
        titulo: titulo || `Evaluación Clínica #${nextSnapshotNumber}`,
        piezas,
        especificaciones: especificaciones || {},
        isSnapshot: true,
        snapshotNumber: nextSnapshotNumber,
        registeredBy: userName,
        staffId: staffId || null
      },
      include: {
        Staff: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ success: true, odontogram });
  } catch (err: any) {
    console.error('Error en POST /api/admin/dental/odontograms:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
