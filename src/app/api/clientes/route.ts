import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export async function GET(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });

        const [clientesDb, pedidosDb] = await Promise.all([
            prisma.cliente.findMany({
                where: { negocioId },
                include: {
                    _count: {
                        select: { Appointment: true }
                    },
                    Appointment: {
                        where: { estado: { in: ['completed', 'finalizada'] } },
                        include: {
                            pagoReserva: true
                        }
                    }
                },
                orderBy: { nombre: 'asc' }
            }),
            prisma.pedido.findMany({
                where: { negocioId },
                select: {
                    id: true,
                    nombreCliente: true,
                    telefonoCliente: true,
                    total: true,
                    estado: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Mapa de pedidos agrupados por teléfono limpio
        const pedidosPorTelefono = new Map<string, { count: number; total: number; nombre: string; fecha: Date }>();
        for (const p of pedidosDb) {
            const tel = (p.telefonoCliente || '').replace(/\D/g, '');
            if (!tel) continue;

            const existing = pedidosPorTelefono.get(tel) || { count: 0, total: 0, nombre: p.nombreCliente || 'Cliente', fecha: p.createdAt };
            existing.count += 1;
            if (p.estado !== 'CANCELADO') {
                existing.total += Number(p.total) || 0;
            }
            pedidosPorTelefono.set(tel, existing);
        }

        const telefonosProcesados = new Set<string>();

        // Consolidar clientes de tabla Cliente
        const clientesConStats: any[] = clientesDb.map(c => {
            const cleanTel = (c.telefono || '').replace(/\D/g, '');
            if (cleanTel) telefonosProcesados.add(cleanTel);

            // Citas
            const citasGastado = c.Appointment.reduce((acc: number, app: any) => {
                if (app.pagoReserva && app.pagoReserva.length > 0) {
                    const sumaPagos = app.pagoReserva.reduce((sum: number, p: any) => sum + Number(p.monto), 0);
                    return acc + sumaPagos;
                }
                return acc;
            }, 0);
            const citasCount = (c as any)._count?.Appointment || 0;

            // Pedidos (Lavado, Calzado, Tiendas)
            const infoPedidos = cleanTel ? pedidosPorTelefono.get(cleanTel) : null;
            const pedidosCount = infoPedidos?.count || 0;
            const pedidosGastado = infoPedidos?.total || 0;

            const totalGastadoFinal = citasGastado + pedidosGastado;
            const totalServiciosFinal = citasCount + pedidosCount;

            return {
                id: c.id,
                nombre: c.nombre || 'Cliente',
                telefono: c.telefono || '',
                email: c.email || '',
                identificacion: c.identificacion || null,
                tipoIdentificacion: c.tipoIdentificacion || 'CEDULA',
                razonSocial: c.razonSocial || null,
                direccionFacturacion: c.direccionFacturacion || null,
                emailFacturacion: c.emailFacturacion || null,
                telefonoFacturacion: c.telefonoFacturacion || null,
                totalReservas: totalServiciosFinal,
                totalGastado: totalGastadoFinal.toFixed(2),
                ratingPromedio: c.ratingPromedio || 0,
                totalReviews: c.totalReviews || 0,
                createdAt: c.createdAt
            };
        });

        // Agregar clientes que tienen pedidos de lavado pero no estaban en tabla Cliente
        for (const [cleanTel, info] of pedidosPorTelefono.entries()) {
            if (!telefonosProcesados.has(cleanTel)) {
                clientesConStats.push({
                    id: `ped_cli_${cleanTel}`,
                    nombre: info.nombre || 'Cliente',
                    telefono: cleanTel,
                    email: '',
                    identificacion: null,
                    tipoIdentificacion: 'CEDULA',
                    razonSocial: null,
                    direccionFacturacion: null,
                    emailFacturacion: null,
                    telefonoFacturacion: null,
                    totalReservas: info.count,
                    totalGastado: info.total.toFixed(2),
                    ratingPromedio: 0,
                    totalReviews: 0,
                    createdAt: info.fecha
                });
            }
        }

        const { planLimitValidator } = await import('@/lib/services/planLimitValidator');
        const { AccessPolicyService } = await import('@/core/security/AccessPolicyService');
        const limitProcessed = await planLimitValidator.obfuscateOverLimitClients(negocioId, clientesConStats);
        const processedClientes = await AccessPolicyService.protectCustomers(negocioId, limitProcessed);

        return NextResponse.json(processedClientes);
    } catch (error) {
        console.error('Error fetching clients:', error);
        return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        if (!negocioId) return NextResponse.json({ error: 'Sin negocio asociado' }, { status: 400 });

        const body = await req.json().catch(() => ({}));
        const { identificacion, tipoIdentificacion, razonSocial, nombre, telefono, email, direccionFacturacion } = body;

        const { CustomerEngine } = await import('@/core/customers/CustomerEngine');
        const cliente = await CustomerEngine.upsertCustomerTaxData(negocioId, {
            identificacion: identificacion || body.cedula || '9999999999999',
            tipoIdentificacion,
            razonSocial: razonSocial || nombre || 'Cliente',
            telefono,
            email,
            direccion: direccionFacturacion
        });

        return NextResponse.json({ success: true, cliente });
    } catch (error: any) {
        console.error('Error saving client:', error);
        return NextResponse.json({ error: error.message || 'Error al guardar cliente' }, { status: 500 });
    }
}

