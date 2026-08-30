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
  previousPrice?: number | null;
  originalPrice?: number | null;
  hasVariants?: boolean;
  priceLabel?: string | null;
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
  previousPrice?: number | null;
  originalPrice?: number | null;
  hasVariants?: boolean;
  priceLabel?: string | null;
  badge?: string | null;
  position: number;
  priority: number;
}

export interface LandingContentResponse {
  hero: ResolvedHeroItem[];
  highlights: ResolvedHighlightItem[];
}

export function cleanDescriptionText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/CITIOX_META:\s*\{[\s\S]*?\}/gi, '')
    .replace(/CITIOX_META:[\s\S]*/gi, '')
    .trim();
}

/**
 * Función centralizada para resolver el precio, precio anterior, variantes y priceLabel de una entidad.
 */
export function resolveHeroPrice(entity: any, type: string): {
  price: number | null;
  previousPrice: number | null;
  hasVariants: boolean;
  priceLabel: string | null;
} {
  if (!entity) {
    return { price: null, previousPrice: null, hasVariants: false, priceLabel: null };
  }

  let price: number | null = null;
  let previousPrice: number | null = null;
  let hasVariants = false;

  if (type === 'PRODUCT') {
    // Extraer variantes desde extraInfo o campo de variantes si existe
    const extra = typeof entity.extraInfo === 'string'
      ? (() => { try { return JSON.parse(entity.extraInfo); } catch { return {}; } })()
      : (entity.extraInfo || {});

    const variantList = extra?.variantes || extra?.variants || entity.variantes || entity.variants;

    if (Array.isArray(variantList) && variantList.length > 0) {
      const validPrices = variantList
        .map((v: any) => Number(v?.precio ?? v?.price))
        .filter((p: number) => !isNaN(p) && p > 0);

      if (validPrices.length > 0) {
        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);
        price = minPrice;
        hasVariants = maxPrice > minPrice || variantList.length > 1;
      } else {
        price = Number(entity.precio ?? entity.price) || null;
      }
    } else {
      price = Number(entity.precio ?? entity.price) || null;
    }

    if (entity.precioAnterior || entity.previousPrice || extra?.precioAnterior) {
      previousPrice = Number(entity.precioAnterior || entity.previousPrice || extra?.precioAnterior) || null;
    }
  } else if (type === 'SERVICE') {
    price = Number(entity.precio ?? entity.price) || null;
    if (entity.precioAnterior || entity.previousPrice) {
      previousPrice = Number(entity.precioAnterior || entity.previousPrice) || null;
    }
  } else if (type === 'PROMOTION') {
    price = Number(entity.precioPromo ?? entity.precio ?? entity.price) || null;
    previousPrice = Number(entity.precioAnterior ?? entity.previousPrice) || null;
  } else if (type === 'COMBO') {
    price = Number(entity.precio ?? entity.price) || null;
    previousPrice = Number(entity.precioAnterior ?? entity.previousPrice) || null;
  }

  let priceLabel: string | null = null;
  if (price !== null && !isNaN(price) && price > 0) {
    const formatted = `$${price.toFixed(2)}`;
    priceLabel = hasVariants ? `Desde ${formatted}` : formatted;
  }

  return {
    price,
    previousPrice,
    hasVariants,
    priceLabel
  };
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
 * Garantiza aislamiento multi-tenant, filtrado por fechas/estado y resolución dinámica de precios.
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
          const priceInfo = resolveHeroPrice(activePromo, 'PROMOTION');
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
            price: priceInfo.price,
            previousPrice: priceInfo.previousPrice,
            originalPrice: priceInfo.previousPrice,
            hasVariants: priceInfo.hasVariants,
            priceLabel: priceInfo.priceLabel,
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
        const priceInfo = resolveHeroPrice(activeProduct, 'PRODUCT');
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
          price: priceInfo.price,
          previousPrice: priceInfo.previousPrice,
          originalPrice: priceInfo.previousPrice,
          hasVariants: priceInfo.hasVariants,
          priceLabel: priceInfo.priceLabel,
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
          const priceInfo = resolveHeroPrice(activeService, 'SERVICE');
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
            price: priceInfo.price,
            previousPrice: priceInfo.previousPrice,
            originalPrice: priceInfo.previousPrice,
            hasVariants: priceInfo.hasVariants,
            priceLabel: priceInfo.priceLabel,
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
          price: null,
          previousPrice: null,
          originalPrice: null,
          hasVariants: false,
          priceLabel: null,
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
    let finalPreviousPrice: number | null = null;
    let finalHasVariants = false;
    let finalPriceLabel: string | null = null;
    let isValidSource = true;

    const sourceType = item.sourceType || item.type;

    if (sourceType === 'PROMOTION' && item.sourceId) {
      const promo = await (prisma as any).promotion.findFirst({
        where: { id: item.sourceId, businessId, estado: { notIn: ['eliminado', 'eliminada'] } },
        include: { imageMedia: true }
      });
      if (!promo) {
        isValidSource = false; // Entidad inactiva, eliminada o de otro negocio
      } else {
        const priceInfo = resolveHeroPrice(promo, 'PROMOTION');
        finalTitle = finalTitle || promo.titulo;
        finalDesc = finalDesc || promo.descripcion;
        finalImage = finalImage || promo.imageMedia?.url || promo.imagenUrl;
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
      }
    } else if (sourceType === 'PRODUCT' && item.sourceId) {
      const prod = await (prisma as any).producto.findFirst({
        where: { id: item.sourceId, negocioId: businessId, activo: true }
      });
      if (!prod) {
        isValidSource = false; // Entidad inactiva, eliminada o de otro negocio
      } else {
        const priceInfo = resolveHeroPrice(prod, 'PRODUCT');
        finalTitle = finalTitle || prod.nombre;
        finalDesc = finalDesc || prod.descripcion;
        finalImage = finalImage || prod.imagenUrl;
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
      }
    } else if (sourceType === 'SERVICE' && item.sourceId) {
      const srv = await (prisma as any).service.findFirst({
        where: { id: item.sourceId, negocioId: businessId, estaActivo: true },
        include: { imageMedia: true, Imagen: true }
      });
      if (!srv) {
        isValidSource = false; // Entidad inactiva, eliminada o de otro negocio
      } else {
        const priceInfo = resolveHeroPrice(srv, 'SERVICE');
        finalTitle = finalTitle || srv.nombre;
        finalImage = finalImage || srv.imageMedia?.url || (srv.Imagen && srv.Imagen[0]?.url);
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
      }
    } else if (sourceType === 'COMBO' && item.sourceId) {
      let combo: any = null;
      try {
        combo = await (prisma as any).combo.findFirst({
          where: { id: item.sourceId, negocioId: businessId }
        });
      } catch (_) {}
      if (!combo) {
        isValidSource = false;
      } else {
        const priceInfo = resolveHeroPrice(combo, 'COMBO');
        finalTitle = finalTitle || combo.nombre;
        finalDesc = finalDesc || combo.descripcion;
        finalImage = finalImage || combo.imagenUrl;
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
      }
    }

    if (!isValidSource || !finalImage) {
      continue; // Descartar si la entidad fuente fue eliminada o no pertenece al negocio
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
      previousPrice: finalPreviousPrice,
      originalPrice: finalPreviousPrice,
      hasVariants: finalHasVariants,
      priceLabel: finalPriceLabel,
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

  // ── RESOLUCIÓN DE HIGHLIGHT ITEMS (DESTACADOS Y PROMOCIONES DE LA BD) ──────
  const resolvedHighlights: ResolvedHighlightItem[] = [];

  for (const item of rawHighlightItems) {
    if (!isWithinSchedule(item.startAt, item.endAt, now)) {
      continue;
    }

    let finalTitle = item.title;
    let finalDesc = item.description;
    let finalImage = item.image;
    let finalPrice: number | null = null;
    let finalPreviousPrice: number | null = null;
    let finalHasVariants = false;
    let finalPriceLabel: string | null = null;
    let isValidSource = true;

    if (item.sourceType === 'PROMOTION' && item.sourceId) {
      const promo = await (prisma as any).promotion.findFirst({
        where: { id: item.sourceId, businessId, estado: { notIn: ['eliminado', 'eliminada'] } },
        include: { imageMedia: true }
      });
      if (!promo) {
        isValidSource = false;
      } else {
        const priceInfo = resolveHeroPrice(promo, 'PROMOTION');
        finalTitle = finalTitle || promo.titulo;
        finalDesc = finalDesc || promo.descripcion;
        finalImage = finalImage || promo.imageMedia?.url || promo.imagenUrl;
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
      }
    } else if (item.sourceType === 'PRODUCT' && item.sourceId) {
      const prod = await (prisma as any).producto.findFirst({
        where: { id: item.sourceId, negocioId: businessId, activo: true }
      });
      if (!prod) {
        isValidSource = false;
      } else {
        const priceInfo = resolveHeroPrice(prod, 'PRODUCT');
        finalTitle = finalTitle || prod.nombre;
        finalDesc = finalDesc || prod.descripcion;
        finalImage = finalImage || prod.imagenUrl;
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
      }
    } else if (item.sourceType === 'SERVICE' && item.sourceId) {
      const srv = await (prisma as any).service.findFirst({
        where: { id: item.sourceId, negocioId: businessId, estaActivo: true },
        include: { imageMedia: true, Imagen: true }
      });
      if (!srv) {
        isValidSource = false;
      } else {
        const priceInfo = resolveHeroPrice(srv, 'SERVICE');
        finalTitle = finalTitle || srv.nombre;
        finalImage = finalImage || srv.imageMedia?.url || (srv.Imagen && srv.Imagen[0]?.url);
        finalPrice = priceInfo.price;
        finalPreviousPrice = priceInfo.previousPrice;
        finalHasVariants = priceInfo.hasVariants;
        finalPriceLabel = priceInfo.priceLabel;
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
      previousPrice: finalPreviousPrice,
      originalPrice: finalPreviousPrice,
      hasVariants: finalHasVariants,
      priceLabel: finalPriceLabel,
      position: item.position,
      priority: item.priority
    });
  }

  // ── SI NO HAY HIGHLIGHTITEMS MANUALES, CONSULTAR DIRECTAMENTE LAS PROMOCIONES ACTIVAS EN DB DE ESTE NEGOCIO ──
  if (resolvedHighlights.length === 0) {
    const activeDbPromotions = await (prisma as any).promotion.findMany({
      where: {
        businessId,
        estado: { in: ['activa', 'activo', 'ACTIVA', 'ACTIVO', 'publicado', 'publicada', 'PUBLICADO', 'PUBLICADA'] }
      },
      include: { imageMedia: true },
      orderBy: { createdAt: 'desc' }
    });

    for (let idx = 0; idx < activeDbPromotions.length; idx++) {
      const promo = activeDbPromotions[idx];
      if (!isWithinSchedule(promo.fechaInicio, promo.fechaFin, now)) {
        continue;
      }

      const promoImg = promo.imageMedia?.url || promo.imagenUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800';
      const priceInfo = resolveHeroPrice(promo, 'PROMOTION');

      let badge = 'OFERTA';
      if (promo.tipoPromo === '2x1') badge = '2x1 OFERTA';
      else if (promo.tipoPromo === 'paquete') badge = 'PAQUETE';
      else if (promo.tipoPromo === 'cupon') badge = 'CUPÓN';
      else if (promo.tipoPromo === 'envio_gratis' || promo.titulo?.toLowerCase().includes('envio gratis') || promo.titulo?.toLowerCase().includes('envío gratis')) badge = 'ENVÍO GRATIS';
      else if (promo.precioAnterior && promo.precioAnterior > promo.precioPromo) {
        const pct = Math.round(((promo.precioAnterior - promo.precioPromo) / promo.precioAnterior) * 100);
        badge = `${pct}% OFF`;
      }

      resolvedHighlights.push({
        id: promo.id,
        businessId,
        type: 'PROMOTION',
        sourceType: 'PROMOTION',
        sourceId: promo.id,
        image: promoImg,
        title: promo.titulo,
        description: cleanDescriptionText(promo.descripcion),
        price: priceInfo.price,
        previousPrice: priceInfo.previousPrice,
        originalPrice: priceInfo.previousPrice,
        hasVariants: priceInfo.hasVariants,
        priceLabel: priceInfo.priceLabel,
        badge,
        position: idx,
        priority: 10
      });
    }
  }

  return {
    hero: resolvedHero,
    highlights: resolvedHighlights
  };
}
