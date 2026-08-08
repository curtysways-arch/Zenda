import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Obtener configuración de métodos de pago del negocio
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });
    }

    let bankProvider = await prisma.paymentProvider.findUnique({
      where: { code: 'BANK_TRANSFER' }
    });

    if (!bankProvider) {
      bankProvider = await prisma.paymentProvider.create({
        data: {
          code: 'BANK_TRANSFER',
          name: 'Transferencia Bancaria',
          description: 'Pago por transferencia bancaria directa con comprobante.',
          enabled: true,
          isGateway: false
        }
      });
    }

    let method = await prisma.paymentMethod.findFirst({
      where: { negocioId, providerId: bankProvider.id },
      include: { provider: true }
    });

    if (!method) {
      method = await prisma.paymentMethod.create({
        data: {
          negocioId,
          providerId: bankProvider.id,
          enabled: true,
          customName: 'Transferencia Bancaria Directa',
          banco: 'Banco Pichincha',
          titular: 'Nombre de Cuenta del Negocio',
          numeroCuenta: '0000000000',
          tipoCuenta: 'Ahorros',
          identificacion: '0000000000001',
          instructions: 'Adjunta tu comprobante para enviar a producción.'
        },
        include: { provider: true }
      });
    }

    const extraConfig = (typeof method.extraConfig === 'object' && method.extraConfig) ? (method.extraConfig as any) : {};
    const isPinchos = method.negocioId === 'pinchos' || (method as any).negocio?.slug === 'pinchos';

    return NextResponse.json({
      success: true,
      method: {
        ...method,
        soloPagoPrevio: extraConfig.soloPagoPrevio ?? (!isPinchos),
        permiteContraentrega: extraConfig.permiteContraentrega ?? isPinchos,
      }
    });
  } catch (error: any) {
    console.error('Error GET /api/admin/metodos-pago:', error);
    return NextResponse.json({ error: 'Error al consultar métodos de pago' }, { status: 500 });
  }
}

// PUT: Actualizar los datos de transferencia bancaria del negocio
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    if (!negocioId) {
      return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });
    }

    const body = await req.json();
    const { banco, titular, numeroCuenta, tipoCuenta, identificacion, instructions, enabled, soloPagoPrevio, permiteContraentrega } = body;

    let bankProvider = await prisma.paymentProvider.findUnique({
      where: { code: 'BANK_TRANSFER' }
    });

    if (!bankProvider) {
      bankProvider = await prisma.paymentProvider.create({
        data: {
          code: 'BANK_TRANSFER',
          name: 'Transferencia Bancaria',
          description: 'Pago por transferencia bancaria directa con comprobante.',
          enabled: true,
          isGateway: false
        }
      });
    }

    const currentMethod = await prisma.paymentMethod.findFirst({
      where: { negocioId, providerId: bankProvider.id }
    });

    const currentExtraConfig = (typeof currentMethod?.extraConfig === 'object' && currentMethod?.extraConfig) ? (currentMethod.extraConfig as any) : {};
    const updatedExtraConfig = {
      ...currentExtraConfig,
      ...(soloPagoPrevio !== undefined ? { soloPagoPrevio: Boolean(soloPagoPrevio) } : {}),
      ...(permiteContraentrega !== undefined ? { permiteContraentrega: Boolean(permiteContraentrega) } : {})
    };

    const updatedMethod = await prisma.paymentMethod.upsert({
      where: {
        id: body.id || currentMethod?.id || 'pm_placeholder_id'
      },
      update: {
        banco,
        titular,
        numeroCuenta,
        tipoCuenta,
        identificacion,
        instructions,
        extraConfig: updatedExtraConfig,
        ...(enabled !== undefined ? { enabled } : {})
      },
      create: {
        negocioId,
        providerId: bankProvider.id,
        enabled: enabled ?? true,
        banco,
        titular,
        numeroCuenta,
        tipoCuenta,
        identificacion,
        instructions,
        extraConfig: updatedExtraConfig
      }
    });

    return NextResponse.json({ success: true, method: updatedMethod });
  } catch (error: any) {
    console.error('Error PUT /api/admin/metodos-pago:', error);
    return NextResponse.json({ error: 'Error al actualizar métodos de pago' }, { status: 500 });
  }
}
