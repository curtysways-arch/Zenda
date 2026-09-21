import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { publishBusinessEvent } from '@/lib/growth/eventBus';
import { getGymAccessConfig, verifyStaticTotemToken } from '@/modules/gym/types/gymAccessConfig';

/**
 * POST /api/[slug]/gym/attendance/self-scan
 * Permite al socio registrar su entrada o salida escaneando el QR del tótem del gimnasio.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await req.json();
    const { totemToken, phone: fallbackPhone } = body;

    if (!totemToken) {
      return NextResponse.json({ error: 'Se requiere el código escaneado del gimnasio' }, { status: 400 });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { slug }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    // 1. Validar el token del tótem del gimnasio (Dinámico o Fijo para Imprimir)
    const accessConfig = getGymAccessConfig(negocio.configuracion);

    if (totemToken.startsWith('CITIOX_TOTEM_STATIC:')) {
      // Validar si el gimnasio tiene habilitado el modo de QR fijo para imprimir
      if (accessConfig.adminQr.mode !== 'STATIC_PRINTABLE') {
        return NextResponse.json({
          access: 'DENIED',
          reason: 'Este gimnasio utiliza pantalla de QR dinámico. Por favor enfoca la pantalla de recepción.'
        }, { status: 403 });
      }

      const isValidStatic = verifyStaticTotemToken(totemToken, negocio.id);
      if (!isValidStatic) {
        return NextResponse.json({
          access: 'DENIED',
          reason: 'Código QR de mostrador inválido o no corresponde a este gimnasio.'
        }, { status: 403 });
      }
    } else if (totemToken.startsWith('CITIOX_TOTEM:')) {
      // Formato esperado: CITIOX_TOTEM:businessId:timestamp:signature
      const parts = totemToken.split(':');
      if (parts.length < 4) {
        return NextResponse.json({
          access: 'DENIED',
          reason: 'Código QR no reconocido. Asegúrate de escanear el QR oficial del gimnasio.'
        }, { status: 400 });
      }

      const [_, tokenBusinessId, timestampStr, signature] = parts;
      if (tokenBusinessId !== negocio.id) {
        return NextResponse.json({
          access: 'DENIED',
          reason: 'Este código QR pertenece a otro gimnasio.'
        }, { status: 403 });
      }

      const tokenTimestamp = parseInt(timestampStr, 10);
      const nowMs = Date.now();
      const intervalMs = (accessConfig.adminQr.dynamicIntervalSeconds || 90) * 1000;
      const toleranceMs = Math.max(intervalMs * 1.5, 60 * 1000); // Tolerancia proporcional al intervalo

      if (isNaN(tokenTimestamp) || Math.abs(nowMs - tokenTimestamp) > toleranceMs) {
        return NextResponse.json({
          access: 'DENIED',
          reason: 'El código QR ha expirado. Por favor enfoca el QR actualizado en la pantalla.'
        }, { status: 400 });
      }

      // Verificar firma criptográfica
      const secret = process.env.NEXTAUTH_SECRET || 'citiox_totem_secret_key_2026';
      const expectedSignature = crypto.createHmac('sha256', secret).update(`${negocio.id}:${tokenTimestamp}`).digest('hex').slice(0, 16);

      if (signature !== expectedSignature) {
        return NextResponse.json({
          access: 'DENIED',
          reason: 'Código QR adulterado o inválido.'
        }, { status: 403 });
      }
    } else {
      return NextResponse.json({
        access: 'DENIED',
        reason: 'Código QR no reconocido. Asegúrate de escanear el QR oficial del gimnasio.'
      }, { status: 400 });
    }

    // 2. Identificar al Socio autenticado (vía customer_token o fallbackPhone)
    let memberPhone = '';
    const cookieStore = await cookies();
    const token = cookieStore.get('customer_token')?.value;

    if (token) {
      try {
        const secretKey = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default_otp_secret_key_change_me');
        const { payload } = await jwtVerify(token, secretKey);
        memberPhone = (payload.telefono as string) || '';
      } catch (_) {}
    }

    if (!memberPhone && fallbackPhone) {
      memberPhone = String(fallbackPhone).trim();
    }

    if (!memberPhone) {
      return NextResponse.json({
        access: 'DENIED',
        reason: 'Debes iniciar sesión con tu número de socio para registrar tu asistencia.'
      }, { status: 401 });
    }

    // 3. Buscar socio en la base de datos
    const cliente = await prisma.cliente.findFirst({
      where: {
        negocioId: negocio.id,
        telefono: memberPhone
      }
    });

    if (!cliente) {
      return NextResponse.json({
        access: 'DENIED',
        reason: 'No se encontró tu ficha de socio en este gimnasio.'
      }, { status: 404 });
    }

    // 4. Validar membresía del socio
    const now = new Date();
    const memberships = await (prisma as any).membership.findMany({
      where: {
        businessId: negocio.id,
        customerId: cliente.id
      },
      include: {
        membershipPlan: true
      },
      orderBy: [
        { status: 'asc' },
        { endAt: 'desc' }
      ]
    });

    const activeMembership = memberships.find((m: any) => m.status === 'ACTIVE' && new Date(m.endAt) >= now);
    const selectedMembership = activeMembership || memberships[0];

    if (!selectedMembership || selectedMembership.status !== 'ACTIVE' || new Date(selectedMembership.endAt) < now) {
      const denialReason = !selectedMembership
        ? 'No cuentas con una membresía activa.'
        : `Tu membresía (${selectedMembership.membershipPlan.name}) está ${selectedMembership.status === 'ACTIVE' ? 'vencida' : selectedMembership.status}.`;

      await (prisma as any).gymAccessLog.create({
        data: {
          businessId: negocio.id,
          customerId: cliente.id,
          membershipId: selectedMembership?.id || null,
          status: 'DENIED',
          reason: denialReason,
          method: 'GYM_QR'
        }
      });

      return NextResponse.json({
        access: 'DENIED',
        reason: denialReason,
        member: {
          id: cliente.id,
          nombre: cliente.nombre,
          planName: selectedMembership?.membershipPlan?.name || 'Sin Plan',
          status: selectedMembership?.status || 'NO_MEMBERSHIP'
        }
      }, { status: 403 });
    }

    // 5. Comprobar si el socio ya tiene asistencia abierta (status = INSIDE en últimas 12h)
    const MAX_ACTIVE_HOURS = 12;
    const openAttendance = await (prisma as any).gymAttendance.findFirst({
      where: {
        businessId: negocio.id,
        customerId: cliente.id,
        status: 'INSIDE',
        checkedInAt: {
          gte: new Date(now.getTime() - MAX_ACTIVE_HOURS * 60 * 60 * 1000)
        }
      },
      orderBy: { checkedInAt: 'desc' }
    });

    const daysRemaining = Math.max(0, Math.ceil((new Date(selectedMembership.endAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Si ya tiene asistencia abierta -> REGISTRAR CHECK-OUT
    if (openAttendance) {
      const secondsSinceCheckIn = (now.getTime() - new Date(openAttendance.checkedInAt).getTime()) / 1000;

      // Prevención de rebote (45s)
      if (secondsSinceCheckIn < 45) {
        return NextResponse.json({
          access: 'DUPLICATE',
          type: 'DUPLICATE_CHECK_IN',
          message: 'Tu entrada ya fue registrada hace unos momentos.',
          member: {
            id: cliente.id,
            nombre: cliente.nombre,
            planName: selectedMembership.membershipPlan.name,
            daysRemaining
          },
          attendance: openAttendance
        });
      }

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
          businessId: negocio.id,
          customerId: cliente.id,
          membershipId: selectedMembership.id,
          status: 'GRANTED',
          reason: 'SALIDA_AUTORREGISTRADA',
          method: 'GYM_QR'
        }
      });

      return NextResponse.json({
        access: 'GRANTED',
        type: 'CHECK_OUT',
        message: `✓ ¡Salida registrada con éxito! Entrenaste durante ${durationText}. ¡Excelente sesión!`,
        durationText,
        durationMinutes,
        member: {
          id: cliente.id,
          nombre: cliente.nombre,
          planName: selectedMembership.membershipPlan.name,
          daysRemaining
        },
        attendance: updatedAttendance
      });
    }

    // Si no tiene asistencia abierta -> REGISTRAR CHECK-IN
    const accessLog = await (prisma as any).gymAccessLog.create({
      data: {
        businessId: negocio.id,
        customerId: cliente.id,
        membershipId: selectedMembership.id,
        status: 'GRANTED',
        reason: 'ENTRADA_AUTORREGISTRADA',
        method: 'GYM_QR'
      }
    });

    const newAttendance = await (prisma as any).gymAttendance.create({
      data: {
        businessId: negocio.id,
        customerId: cliente.id,
        membershipId: selectedMembership.id,
        accessLogId: accessLog.id,
        checkedInAt: now,
        status: 'INSIDE',
        method: 'GYM_QR'
      }
    });

    try {
      await publishBusinessEvent({
        negocioId: negocio.id,
        userId: cliente.id,
        eventType: 'GYM_ATTENDANCE',
        entityId: newAttendance.id,
        cantidad: 1,
        metadata: {
          method: 'GYM_QR',
          membershipId: selectedMembership.id
        }
      });
    } catch (evtErr) {
      console.error('[SELF_SCAN_EVENT_BUS_ERROR]', evtErr);
    }

    return NextResponse.json({
      access: 'GRANTED',
      type: 'CHECK_IN',
      message: '✓ ¡Entrada registrada con éxito! Disfruta tu entrenamiento 💪',
      member: {
        id: cliente.id,
        nombre: cliente.nombre,
        planName: selectedMembership.membershipPlan.name,
        daysRemaining
      },
      attendance: newAttendance
    });

  } catch (error: any) {
    console.error('[API_GYM_SELF_SCAN_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error al procesar asistencia' }, { status: 500 });
  }
}
