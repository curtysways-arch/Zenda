import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId');
    const status = searchParams.get('status');
    const phone = searchParams.get('phone');

    let whereClause: any = {};
    if (businessId) whereClause.negocioId = businessId;
    if (status) whereClause.estado = status;
    if (phone) whereClause.telefonoCliente = phone;

    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        payment: true
      }
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Error fetching shoe care orders:', error);
    return NextResponse.json({ error: 'Error obteniendo órdenes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      negocioId,
      modo, // 'LOCAL' | 'DOMICILIO'
      nombreCliente,
      telefonoCliente,
      emailCliente,
      direccionCliente,
      referenciaCliente,
      cantidadPares,
      notas,
      observaciones,
      latitud,
      longitud,
      fechaHoraRetiro,
      fechaEstimadaEntrega,
      fotosRecepcion,
      precioEstimado,
      servicioNombre,
      precioServicio
    } = body;

    if (!negocioId || !nombreCliente || !telefonoCliente) {
      return NextResponse.json({ error: 'negocioId, nombreCliente y telefonoCliente son requeridos' }, { status: 400 });
    }

    // 1. Obtener o crear/actualizar Cliente automáticamente
    let cliente = await prisma.cliente.findUnique({
      where: {
        telefono_negocioId: {
          telefono: telefonoCliente,
          negocioId
        }
      }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          id: `cli_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          nombre: nombreCliente,
          telefono: telefonoCliente,
          email: emailCliente || null,
          negocioId,
          updatedAt: new Date()
        }
      });
    } else if (nombreCliente || emailCliente) {
      cliente = await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          nombre: nombreCliente || cliente.nombre,
          email: emailCliente || cliente.email,
          updatedAt: new Date()
        }
      });
    }

    // 2. Determinar número de pedido incremental por negocio
    const lastOrder = await prisma.pedido.findFirst({
      where: { negocioId },
      orderBy: { numeroPedido: 'desc' }
    });
    const numeroPedido = (lastOrder?.numeroPedido || 0) + 1;

    // 3. Determinar estado inicial y valores iniciales segun modo
    const esDomicilio = modo === 'DOMICILIO' || modo === 'RETIRO_SOLO' || modo === 'DESPACHO_SOLO';
    const requiereRetiro = modo === 'DOMICILIO' || modo === 'RETIRO_SOLO';
    const estadoInicial = requiereRetiro ? 'PENDIENTE_RETIRO' : 'RECIBIDO';
    const numPares = parseInt(cantidadPares) || 1;
    
    // Procesar artículos multi-atributo si se reciben
    const rawArticulos = Array.isArray(body.articulos) ? body.articulos : [];
    
    let totalCalculado = 0;
    let itemsToCreate: any[] = [];

    if (rawArticulos.length > 0) {
      totalCalculado = rawArticulos.reduce((sum: number, art: any) => {
        const pUnit = parseFloat(art.precioUnitario) || 0;
        const qty = parseInt(art.cantidad) || 1;
        return sum + (pUnit * qty);
      }, 0);

      itemsToCreate = rawArticulos.map((art: any) => ({
        nombreProducto: `${art.tipo || 'Artículo'} (${art.variante || 'Estándar'}): ${art.servicioNombre || 'Servicio'}${art.extras?.length ? ` + ${art.extras.join(', ')}` : ''}`,
        precioUnitario: parseFloat(art.precioUnitario) || 0,
        cantidad: parseInt(art.cantidad) || 1
      }));
    } else {
      const precioBase = parseFloat(precioServicio) || parseFloat(precioEstimado) || 6.00;
      totalCalculado = precioBase * numPares;
      itemsToCreate = [
        {
          nombreProducto: servicioNombre ? `${servicioNombre} (${numPares} par/es)` : `Servicio Lavado de Calzado (${numPares} par/es)`,
          precioUnitario: precioBase,
          cantidad: numPares
        }
      ];
    }

    const fechaEntregaFinal = fechaEstimadaEntrega ? new Date(fechaEstimadaEntrega) : new Date(Date.now() + 86400000 * 2);

    const extraInfo = {
      modoIngreso: modo || (esDomicilio ? 'DOMICILIO' : 'LOCAL'),
      cantidadPares: numPares,
      servicioNombre: servicioNombre || 'Lavado Completo',
      articulos: rawArticulos,
      requiereConfirmacionPrecio: Boolean(body.requiereConfirmacionPrecio),
      fechaHoraRetiro: fechaHoraRetiro || null,
      fechaEstimadaEntrega: fechaEntregaFinal.toISOString(),
      fotosRecepcion: Array.isArray(fotosRecepcion) ? fotosRecepcion : [],
      fotosProceso: [],
      fotosRetiro: [],
      fotosEntrega: [],
      precioEstimado: totalCalculado,
      observaciones: observaciones || notas || '',
      inspeccionRealizada: !esDomicilio,
      avisoInspeccion: esDomicilio ? "El precio final será confirmado después de inspeccionar el estado del calzado." : "Calzado recibido e inspeccionado en local."
    };

    // Obtener configuración del negocio para tarifas dinámicas de envío
    const configsDB = await prisma.configuracion.findMany({ where: { negocioId } });
    const configMap: Record<string, string> = {};
    configsDB.forEach(c => { configMap[c.clave] = c.valor; });

    let costoEnvioCalculado = body.costoEnvio !== undefined ? parseFloat(body.costoEnvio) : 0;
    if (esDomicilio && body.costoEnvio === undefined) {
      const baseCost = configMap.costoEnvio !== undefined ? parseFloat(configMap.costoEnvio) : 1.50;
      if (latitud && longitud) {
        const latNegocio = configMap.latitudNegocio !== undefined ? parseFloat(configMap.latitudNegocio) : -0.180653;
        const lngNegocio = configMap.longitudNegocio !== undefined ? parseFloat(configMap.longitudNegocio) : -78.467838;
        
        // Fórmula de distancia Haversine
        const R = 6371;
        const dLat = (parseFloat(latitud.toString()) - latNegocio) * (Math.PI / 180);
        const dLon = (parseFloat(longitud.toString()) - lngNegocio) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latNegocio * (Math.PI / 180)) * Math.cos(parseFloat(latitud.toString()) * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;

        const kmCost = distanceKm * (configMap.costoEnvioPorKm !== undefined ? parseFloat(configMap.costoEnvioPorKm) : 0.30);
        costoEnvioCalculado = parseFloat((baseCost + kmCost).toFixed(2));
      } else {
        costoEnvioCalculado = baseCost;
      }
    }

    const pedido = await prisma.pedido.create({
      data: {
        negocioId,
        numeroPedido,
        tipoEntrega: esDomicilio ? 'DOMICILIO' : 'RETIRO',
        nombreCliente,
        telefonoCliente,
        direccionCliente: direccionCliente || null,
        referenciaCliente: referenciaCliente || null,
        latitud: latitud ? parseFloat(latitud.toString()) : null,
        longitud: longitud ? parseFloat(longitud.toString()) : null,
        fechaEntrega: fechaEntregaFinal,
        franjaHoraria: fechaHoraRetiro || '10:00 - 18:00',
        subtotal: totalCalculado,
        costoEnvio: costoEnvioCalculado,
        total: totalCalculado + costoEnvioCalculado,
        estado: estadoInicial,
        notas: observaciones || notas || null,
        extraInfo,
        items: {
          create: itemsToCreate
        }
      },
      include: {
        items: true
      }
    });

    // 4. Si es Domicilio, simular o disparar notificación de WhatsApp al negocio
    if (esDomicilio) {
      console.log(`📱 [WhatsApp Business Notify] Nueva solicitud de retiro a domicilio #${numeroPedido} de ${nombreCliente} (${telefonoCliente})`);
    }

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Error creando orden de lavado:', error);
    return NextResponse.json({ error: 'Error al crear la orden de servicio' }, { status: 500 });
  }
}
