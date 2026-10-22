import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryNegocioId = searchParams.get('negocioId');
    const querySlug = searchParams.get('slug');

    let targetNegocioId = queryNegocioId;

    if (!targetNegocioId && !querySlug) {
      const session = await getEffectiveAdminSession();
      if (session?.user) {
        const user = session.user as any;
        targetNegocioId = user.negocioId || user.businessId || null;
      }
    }

    let negocio: any = null;
    if (targetNegocioId) {
      negocio = await prisma.negocio.findUnique({
        where: { id: targetNegocioId },
        select: { id: true, configuracion: true }
      });
    } else if (querySlug) {
      negocio = await prisma.negocio.findFirst({
        where: { slug: querySlug },
        select: { id: true, configuracion: true }
      });
    } else {
      negocio = await prisma.negocio.findFirst({
        where: { slug: 'lavado' },
        select: { id: true, configuracion: true }
      });
    }

    if (!negocio) {
      return NextResponse.json({
        activa: true,
        mensaje: 'Cobertura amplia para retiro a domicilio.',
        poligono: []
      });
    }

    let config: any = {};
    if (typeof negocio.configuracion === 'string') {
      try {
        config = JSON.parse(negocio.configuracion);
      } catch {
        config = {};
      }
    } else {
      config = negocio.configuracion || {};
    }

    const coverageData = config.coverage || config.cobertura || {};

    return NextResponse.json({
      activa: coverageData.activa !== undefined ? Boolean(coverageData.activa) : true,
      mensaje: coverageData.mensaje || 'Cobertura amplia para retiro a domicilio.',
      poligono: Array.isArray(coverageData.poligono) ? coverageData.poligono : []
    });
  } catch (error: any) {
    console.error('[API_SHOE_CARE_COVERAGE_GET_ERROR]', error);
    return NextResponse.json(
      { error: 'Error al consultar la cobertura' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    const authNegocioId = user.negocioId || user.businessId;

    const body = await req.json();
    const { negocioId: bodyNegocioId, activa, mensaje, poligono } = body;

    const targetNegocioId =
      user.role === 'SUPERADMIN' && bodyNegocioId
        ? bodyNegocioId
        : (authNegocioId || bodyNegocioId);

    if (!targetNegocioId) {
      return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { id: targetNegocioId }
    });

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let currentConfig: any = {};
    if (typeof negocio.configuracion === 'string') {
      try {
        currentConfig = JSON.parse(negocio.configuracion);
      } catch {
        currentConfig = {};
      }
    } else {
      currentConfig = negocio.configuracion || {};
    }

    const coverageObj = {
      activa: activa !== undefined ? Boolean(activa) : true,
      mensaje: mensaje || 'Cobertura activa dentro del perímetro configurado.',
      poligono: Array.isArray(poligono) ? poligono : []
    };

    const updatedConfig = {
      ...currentConfig,
      coverage: coverageObj,
      cobertura: coverageObj
    };

    await prisma.negocio.update({
      where: { id: targetNegocioId },
      data: {
        configuracion: updatedConfig
      }
    });

    return NextResponse.json({
      success: true,
      ...coverageObj
    });
  } catch (error: any) {
    console.error('[API_SHOE_CARE_COVERAGE_POST_ERROR]', error);
    return NextResponse.json(
      { error: 'Error al guardar la cobertura' },
      { status: 500 }
    );
  }
}
