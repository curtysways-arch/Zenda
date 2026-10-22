import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { inviteDriver, HttpError } from '@/lib/logistics/driverNetwork';

export const dynamic = 'force-dynamic';

async function negocioId() {
  const session = await getEffectiveAdminSession();
  return ((session?.user as any)?.negocioId as string) || null;
}

// GET: invitaciones del negocio de la sesión
export async function GET() {
  const id = await negocioId();
  if (!id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  try {
    const invitations = await (prisma as any).deliveryInvitation.findMany({
      where: { negocioId: id },
      include: { resource: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('[LOGISTICS/INVITATIONS GET]', error);
    return NextResponse.json({ error: 'Error obteniendo invitaciones' }, { status: 500 });
  }
}

// POST { nombre, telefono, tipoVehiculo }: invitar repartidor
export async function POST(req: Request) {
  const id = await negocioId();
  if (!id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  try {
    const { nombre, telefono, tipoVehiculo } = await req.json();
    const r = await inviteDriver(id, { nombre, telefono: String(telefono || ''), tipoVehiculo });
    return NextResponse.json({ ...r, whatsapp: { url: r.whatsappUrl } }, { status: 201 });
  } catch (error: any) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[LOGISTICS/INVITATIONS POST]', error);
    return NextResponse.json({ error: 'Error creando invitación' }, { status: 500 });
  }
}
