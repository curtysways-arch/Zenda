import { NextResponse } from 'next/server';
import { guardCustomerIntake } from '@/lib/subscription/receiveGuard';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/lib/notifications/notificationService';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { calculateDeliveryCost, calculateDeliveryCostAsync, getRoadDistanceKm } from '@/core/delivery/DeliveryPricing';
import { extractCoordsFromMapUrl } from '@/core/branch/BranchService';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import { requireBusinessAccess } from '@/lib/auth/requireBusinessAccess';

export const dynamic = 'force-dynamic';

function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '593' + clean.substring(1);
  } else if (clean.startsWith('9')) {
    clean = '593' + clean;
  } else if (clean.startsWith('5930')) {
    clean = '593' + clean.substring(4);
  }
  return clean;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let businessId = searchParams.get('businessId') || searchParams.get('negocioId');
    const status = searchParams.get('status');
    const phone = searchParams.get('phone');

    if (!businessId || businessId === 'demo-canchas') {
      const session = await getEffectiveAdminSession();
      if (session?.user && (session.user as any).negocioId) {
        businessId = (session.user as any).negocioId;
      }
    }

    if (!businessId || businessId === 'all') {
      return NextResponse.json({ error: 'Falta el negocio.' }, { status: 400 });
    }

    // Consulta del cliente por su teléfono (página pública "mis órdenes"); todo lo demás es del panel.
    if (!phone) {
      const access = await requireBusinessAccess(businessId);
      if (!access.ok) return access.response;
    }

    const whereClause: any = { negocioId: businessId };
    if (status) whereClause.estado = status;
    if (phone) whereClause.telefonoCliente = phone;

    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        payment: true,
        items: true
      }
    });

    if (phone) {
      // El cliente nunca ve datos internos (códigos se muestran solo en su página de seguimiento)
      return NextResponse.json(pedidos.map((p: any) => {
        const ex = { ...((p.extraInfo as any) || {}) };
        delete ex.timeline; delete ex.notasInternas; delete ex.canonicalLogistics;
        return { ...p, extraInfo: ex };
      }));
    }
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Error fetching shoe care orders:', error);
    return NextResponse.json({ error: 'Error obteniendo órdenes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let {
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

    if (!negocioId || negocioId === 'demo-canchas') {
      const session = await getEffectiveAdminSession();
      if (session?.user && (session.user as any).negocioId) {
        negocioId = (session.user as any).negocioId;
      }
    }

    if (!negocioId || !nombreCliente || !telefonoCliente) {
      return NextResponse.json({ error: 'negocioId, nombreCliente y telefonoCliente son requeridos' }, { status: 400 });
    }
    const intakeBlocked = await guardCustomerIntake(negocioId);
    if (intakeBlocked) return intakeBlocked;

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

      itemsToCreate = rawArticulos.map((art: any) => {
        const extraNote = art.notas ? ` (${art.notas})` : (art.variante && art.variante !== art.tipo ? ` (${art.variante})` : '');
        const extraAddons = art.extras?.length ? ` + ${art.extras.join(', ')}` : '';
        return {
          nombreProducto: `${art.tipo || 'Artículo'}${extraNote}: ${art.servicioNombre || 'Servicio'}${extraAddons}`.trim(),
          precioUnitario: parseFloat(art.precioUnitario) || 0,
          cantidad: parseInt(art.cantidad) || 1
        };
      });
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

    // Resolver la sucursal activa para el origen del delivery (solo desde Sucursales)
    const branch = await prisma.branch.findFirst({
      where: {
        businessId: negocioId,
        ...(body.branchId ? { id: body.branchId } : { active: true })
      },
      orderBy: [
        { isMain: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    let latNegocio: number | null = null;
    let lngNegocio: number | null = null;

    if (branch) {
      if (branch.latitude != null && branch.longitude != null) {
        latNegocio = branch.latitude;
        lngNegocio = branch.longitude;
      } else {
        const branchSettings = (branch.settings && typeof branch.settings === 'object') ? (branch.settings as any) : {};
        if (branchSettings.latitude != null && branchSettings.longitude != null) {
          latNegocio = parseFloat(branchSettings.latitude);
          lngNegocio = parseFloat(branchSettings.longitude);
        } else if (branchSettings.mapUrl) {
          const coords = extractCoordsFromMapUrl(branchSettings.mapUrl);
          if (coords) {
            latNegocio = coords.lat;
            lngNegocio = coords.lng;
          }
        }
      }
    }

    // Fallback a Ubicacion si no se encontraron en Branch
    if (latNegocio == null || lngNegocio == null) {
      const ubi = await (prisma as any).ubicacion.findFirst({
        where: { negocioId },
        orderBy: { createdAt: 'asc' }
      });
      if (ubi) {
        if (ubi.latitud != null && ubi.longitud != null) {
          latNegocio = Number(ubi.latitud);
          lngNegocio = Number(ubi.longitud);
        } else if (ubi.mapUrl) {
          const coords = extractCoordsFromMapUrl(ubi.mapUrl);
          if (coords) {
            latNegocio = coords.lat;
            lngNegocio = coords.lng;
          }
        }
      }
    }

    // Fallback de contingencia sólo si no hay sucursal
    if (latNegocio == null || lngNegocio == null) {
      if (configMap.latitudNegocio && configMap.longitudNegocio) {
        latNegocio = parseFloat(configMap.latitudNegocio);
        lngNegocio = parseFloat(configMap.longitudNegocio);
      }
    }

    // El costo de envío lo calcula el servidor. Solo el personal del local puede fijarlo a mano (recepción en mostrador).
    const staffAccess = body.costoEnvio !== undefined ? await requireBusinessAccess(negocioId) : null;
    const manualShipping = Boolean(staffAccess?.ok) && Number.isFinite(parseFloat(body.costoEnvio));
    let costoEnvioCalculado = manualShipping ? parseFloat(body.costoEnvio) : 0;
    if (esDomicilio && !manualShipping) {
      const baseCost = configMap.costoEnvio !== undefined ? parseFloat(configMap.costoEnvio) : 1.50;
      if (latitud && longitud && latNegocio != null && lngNegocio != null) {
        const kmRate = configMap.costoEnvioPorKm !== undefined ? parseFloat(configMap.costoEnvioPorKm) : 0.30;

        // Lavandería / Shoe-Care: Recogida + Entrega vial real (calles OSRM, no línea recta)
        const pricing = await calculateDeliveryCostAsync(
          latNegocio,
          lngNegocio,
          parseFloat(latitud.toString()),
          parseFloat(longitud.toString()),
          {
            enabled: true,
            baseCost,
            costPerKm: kmRate,
            tipoNegocio: 'LAVANDERIA',
            isRoundTrip: true
          }
        );
        costoEnvioCalculado = pricing.deliveryCost;
        const pickupFee = pricing.pickupFee !== undefined ? pricing.pickupFee : Math.round((costoEnvioCalculado / 2) * 100) / 100;
        const deliveryFee = pricing.deliveryFee !== undefined ? pricing.deliveryFee : Math.round((costoEnvioCalculado - pickupFee) * 100) / 100;

        (extraInfo as any).distanciaKm = pricing.distanceKm;
        (extraInfo as any).distanciaCobrableKm = pricing.billableDistanceKm;
        (extraInfo as any).tipoEntregaDesplazamiento = 'RECOGIDA_Y_ENTREGA';
        (extraInfo as any).esRutaVialReal = true;
        (extraInfo as any).origenLat = latNegocio;
        (extraInfo as any).origenLng = lngNegocio;
        (extraInfo as any).sucursalNombre = branch?.name || 'Local Principal';
        (extraInfo as any).sucursalDireccion = branch?.address || null;
        (extraInfo as any).canonicalLogistics = {
          tipoMision: 'ROUND_TRIP_SERVICE',
          pickupFee,
          deliveryFee,
          totalLogisticsFee: costoEnvioCalculado,
          recaudacion: {
            requerida: false,
            montoEsperado: 0.00,
            montoRecaudado: 0.00,
            estado: 'NOT_REQUIRED',
            metodo: 'NINGUNO'
          }
        };
      } else {
        // Sin ubicación exacta: tarifa base por cada viaje (retiro + entrega)
        costoEnvioCalculado = Math.round(baseCost * 2 * 100) / 100;
      }
    }
    if (esDomicilio) {
      if (!(extraInfo as any).canonicalLogistics) {
        const pFee = Math.round((costoEnvioCalculado / 2) * 100) / 100;
        const dFee = Math.round((costoEnvioCalculado - pFee) * 100) / 100;
        (extraInfo as any).canonicalLogistics = {
          tipoMision: 'ROUND_TRIP_SERVICE',
          pickupFee: pFee,
          deliveryFee: dFee,
          totalLogisticsFee: costoEnvioCalculado,
          recaudacion: {
            requerida: false,
            montoEsperado: 0.00,
            montoRecaudado: 0.00,
            estado: 'NOT_REQUIRED',
            metodo: 'NINGUNO'
          }
        };
      }
    }

    const pedido = await prisma.pedido.create({
      data: {
        negocioId,
        branchId: branch?.id || null,
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

    // 4. WhatsApp al negocio y al cliente, en segundo plano (no hace esperar al cliente si WhatsApp tarda)
    void (async () => {
    try {
      const negocio = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { nombre: true, whatsapp: true }
      });

      // Si el negocio no tiene teléfono configurado, intentar con el teléfono admin global
      let waNegocioNumero = negocio?.whatsapp;
      if (!waNegocioNumero) {
        try {
          const cfg = await (prisma as any).globalConfig.findUnique({
            where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
          });
          waNegocioNumero = cfg?.valor || '593959997521';
        } catch {
          waNegocioNumero = '593959997521';
        }
      }

      const cleanCliente = normalizePhone(telefonoCliente);
      const cleanNegocio = waNegocioNumero ? normalizePhone(waNegocioNumero) : null;

      // Resumen legible de artículos
      const articulosTexto = Array.isArray(rawArticulos) && rawArticulos.length > 0
        ? rawArticulos.map((a: any, idx: number) => `  ${idx + 1}. ${a.cantidad || 1}x ${a.tipo || 'Calzado'} (${a.servicioNombre || 'Limpieza'}${a.variante ? ' - ' + a.variante : ''})`).join('\n')
        : `  • ${cantidadPares || 1} par(es) de calzado`;

      const totalEstimadoFinal = (totalCalculado + costoEnvioCalculado).toFixed(2);

      // 4.1 Notificación al Negocio
      if (cleanNegocio) {
        const msgNegocio = [
          `🔔 *NUEVA ORDEN DE SERVICIO #${numeroPedido}*`,
          ``,
          `👤 *Cliente:* ${nombreCliente}`,
          `📞 *WhatsApp:* +${cleanCliente}`,
          `📍 *Dirección:* ${direccionCliente || 'Recepción en local'}`,
          referenciaCliente ? `📝 *Referencia:* ${referenciaCliente}` : null,
          `🚚 *Modalidad:* ${esDomicilio ? 'Retiro a Domicilio' : 'Recepción en Local'}`,
          `⏰ *Horario:* ${fechaHoraRetiro || 'A coordinar'}`,
          `📦 *Prendas:*`,
          articulosTexto,
          observaciones || notas ? `💬 *Observaciones:* ${observaciones || notas}` : null,
          ``,
          `💵 *Total Estimado: $${totalEstimadoFinal} USD*`,
          ``,
          `👉 Gestionar pedido en el panel:`,
          `https://citiox.com/admin/ordenes-servicio`
        ].filter(Boolean).join('\n');

        await sendWhatsAppMessage(cleanNegocio, msgNegocio, 'shoe_care_nueva_orden_negocio');
      }

      // 4.2 Notificación de confirmación al Cliente
      if (cleanCliente) {
        const msgCliente = [
          `👟 *¡Hola ${nombreCliente}! Recibimos tu solicitud #${numeroPedido}*`,
          ``,
          `Hemos registrado tu pedido para el cuidado de tus prendas:`,
          `📦 *Artículos:*`,
          articulosTexto,
          `🚚 *Modalidad:* ${esDomicilio ? 'Retiro a Domicilio' : 'Recepción en Local'}`,
          `⏰ *Horario solicitado:* ${fechaHoraRetiro || 'A coordinar'}`,
          `📍 *Dirección:* ${direccionCliente || 'En local'}`,
          `💵 *Total Estimado: $${totalEstimadoFinal} USD*`,
          ``,
          `Nos pondremos en contacto contigo para coordinar el retiro e informarte tras la inspección física en taller. ¡Gracias por tu preferencia! 🫧✨`
        ].filter(Boolean).join('\n');

        await sendWhatsAppMessage(cleanCliente, msgCliente, 'shoe_care_confirmacion_cliente');
      }
    } catch (waErr) {
      console.error('[WhatsApp Orders] Error despachando notificaciones:', waErr);
    }
    })();

    // 5. Despachar al Centro de Notificaciones In-App & Tiempo Real SSE
    try {
      const montoTotalStr = Number(pedido.total || 0).toFixed(2);

      // 5.1 Notificación para el Cliente
      await NotificationService.createNotification({
        negocioId,
        telefonoCliente,
        tipo: 'ORDEN',
        categoria: 'ORDENES',
        titulo: `👟 Orden #${pedido.numeroPedido} Registrada`,
        descripcion: `Hemos recibido tu solicitud (${esDomicilio ? 'Retiro a Domicilio' : 'Recepción en Local'}) por un estimado de $${montoTotalStr}. Te mantendremos informado de cada paso.`,
        icono: 'PackageCheck',
        prioridad: 'INFO',
        recipientType: 'USER',
        actionType: 'VER_ORDEN',
        actionPayload: { screen: 'order', orderId: pedido.id, url: '/pedidos' },
        channels: ['APP', 'PUSH']
      });

      // 5.2 Notificación para el Negocio / Administradores
      await NotificationService.createNotification({
        negocioId,
        tipo: 'ORDEN',
        categoria: 'ORDENES',
        titulo: `🔔 Nueva Orden #${pedido.numeroPedido}`,
        descripcion: `${nombreCliente} - ${esDomicilio ? 'Domicilio' : 'En Local'} ($${montoTotalStr})`,
        icono: 'ShoppingBag',
        prioridad: 'SUCCESS',
        recipientType: 'ALL',
        actionType: 'VER_ORDEN',
        actionPayload: { screen: 'order', orderId: pedido.id, url: '/admin/lavado' },
        channels: ['APP', 'PUSH']
      });
    } catch (notifErr) {
      console.error('[ShoeCare Orders] Error emitiendo NotificationService:', notifErr);
    }

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Error creando orden de lavado:', error);
    return NextResponse.json({ error: 'Error al crear la orden de servicio' }, { status: 500 });
  }
}
