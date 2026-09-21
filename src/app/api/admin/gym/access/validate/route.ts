import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { publishBusinessEvent } from '@/lib/growth/eventBus';
import { getGymAccessConfig } from '@/modules/gym/types/gymAccessConfig';

export async function POST(req: Request) {
  const session = await getEffectiveAdminSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const negocioId = (session.user as any).negocioId;
  const adminUserId = (session.user as any).id;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { qrCode, customerId, identifier, branchId, method = 'QR' } = body;

    // Verificar permisos según la configuración de métodos de acceso del gimnasio
    const negocioConfig = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { configuracion: true }
    });
    const accessConfig = getGymAccessConfig(negocioConfig?.configuracion);

    const isQrAttempt = Boolean(qrCode) || method === 'QR' || method === 'DESK_SCANNER';
    const isManualAttempt = method === 'MANUAL_DESK' || (!qrCode && Boolean(identifier || customerId));

    const isQrAllowed = accessConfig.primaryMethod === 'QR' || accessConfig.backupMethods.qr;
    const isManualAllowed = accessConfig.primaryMethod === 'MANUAL' || accessConfig.backupMethods.manual;

    if (isQrAttempt && !isQrAllowed) {
      return NextResponse.json({
        access: 'DENIED',
        reason: 'El acceso por código QR está deshabilitado por el administrador en este gimnasio.',
        member: null
      }, { status: 403 });
    }

    if (isManualAttempt && !isManualAllowed) {
      return NextResponse.json({
        access: 'DENIED',
        reason: 'El registro manual de socios está deshabilitado por el administrador.',
        member: null
      }, { status: 403 });
    }

    let targetCustomerId = customerId;

    // 1. Si viene por qrCode o identifier (ej. "CITIOX_GYM_<negocioId>_<customerId>_<hash>" o cédula/teléfono)
    if (!targetCustomerId && qrCode) {
      if (qrCode.startsWith('CITIOX_GYM:')) {
        const parts = qrCode.split(':');
        // Formato: CITIOX_GYM:negocioId:customerId:timestamp
        if (parts[1] && parts[1] !== negocioId) {
          return NextResponse.json({
            access: 'DENIED',
            reason: 'QR no corresponde a este gimnasio',
            member: null
          }, { status: 403 });
        }
        targetCustomerId = parts[2];
      } else {
        // Puede ser el ID directo del cliente, o su teléfono, o su email
        targetCustomerId = qrCode.trim();
      }
    } else if (!targetCustomerId && identifier) {
      targetCustomerId = identifier.trim();
    }

    if (!targetCustomerId) {
      return NextResponse.json({ error: 'Se requiere código QR, ID o identificación del socio' }, { status: 400 });
    }

    // 2. Buscar socio (Cliente) asegurando pertenencia a este gimnasio
    const cliente = await prisma.cliente.findFirst({
      where: {
        negocioId,
        OR: [
          { id: targetCustomerId },
          { telefono: targetCustomerId },
          { email: targetCustomerId }
        ]
      }
    });

    if (!cliente) {
      // Registrar intento fallido
      await (prisma as any).gymAccessLog.create({
        data: {
          businessId: negocioId,
          customerId: targetCustomerId.slice(0, 36),
          status: 'DENIED',
          reason: 'Socio no encontrado',
          method,
          branchId: branchId || null
        }
      }).catch(() => {});

      return NextResponse.json({
        access: 'DENIED',
        reason: 'Socio no encontrado en el sistema',
        member: null
      }, { status: 404 });
    }

    // 3. Buscar membresía más relevante del socio
    const now = new Date();
    const memberships = await (prisma as any).membership.findMany({
      where: {
        businessId: negocioId,
        customerId: cliente.id
      },
      include: {
        membershipPlan: true
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE primero alfabéticamente antes de CANCELLED/EXPIRED
        { endAt: 'desc' }
      ]
    });

    const activeMembership = memberships.find((m: any) => m.status === 'ACTIVE' && new Date(m.endAt) >= now);
    const frozenMembership = memberships.find((m: any) => m.status === 'FROZEN');
    const expiredMembership = memberships.find((m: any) => m.status === 'EXPIRED' || (m.status === 'ACTIVE' && new Date(m.endAt) < now));
    const pendingPaymentMembership = memberships.find((m: any) => m.status === 'PENDING_PAYMENT');

    const selectedMembership = activeMembership || frozenMembership || expiredMembership || pendingPaymentMembership || memberships[0];

    // 4. Determinar validez de acceso
    let isGranted = false;
    let denialReason = '';

    if (!selectedMembership) {
      denialReason = 'El socio no tiene ninguna membresía registrada';
    } else if (selectedMembership.status === 'FROZEN') {
      denialReason = `Membresía congelada desde el ${new Date(selectedMembership.frozenAt).toLocaleDateString('es-ES')}. Motivo: ${selectedMembership.freezeReason || 'Petición de usuario'}`;
    } else if (selectedMembership.status === 'PENDING_PAYMENT') {
      denialReason = 'Membresía pendiente de pago';
    } else if (selectedMembership.status === 'CANCELLED') {
      denialReason = 'Membresía cancelada';
    } else if (new Date(selectedMembership.endAt) < now) {
      denialReason = `Membresía vencida el ${new Date(selectedMembership.endAt).toLocaleDateString('es-ES')}`;
      // Actualizar status a EXPIRED si aún estaba en ACTIVE
      if (selectedMembership.status === 'ACTIVE') {
        await (prisma as any).membership.update({
          where: { id: selectedMembership.id },
          data: { status: 'EXPIRED' }
        });
      }
    } else if (selectedMembership.status === 'ACTIVE') {
      isGranted = true;
    } else {
      denialReason = `Estado de membresía no válido (${selectedMembership.status})`;
    }

    // 5. Consultar si el socio tiene una asistencia abierta actualmente (status = INSIDE)
    const MAX_ACTIVE_HOURS = 12;
    const openAttendance = await (prisma as any).gymAttendance.findFirst({
      where: {
        businessId: negocioId,
        customerId: cliente.id,
        status: 'INSIDE',
        checkedInAt: {
          gte: new Date(now.getTime() - MAX_ACTIVE_HOURS * 60 * 60 * 1000)
        }
      },
      orderBy: { checkedInAt: 'desc' }
    });

    const daysRemaining = Math.max(0, Math.ceil((new Date(selectedMembership.endAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // 6. Si es DENEGADO: Registrar AccessLog y responder sin alterar asistencias
    if (!isGranted) {
      await (prisma as any).gymAccessLog.create({
        data: {
          businessId: negocioId,
          customerId: cliente.id,
          membershipId: selectedMembership?.id || null,
          status: 'DENIED',
          reason: denialReason,
          method,
          branchId: branchId || null
        }
      });

      try {
        if (adminUserId) {
          await (prisma as any).adminAuditLog.create({
            data: {
              adminUserId,
              accion: 'ACCESS_DENIED',
              modulo: 'GIMNASIO',
              descripcion: `Acceso denegado a ${cliente.nombre}. Motivo: ${denialReason}`,
              targetId: cliente.id,
              targetType: 'CLIENTE',
              resultado: 'DENEGADO'
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({
        access: 'DENIED',
        reason: denialReason,
        member: {
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email,
          imagenUrl: cliente.imagenUrl,
          planName: selectedMembership?.membershipPlan?.name || 'Sin Plan',
          status: selectedMembership?.status || 'NO_MEMBERSHIP',
          endAt: selectedMembership?.endAt || null
        }
      }, { status: 403 });
    }

    // 7. Si YA ESTÁ DENTRO (status = INSIDE): REGISTRAR CHECK-OUT
    if (openAttendance) {
      const secondsSinceCheckIn = (now.getTime() - new Date(openAttendance.checkedInAt).getTime()) / 1000;

      // Prevención de rebote: si el escaneo ocurrió hace menos de 45 segundos, no marcar salida inmediata
      if (secondsSinceCheckIn < 45) {
        return NextResponse.json({
          access: 'DUPLICATE',
          type: 'DUPLICATE_CHECK_IN',
          message: 'Entrada registrada hace unos instantes. Acceso confirmado.',
          member: {
            id: cliente.id,
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            email: cliente.email,
            imagenUrl: cliente.imagenUrl,
            planName: selectedMembership.membershipPlan.name,
            endAt: selectedMembership.endAt,
            daysRemaining
          },
          attendance: openAttendance
        });
      }

      // Cerrar asistencia (Check-Out)
      const diffMs = now.getTime() - new Date(openAttendance.checkedInAt).getTime();
      const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      const updatedAttendance = await (prisma as any).gymAttendance.update({
        where: { id: openAttendance.id },
        data: {
          checkedOutAt: now,
          status: 'COMPLETED',
          durationMinutes
        }
      });

      await (prisma as any).gymAccessLog.create({
        data: {
          businessId: negocioId,
          customerId: cliente.id,
          membershipId: selectedMembership.id,
          status: 'GRANTED',
          reason: 'SALIDA_REGISTRADA',
          method,
          branchId: branchId || null
        }
      });

      try {
        if (adminUserId) {
          await (prisma as any).adminAuditLog.create({
            data: {
              adminUserId,
              accion: 'ACCESS_CHECK_OUT',
              modulo: 'GIMNASIO',
              descripcion: `Salida de ${cliente.nombre}. Permanencia: ${durationText}`,
              targetId: updatedAttendance.id,
              targetType: 'ATTENDANCE',
              resultado: 'EXITOSO'
            }
          });
        }
      } catch (_) {}

      return NextResponse.json({
        access: 'GRANTED',
        type: 'CHECK_OUT',
        message: `✓ Salida registrada. Duración: ${durationText}. ¡Buen descanso!`,
        durationText,
        durationMinutes,
        member: {
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email,
          imagenUrl: cliente.imagenUrl,
          planName: selectedMembership.membershipPlan.name,
          endAt: selectedMembership.endAt,
          daysRemaining
        },
        attendance: updatedAttendance
      });
    }

    // 8. Si NO ESTÁ DENTRO: REGISTRAR CHECK-IN
    const accessLog = await (prisma as any).gymAccessLog.create({
      data: {
        businessId: negocioId,
        customerId: cliente.id,
        membershipId: selectedMembership.id,
        status: 'GRANTED',
        reason: 'ENTRADA_REGISTRADA',
        method,
        branchId: branchId || null
      }
    });

    const newAttendance = await (prisma as any).gymAttendance.create({
      data: {
        businessId: negocioId,
        customerId: cliente.id,
        membershipId: selectedMembership.id,
        accessLogId: accessLog.id,
        checkedInAt: now,
        status: 'INSIDE',
        method,
        branchId: branchId || null
      }
    });

    try {
      if (adminUserId) {
        await (prisma as any).adminAuditLog.create({
          data: {
            adminUserId,
            accion: 'ACCESS_GRANTED',
            modulo: 'GIMNASIO',
            descripcion: `Entrada autorizada a ${cliente.nombre} (${selectedMembership.membershipPlan.name})`,
            targetId: newAttendance.id,
            targetType: 'ATTENDANCE',
            resultado: 'EXITOSO'
          }
        });
      }
    } catch (_) {}

    try {
      await publishBusinessEvent({
        negocioId,
        userId: cliente.id,
        eventType: 'GYM_ATTENDANCE',
        entityId: newAttendance.id,
        cantidad: 1,
        metadata: {
          method,
          membershipId: selectedMembership.id,
          branchId: branchId || null
        }
      });
    } catch (evtErr) {
      console.error('[GYM_EVENT_BUS_ERROR] No se pudo publicar GYM_ATTENDANCE:', evtErr);
    }

    return NextResponse.json({
      access: 'GRANTED',
      type: 'CHECK_IN',
      message: '✓ Entrada registrada. ¡Bienvenido a entrenar! 💪',
      member: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        imagenUrl: cliente.imagenUrl,
        planName: selectedMembership.membershipPlan.name,
        endAt: selectedMembership.endAt,
        daysRemaining
      },
      attendance: newAttendance
    });

  } catch (error: any) {
    console.error('[API_GYM_ACCESS_VALIDATE]', error);
    return NextResponse.json({ error: error.message || 'Error en validación de acceso' }, { status: 500 });
  }
}
