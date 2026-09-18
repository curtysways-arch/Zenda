import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const negocioId = (session.user as any).negocioId;
  if (!negocioId) {
    return NextResponse.json({ error: 'No tienes un negocio asociado' }, { status: 400 });
  }

  try {
    const biz = await prisma.negocio.findUnique({
      where: { id: negocioId },
      include: { Imagen: true }
    });

    if (!biz) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    let config: any = biz.configuracion;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch (_) {}
    }

    const bannerImage =
      config?.bannerUrl ||
      (biz as any).bannerUrl ||
      (Array.isArray(config?.bannerUrls) && config.bannerUrls[0]) ||
      (biz.Imagen && biz.Imagen.find((img: any) => img.tipo === 'BANNER')?.url) ||
      null;

    if (!bannerImage) {
      return NextResponse.json(
        { error: 'No se encontró un banner configurado en el perfil de este negocio' },
        { status: 400 }
      );
    }

    const isStore =
      biz.tipoNegocio === 'TIENDA' ||
      biz.tipoNegocio === 'STORE' ||
      config?.blueprintId === 'STORE';

    const defaultSubtitulo = isStore
      ? 'Descubre nuestra selección exclusiva y recibe a domicilio o retira en tienda.'
      : 'Reserva tu cita de forma online en sencillos pasos.';

    const count = await (prisma as any).heroItem.count({ where: { businessId: negocioId } });

    const newHero = await (prisma as any).heroItem.create({
      data: {
        businessId: negocioId,
        type: 'IMAGE',
        sourceType: 'CUSTOM',
        sourceId: null,
        image: bannerImage,
        mobileImage: bannerImage,
        title: biz.heroTitulo || `Bienvenido a ${biz.nombre}`,
        description: biz.heroSubtitulo || defaultSubtitulo,
        buttonEnabled: true,
        buttonText: isStore ? 'Explorar Catálogo' : 'Ver Servicios',
        actionType: isStore ? 'PRODUCT' : 'SERVICE',
        actionValue: null,
        isActive: true,
        position: count,
        priority: 1
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Banner importado como Hero exitosamente',
      heroItem: newHero
    });
  } catch (error: any) {
    console.error('[API_SYNC_BANNER_ERROR]', error);
    return NextResponse.json({ error: 'Error al sincronizar banner del perfil' }, { status: 500 });
  }
}
