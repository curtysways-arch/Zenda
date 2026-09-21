import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });

  try {
    const body = await req.json();
    const { nombre, telefono, email } = body;
    if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

    let cliente: any = null;
    if (telefono) {
      cliente = await prisma.cliente.findFirst({ where: { negocioId, telefono } });
    }
    if (!cliente && email) {
      cliente = await prisma.cliente.findFirst({ where: { negocioId, email } });
    }

    if (!cliente) {
      cliente = await (prisma as any).cliente.create({
        data: {
          id: crypto.randomUUID(),
          negocioId,
          nombre: nombre.trim(),
          telefono: telefono?.trim() || null,
          email: email?.trim() || null,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, cliente });
  } catch (error: any) {
    console.error('[API_GYM_CUSTOMERS_POST]', error);
    return NextResponse.json({ error: error.message || 'Error al crear socio' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const negocioId = (session.user as any).negocioId;
  if (!negocioId) return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        negocioId,
        ...(q ? {
          OR: [
            { nombre: { contains: q } },
            { telefono: { contains: q } },
            { email: { contains: q } },
          ]
        } : {})
      },
      orderBy: { nombre: 'asc' },
      take: 50,
    });
    return NextResponse.json({ success: true, clientes });
  } catch (error: any) {
    console.error('[API_GYM_CUSTOMERS_GET]', error);
    return NextResponse.json({ error: error.message || 'Error al obtener socios' }, { status: 500 });
  }
}
