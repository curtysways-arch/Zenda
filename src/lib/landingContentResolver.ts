import prisma from '@/lib/prisma';

export interface ResolvedButton {
  enabled: boolean;
  text?: string | null;
  actionType: string;
  actionValue?: string | null;
}

export interface ResolvedHeroItem {
  id: string;
  businessId: string;
  type: string;
  sourceType?: string | null;
  sourceId?: string | null;
  image: string;
  mobileImage?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  button: ResolvedButton;
  position: number;
  priority: number;
  isAutomatic?: boolean;
}

export interface ResolvedHighlightItem {
  id: string;
  businessId: string;
  type: string;
  sourceType?: string | null;
  sourceId?: string | null;
  image: string;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  position: number;
  priority: number;
}

export interface LandingContentResponse {
  hero: ResolvedHeroItem[];
  highlights: ResolvedHighlightItem[];
}

/**
 * Filtra si un ítem está dentro de su ventana de vigencia (startAt y endAt).
 */
function isWithinSchedule(startAt?: Date | null, endAt?: Date | null, now: Date = new Date()): boolean {
  if (startAt && startAt > now) return false;
  if (endAt && endAt < now) return false;
  return true;
}

/**
 * Resolver universal para el contenido de Landing de un negocio.
 * Garantiza aislamiento multi-tenant, filtrado por fechas/estado y resolución de entidades asociadas.
 */
export async function resolveLandingContent(businessId: string): Promise<LandingContentResponse> {
  if (!businessId) {
    return { hero: [], highlights: [] };
  }

  const now = new Date();

  // 1. Obtener HeroItems activos para el negocio
  const rawHeroItems = await (prisma as any).heroItem.findMany({
    where: {
      businessId,
      isActive: true,
    },
    orderBy: [
      { position: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // 2. Obtener HighlightItems activos para el negocio
  const rawHighlightItems = await (prisma as any).highlightItem.findMany({
    where: {
      businessId,
      isActive: true,
    },
    orderBy: [
      { position: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // ── RESOLUCIÓN DE HERO ITEMS ─────────────────────────────────────────────
  const resolvedHero: ResolvedHeroItem[] = [];

  for (const item of rawHeroItems) {
    if (!isWithinSchedule(item.startAt, item.endAt, now)) {
      continue;
    }

    if (item.type === 'AUTOMATIC') {
      // Estrategia de resolución automática
      // 1. Promoción activa
      const activePromo = await (prisma as any).promotion.findFirst({
        where: {
          businessId,
          estado: { in: ['activa', 'activo', 'ACTIVA', 'ACTIVO', 'publicado', 'publicada', 'PUBLICADO', 'PUBLICADA'] }
        },
        orderBy: { createdAt: 'desc' },
        include: { imageMedia: true }
      });

      if (activePromo) {
        const promoImg = activePromo.imageMedia?.url || activePromo.imagenUrl;
        if (promoImg) {
          resolvedHero.push({
            id: item.id,
            businessId,
            type: 'PROMOTION',
            sourceType: 'PROMOTION',
            sourceId: activePromo.id,
            image: item.image || promoImg,
            mobileImage: item.mobileImage || item.image || promoImg,
            title: item.title || activePromo.titulo,
            description: item.description || activePromo.descripcion,
            price: activePromo.precioPromo,
            originalPrice: activePromo.precioAnterior,
            button: {
              enabled: item.buttonEnabled,
              text: item.buttonEnabled ? (item.buttonText || 'Ver Promoción') : null,
              actionType: item.buttonEnabled ? (item.actionType || 'PROMOTION') : 'NONE',
              actionValue: item.buttonEnabled ? (item.actionValue || activePromo.id) : null
            },
            position: item.position,
            priority: item.priority,
            isAutomatic: true
          });
          continue;
        }
      }

      // 2. Producto activo
      const activeProduct = await (prisma as any).producto.findFirst({
        where: {
          negocioId: businessId,
          activo: true,
          imagenUrl: { not: null }
        },
        orderBy: { orden: 'asc' }
      });

      if (activeProduct && activeProduct.imagenUrl) {
        resolvedHero.push({
          id: item.id,
          businessId,
          type: 'PRODUCT',
          sourceType: 'PRODUCT',
          sourceId: activeProduct.id,
          image: item.image || activeProduct.imagenUrl,
          mobileImage: item.mobileImage || item.image || activeProduct.imagenUrl,
          title: item.title || activeProduct.nombre,
          description: item.description || activeProduct.descripcion,
          price: activeProduct.precio,
          button: {
            enabled: item.buttonEnabled,
            text: item.buttonEnabled ? (item.buttonText || 'Ver Producto') : null,
            actionType: item.buttonEnabled ? (item.actionType || 'PRODUCT') : 'NONE',
            actionValue: item.buttonEnabled ? (item.actionValue || activeProduct.id) : null
          },
          position: item.position,
          priority: item.priority,
          isAutomatic: true
        });
        continue;
      }

      // 3. Servicio activo
      const activeService = await (prisma as any).service.findFirst({
        where: {
          negocioId: businessId,
          estaActivo: true
        },
        include: { imageMedia: true, Imagen: true },
        orderBy: { createdAt: 'desc' }
      });

      if (activeService) {
        const srvImg = activeService.imageMedia?.url || (activeService.Imagen && activeService.Imagen[0]?.url);
        if (srvImg) {
          resolvedHero.push({
            id: item.id,
            businessId,
            type: 'SERVICE',
            sourceType: 'SERVICE',
            sourceId: activeService.id,
            image: item.image || srvImg,
            mobileImage: item.mobileImage || item.image || srvImg,
            title: item.title || activeService.nombre,
            description: item.description,
            price: activeService.precio,
            button: {
              enabled: item.buttonEnabled,
              text: item.buttonEnabled ? (item.buttonText || 'Reservar Servicio') : null,
              actionType: item.buttonEnabled ? (item.actionType || 'SERVICE') : 'NONE',
              actionValue: item.buttonEnabled ? (item.actionValue || activeService.id) : null
            },
            position: item.position,
            priority: item.priority,
            isAutomatic: true
          });
          continue;
        }
      }

      // 4. Imagen personalizada guardada en el HeroItem si existe
      if (item.image) {
        resolvedHero.push({
          id: item.id,
          businessId,
          type: 'IMAGE',
          sourceType: 'CUSTOM',
          sourceId: null,
          image: item.image,
          mobileImage: item.mobileImage || item.image,
          title: item.title,
          description: item.description,
          button: {
            enabled: item.buttonEnabled,
            text: item.buttonEnabled ? item.buttonText : null,
            actionType: item.buttonEnabled ? item.actionType : 'NONE',
            actionValue: item.buttonEnabled ? item.actionValue : null
          },
          position: item.position,
          priority: item.priority,
          isAutomatic: true
        });
      }
      continue;
    }

    // Para héroes específicos (IMAGE, PROMOTION, PRODUCT, SERVICE, COMBO)
    let finalTitle = item.title;
    let finalDesc = item.description;
    let finalImage = item.image;
    let finalPrice: number | null = null;
    let finalOriginalPrice: number | null = null;
    let isValidSource = true;

    if (item.sourceType === 'PROMOTION' && item.sourceId) {
      const promo = await (prisma as any).promotion.findFirst({
        where: { id: item.sourceId, businessId, estado: { notIn: ['eliminado', 'eliminada'] } },
        include: { imageMedia: true }
      });
      if (!promo) {
        isValidSource = false; // Entidad inactiva o eliminada
      } else {
        finalTitle = finalTitle || promo.titulo;
        finalDesc = finalDesc || promo.descripcion;
        finalImage = finalImage || promo.imageMedia?.url || promo.imagenUrl;
        finalPrice = promo.precioPromo;
        finalOriginalPrice = promo.precioAnterior;
      }
    } else if (item.sourceType === 'PRODUCT' && item.sourceId) {
      const prod = await (prisma as any).producto.findFirst({
        where: { id: item.sourceId, negocioId: businessId, activo: true }
      });
      if (!prod) {
        isValidSource = false;
      } else {
        finalTitle = finalTitle || prod.nombre;
        finalDesc = finalDesc || prod.descripcion;
        finalImage = finalImage || prod.imagenUrl;
        finalPrice = prod.precio;
      }
    } else if (item.sourceType === 'SERVICE' && item.sourceId) {
      const srv = await (prisma as any).service.findFirst({
        where: { id: item.sourceId, negocioId: businessId, estaActivo: true },
        include: { imageMedia: true, Imagen: true }
      });
      if (!srv) {
        isValidSource = false;
      } else {
        finalTitle = finalTitle || srv.nombre;
        finalImage = finalImage || srv.imageMedia?.url || (srv.Imagen && srv.Imagen[0]?.url);
        finalPrice = srv.precio;
      }
    }

    if (!isValidSource || !finalImage) {
      continue; // Descartar ítems cuya entidad fuente ya no exista o no tenga imagen
    }

    resolvedHero.push({
      id: item.id,
      businessId,
      type: item.type,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      image: finalImage,
      mobileImage: item.mobileImage || finalImage,
      title: finalTitle,
      description: finalDesc,
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      button: {
        enabled: item.buttonEnabled,
        text: item.buttonEnabled ? item.buttonText : null,
        actionType: item.buttonEnabled ? item.actionType : 'NONE',
        actionValue: item.buttonEnabled ? item.actionValue : null
      },
      position: item.position,
      priority: item.priority
    });
  }

  // ── RESOLUCIÓN DE HIGHLIGHT ITEMS ────────────────────────────────────────
  const resolvedHighlights: ResolvedHighlightItem[] = [];

  for (const item of rawHighlightItems) {
    if (!isWithinSchedule(item.startAt, item.endAt, now)) {
      continue;
    }

    let finalTitle = item.title;
    let finalDesc = item.description;
    let finalImage = item.image;
    let finalPrice: number | null = null;
    let isValidSource = true;

    if (item.sourceType === 'PROMOTION' && item.sourceId) {
      const promo = await (prisma as any).promotion.findFirst({
        where: { id: item.sourceId, businessId, estado: { notIn: ['eliminado', 'eliminada'] } },
        include: { imageMedia: true }
      });
      if (!promo) {
        isValidSource = false;
      } else {
        finalTitle = finalTitle || promo.titulo;
        finalDesc = finalDesc || promo.descripcion;
        finalImage = finalImage || promo.imageMedia?.url || promo.imagenUrl;
        finalPrice = promo.precioPromo;
      }
    } else if (item.sourceType === 'PRODUCT' && item.sourceId) {
      const prod = await (prisma as any).producto.findFirst({
        where: { id: item.sourceId, negocioId: businessId, activo: true }
      });
      if (!prod) {
        isValidSource = false;
      } else {
        finalTitle = finalTitle || prod.nombre;
        finalDesc = finalDesc || prod.descripcion;
        finalImage = finalImage || prod.imagenUrl;
        finalPrice = prod.precio;
      }
    } else if (item.sourceType === 'SERVICE' && item.sourceId) {
      const srv = await (prisma as any).service.findFirst({
        where: { id: item.sourceId, negocioId: businessId, estaActivo: true },
        include: { imageMedia: true, Imagen: true }
      });
      if (!srv) {
        isValidSource = false;
      } else {
        finalTitle = finalTitle || srv.nombre;
        finalImage = finalImage || srv.imageMedia?.url || (srv.Imagen && srv.Imagen[0]?.url);
        finalPrice = srv.precio;
      }
    }

    if (!isValidSource || !finalImage) {
      continue;
    }

    resolvedHighlights.push({
      id: item.id,
      businessId,
      type: item.type,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      image: finalImage,
      title: finalTitle,
      description: finalDesc,
      price: finalPrice,
      position: item.position,
      priority: item.priority
    });
  }

  return {
    hero: resolvedHero,
    highlights: resolvedHighlights
  };
}
