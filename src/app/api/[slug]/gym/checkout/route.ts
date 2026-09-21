import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { publishBusinessEvent } from '@/lib/growth/eventBus';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      include: {
        paymentMethods: {
          where: { enabled: true },
          include: { provider: true }
        }
      }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const bankMethod = (negocio as any).paymentMethods?.find((m: any) => m.provider?.code === 'BANK_TRANSFER' || m.banco);

    return NextResponse.json({
      success: true,
      bankTransfer: bankMethod ? {
        banco: bankMethod.banco,
        titular: bankMethod.titular,
        numeroCuenta: bankMethod.numeroCuenta,
        tipoCuenta: bankMethod.tipoCuenta,
        identificacion: bankMethod.identificacion,
        instructions: bankMethod.instructions,
        qrImageUrl: bankMethod.qrImageUrl
      } : {
        banco: 'Banco Pichincha / Guayaquil',
        titular: negocio.nombre,
        numeroCuenta: 'Consultar por WhatsApp',
        tipoCuenta: 'Corriente / Ahorros',
        identificacion: '',
        instructions: 'Realiza la transferencia e ingresa el número de comprobante.'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Gimnasio no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      planId, 
      promotionId,
      nombre, 
      telefono, 
      email, 
      paymentMethod = 'TARJETA_ONLINE',
      paymentReference: clientRef,
      cardLast4
    } = body;

    if (!planId || !nombre || !telefono) {
      return NextResponse.json({ error: 'Plan, nombre y teléfono son obligatorios' }, { status: 400 });
    }

    // 1. Validar Plan Comercial
    const plan = await (prisma as any).membershipPlan.findFirst({
      where: { id: planId, businessId: negocio.id, active: true }
    });

    if (!plan) {
      return NextResponse.json({ error: 'El plan de membresía seleccionado no está disponible' }, { status: 404 });
    }

    // 1.1 Calcular Precio con Promoción si se envió promotionId
    let chargedPrice = plan.price;
    let appliedPromoTitle: string | null = null;

    if (promotionId) {
      try {
        const promo = await (prisma as any).promotion.findFirst({
          where: { id: promotionId, businessId: negocio.id }
        });
        if (promo) {
          appliedPromoTitle = promo.titulo;
          const rawDesc = promo.descripcion || '';
          let meta: any = null;
          if (rawDesc.includes('<!-- CITIOX_META:')) {
            try {
              meta = JSON.parse(rawDesc.split('<!-- CITIOX_META:')[1].split('-->')[0]);
            } catch (_) {}
          }

          if (meta?.finalPrice !== undefined && meta.finalPrice !== null) {
            chargedPrice = Number(meta.finalPrice);
          } else if (promo.precioPromo !== undefined && promo.precioPromo !== null) {
            chargedPrice = Number(promo.precioPromo);
          } else if (meta?.benefitType === 'DESCUENTO_PORCENTAJE' && meta?.discountValue) {
            chargedPrice = Math.max(0, Number((plan.price * (1 - meta.discountValue / 100)).toFixed(2)));
          } else if (meta?.benefitType === 'DESCUENTO_FIJO' && meta?.discountValue) {
            chargedPrice = Math.max(0, Number((plan.price - meta.discountValue).toFixed(2)));
          }
        }
      } catch (err) {
        console.error('[PROMO_CHECKOUT_RESOLVE_ERROR]', err);
      }
    }

    // 2. Buscar o crear Socio (Cliente universal)
    const normalizedPhone = telefono.trim();
    let cliente = await prisma.cliente.findFirst({
      where: {
        negocioId: negocio.id,
        telefono: normalizedPhone
      }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          id: crypto.randomUUID(),
          negocioId: negocio.id,
          nombre: nombre.trim(),
          telefono: normalizedPhone,
          email: email ? email.trim() : null,
          updatedAt: new Date()
        }
      });
    } else if (email && !cliente.email) {
      cliente = await prisma.cliente.update({
        where: { id: cliente.id },
        data: { email: email.trim() }
      });
    }

    // 3. Crear Membresía con precio histórico inmutable (Regla 12)
    const now = new Date();
    const durationDays = plan.durationDays || 30;
    const endAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const refCode = clientRef 
      ? clientRef.trim() 
      : cardLast4 
        ? `CARD-****${cardLast4}-${Date.now().toString(36).toUpperCase()}`
        : `TX-${paymentMethod}-${Date.now().toString(36).toUpperCase()}`;

    const paymentStatus = paymentMethod === 'TARJETA_ONLINE' 
      ? 'PAID' 
      : paymentMethod === 'TRANSFERENCIA' 
        ? 'PAID_REPORTED' 
        : 'PENDING_ON_SITE';

    const membership = await (prisma as any).membership.create({
      data: {
        businessId: negocio.id,
        customerId: cliente.id,
        membershipPlanId: plan.id,
        status: 'ACTIVE',
        startAt: now,
        endAt,
        price: chargedPrice,
        currency: plan.currency || 'USD',
        paymentStatus,
        paymentMethod,
        paymentReference: refCode
      },
      include: {
        membershipPlan: true,
        cliente: true
      }
    });

    // 4. Publicar evento MEMBERSHIP_PURCHASED al EventBus universal
    try {
      await publishBusinessEvent({
        negocioId: negocio.id,
        userId: cliente.id,
        eventType: 'MEMBERSHIP_PURCHASED',
        entityId: membership.id,
        monto: chargedPrice,
        cantidad: 1,
        metadata: {
          planName: plan.name,
          durationDays,
          price: chargedPrice,
          originalPrice: plan.price,
          promotionTitle: appliedPromoTitle
        }
      });
    } catch (evtErr) {
      console.error('[MEMBERSHIP_EVENT_BUS_ERROR]', evtErr);
    }

    // 5. Enviar Notificaciones Automáticas por WhatsApp (Socio y Administradores)
    try {
      const normalizePhone = (p: string) => {
        const clean = p.replace(/\D/g, '');
        if (clean.startsWith('593')) return clean;
        if (clean.startsWith('0')) return `593${clean.slice(1)}`;
        if (clean.length === 9) return `593${clean}`;
        return clean;
      };

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com';
      const qrUrl = `${appUrl}/${negocio.slug}/mi-qr`;

      const methodLabels: Record<string, string> = {
        TARJETA_ONLINE: '💳 Tarjeta de Crédito/Débito (Online)',
        TRANSFERENCIA: `🏦 Transferencia Bancaria (${clientRef ? `Ref: ${clientRef}` : 'Comprobante reportado'})`,
        RECEPCION_EFECTIVO: '💵 Pago en Recepción / Caja'
      };
      const methodLabel = methodLabels[paymentMethod] || paymentMethod;

      const formattedEndAt = endAt.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      // A) WhatsApp al SOCIO / CLIENTE
      const clientPhone = normalizePhone(cliente.telefono);
      if (clientPhone && clientPhone.length >= 8) {
        const clientMsg = 
          `🏋️ *¡Bienvenido a ${negocio.nombre}!* 🎉\n\n` +
          `Hola *${cliente.nombre}*, tu membresía ha sido registrada con éxito:\n\n` +
          `📋 *Plan:* ${plan.name}\n` +
          `⏱️ *Duración:* ${durationDays} días de acceso\n` +
          `💰 *Monto:* $${plan.price} ${plan.currency || 'USD'}\n` +
          `💳 *Método de Pago:* ${methodLabel}\n` +
          `📅 *Válido hasta:* ${formattedEndAt}\n\n` +
          `📲 *Tu Carnet Digital QR de Acceso:*\n` +
          `Presenta tu código QR en recepción para ingresar a las instalaciones:\n` +
          `👉 ${qrUrl}\n\n` +
          `¡A entrenar con todo! 💪🔥`;

        console.log(`[API_GYM_CHECKOUT] Enviando WhatsApp al cliente ${clientPhone}...`);
        sendWhatsAppMessage(clientPhone, clientMsg, 'gym_membership_client').catch(e => {
          console.error('[API_GYM_CHECKOUT] Error enviando WhatsApp al cliente:', e);
        });
      }

      // B) WhatsApp a los ADMINISTRADORES del Gimnasio
      const adminPhones = new Set<string>();
      if (negocio.whatsapp) {
        adminPhones.add(normalizePhone(negocio.whatsapp));
      }

      // Buscar administradores del negocio
      const adminUsers = await prisma.usuario.findMany({
        where: {
          negocioId: negocio.id,
          role: { in: ['ADMIN', 'SUPERADMIN'] },
          phone: { not: null }
        },
        select: { phone: true }
      });

      for (const u of adminUsers) {
        if (u.phone) {
          adminPhones.add(normalizePhone(u.phone));
        }
      }

      // Fallback: Si el negocio no tiene whatsapp configurado, notificar al número global
      if (adminPhones.size === 0) {
        try {
          const globalConfig = await prisma.globalConfig.findUnique({
            where: { clave: 'NUMERO_WHATSAPP_ADMIN' }
          });
          if (globalConfig?.valor) {
            adminPhones.add(normalizePhone(globalConfig.valor));
          }
        } catch (_) {}
      }

      const adminMsg = 
        `🔔 *¡Nueva Membresía Adquirida!* 🏋️‍♂️\n\n` +
        `Se ha registrado un nuevo socio en *${negocio.nombre}*:\n\n` +
        `👤 *Socio:* ${cliente.nombre}\n` +
        `📱 *Teléfono:* ${cliente.telefono}\n` +
        (cliente.email ? `📧 *Email:* ${cliente.email}\n` : '') +
        `📋 *Plan:* ${plan.name} ($${plan.price} ${plan.currency || 'USD'})\n` +
        `⏱️ *Duración:* ${durationDays} días\n` +
        `💳 *Método de Pago:* ${methodLabel}\n` +
        `📅 *Vigencia:* ${now.toLocaleDateString('es-ES')} al ${formattedEndAt}\n\n` +
        `👉 *Gestionar en Panel Admin:*\n` +
        `${appUrl}/admin/socios`;

      for (const targetAdmin of adminPhones) {
        if (targetAdmin && targetAdmin.length >= 8) {
          console.log(`[API_GYM_CHECKOUT] Enviando alerta a admin ${targetAdmin}...`);
          sendWhatsAppMessage(targetAdmin, adminMsg, 'gym_membership_admin').catch(e => {
            console.error('[API_GYM_CHECKOUT] Error enviando WhatsApp al admin:', e);
          });
        }
      }

    } catch (waErr) {
      console.error('[API_GYM_CHECKOUT_WA_ERROR]', waErr);
    }

    // 6. Retornar confirmación
    return NextResponse.json({
      success: true,
      message: '¡Membresía adquirida con éxito!',
      membership: {
        id: membership.id,
        planName: plan.name,
        price: plan.price,
        currency: plan.currency,
        startAt: membership.startAt,
        endAt: membership.endAt,
        status: membership.status,
        member: {
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email
        },
        qrCode: `CITIOX_GYM:${negocio.id}:${cliente.id}:${Date.now()}`
      }
    });

  } catch (error: any) {
    console.error('[API_GYM_CHECKOUT]', error);
    return NextResponse.json({ error: error.message || 'Error al procesar la compra de membresía' }, { status: 500 });
  }
}
