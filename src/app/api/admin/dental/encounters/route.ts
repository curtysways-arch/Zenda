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

    if (!clinicalRecordId) {
      return NextResponse.json({ error: 'clinicalRecordId es requerido' }, { status: 400 });
    }

    // Verificar pertenencia del registro al negocio
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      select: { id: true, negocioId: true }
    });

    if (!record || record.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Registro no encontrado o acceso denegado' }, { status: 403 });
    }

    const encounters = await prisma.clinicalEncounter.findMany({
      where: { clinicalRecordId, negocioId },
      include: {
        Staff: { select: { id: true, name: true } },
        Appointment: { select: { id: true, fecha: true, horaInicio: true } },
        Odontogram: { select: { id: true, titulo: true, snapshotNumber: true } }
      },
      orderBy: { fecha: 'desc' }
    });

    return NextResponse.json({ success: true, encounters });
  } catch (err: any) {
    console.error('Error en GET /api/admin/dental/encounters:', err);
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
    const {
      clinicalRecordId,
      appointmentId,
      staffId,
      fecha,
      motivoConsulta,
      problemaActual,
      signosVitales,
      examenFisico,
      diagnostico,
      codigoCIE,
      procedimientoRealizado,
      prescripcion,
      indicaciones,
      proximaCita,
      odontogramId
    } = body;

    if (!clinicalRecordId || !motivoConsulta) {
      return NextResponse.json({ error: 'clinicalRecordId y motivoConsulta son requeridos' }, { status: 400 });
    }

    // Verificar seguridad: registro clínico debe pertenecer al negocio activo
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      select: { id: true, negocioId: true }
    });

    if (!record || record.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Acceso denegado a este registro clínico' }, { status: 403 });
    }

    const encounter = await prisma.clinicalEncounter.create({
      data: {
        negocioId,
        clinicalRecordId,
        appointmentId: appointmentId || null,
        staffId: staffId || null,
        fecha: fecha ? new Date(fecha) : new Date(),
        motivoConsulta,
        problemaActual: problemaActual || {},
        signosVitales: signosVitales || {},
        examenFisico: examenFisico || null,
        diagnostico: diagnostico || null,
        codigoCIE: codigoCIE || null,
        procedimientoRealizado: procedimientoRealizado || null,
        prescripcion: prescripcion || null,
        indicaciones: indicaciones || null,
        proximaCita: proximaCita ? new Date(proximaCita) : null,
        odontogramId: odontogramId || null
      },
      include: {
        Staff: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ success: true, encounter });
  } catch (err: any) {
    console.error('Error en POST /api/admin/dental/encounters:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
