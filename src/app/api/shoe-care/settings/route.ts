import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  precioPocoSucio: 4.00,
  precioMedioSucio: 6.00,
  precioMuySucio: 8.00,
  precioRestauracion: 10.00,
  costoRetiro: 1.50,
  costoEntrega: 1.50,
  recargoUrgente: 3.00,
  whatsappTemplates: {
    nuevaSolicitud: "¡Hola {nombre}! Hemos recibido tu solicitud de retiro a domicilio para {pares} par(es). Pronto confirmaremos la hora de llegada.",
    retiroProgramado: "¡Hola {nombre}! Tu retiro ha sido programado para {fechaHora}.",
    precioConfirmado: "¡Hola {nombre}! Tus zapatos han sido inspeccionados. El costo total es de ${total}. Fecha estimada de entrega: {fechaEntrega}.",
    ordenLista: "¡Hola {nombre}! Tus zapatos están listos e impecables. ¡Te esperamos en nuestro local!",
    enRuta: "¡Hola {nombre}! Tu pedido #{numeroPedido} va en camino con nuestro repartidor.",
    servicioEntregado: "¡Hola {nombre}! Tu servicio de lavado ha sido entregado con éxito. ¡Gracias por preferirnos!"
  }
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || searchParams.get('negocioId') || 'demo-canchas';

    const configRecord = await prisma.configuracion.findUnique({
      where: {
        clave_negocioId: {
          clave: 'SHOE_CARE_BUSINESS_SETTINGS',
          negocioId: businessId
        }
      }
    });

    if (!configRecord || !configRecord.valor) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json(JSON.parse(configRecord.valor));
  } catch (error) {
    console.error('Error fetching shoe care settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { negocioId = 'demo-canchas', ...settings } = body;

    await prisma.configuracion.upsert({
      where: {
        clave_negocioId: {
          clave: 'SHOE_CARE_BUSINESS_SETTINGS',
          negocioId
        }
      },
      update: {
        valor: JSON.stringify(settings)
      },
      create: {
        id: `cfg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        clave: 'SHOE_CARE_BUSINESS_SETTINGS',
        valor: JSON.stringify(settings),
        negocioId
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving shoe care settings:', error);
    return NextResponse.json({ error: 'Error guardando configuración' }, { status: 500 });
  }
}
