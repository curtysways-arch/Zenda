/**
 * @file PromotionEngineService.ts
 * @module core/services
 * @description Motor Universal de Evaluación y Aplicación de Promociones de Citiox.
 * @responsibility Evaluar promociones activas para cualquier vertical (Restaurantes, Spas, Lavanderías, Tiendas, Canchas, Citas).
 * @status Stable (Core Business Engine)
 */

export interface CartItemInput {
  productId?: string;
  serviceId?: string;
  categoryId?: string;
  nombre: string;
  precio: number;
  cantidad: number;
  variantId?: string;
  professionalId?: string;
  resourceId?: string;
}

export interface PromotionEvaluationContext {
  cartItems: CartItemInput[];
  channel: string; // 'POS' | 'ONLINE' | 'MESEROS' | 'DELIVERY' | 'PICKUP' | 'CITAS' | 'LANDING'
  subtotal: number;
  shippingAmount?: number;
  distanceKm?: number;
  customerType?: 'NEW' | 'RECURRING' | 'ANY';
  couponCode?: string;
  now?: Date;
  promotions: any[];
}

export interface AppliedPromotionResult {
  promotionId: string;
  promotionCode?: string;
  promotionTitle: string;
  tipoPromo: string;
  discountAmount: number;
  freeDelivery: boolean;
  shippingDiscount: number;
  merchantShippingSubsidy: number;
  customerShippingAmount: number;
  finalSubtotal: number;
  finalTotal: number;
  metadata: Record<string, any>;
}

export class PromotionEngineService {
  /**
   * Evalúa las promociones activas y retorna los beneficios aplicados sin modificar precios base.
   */
  static evaluate(context: PromotionEvaluationContext): {
    appliedPromotions: AppliedPromotionResult[];
    totalDiscount: number;
    freeDelivery: boolean;
    shippingDiscount: number;
    merchantShippingSubsidy: number;
    customerShippingAmount: number;
    finalSubtotal: number;
    finalTotal: number;
    bestPromotionSummary: string | null;
  } {
    const {
      cartItems = [],
      channel = 'ONLINE',
      subtotal = 0,
      shippingAmount = 0,
      distanceKm = 0,
      customerType = 'ANY',
      couponCode,
      now = new Date(),
      promotions = []
    } = context;

    if (!promotions || promotions.length === 0 || (cartItems.length === 0 && subtotal === 0)) {
      return {
        appliedPromotions: [],
        totalDiscount: 0,
        freeDelivery: false,
        shippingDiscount: 0,
        merchantShippingSubsidy: 0,
        customerShippingAmount: shippingAmount,
        finalSubtotal: subtotal,
        finalTotal: subtotal + shippingAmount,
        bestPromotionSummary: null
      };
    }

    const currentDayIdx = now.getDay(); // 0 = Dom, 1 = Lun...
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayNames[currentDayIdx];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const validPromos: any[] = [];

    for (const promo of promotions) {
      // 1. Validar Estado
      if (promo.estado !== 'ACTIVA' && promo.estado !== 'activa') continue;

      // 2. Validar Fechas (Inicio / Fin)
      if (promo.fechaInicio && new Date(promo.fechaInicio) > now) continue;
      if (promo.fechaFin && new Date(promo.fechaFin) < now) continue;

      // 3. Validar Días de la semana
      if (promo.diasValidos && typeof promo.diasValidos === 'string' && promo.diasValidos.trim() !== '') {
        const validDays = promo.diasValidos.split(',').map((d: string) => d.trim().toLowerCase());
        const isDayValid = validDays.some((d: string) => 
          d === currentDayName.toLowerCase() || d === String(currentDayIdx)
        );
        if (!isDayValid) continue;
      }

      // 4. Validar Horario
      if (promo.horaInicioValida && promo.horaFinValida) {
        if (currentTimeStr < promo.horaInicioValida || currentTimeStr > promo.horaFinValida) {
          continue;
        }
      }

      // 5. Validar Canal
      if (promo.canales && Array.isArray(promo.canales) && promo.canales.length > 0) {
        const channelUpper = channel.toUpperCase();
        const promoChannelsUpper = promo.canales.map((c: string) => c.toUpperCase());
        // Mapeos de compatibilidad de canales
        const matchesChannel = promoChannelsUpper.includes(channelUpper) ||
          (channelUpper === 'ONLINE' && (promoChannelsUpper.includes('LANDING') || promoChannelsUpper.includes('CITAS') || promoChannelsUpper.includes('SOLICITUDES'))) ||
          (channelUpper === 'LANDING' && promoChannelsUpper.includes('ONLINE')) ||
          (channelUpper === 'CITAS' && (promoChannelsUpper.includes('LOCAL') || promoChannelsUpper.includes('ONLINE')));
        if (!matchesChannel) continue;
      }

      // 6. Validar Cupón si la promo lo requiere
      if (promo.tipoPromo === 'CUPON' || promo.cuponRequerido) {
        const expectedCode = (promo.cuponCodigo || promo.titulo || '').trim().toUpperCase();
        const providedCode = (couponCode || '').trim().toUpperCase();
        if (!providedCode || providedCode !== expectedCode) {
          continue;
        }
      }

      // 7. Validar Tipo de Cliente
      if (promo.tipoCliente && promo.tipoCliente !== 'ANY') {
        if (customerType !== 'ANY' && promo.tipoCliente !== customerType) {
          continue;
        }
      }

      // 8. Validar Alcance y Subtotal Elegible
      let eligibleSubtotal = subtotal;
      if (promo.alcance === 'PRODUCTOS' || promo.alcance === 'SERVICIOS') {
        const eligibleItems = cartItems.filter(it => {
          if (promo.productoRequeridoId) return (it.productId || (it as any).id) === promo.productoRequeridoId;
          if (promo.servicioRequeridoId) return (it.serviceId || (it as any).id) === promo.servicioRequeridoId;
          if (promo.categoriaRequeridaId) return it.categoryId === promo.categoriaRequeridaId;
          return true;
        });
        eligibleSubtotal = eligibleItems.reduce((acc, it) => acc + ((it.precio || 0) * (it.cantidad || 1)), 0);
      }

      // 9. Validar Compra Mínima sobre Subtotal Elegible
      if (promo.montoMinimo && eligibleSubtotal < Number(promo.montoMinimo)) {
        continue;
      }

      // 10. Validar Cantidad Mínima
      const totalItemQty = cartItems.reduce((acc, it) => acc + (it.cantidad || 1), 0);
      if (promo.cantidadMinima && totalItemQty < Number(promo.cantidadMinima)) {
        continue;
      }

      // 11. Validar Distancia Máxima para Envío Gratis / Subsidiado
      if (promo.tipoPromo === 'ENVIO_GRATIS' && promo.distanciaMaximaKm && distanceKm > Number(promo.distanciaMaximaKm)) {
        continue;
      }

      validPromos.push({ ...promo, eligibleSubtotal });
    }

    if (validPromos.length === 0) {
      return {
        appliedPromotions: [],
        totalDiscount: 0,
        freeDelivery: false,
        shippingDiscount: 0,
        merchantShippingSubsidy: 0,
        customerShippingAmount: shippingAmount,
        finalSubtotal: subtotal,
        finalTotal: subtotal + shippingAmount,
        bestPromotionSummary: null
      };
    }

    // Evaluar cada promoción válida
    const evaluatedResults: AppliedPromotionResult[] = [];

    for (const promo of validPromos) {
      let discount = 0;
      let isFreeDelivery = false;
      let shippingDisc = 0;
      let merchantSubsidy = 0;
      let customerShipping = shippingAmount;

      const promoType = (promo.tipoPromo || 'PORCENTAJE').toUpperCase();
      const baseSubtotal = promo.eligibleSubtotal !== undefined ? promo.eligibleSubtotal : subtotal;

      if (promoType === 'PORCENTAJE' || promoType === 'PERCENTAGE') {
        const pct = Number(promo.porcentajeDescuento || promo.precioPromo || 0);
        if (pct > 0) {
          discount = baseSubtotal * (pct > 1 ? pct / 100 : pct);
        }
      } else if (promoType === 'DESCUENTO_FIJO' || promoType === 'FIXED') {
        discount = Number(promo.precioPromo || promo.montoDescuento || 0);
      } else if (promoType === 'DOS_POR_UNO' || promoType === '2X1') {
        cartItems.forEach(it => {
          const pid = it.productId || it.serviceId || (it as any).id;
          const isEligible = !promo.productoRequeridoId || pid === promo.productoRequeridoId;
          if (isEligible) {
            if (it.cantidad >= 2) {
              const freeCount = Math.floor(it.cantidad / 2);
              discount += freeCount * (it.precio || 0);
            }
          }
        });
      } else if (promoType === 'TRES_POR_DOS' || promoType === '3X2') {
        cartItems.forEach(it => {
          if (it.cantidad >= 3) {
            const freeCount = Math.floor(it.cantidad / 3);
            discount += freeCount * (it.precio || 0);
          }
        });
      } else if (promoType === 'ENVIO_GRATIS' || promoType === 'FREE_DELIVERY') {
        isFreeDelivery = true;
        if (promo.esCostoCompleto ?? true) {
          shippingDisc = shippingAmount;
          merchantSubsidy = shippingAmount;
          customerShipping = 0;
        } else {
          const maxSub = Number(promo.costoMaximoSubsidiado || 0);
          shippingDisc = Math.min(shippingAmount, maxSub);
          merchantSubsidy = shippingDisc;
          customerShipping = Math.max(0, shippingAmount - shippingDisc);
        }
      } else if (promoType === 'COMBO' || promoType === 'PRECIO_ESPECIAL') {
        const promoPrice = Number(promo.precioPromo || 0);
        if (promoPrice > 0 && baseSubtotal > promoPrice) {
          discount = baseSubtotal - promoPrice;
        }
      } else if (promoType === 'CUPON') {
        const pct = Number(promo.porcentajeDescuento || promo.precioPromo || 0);
        if (pct > 0) {
          discount = baseSubtotal * (pct > 1 ? pct / 100 : pct);
        } else if (promo.montoDescuento) {
          discount = Number(promo.montoDescuento);
        }
      }

      // Límite de presupuesto si existe
      if (promo.presupuestoMaximo && discount > Number(promo.presupuestoMaximo)) {
        discount = Number(promo.presupuestoMaximo);
      }

      discount = Math.min(discount, baseSubtotal);
      discount = Math.round(discount * 100) / 100;

      const finalSub = Math.max(0, subtotal - discount);
      const finalTot = finalSub + customerShipping;

      evaluatedResults.push({
        promotionId: promo.id,
        promotionCode: promo.cuponCodigo || promo.titulo,
        promotionTitle: promo.titulo,
        tipoPromo: promoType,
        discountAmount: discount,
        freeDelivery: isFreeDelivery,
        shippingDiscount: shippingDisc,
        merchantShippingSubsidy: merchantSubsidy,
        customerShippingAmount: customerShipping,
        finalSubtotal: finalSub,
        finalTotal: finalTot,
        metadata: {
          descripcion: promo.descripcion,
          goalPreset: promo.goalPreset || 'CUSTOM',
          alcance: promo.alcance || 'PEDIDO_COMPLETO',
          canales: promo.canales || [],
          financiamiento: promo.financiamiento || 'NEGOCIO'
        }
      });
    }

    // Seleccionar la mejor oferta por descuento total acumulado (descuento producto + descuento envío)
    evaluatedResults.sort((a, b) => (b.discountAmount + b.shippingDiscount) - (a.discountAmount + a.shippingDiscount));
    const topResult = evaluatedResults[0];

    const totalSavings = topResult ? (topResult.discountAmount + topResult.shippingDiscount) : 0;

    return {
      appliedPromotions: topResult ? [topResult] : [],
      totalDiscount: topResult ? topResult.discountAmount : 0,
      freeDelivery: topResult ? topResult.freeDelivery : false,
      shippingDiscount: topResult ? topResult.shippingDiscount : 0,
      merchantShippingSubsidy: topResult ? topResult.merchantShippingSubsidy : 0,
      customerShippingAmount: topResult ? topResult.customerShippingAmount : shippingAmount,
      finalSubtotal: topResult ? topResult.finalSubtotal : subtotal,
      finalTotal: topResult ? topResult.finalTotal : (subtotal + shippingAmount),
      bestPromotionSummary: topResult
        ? `🎉 ${topResult.promotionTitle}: Ahorraste $${totalSavings.toFixed(2)}`
        : null
    };
  }
}
