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
    const estado = searchParams.get('estado');

    const whereClause: any = { negocioId };
    if (clinicalRecordId) {
      whereClause.clinicalRecordId = clinicalRecordId;
    }
    if (estado) {
      whereClause.estado = estado;
    }

    const treatments = await prisma.dentalTreatment.findMany({
      where: whereClause,
      include: {
        ClinicalRecord: {
          include: {
            Cliente: { select: { id: true, nombre: true, telefono: true } }
          }
        },
        Service: { select: { id: true, nombre: true, precio: true } },
        Staff: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, treatments });
  } catch (err: any) {
    console.error('Error en GET /api/admin/dental/treatments:', err);
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
      serviceId,
      appointmentId,
      staffId,
      diente,
      superficies,
      descripcion,
      costoEstimado,
      estado,
      prioridad,
      notas
    } = body;

    if (!clinicalRecordId || !descripcion) {
      return NextResponse.json({ error: 'clinicalRecordId y descripcion son requeridos' }, { status: 400 });
    }

    // Verificar seguridad: registro clínico pertenece al negocio
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: clinicalRecordId },
      select: { id: true, negocioId: true }
    });

    if (!record || record.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const treatment = await prisma.dentalTreatment.create({
      data: {
        negocioId,
        clinicalRecordId,
        serviceId: serviceId || null,
        appointmentId: appointmentId || null,
        staffId: staffId || null,
        diente: diente || null,
        superficies: superficies || null,
        descripcion,
        costoEstimado: costoEstimado != null ? Number(costoEstimado) : null,
        estado: estado || 'PLANIFICADO',
        prioridad: prioridad || 'MEDIA',
        notas: notas || null
      },
      include: {
        Service: { select: { id: true, nombre: true } }
      }
    });

    return NextResponse.json({ success: true, treatment });
  } catch (err: any) {
    console.error('Error en POST /api/admin/dental/treatments:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const negocioId = await getSessionNegocioId();
    if (!negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, estado, notas, fechaRealizado } = body;

    if (!id) {
      return NextResponse.json({ error: 'id del tratamiento es requerido' }, { status: 400 });
    }

    // Verificar que el tratamiento pertenezca al negocio
    const existing = await prisma.dentalTreatment.findUnique({
      where: { id },
      select: { id: true, negocioId: true }
    });

    if (!existing || existing.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Tratamiento no encontrado o acceso no autorizado' }, { status: 403 });
    }

    const updated = await prisma.dentalTreatment.update({
      where: { id },
      data: {
        estado: estado || undefined,
        notas: notas !== undefined ? notas : undefined,
        fechaRealizado: estado === 'REALIZADO' ? (fechaRealizado ? new Date(fechaRealizado) : new Date()) : undefined
      }
    });

    return NextResponse.json({ success: true, treatment: updated });
  } catch (err: any) {
    console.error('Error en PATCH /api/admin/dental/treatments:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
