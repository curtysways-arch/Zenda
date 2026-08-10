/**
 * @file PromotionEngineService.ts
 * @module core/services
 * @description Motor de Evaluación y Aplicación de Promociones (FASE 5 - RESTAURANT PROMOTIONS v1.0).
 * @responsibility Evaluar promociones activas sobre un carrito u orden en POS, Landing y Meseros.
 * @status Stable (Core Business Engine)
 */

export interface CartItemInput {
  productId?: string;
  categoryId?: string;
  nombre: string;
  precio: number;
  cantidad: number;
  variantId?: string;
}

export interface PromotionEvaluationContext {
  cartItems: CartItemInput[];
  channel: 'POS' | 'MESEROS' | 'DELIVERY' | 'PICKUP' | 'LANDING';
  subtotal: number;
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
    finalSubtotal: number;
    bestPromotionSummary: string | null;
  } {
    const { cartItems, channel, subtotal, customerType = 'ANY', couponCode, now = new Date(), promotions } = context;

    if (!promotions || promotions.length === 0 || cartItems.length === 0) {
      return {
        appliedPromotions: [],
        totalDiscount: 0,
        freeDelivery: false,
        finalSubtotal: subtotal,
        bestPromotionSummary: null
      };
    }

    const currentDayIdx = now.getDay(); // 0 = Dom, 1 = Lun...
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
        const validDays = promo.diasValidos.split(',').map((d: string) => d.trim());
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const currentDayName = dayNames[currentDayIdx];
        const isDayValid = validDays.some((d: string) => 
          d.toLowerCase() === currentDayName.toLowerCase() || d === String(currentDayIdx)
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
        if (!promo.canales.includes(channel)) continue;
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

      // 8. Validar Compra Mínima
      if (promo.montoMinimo && subtotal < Number(promo.montoMinimo)) {
        continue;
      }

      // 9. Validar Cantidad Mínima
      const totalItemQty = cartItems.reduce((acc, it) => acc + (it.cantidad || 1), 0);
      if (promo.cantidadMinima && totalItemQty < Number(promo.cantidadMinima)) {
        continue;
      }

      // 10. Validar Productos / Categorías Requeridas
      if (promo.productoRequeridoId) {
        const hasReqProd = cartItems.some(it => {
          const pid = it.productId || (it as any).id || (it as any).productoId;
          return pid === promo.productoRequeridoId || (it.nombre && promo.titulo && promo.titulo.toLowerCase().includes(it.nombre.toLowerCase()));
        });
        if (!hasReqProd) continue;
      }

      if (promo.categoriaRequeridaId) {
        const hasReqCat = cartItems.some(it => it.categoryId === promo.categoriaRequeridaId);
        if (!hasReqCat) continue;
      }

      validPromos.push(promo);
    }

    if (validPromos.length === 0) {
      return {
        appliedPromotions: [],
        totalDiscount: 0,
        freeDelivery: false,
        finalSubtotal: subtotal,
        bestPromotionSummary: null
      };
    }

    // Calcular descuento para cada promoción válida
    let bestResult: {
      appliedPromotions: AppliedPromotionResult[];
      totalDiscount: number;
      freeDelivery: boolean;
      finalSubtotal: number;
      bestPromotionSummary: string | null;
    } = {
      appliedPromotions: [],
      totalDiscount: 0,
      freeDelivery: false,
      finalSubtotal: subtotal,
      bestPromotionSummary: null
    };

    const evaluatedResults: AppliedPromotionResult[] = [];

    for (const promo of validPromos) {
      let discount = 0;
      let isFreeDelivery = false;

      const promoType = (promo.tipoPromo || 'PORCENTAJE').toUpperCase();

      if (promoType === 'PORCENTAJE' || promoType === 'PERCENTAGE') {
        const pct = Number(promo.porcentajeDescuento || promo.precioPromo || 0);
        if (pct > 0) {
          discount = (subtotal * (pct > 1 ? pct / 100 : pct));
        }
      } else if (promoType === 'DESCUENTO_FIJO' || promoType === 'FIXED') {
        discount = Number(promo.precioPromo || promo.montoDescuento || 0);
      } else if (promoType === 'DOS_POR_UNO' || promoType === '2X1') {
        // En 2x1, descuenta 1 unidad por cada 2 ítems elegibles
        cartItems.forEach(it => {
          const pid = it.productId || (it as any).id || (it as any).productoId;
          const isEligible = !promo.productoRequeridoId || pid === promo.productoRequeridoId || (it.nombre && promo.titulo && promo.titulo.toLowerCase().includes(it.nombre.toLowerCase()));
          if (isEligible) {
            if (it.cantidad >= 2) {
              const freeCount = Math.floor(it.cantidad / 2);
              discount += freeCount * (it.precio || 0);
            } else if (it.cantidad === 1 && promo.productoRequeridoId) {
              discount += (it.precio || 0) * 0.5;
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
        discount = 0; // El precio de los productos se cobra al 100% (cero descuento a producto)
      } else if (promoType === 'COMBO') {
        const comboPrice = Number(promo.precioPromo || 0);
        if (comboPrice > 0 && subtotal > comboPrice) {
          discount = subtotal - comboPrice;
        }
      } else if (promoType === 'PRECIO_ESPECIAL') {
        const promoPrice = Number(promo.precioPromo || 0);
        if (promoPrice > 0 && subtotal > promoPrice) {
          discount = subtotal - promoPrice;
        }
      } else if (promoType === 'CUPON') {
        const pct = Number(promo.porcentajeDescuento || promo.precioPromo || 0);
        if (pct > 0) {
          discount = subtotal * (pct > 1 ? pct / 100 : pct);
        } else if (promo.montoDescuento) {
          discount = Number(promo.montoDescuento);
        }
      }

      // Aplicar límite de presupuesto si existe
      if (promo.presupuestoMaximo && discount > Number(promo.presupuestoMaximo)) {
        discount = Number(promo.presupuestoMaximo);
      }

      // Asegurar que el descuento no supere el subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }

      discount = Math.round(discount * 100) / 100;

      evaluatedResults.push({
        promotionId: promo.id,
        promotionCode: promo.cuponCodigo || promo.titulo,
        promotionTitle: promo.titulo,
        tipoPromo: promoType,
        discountAmount: discount,
        freeDelivery: isFreeDelivery,
        finalSubtotal: Math.max(0, subtotal - discount),
        finalTotal: Math.max(0, subtotal - discount),
        metadata: {
          descripcion: promo.descripcion,
          canales: promo.canales || [],
          tipoCliente: promo.tipoCliente || 'ANY'
        }
      });
    }

    // Seleccionar la mejor combinación o la promoción con mayor ahorro
    evaluatedResults.sort((a, b) => b.discountAmount - a.discountAmount);
    const topResult = evaluatedResults[0];

    if (topResult) {
      bestResult = {
        appliedPromotions: [topResult],
        totalDiscount: topResult.discountAmount,
        freeDelivery: topResult.freeDelivery,
        finalSubtotal: topResult.finalSubtotal,
        bestPromotionSummary: `🎉 ${topResult.promotionTitle}: Ahorraste $${topResult.discountAmount.toFixed(2)}`
      };
    }

    return bestResult;
  }
}
