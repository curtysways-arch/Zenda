import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clientes/actividad?telefono=0991234567[&clienteId=...]
 * Historial de un cliente del negocio de la sesión: órdenes/pedidos (por teléfono), citas y fotos de recepción/entrega.
 * Sirve tanto para clientes registrados como para los que solo tienen órdenes.
 */
export async function GET(req: Request) {
    try {
        const session = await getEffectiveAdminSession();
        const negocioId = (session?.user as any)?.negocioId as string | undefined;
        if (!negocioId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const clienteIdParam = searchParams.get('clienteId') || '';
        const telefonoParam = searchParams.get('telefono') || '';

        // Respeta la política de datos del plan (igual que la lista de clientes).
        const { AccessPolicyService } = await import('@/core/security/AccessPolicyService');
        const { DATA_RESOURCES } = await import('@/core/security/dataPolicyTypes');
        const policy: any = await AccessPolicyService.getResourcePolicy(negocioId, DATA_RESOURCES.CUSTOMERS);
        if (!policy.view || !policy.details) {
            return NextResponse.json({ error: 'Tu plan no permite ver el historial de clientes.', code: 'LOCKED' }, { status: 403 });
        }

        const cliente = clienteIdParam && !clienteIdParam.startsWith('ped_cli_')
            ? await prisma.cliente.findFirst({ where: { id: clienteIdParam, negocioId } })
            : null;

        const digits = (telefonoParam || cliente?.telefono || '').replace(/\D/g, '');
        if (!cliente && digits.length < 7) return NextResponse.json({ error: 'Falta el cliente.' }, { status: 400 });

        // Variantes del número: 0991234567 · 991234567 · 593991234567
        const local = digits.startsWith('593') ? `0${digits.slice(3)}` : digits;
        const core = local.replace(/^0/, '');
        const variants = Array.from(new Set([digits, local, core, `593${core}`, `+593${core}`].filter((v) => v.length >= 7)));

        const [pedidos, citas] = await Promise.all([
            digits.length >= 7
                ? prisma.pedido.findMany({
                    where: { negocioId, OR: [{ telefonoCliente: { in: variants } }, { telefonoCliente: { endsWith: core } }] },
                    include: { items: true },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                })
                : Promise.resolve([] as any[]),
            cliente
                ? prisma.appointment.findMany({
                    where: { negocioId, clienteId: cliente.id },
                    include: { service: { select: { nombre: true, precio: true } }, staff: { select: { name: true } } },
                    orderBy: { fecha: 'desc' },
                    take: 100,
                })
                : Promise.resolve([] as any[]),
        ]);

        const parse = (raw: any) => {
            if (!raw) return {};
            if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
            return raw;
        };

        const fotos: { url: string; tipo: 'RECEPCION' | 'ENTREGA'; fecha: string; numero: number }[] = [];
        const ordenes = pedidos.map((p: any) => {
            const ex = parse(p.extraInfo);
            for (const url of Array.isArray(ex.fotosRecepcion) ? ex.fotosRecepcion : []) fotos.push({ url, tipo: 'RECEPCION', fecha: p.createdAt, numero: p.numeroPedido });
            for (const url of Array.isArray(ex.fotosEntrega) ? ex.fotosEntrega : []) fotos.push({ url, tipo: 'ENTREGA', fecha: p.createdAt, numero: p.numeroPedido });
            const items = Array.isArray(p.items) && p.items.length
                ? p.items.map((i: any) => `${Number(i.cantidad) || 1} × ${i.nombreProducto}`)
                : (Array.isArray(ex.articulos) ? ex.articulos.map((a: any) => `${a.cantidad || 1} × ${a.servicioNombre || a.tipo || 'Artículo'}`) : []);
            return {
                id: p.id,
                numero: p.numeroPedido,
                estado: p.estado,
                total: policy.financials ? Number(p.total) || 0 : null,
                fecha: p.createdAt,
                tipoEntrega: p.tipoEntrega,
                esServicio: Boolean(ex.modoIngreso),
                direccion: p.direccionCliente || null,
                items,
                pagado: ex.pagoCliente === 'PAGADO',
            };
        });

        const reservas = citas.map((a: any) => ({
            id: a.id,
            fecha: a.fecha,
            estado: a.estado,
            servicio: a.service?.nombre || 'Servicio',
            precio: policy.financials ? Number(a.service?.precio) || 0 : null,
            profesional: a.staff?.name || null,
        }));

        const ultimoNombre = pedidos[0]?.nombreCliente || null;
        return NextResponse.json({
            cliente: {
                id: cliente?.id || null,
                nombre: policy.customer ? (cliente?.nombre || ultimoNombre || 'Cliente') : 'Cliente Protegido',
                telefono: policy.contact ? (cliente?.telefono || pedidos[0]?.telefonoCliente || telefonoParam) : null,
                email: policy.contact ? (cliente?.email || null) : null,
                notas: (cliente as any)?.notas || null,
                createdAt: cliente?.createdAt || pedidos[pedidos.length - 1]?.createdAt || null,
            },
            ordenes,
            citas: reservas,
            fotos: fotos.slice(0, 40),
        });
    } catch (error) {
        console.error('[CLIENTES/ACTIVIDAD]', error);
        return NextResponse.json({ error: 'No se pudo cargar el historial.' }, { status: 500 });
    }
}
