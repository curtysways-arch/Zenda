import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireBusinessAccess } from '@/lib/auth/requireBusinessAccess';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId') || '';
    const query = searchParams.get('query') || '';
    if (!businessId) return NextResponse.json({ error: 'Falta el negocio.' }, { status: 400 });

    // Datos de clientes: solo el personal del negocio.
    const access = await requireBusinessAccess(businessId);
    if (!access.ok) return access.response;

    let whereClause: any = { negocioId: businessId };
    if (query) {
      whereClause.OR = [
        { nombre: { contains: query } },
        { telefono: { contains: query } },
        { email: { contains: query } }
      ];
    }

    const clientesDb = await prisma.cliente.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { Appointment: true } }
      }
    });

    const pedidos = await prisma.pedido.findMany({
      where: { negocioId: businessId },
      select: {
        nombreCliente: true,
        telefonoCliente: true,
        direccionCliente: true,
        extraInfo: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const clientMap = new Map<string, any>();

    // Cargar desde DB Cliente
    clientesDb.forEach(cli => {
      if (cli.telefono) {
        clientMap.set(cli.telefono.replace(/\D/g, ''), {
          id: cli.id,
          nombre: cli.nombre,
          telefono: cli.telefono,
          email: cli.email || '',
          direccion: ''
        });
      }
    });

    // Cargar desde Pedidos
    pedidos.forEach(p => {
      if (p.telefonoCliente) {
        const key = p.telefonoCliente.replace(/\D/g, '');
        if (!clientMap.has(key)) {
          const extra = (p.extraInfo as any) || {};
          clientMap.set(key, {
            id: `cli_${key}`,
            nombre: p.nombreCliente,
            telefono: p.telefonoCliente,
            email: extra.emailCliente || '',
            direccion: p.direccionCliente || ''
          });
        }
      }
    });

    const resultList = Array.from(clientMap.values());

    return NextResponse.json(resultList);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'No se pudieron cargar los clientes.' }, { status: 500 });
  }
}
