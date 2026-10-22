import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDentalContext, jsonError } from '@/modules/dental/server/context';

export const dynamic = 'force-dynamic';

/** GET — servicios y doctores activos para los formularios (citas, tratamientos, consultas). */
export async function GET() {
  try {
    const access = await getDentalContext({ withStaff: true });
    if (!access.ok) return access.response;
    const { negocioId, staffId } = access.ctx;

    const [services, staff] = await Promise.all([
      prisma.service.findMany({
        where: { negocioId, estaActivo: true },
        select: { id: true, nombre: true, precio: true, duracion: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.staff.findMany({
        where: { businessId: negocioId, active: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ success: true, services, staff, myStaffId: staffId });
  } catch (err) {
    console.error('Error en GET /api/admin/dental/options:', err);
    return jsonError('No se pudieron cargar servicios y doctores.', 500);
  }
}
