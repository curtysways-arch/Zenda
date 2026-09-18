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
    const clienteId = searchParams.get('clienteId');

    if (clienteId) {
      // Validar que el cliente pertenezca al negocio del usuario (Aislamiento Multi-Tenant)
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { id: true, negocioId: true }
      });

      if (!cliente || cliente.negocioId !== negocioId) {
        return NextResponse.json({ error: 'Paciente no encontrado o acceso no autorizado' }, { status: 403 });
      }

      const record = await prisma.clinicalRecord.findUnique({
        where: {
          negocioId_clienteId: {
            negocioId,
            clienteId
          }
        },
        include: {
          Cliente: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
              email: true,
              fechaNacimiento: true,
              imagenUrl: true
            }
          },
          encounters: {
            orderBy: { fecha: 'desc' },
            include: { Staff: { select: { id: true, name: true } } }
          },
          odontograms: {
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          treatments: {
            orderBy: { createdAt: 'desc' },
            include: { Service: { select: { id: true, nombre: true } } }
          },
          documents: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return NextResponse.json({ success: true, record });
    }

    // Listar todos los registros clínicos del negocio
    const records = await prisma.clinicalRecord.findMany({
      where: { negocioId },
      include: {
        Cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
            fechaNacimiento: true
          }
        },
        _count: {
          select: {
            encounters: true,
            odontograms: true,
            treatments: true,
            documents: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, records });
  } catch (err: any) {
    console.error('Error en GET /api/admin/dental/records:', err);
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
      clienteId, 
      numeroHistoria, 
      grupoSanguineo, 
      antecedentesMedicos, 
      alergias, 
      medicacionActual, 
      habitos, 
      observaciones 
    } = body;

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId es requerido' }, { status: 400 });
    }

    // Aislamiento: verificar que el paciente pertenezca a este negocio
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, negocioId: true }
    });

    if (!cliente || cliente.negocioId !== negocioId) {
      return NextResponse.json({ error: 'Paciente no pertenece a este negocio' }, { status: 403 });
    }

    const record = await prisma.clinicalRecord.upsert({
      where: {
        negocioId_clienteId: {
          negocioId,
          clienteId
        }
      },
      create: {
        negocioId,
        clienteId,
        numeroHistoria: numeroHistoria || `HC-${Date.now().toString().slice(-6)}`,
        grupoSanguineo: grupoSanguineo || null,
        antecedentesMedicos: antecedentesMedicos || {},
        alergias: alergias || {},
        medicacionActual: medicacionActual || null,
        habitos: habitos || {},
        observaciones: observaciones || null
      },
      update: {
        numeroHistoria: numeroHistoria !== undefined ? numeroHistoria : undefined,
        grupoSanguineo: grupoSanguineo !== undefined ? grupoSanguineo : undefined,
        antecedentesMedicos: antecedentesMedicos !== undefined ? antecedentesMedicos : undefined,
        alergias: alergias !== undefined ? alergias : undefined,
        medicacionActual: medicacionActual !== undefined ? medicacionActual : undefined,
        habitos: habitos !== undefined ? habitos : undefined,
        observaciones: observaciones !== undefined ? observaciones : undefined
      }
    });

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    console.error('Error en POST /api/admin/dental/records:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
