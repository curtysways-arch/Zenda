import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDentalContext, jsonError, cleanText } from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

function digits(value: string) {
  return value.replace(/\D/g, '');
}

/**
 * GET /api/admin/dental/patients/[id]
 * Ficha completa en una sola llamada: datos del paciente, historia clínica
 * (consultas, odontogramas, tratamientos, archivos) y citas.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;
    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        negocioId: true,
        nombre: true,
        telefono: true,
        email: true,
        fechaNacimiento: true,
        identificacion: true,
        imagenUrl: true,
        createdAt: true,
      },
    });
    if (!cliente || cliente.negocioId !== negocioId) {
      return jsonError('Paciente no encontrado.', 404);
    }

    const [record, appointments] = await Promise.all([
      prisma.clinicalRecord.findUnique({
        where: { negocioId_clienteId: { negocioId, clienteId: id } },
        include: {
          encounters: {
            orderBy: { fecha: 'desc' },
            include: { Staff: { select: { id: true, name: true } } },
          },
          odontograms: {
            orderBy: { snapshotNumber: 'desc' },
            take: 30,
            include: { Staff: { select: { id: true, name: true } } },
          },
          treatments: {
            orderBy: [{ createdAt: 'desc' }],
            include: {
              Service: { select: { id: true, nombre: true } },
              Staff: { select: { id: true, name: true } },
            },
          },
          documents: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.appointment.findMany({
        where: { negocioId, clienteId: id },
        include: {
          service: { select: { id: true, nombre: true } },
          staff: { select: { id: true, name: true } },
        },
        orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
        take: 100,
      }),
    ]);

    const { negocioId: _omit, ...patient } = cliente;
    return NextResponse.json({
      success: true,
      patient: {
        ...patient,
        telefono: patient.telefono?.startsWith('CF-') || patient.telefono?.startsWith('ST-') ? '' : patient.telefono,
        identificacion: patient.identificacion === '9999999999999' ? null : patient.identificacion,
      },
      record,
      appointments,
    });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/patients/[id]:', err);
    return jsonError('No se pudo cargar la ficha del paciente.', 500);
  }
}

/** PATCH /api/admin/dental/patients/[id] — editar datos personales del paciente. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getDentalContext();
    if (!access.ok) return access.response;
    const { negocioId } = access.ctx;
    const { id } = await params;

    const existing = await prisma.cliente.findUnique({ where: { id }, select: { id: true, negocioId: true } });
    if (!existing || existing.negocioId !== negocioId) {
      return jsonError('Paciente no encontrado.', 404);
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (body.nombre !== undefined) {
      const nombre = cleanText(body.nombre, 120);
      if (!nombre) return jsonError('El nombre no puede quedar vacío.');
      data.nombre = nombre;
    }
    if (body.telefono !== undefined) {
      const telefono = cleanText(body.telefono, 30);
      if (!telefono || digits(telefono).length < 7) return jsonError('Escribe un teléfono válido.');
      const last9 = digits(telefono).slice(-9);
      const candidates = await prisma.cliente.findMany({
        where: { negocioId, id: { not: id }, telefono: { contains: last9.slice(-7) } },
        select: { nombre: true, telefono: true },
      });
      const dup = candidates.find((c) => digits(c.telefono).endsWith(last9));
      if (dup) return jsonError(`Ese teléfono ya pertenece a ${dup.nombre}.`, 409);
      data.telefono = telefono;
    }
    if (body.email !== undefined) {
      const email = cleanText(body.email, 120)?.toLowerCase() || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('El correo no es válido.');
      data.email = email;
    }
    if (body.identificacion !== undefined) {
      const ident = cleanText(body.identificacion, 20)?.toUpperCase() || null;
      if (ident) {
        const dup = await prisma.cliente.findFirst({
          where: { negocioId, identificacion: ident, id: { not: id } },
          select: { nombre: true },
        });
        if (dup) return jsonError(`Esa cédula ya pertenece a ${dup.nombre}.`, 409);
      }
      data.identificacion = ident;
    }
    if (body.fechaNacimiento !== undefined) {
      const raw = cleanText(body.fechaNacimiento, 10);
      if (!raw) {
        data.fechaNacimiento = null;
      } else {
        const birth = new Date(`${raw}T12:00:00Z`);
        if (isNaN(birth.getTime()) || birth > new Date()) return jsonError('La fecha de nacimiento no es válida.');
        data.fechaNacimiento = birth;
      }
    }

    const updated = await prisma.cliente.update({
      where: { id },
      data,
      select: { id: true, nombre: true, telefono: true, email: true, fechaNacimiento: true, identificacion: true },
    });
    return NextResponse.json({ success: true, patient: updated });
  } catch (err) {
    console.error('Error en PATCH /api/admin/dental/patients/[id]:', err);
    return jsonError('No se pudieron guardar los datos del paciente.', 500);
  }
}
