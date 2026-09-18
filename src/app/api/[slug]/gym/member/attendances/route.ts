import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const customerId = searchParams.get('customerId');

  if (!phone && !customerId) {
    return NextResponse.json({ error: 'Se requiere teléfono o ID del socio' }, { status: 400 });
  }

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        negocioId: negocio.id,
        OR: [
          ...(customerId ? [{ id: customerId }] : []),
          ...(phone ? [{ telefono: phone.trim() }] : [])
        ]
      }
    });

    if (!cliente) {
      return NextResponse.json({
        found: false,
        message: 'No se encontró el socio'
      }, { status: 404 });
    }

    const attendances = await (prisma as any).gymAttendance.findMany({
      where: {
        businessId: negocio.id,
        customerId: cliente.id
      },
      include: {
        branch: { select: { id: true, name: true } }
      },
      orderBy: { checkedInAt: 'desc' },
      take: 50
    });

    // Calcular estadísticas de entrenamiento
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = attendances.filter((a: any) => new Date(a.checkedInAt) >= startOfMonth).length;

    return NextResponse.json({
      success: true,
      found: true,
      member: {
        id: cliente.id,
        name: cliente.nombre,
        phone: cliente.telefono
      },
      stats: {
        total: attendances.length,
        thisMonth: thisMonthCount,
      },
      attendances: attendances.map((a: any) => ({
        id: a.id,
        checkedInAt: a.checkedInAt,
        method: a.method,
        branchName: a.branch?.name || 'Sede Principal'
      }))
    });
  } catch (err: any) {
    console.error('Error fetching member attendances:', err);
    return NextResponse.json({ error: 'Error al consultar asistencias' }, { status: 500 });
  }
}