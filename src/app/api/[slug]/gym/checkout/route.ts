import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { publishBusinessEvent } from '@/lib/growth/eventBus';

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
        price: plan.price,
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
        monto: plan.price,
        cantidad: 1,
        metadata: {
          planName: plan.name,
          durationDays,
          price: plan.price
        }
      });
    } catch (evtErr) {
      console.error('[MEMBERSHIP_EVENT_BUS_ERROR]', evtErr);
    }

    // 5. Retornar confirmación
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
