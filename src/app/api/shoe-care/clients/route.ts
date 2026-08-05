import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId') || 'demo-canchas';
    const query = searchParams.get('query') || '';

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

    if (resultList.length === 0) {
      return NextResponse.json([
        { id: 'cli_demo_1', nombre: 'Carlos Caicedo', telefono: '0989997521', email: 'carlos@ejemplo.com', direccion: 'Av. 6 de Diciembre y Orellana' },
        { id: 'cli_demo_2', nombre: 'María Fernanda Ruiz', telefono: '0998765432', email: 'maria@ejemplo.com', direccion: 'Calle Los Cerezos y Eloy Alfaro' },
        { id: 'cli_demo_3', nombre: 'Andrés Ramírez', telefono: '0995566565', email: 'andres@ejemplo.com', direccion: 'Av. Amazonas 123 y Colón' }
      ]);
    }

    return NextResponse.json(resultList);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json([
      { id: 'cli_demo_1', nombre: 'Carlos Caicedo', telefono: '0989997521', email: 'carlos@ejemplo.com', direccion: 'Av. 6 de Diciembre y Orellana' },
      { id: 'cli_demo_2', nombre: 'María Fernanda Ruiz', telefono: '0998765432', email: 'maria@ejemplo.com', direccion: 'Calle Los Cerezos y Eloy Alfaro' }
    ]);
  }
}
