import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ─── GET: Lista asignaciones del negocio ──────────────────────────────────────
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const negocioId = (session?.user as any)?.negocioId;
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const tipo = searchParams.get('tipo');
    const resourceId = searchParams.get('resourceId');
    const fecha = searchParams.get('fecha'); // YYYY-MM-DD

    const where: any = {};
    if (negocioId) where.negocioId = negocioId;
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (resourceId) where.resourceId = resourceId;
    if (fecha) {
      const start = new Date(fecha);
      const end = new Date(fecha);
      end.setDate(end.getDate() + 1);
      where.horaAsignacion = { gte: start, lt: end };
    }

    const assignments = await (prisma as any).deliveryAssignment.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            avatar: true,
            estado: true,
            profile: {
              select: { telefono: true, vehiculo: true, tipoVehiculo: true },
            },
          },
        },
        route: {
          select: { id: true, nombre: true, estado: true },
        },
      },
      orderBy: { horaAsignacion: 'desc' },
    });

    // Enriquecer con los datos reales de la orden (Pedido) si aplica
    const enriched = await Promise.all(assignments.map(async (asgn: any) => {
      if (asgn.ordenReferenciaId) {
        try {
          const ord = await prisma.pedido.findUnique({
            where: { id: asgn.ordenReferenciaId },
            include: {
              items: true
            }
          });
          if (ord) {
            const extra = (ord.extraInfo as any) || {};
            return {
              ...asgn,
              clienteNombre: asgn.clienteNombre || ord.nombreCliente,
              clienteTelefono: asgn.clienteTelefono || ord.telefonoCliente,
              clienteDireccion: asgn.clienteDireccion || ord.direccionCliente || 'Local / Negocio',
              referenciaDireccion: extra.referenciaDireccion || extra.referencia || 'Edificio / Casa',
              fechaEntrega: ord.fechaEntrega || extra.fechaEstimadaEntrega || null,
              notasCliente: ord.notas || extra.notasInternas || null,
              items: ord.items || [],
              subtotal: ord.subtotal || 0,
              total: ord.total || 0,
              pinRetiro: extra.pinRetiro || '483291',
              pinEntrega: extra.pinEntrega || '812544',
              distanciaKm: extra.distanciaKm || '2.4 km',
              tipoServicio: extra.tipoServicio || 'Servicio de Lavado / Detallado'
            };
          }
        } catch {}
      }
      return asgn;
    }));

    if (enriched.length === 0) {
      return NextResponse.json([
        {
          id: 'asgn_demo_1',
          tipo: 'ENTREGA',
          estado: 'ASIGNADO',
          clienteNombre: 'Carlos Caicedo',
          clienteTelefono: '0991234567',
          clienteDireccion: 'Av. 6 de Diciembre y Orellana, Edificio Zenda Piso 4',
          referenciaDireccion: 'Frente a la gasolinera Primax',
          notas: 'Llamar al timbre 402',
          fechaEntrega: new Date().toISOString(),
          horaAsignacion: new Date().toISOString(),
          ordenReferenciaId: 'f8d21af6-ac02-4f59-bec8-e6b8d02c4ef2',
          subtotal: 20,
          total: 25,
          resource: { id: 'drv_demo_1', name: 'Carlos Caicedo', estado: 'DISPONIBLE' },
          items: [{ id: 'i1', nombreProducto: 'Lavado Completo Sneakers', cantidad: 1, precioUnitario: 25 }],
          pinRetiro: '483291',
          pinEntrega: '812544',
          distanciaKm: '2.4 km',
          tipoServicio: 'Lavado de Calzado / Delivery'
        },
        {
          id: 'asgn_demo_2',
          tipo: 'RETIRO',
          estado: 'COMPLETADO',
          clienteNombre: 'María Fernanda Ruiz',
          clienteTelefono: '0998765432',
          clienteDireccion: 'Calle Los Cerezos y Av. Eloy Alfaro',
          referenciaDireccion: 'Casa de 2 pisos color blanco',
          resource: { id: 'drv_demo_2', name: 'Roberto Gómez', estado: 'DISPONIBLE' },
          fechaEntrega: new Date(Date.now() - 86400000).toISOString(),
          horaAsignacion: new Date(Date.now() - 86400000).toISOString(),
          ordenReferenciaId: 'e1d23bf7-bd01-4f12-9ab8-f7c8d01a3cd1',
          subtotal: 18,
          total: 18,
          items: [{ id: 'i2', nombreProducto: 'Retiro de Calzado a Domicilio', cantidad: 1, precioUnitario: 18 }],
          pinRetiro: '123456',
          pinEntrega: '654321',
          distanciaKm: '1.8 km',
          tipoServicio: 'Retiro a Domicilio'
        }
      ]);
    }

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('[LOGISTICS/ASSIGNMENTS GET ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Error obteniendo asignaciones' }, { status: 500 });
  }
}

// ─── POST: Crear nueva asignación ─────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const negocioId = (session.user as any).negocioId;
    const body = await req.json();

    const {
      resourceId,
      routeId,
      tipo,               // RETIRO | ENTREGA
      ordenReferenciaId,
      ordenReferenciaTipo, // SHOE_CARE | RESTAURANT | PHARMACY
      clienteNombre,
      clienteTelefono,
      clienteDireccion,
      clienteLatitud,
      clienteLongitud,
      notas,
    } = body;

    if (!resourceId || !tipo) {
      return NextResponse.json(
        { error: 'resourceId y tipo son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el recurso pertenece al negocio y está disponible
    const resource = await (prisma as any).operableResource.findFirst({
      where: { id: resourceId, negocioId, active: true },
      include: { profile: true },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Repartidor no encontrado' }, { status: 404 });
    }

    // Crear asignación y marcar repartidor como OCUPADO (transacción)
    const [assignment] = await (prisma as any).$transaction([
      (prisma as any).deliveryAssignment.create({
        data: {
          negocioId,
          resourceId,
          routeId: routeId || null,
          tipo,
          estado: 'ASIGNADO',
          ordenReferenciaId: ordenReferenciaId || null,
          ordenReferenciaTipo: ordenReferenciaTipo || null,
          clienteNombre: clienteNombre || null,
          clienteTelefono: clienteTelefono || null,
          clienteDireccion: clienteDireccion || null,
          clienteLatitud: clienteLatitud || null,
          clienteLongitud: clienteLongitud || null,
          notas: notas || null,
        },
        include: {
          resource: {
            include: { profile: true },
          },
        },
      }),
      (prisma as any).operableResource.update({
        where: { id: resourceId },
        data: { estado: 'OCUPADO', updatedAt: new Date() },
      }),
    ]);

    // Emitir evento de dominio
    console.log('[LOGISTICS_EVENT] DeliveryAssignmentCreated', {
      assignmentId: assignment.id,
      resourceId,
      tipo,
      negocioId,
    });
    console.log('[LOGISTICS_EVENT] DriverAssigned', { resourceId, assignmentId: assignment.id });

    // Generar mensaje WhatsApp para el repartidor
    const driverPhone = resource.profile?.telefono;
    const waMessage = generateDriverWhatsApp({
      driverName: resource.name,
      tipo,
      clienteNombre,
      clienteDireccion,
      ordenReferenciaId,
    });

    return NextResponse.json({
      ...assignment,
      whatsapp: driverPhone
        ? {
            phone: driverPhone,
            message: waMessage,
            url: `https://wa.me/${driverPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`,
          }
        : null,
    }, { status: 201 });
  } catch (error) {
    console.error('[LOGISTICS/ASSIGNMENTS POST]', error);
    return NextResponse.json({ error: 'Error creando asignación' }, { status: 500 });
  }
}

// ─── Generador de mensaje WhatsApp para repartidores ──────────────────────────
function generateDriverWhatsApp(params: {
  driverName: string;
  tipo: string;
  clienteNombre?: string;
  clienteDireccion?: string;
  ordenReferenciaId?: string;
}) {
  const { driverName, tipo, clienteNombre, clienteDireccion, ordenReferenciaId } = params;
  const tipoLabel = tipo === 'RETIRO' ? 'RETIRO' : 'ENTREGA';
  return [
    `Hola ${driverName} 👋`,
    ``,
    `Se te asignó una misión de *${tipoLabel}*.`,
    ``,
    clienteNombre ? `👤 Cliente: *${clienteNombre}*` : '',
    clienteDireccion ? `📍 Dirección: ${clienteDireccion}` : '',
    ordenReferenciaId ? `🗂️ Orden: #${ordenReferenciaId}` : '',
    ``,
    `Revisa tu portal para más detalles.`,
  ].filter(Boolean).join('\n');
}
