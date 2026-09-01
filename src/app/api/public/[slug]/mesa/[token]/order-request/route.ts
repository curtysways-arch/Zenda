import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  try {
    const { slug, token } = await params;
    const body = await request.json();

    const {
      tableSessionId,
      nombreCliente,
      telefonoCliente,
      items,
      notas,
      clientLat,
      clientLng,
      accuracy
    } = body;

    // 1. Validar parámetros requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El carrito no contiene productos.' }, { status: 400 });
    }

    if (clientLat === undefined || clientLng === undefined || clientLat === null || clientLng === null) {
      return NextResponse.json({
        error: 'Necesitamos verificar tu ubicación para confirmar que estás dentro del restaurante.'
      }, { status: 400 });
    }

    // 2. Resolver negocio y mesa
    const negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio || negocio.estado !== 'ACTIVO') {
      return NextResponse.json({ error: 'Restaurante no disponible' }, { status: 404 });
    }

    const mesa = await (prisma as any).restaurantTable.findFirst({
      where: { token, negocioId: negocio.id }
    });

    if (!mesa || !mesa.activa) {
      return NextResponse.json({ error: 'Esta mesa no se encuentra disponible.' }, { status: 403 });
    }

    // 3. Consultar configuración de geolocalización y pedidos en mesa
    let config: any = {};
    if (typeof negocio.configuracion === 'string') {
      try { config = JSON.parse(negocio.configuracion); } catch { config = {}; }
    } else {
      config = negocio.configuracion || {};
    }

    const mesaPedidosHabilitados = config.mesaPedidosHabilitados !== undefined ? Boolean(config.mesaPedidosHabilitados) : true;
    const mesaRadioPermitido = config.mesaRadioPermitido !== undefined ? Number(config.mesaRadioPermitido) : 100;
    const latNegocio = config.latitudNegocio !== undefined ? Number(config.latitudNegocio) : -0.180653;
    const lngNegocio = config.longitudNegocio !== undefined ? Number(config.longitudNegocio) : -78.467838;

    if (!mesaPedidosHabilitados || !mesa.permitePedidos) {
      return NextResponse.json({
        error: 'Los pedidos desde la mesa están desactivados temporalmente para este restaurante.'
      }, { status: 403 });
    }

    // 4. Validar precisión del GPS (Accuracy)
    if (accuracy && Number(accuracy) > 120) {
      return NextResponse.json({
        error: 'No podemos verificar tu ubicación con suficiente precisión (GPS impreciso). Activa el GPS de alta precisión e inténtalo nuevamente.'
      }, { status: 400 });
    }

    // 5. Cálculo Server-Side de Geolocalización (Haversine)
    const distanceMeters = calculateHaversineDistance(
      Number(clientLat),
      Number(clientLng),
      latNegocio,
      lngNegocio
    );

    if (distanceMeters > mesaRadioPermitido) {
      return NextResponse.json({
        error: `📍 Estás fuera del restaurante. Debes estar dentro del local para realizar un pedido desde la mesa. Distancia detectada: ${distanceMeters}m. Distancia máxima permitida: ${mesaRadioPermitido}m.`
      }, { status: 403 });
    }

    // 6. Reconstrucción y validación de precios Server-Side desde la BD
    let calculatedSubtotal = 0;
    const validatedSnapshotItems = [];

    for (const rawItem of items) {
      const prodId = rawItem.productoId || rawItem.id || rawItem.product?.id;
      const qty = Math.max(1, parseInt(rawItem.cantidad || rawItem.quantity || 1, 10));

      if (!prodId) continue;

      const dbProduct = await (prisma as any).producto.findFirst({
        where: { id: prodId, negocioId: negocio.id }
      });

      if (!dbProduct) continue;

      let unitPrice = Number(dbProduct.precio || 0);
      let varianteNombre = null;
      let varianteId = rawItem.varianteId || rawItem.product?.varianteId || null;

      if (varianteId && dbProduct.variantes && Array.isArray(dbProduct.variantes)) {
        const vMatch = dbProduct.variantes.find((v: any) => v.id === varianteId);
        if (vMatch) {
          unitPrice = Number(vMatch.precio || unitPrice);
          varianteNombre = vMatch.nombre || null;
        }
      }

      const itemSubtotal = unitPrice * qty;
      calculatedSubtotal += itemSubtotal;

      validatedSnapshotItems.push({
        productoId: dbProduct.id,
        nombre: dbProduct.nombre,
        varianteId,
        varianteNombre,
        sku: dbProduct.sku || null,
        cantidad: qty,
        precioUnitario: unitPrice,
        subtotal: itemSubtotal
      });
    }

    if (validatedSnapshotItems.length === 0) {
      return NextResponse.json({ error: 'Ningún producto del carrito se encuentra disponible.' }, { status: 400 });
    }

    const calculatedTotal = calculatedSubtotal; // Sin costo de envío en mesa

    // 7. Crear la Solicitud de Pedido en estado PENDING_ADMIN_CONFIRMATION
    const orderRequest = await (prisma as any).tableOrderRequest.create({
      data: {
        negocioId: negocio.id,
        tableId: mesa.id,
        tableSessionId: tableSessionId || `session_${Date.now()}`,
        nombreCliente: nombreCliente ? String(nombreCliente).trim() : `Cliente Mesa ${mesa.nombre}`,
        telefonoCliente: telefonoCliente ? String(telefonoCliente).trim() : null,
        items: validatedSnapshotItems,
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
        notas: notas ? String(notas).trim() : null,
        estado: 'PENDING_ADMIN_CONFIRMATION',
        locationValidated: true,
        distanceFromBusiness: distanceMeters,
        clientLat: Number(clientLat),
        clientLng: Number(clientLng)
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de pedido enviada al administrador',
      request: {
        id: orderRequest.id,
        mesaNombre: mesa.nombre,
        total: calculatedTotal,
        distanceMeters,
        estado: orderRequest.estado
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[PUBLIC_TABLE_ORDER_REQUEST_POST_ERROR]', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud de pedido en mesa' }, { status: 500 });
  }
}
