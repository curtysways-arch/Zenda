import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ModuleResolver } from '@/lib/modules/ModuleResolver';
import { PinchoFriendlyCodeService } from '@/modules/pinchos/services/pinchoFriendlyCodeService';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const negocio = await prisma.negocio.findUnique({
      where: { slug },
      select: { id: true, nombre: true, logoUrl: true, tipoNegocio: true },
    });
    if (!negocio) return {};

    const order = await (prisma as any).pedido.findFirst({
      where: {
        negocioId: negocio.id,
        OR: [{ id }, ...(isNaN(Number(id)) ? [] : [{ numeroPedido: Number(id) }])],
      },
      select: { numeroPedido: true, extraInfo: true, estado: true },
    });

    if (!order) return {};

    const extra = (order.extraInfo as any) || {};
    const fotosEntrega = extra.fotosEntrega || [];
    const fotosRecepcion = extra.fotosRecepcion || [];
    const foto = fotosEntrega[0] || fotosRecepcion[0] || negocio.logoUrl;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://citiox.com';
    const fullImageUrl = foto ? (foto.startsWith('http') ? foto : `${baseUrl}${foto}`) : undefined;

    const title = `Orden #${order.numeroPedido || ''} - ${negocio.nombre} | Reporte & Seguimiento`;
    const description = `Revisa las fotografías de inspección y el estado de tu servicio en ${negocio.nombre}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/${slug}/pedidos/${id}`,
        siteName: negocio.nombre,
        images: fullImageUrl
          ? [
              {
                url: fullImageUrl,
                width: 1200,
                height: 1200,
                alt: `Fotografía de auditoría Pedido #${order.numeroPedido}`,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: fullImageUrl ? [fullImageUrl] : [],
      },
    };
  } catch {
    return {};
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { slug, id } = await params;

  const isPinchos = ModuleResolver.isPinchosModule(slug);

  // Para módulos Pinchos → flujo legacy
  if (isPinchos) {
    const order = await (prisma as any).pedido.findUnique({
      where: { id },
      include: {
        items: true,
        payment: {
          include: {
            evidences: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    if (!order) notFound();

    let timeline: any[] = [];
    try {
      timeline = await (prisma as any).pinchoOrderTimeline.findMany({
        where: { pedidoId: id },
        orderBy: { createdAt: 'asc' },
      });
    } catch (_) {
      timeline = [];
    }

    const friendlyCode = PinchoFriendlyCodeService.formatFriendlyCode(order.numeroPedido, 'PIN');
    const { default: PinchoOrderTrackingClient } = await import('@/modules/pinchos/components/PinchoOrderTrackingClient');
    return <PinchoOrderTrackingClient order={{ ...order, friendlyCode }} timeline={timeline} storeSlug={slug} />;
  }

  // Para cualquier otro módulo (Enterprise, Servicios, Lavandería, Restaurante)
  const negocio = await prisma.negocio.findUnique({
    where: { slug },
    select: { id: true, nombre: true, slug: true, logoUrl: true, colorPrimario: true, colorSecundario: true, tipoNegocio: true, whatsapp: true, configuracion: true },
  });
  if (!negocio) notFound();

  const order = await (prisma as any).pedido.findFirst({
    where: {
      negocioId: negocio.id,
      OR: [{ id }, ...(isNaN(Number(id)) ? [] : [{ numeroPedido: Number(id) }])],
    },
    include: {
      items: true,
      payment: {
        include: {
          evidences: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });
  if (!order) notFound();

  // Si es un negocio de Lavandería / Restauración de calzado (SHOE_CARE) o contiene fotos de auditoría
  const tipoUp = String(negocio.tipoNegocio || '').toUpperCase();
  const isShoeCare = ['SHOE_CARE', 'LAVANDERIA', 'LAUNDRY', 'LAVADO', 'ORDENES-SERVICIO'].includes(tipoUp) || slug === 'lavado' || Boolean(order.extraInfo?.fotosRecepcion?.length || order.extraInfo?.fotosEntrega?.length || order.extraInfo?.modoIngreso);

  if (isShoeCare) {
    // Los códigos de seguridad solo se muestran con el enlace privado (id), nunca buscando por número de orden
    const viaPrivateLink = order.id === id;
    const extra = { ...((order.extraInfo as any) || {}) };
    if (!viaPrivateLink) {
      delete extra.pickupCode;
      delete extra.deliveryCode;
    }
    delete extra.canonicalLogistics;
    delete extra.notasInternas;
    const { default: ServiceOrderTrackingClient } = await import('@/components/public/ServiceOrderTrackingClient');
    return (
      <ServiceOrderTrackingClient
        order={JSON.parse(JSON.stringify({ ...order, extraInfo: extra }))}
        negocio={JSON.parse(JSON.stringify(negocio))}
        storeSlug={slug}
        showCodes={viaPrivateLink}
      />
    );
  }

  const { default: RestaurantOrderTrackingClient } = await import(
    '@/modules/restaurant/components/RestaurantOrderTrackingClient'
  );
  return <RestaurantOrderTrackingClient order={order} negocio={negocio} storeSlug={slug} chatEnabled={order.id === id} />;
}
