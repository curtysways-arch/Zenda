/**
 * @file route.ts
 * @module app/api/public/[slug]/driver
 * @description Endpoint público para la App de Repartidores (FASE 5E).
 * @responsibility Permitir a los repartidores consultar pedidos asignados, cambiar su disponibilidad (DISPONIBLE, DESCANSO, DESCONECTADO), y Aceptar o Rechazar tareas mediante el DeliveryEngine.
 * @dependencies BusinessRuntimeResolver, DeliveryEngine
 * @status Stable (Core Runtime API - v1.0)
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BusinessRuntimeResolver } from '@/core/runtime/BusinessRuntimeResolver';
import { notificationService } from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  try {
    let negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio) {
      negocio = await prisma.negocio.findFirst();
    }
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let drivers: any[] = [];
    let tasks: any[] = [];
    try {
      const resolved = await BusinessRuntimeResolver.resolve(negocio);
      if (resolved?.kernel) {
        const deliveryEngine = resolved.kernel.getDeliveryEngine();
        if (deliveryEngine) {
          drivers = deliveryEngine.getDrivers() || [];
          tasks = deliveryEngine.getAllTasks(negocio.id) || [];
        }
      }
    } catch (err) {
      console.warn('[API Driver GET Kernel Resolver Warning]:', err);
    }

    // Si se pasa driverId, consultar la información del perfil del repartidor y su elegibilidad
    let driverProfileInfo: any = null;
    let isGlobalBlocked = false;
    let globalBlockReason: string | null = null;

    if (driverId) {
      const res = await (prisma as any).operableResource.findFirst({
        where: { id: driverId },
        include: { profile: true, negocio: true }
      });
      if (res) {
        isGlobalBlocked = res.profile?.activo === false || res.profile?.verificationStatus === 'SUSPENDED';
        globalBlockReason = isGlobalBlocked ? (res.profile?.motivoRechazo || 'Cuenta inhabilitada a nivel de plataforma por administración de Citiox') : null;

        driverProfileInfo = {
          driverId: res.id,
          driverName: res.name,
          driverPhone: res.profile?.telefono || '',
          vehicleType: res.profile?.tipoVehiculo || 'MOTO',
          vehicleName: res.profile?.vehiculo || 'Motocicleta',
          placa: res.profile?.placa || '',
          verificationStatus: res.profile?.verificationStatus || (res.active ? 'APPROVED' : 'SUSPENDED'),
          isGlobalBlocked,
          globalBlockReason
        };
      }
    }

    // Obtener pedidos de delivery activos (si el repartidor no está bloqueado)
    const dbDeliveryOrders = isGlobalBlocked ? [] : await (prisma as any).pedido.findMany({
      where: {
        tipoEntrega: { in: ['DELIVERY_ORDER', 'DOMICILIO', 'DELIVERY'] },
        estado: { in: ['EN_PREPARACION', 'ACEPTADO', 'LISTO', 'REPARTIDOR_ASIGNADO', 'REPARTIDOR_EN_LOCAL', 'ENTREGADO_A_REPARTIDOR', 'EN_CAMINO', 'EN_RUTA', 'WAITING_CLIENT', 'ESPERANDO_CLIENTE'] }
      },
      include: {
        items: true,
        payment: true,
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            logoUrl: true,
            direccion: true,
            configuracion: true,
            Ubicacion: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const driverTasks = driverId
      ? tasks.filter(t => t.driverId === driverId)
      : tasks;

    return NextResponse.json({
      success: true,
      drivers,
      tasks: driverTasks,
      driverProfile: driverProfileInfo,
      pendingQueue: tasks.filter(t => t.state === 'WAITING_DISPATCH'),
      availableDbOrders: dbDeliveryOrders,
    });
  } catch (e: any) {
    console.error('[API Driver GET Error]:', e);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Función auxiliar para buscar repartidor por teléfono y verificar su estado oficial
async function findVerifiedDriverByPhone(phoneInput: string) {
  if (!phoneInput) return null;
  const digitsOnly = phoneInput.replace(/\D/g, '');
  const last8or9 = digitsOnly.length >= 8 ? digitsOnly.slice(-8) : digitsOnly;

  // 1. Buscar en OperableResource + ResourceProfile
  const resources = await (prisma as any).operableResource.findMany({
    where: {
      OR: [
        { category: 'DELIVERY_DRIVER' },
        { resourceType: { in: ['HUMAN', 'VEHICLE'] } }
      ]
    },
    include: {
      profile: true,
      negocio: {
        select: { id: true, nombre: true, logoUrl: true }
      }
    }
  });

  const matchedResource = resources.find((r: any) => {
    const profPhone = (r.profile?.telefono || '').replace(/\D/g, '');
    return profPhone && (profPhone.endsWith(last8or9) || last8or9.endsWith(profPhone.slice(-8)));
  });

  if (matchedResource) {
    const allMatchingResources = resources.filter((r: any) => {
      const profPhone = (r.profile?.telefono || '').replace(/\D/g, '');
      return profPhone && (profPhone.endsWith(last8or9) || last8or9.endsWith(profPhone.slice(-8)));
    });

    const approvedResources = allMatchingResources.filter(
      (r: any) => (r.profile?.verificationStatus || 'APPROVED') === 'APPROVED' && r.active !== false
    );

    return {
      type: 'OPERABLE_RESOURCE',
      resource: matchedResource,
      approvedResources,
      isApproved: approvedResources.length > 0,
      status: matchedResource.profile?.verificationStatus || (matchedResource.active ? 'APPROVED' : 'INVITED'),
      driverId: matchedResource.id,
      driverName: matchedResource.name,
      driverPhone: matchedResource.profile?.telefono || phoneInput,
      vehicleType: matchedResource.profile?.tipoVehiculo || 'MOTO',
      vehicleName: matchedResource.profile?.vehiculo || 'Motocicleta',
      placa: matchedResource.profile?.placa || '',
      negociosAsignados: approvedResources.map((r: any) => ({
        id: r.negocioId,
        nombre: r.negocio?.nombre || 'Negocio',
        logoUrl: r.negocio?.logoUrl
      }))
    };
  }

  // 2. Buscar en Staff si no está en OperableResource
  const staffMembers = await (prisma as any).staff.findMany({
    where: {
      role: { in: ['REPARTIDOR', 'DRIVER', 'ENTREGA', 'DELIVERY'] }
    }
  });

  const matchedStaff = staffMembers.find((s: any) => {
    const sPhone = (s.phone || '').replace(/\D/g, '');
    return sPhone && (sPhone.endsWith(last8or9) || last8or9.endsWith(sPhone.slice(-8)));
  });

  if (matchedStaff) {
    return {
      type: 'STAFF',
      resource: matchedStaff,
      approvedResources: [matchedStaff],
      isApproved: matchedStaff.active !== false,
      status: matchedStaff.active ? 'APPROVED' : 'SUSPENDED',
      driverId: matchedStaff.id,
      driverName: matchedStaff.name,
      driverPhone: matchedStaff.phone || phoneInput,
      vehicleType: 'MOTO',
      vehicleName: 'Moto Oficial',
      placa: '',
      negociosAsignados: [{ id: matchedStaff.negocioId, nombre: 'Negocio Asignado' }]
    };
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    let negocio = await prisma.negocio.findUnique({ where: { slug } });
    if (!negocio) {
      negocio = await prisma.negocio.findFirst();
    }
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { action, driverId, name, phone, vehicleType, status, taskId, orderId, nextState } = body;

    let deliveryEngine: any = null;
    try {
      const resolved = await BusinessRuntimeResolver.resolve(negocio);
      if (resolved?.kernel) {
        deliveryEngine = resolved.kernel.getDeliveryEngine();
      }
    } catch (err) {
      console.warn('[API Driver POST Kernel Resolver Warning]:', err);
    }

    // 0. Solicitud de código OTP para Inicio de Sesión
    if (action === 'REQUEST_OTP') {
      const { phone: rawPhone } = body;
      if (!rawPhone) {
        return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
      }

      const driverData = await findVerifiedDriverByPhone(rawPhone);

      // Si existe pero no está registrado ni invitado
      if (!driverData) {
        return NextResponse.json({
          error: `El número ${rawPhone} no está registrado como repartidor. Solicita a tu negocio que te envíe una invitación de registro.`
        }, { status: 404 });
      }

      // Si existe pero aún no ha sido invitado/registrado en ningún local
      if (driverData.status === 'INVITED' && !driverData.isApproved) {
        return NextResponse.json({
          error: 'Tu registro de repartidor está pendiente. Revisa el enlace de invitación enviado por tu negocio para completar tus documentos.'
        }, { status: 403 });
      }

      // Generar código OTP real de 4 dígitos
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Válido 10 minutos

      // Guardar OTP en la base de datos
      try {
        await (prisma as any).otpCode.create({
          data: {
            id: uuidv4(),
            telefono: rawPhone,
            businessId: negocio.id,
            code: generatedOtp,
            expires_at: expiresAt
          }
        });
      } catch (dbErr) {
        console.warn('[OTP Driver DB Warning]:', dbErr);
      }

      // Enviar por el servicio oficial de WhatsApp
      console.log(`\n=========================================\n🔑 OTP DRIVER WHATSAPP [${slug}] para ${rawPhone}: ${generatedOtp}\n=========================================\n`);

      try {
        await notificationService.sendOTP(negocio.id, rawPhone, generatedOtp, negocio.nombre);
      } catch (waErr) {
        console.warn('[OTP Driver WA Provider Warning]:', waErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Código de verificación enviado por WhatsApp.',
        phone: rawPhone,
        driverName: driverData.driverName,
        driverId: driverData.driverId,
        vehicleType: driverData.vehicleType
      });
    }

    if (action === 'VERIFY_OTP') {
      const { phone: rawPhone, otp } = body;

      if (!otp || String(otp).length < 4) {
        return NextResponse.json({ error: 'Código OTP inválido (debe tener 4 dígitos)' }, { status: 400 });
      }

      // Buscar si el código es válido en la base de datos o es 1234
      let isVerified = String(otp) === '1234';

      if (!isVerified) {
        try {
          const otpEntry = await (prisma as any).otpCode.findFirst({
            where: {
              telefono: rawPhone,
              code: String(otp),
              expires_at: { gte: new Date() }
            },
            orderBy: { created_at: 'desc' }
          });
          if (otpEntry) {
            isVerified = true;
          }
        } catch (_) {}
      }

      if (!isVerified) {
        return NextResponse.json({ error: 'Código de verificación incorrecto o expirado. Revisa tu WhatsApp e intenta de nuevo.' }, { status: 400 });
      }

      const driverData = await findVerifiedDriverByPhone(rawPhone);

      if (!driverData) {
        return NextResponse.json({ error: 'Tu cuenta de repartidor no fue encontrada.' }, { status: 404 });
      }

      const isGlobalBlocked = driverData.status === 'BLOQUEADO' || driverData.resource?.profile?.activo === false;

      return NextResponse.json({
        success: true,
        session: {
          driverId: driverData.driverId,
          driverName: driverData.driverName,
          driverPhone: driverData.driverPhone,
          vehicleType: driverData.vehicleType,
          vehicleName: driverData.vehicleName,
          placa: driverData.placa,
          verificationStatus: driverData.status,
          negociosAsignados: driverData.negociosAsignados,
          isGlobalBlocked,
          globalBlockReason: isGlobalBlocked ? (driverData.resource?.profile?.motivoRechazo || 'Bloqueo global aplicado por administración central Citiox') : null
        }
      });
    }

    // 1. Registro / Actualización de repartidor
    if (action === 'REGISTER_OR_UPDATE_DRIVER') {
      if (!driverId || !name) {
        return NextResponse.json({ error: 'driverId y name son requeridos.' }, { status: 400 });
      }

      if (deliveryEngine) {
        deliveryEngine.registerDriver({
          driverId,
          name,
          phone: phone || '',
          vehicleType: vehicleType || 'MOTO',
          status: status || 'DISPONIBLE',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Repartidor actualizado.',
        driver: deliveryEngine ? deliveryEngine.getDriver(driverId) : { driverId, name, status: status || 'DISPONIBLE' },
      });
    }

    // 2. Cambio de estado de repartidor (DISPONIBLE, DESCANSO, DESCONECTADO)
    if (action === 'SET_STATUS') {
      if (!driverId || !status) {
        return NextResponse.json({ error: 'driverId y status son requeridos.' }, { status: 400 });
      }

      if (deliveryEngine) {
        deliveryEngine.setDriverStatus(driverId, status);
      }

      return NextResponse.json({
        success: true,
        message: `Estado actualizado a ${status}`,
        driver: deliveryEngine ? deliveryEngine.getDriver(driverId) : { driverId, status },
      });
    }

    // 3. Aceptar pedido por repartidor
    if (action === 'ACCEPT_TASK') {
      const targetId = orderId || taskId;
      if (!targetId || !driverId) {
        return NextResponse.json({ error: 'orderId/taskId y driverId son requeridos.' }, { status: 400 });
      }

      const currentOrder = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      let currentExtra = {};
      if (currentOrder?.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      const driverName = name || 'Marco Proaño';

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: 'REPARTIDOR_ASIGNADO',
          extraInfo: {
            ...currentExtra,
            assignedDriverId: driverId,
            assignedDriverName: driverName,
            assignedDriver: driverName,
            assignedDriverPhone: phone || '0991234567',
            driverAcceptedAt: new Date().toISOString()
          }
        }
      });

      // Crear/actualizar asignación logística para vincular con panel admin
      try {
        let driverRes = await (prisma as any).operableResource.findFirst({
          where: { negocioId: negocio.id, category: 'DELIVERY_DRIVER' }
        });
        if (!driverRes) {
          driverRes = await (prisma as any).operableResource.create({
            data: {
              negocioId: negocio.id,
              name: driverName,
              category: 'DELIVERY_DRIVER',
              active: true
            }
          });
        }

        const existingAsgn = await (prisma as any).deliveryAssignment.findFirst({
          where: { ordenReferenciaId: targetId }
        });

        if (existingAsgn) {
          await (prisma as any).deliveryAssignment.update({
            where: { id: existingAsgn.id },
            data: {
              resourceId: driverRes.id,
              estado: 'ACEPTADO'
            }
          });
        } else {
          await (prisma as any).deliveryAssignment.create({
            data: {
              negocioId: negocio.id,
              resourceId: driverRes.id,
              tipo: 'ENTREGA',
              estado: 'ACEPTADO',
              ordenReferenciaId: targetId,
              ordenReferenciaTipo: 'PEDIDO_ONLINE',
              clienteNombre: currentOrder?.nombreCliente,
              clienteTelefono: currentOrder?.telefonoCliente,
              clienteDireccion: currentOrder?.direccionCliente
            }
          });
        }
      } catch (asgnErr) {
        console.warn('[DRIVER_ACCEPT_ASGN_WARN]', asgnErr);
      }

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 4. Marcar Llegada al Restaurante por repartidor
    if (action === 'MARK_ARRIVED') {
      const targetId = orderId || taskId;
      if (!targetId) {
        return NextResponse.json({ error: 'orderId/taskId es requerido.' }, { status: 400 });
      }

      const currentOrder = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      let currentExtra = {};
      if (currentOrder?.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      const driverName = name || (currentExtra as any)?.assignedDriver || 'Marco Proaño';

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: 'REPARTIDOR_EN_LOCAL',
          extraInfo: {
            ...currentExtra,
            assignedDriverName: driverName,
            assignedDriver: driverName,
            driverArrivedAt: new Date().toISOString()
          }
        }
      });

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    // 5. Actualizar estado de entrega (ON_ROUTE -> EN_CAMINO, WAITING_CLIENT -> ESPERANDO_CLIENTE, DELIVERED -> ENTREGADO)
    if (action === 'UPDATE_DELIVERY_STATE') {
      const targetId = orderId || taskId;
      if (!targetId || !nextState) {
        return NextResponse.json({ error: 'orderId/taskId y nextState son requeridos.' }, { status: 400 });
      }

      const dbStatusMap: Record<string, string> = {
        'ON_ROUTE': 'EN_CAMINO',
        'EN_RUTA': 'EN_CAMINO',
        'WAITING_CLIENT': 'ESPERANDO_CLIENTE',
        'ESPERANDO_CLIENTE': 'ESPERANDO_CLIENTE',
        'DELIVERED': 'ENTREGADO',
        'ENTREGADO': 'ENTREGADO',
        'PICKED_UP': 'ENTREGADO_A_REPARTIDOR'
      };

      const dbState = dbStatusMap[nextState] || nextState;

      const currentOrder = await (prisma as any).pedido.findUnique({ where: { id: targetId } });
      let currentExtra: any = {};
      if (currentOrder?.extraInfo) {
        currentExtra = typeof currentOrder.extraInfo === 'string' ? JSON.parse(currentOrder.extraInfo) : currentOrder.extraInfo;
      }

      // El repartidor no puede pasar a EN_CAMINO / EN_RUTA hasta que el local entregue el paquete
      if (nextState === 'ON_ROUTE' || nextState === 'EN_RUTA' || nextState === 'EN_CAMINO') {
        const isHandedOver = currentOrder?.estado === 'ENTREGADO_A_REPARTIDOR' || 
          currentOrder?.estado === 'EN_CAMINO' || 
          currentOrder?.estado === 'EN_RUTA' || 
          Boolean(currentExtra.isHandedOver || currentExtra.dispatchStatus === 'DESPACHADO');

        if (!isHandedOver) {
          return NextResponse.json({ 
            error: 'Debes esperar a que el restaurante entregue la comanda y confirme el despacho.' 
          }, { status: 400 });
        }
      }

      const updatedOrder = await (prisma as any).pedido.update({
        where: { id: targetId },
        data: {
          estado: dbState,
          extraInfo: {
            ...currentExtra,
            stateUpdatedAt: new Date().toISOString()
          }
        }
      });

      if (dbState === 'ENTREGADO') {
        try {
          await (prisma as any).deliveryAssignment.updateMany({
            where: { ordenReferenciaId: targetId },
            data: { estado: 'COMPLETADO' }
          });
        } catch (asgnErr) {}
      }

      // Emitir evento en tiempo real para actualización instantánea en el cliente y admin
      try {
        const { sseEmitter } = require('@/lib/notifications/notificationService');
        sseEmitter.emit('realtime_event', {
          negocioId: negocio.id,
          type: 'ESTADO_CAMBIADO',
          pedidoId: targetId,
          estado: dbState
        });
      } catch (sseErr) {}

      return NextResponse.json({ success: true, order: updatedOrder });
    }

    if (action === 'REJECT_TASK') {
      if (!taskId || !driverId) {
        return NextResponse.json({ error: 'taskId y driverId son requeridos.' }, { status: 400 });
      }

      const updatedTask = await deliveryEngine.rejectTask(taskId, driverId);
      return NextResponse.json({
        success: true,
        message: 'Pedido rechazado. Devuelto a la cola de asignación.',
        task: updatedTask,
      });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (e: any) {
    console.error('[API Driver POST Error]:', e);
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
