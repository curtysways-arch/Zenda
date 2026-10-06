export interface PackServiceDetail {
    nombre: string;
    duracion?: number;
    precio?: number;
}

export interface PackInfo {
    isPack: boolean;             // true = Combo / Pack de múltiples tratamientos; false = Oferta / Descuento especial individual
    titulo: string;
    descripcion?: string;
    tipoPromo?: string;
    servicios: string[];
    serviciosDetalle?: PackServiceDetail[];
    precioPromo?: number;
    precioOriginal?: number;
    ahorro?: number;
    porcentajeDescuento?: number;
}

/**
 * Extrae la información y los tratamientos/servicios que componen un Pack Promocional
 * o una Promoción de Descuento Especial.
 * Soporta objetos de reserva, citas de BD, o estado de BookingClient / Service.
 */
export function parsePackInfo(appointmentOrBooking: any, targetPromoId?: string | null): PackInfo | null {
    if (!appointmentOrBooking) return null;

    // 1. Si ya viene el objeto packPromo directamente
    if (appointmentOrBooking.packPromo) {
        const p = appointmentOrBooking.packPromo;
        const pOriginal = p.precioOriginal ? Number(p.precioOriginal) : undefined;
        const pPromo = p.precioPromo ? Number(p.precioPromo) : undefined;
        const ahorro = (pOriginal && pPromo && pOriginal > pPromo) ? (pOriginal - pPromo) : undefined;
        const pct = (pOriginal && pPromo && pOriginal > pPromo) ? Math.round(((pOriginal - pPromo) / pOriginal) * 100) : undefined;

        const isPack = p.isPack !== undefined ? Boolean(p.isPack) : (
            p.tipoPromo === 'combo_pack' ||
            p.tipoPromo === 'pack' ||
            (Array.isArray(p.servicios) && p.servicios.length > 1) ||
            String(p.titulo || '').toLowerCase().includes('pack') ||
            String(p.titulo || '').toLowerCase().includes('combo')
        );

        return {
            isPack,
            titulo: p.titulo || (isPack ? 'Pack Promocional' : 'Promoción Especial'),
            descripcion: p.descripcion,
            tipoPromo: p.tipoPromo,
            servicios: Array.isArray(p.servicios) && p.servicios.length > 0 ? p.servicios : [],
            serviciosDetalle: Array.isArray(p.serviciosDetalle) ? p.serviciosDetalle : undefined,
            precioPromo: pPromo,
            precioOriginal: pOriginal,
            ahorro,
            porcentajeDescuento: pct
        };
    }

    const comments = appointmentOrBooking.comentarios || '';

    // 2. Parsear desde el texto estructurado en comentarios (para citas existentes)
    if (comments.includes('Pack') || comments.includes('pack') || comments.includes('Promoción:') || comments.includes('Promo:')) {
        const isPackMatch = comments.toLowerCase().includes('pack');
        const titleMatch = comments.match(/(?:Pack|Promoción|Promo)(?: Promocional)?:\s*([^\n\r]+)/i);
        const titulo = titleMatch ? titleMatch[1].trim() : (isPackMatch ? 'Pack Promocional' : 'Promoción Especial');

        const bulletLines = comments
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.startsWith('✓'))
            .map((l: string) => l.replace(/^[•\-\*✓]\s*/, '').trim())
            .filter((l: string) => l.length > 0 && !l.toLowerCase().includes('notas del cliente'));

        if (bulletLines.length > 0 || titleMatch) {
            return {
                isPack: isPackMatch,
                titulo,
                servicios: bulletLines.length > 0 
                    ? bulletLines 
                    : (appointmentOrBooking.service?.nombre ? [appointmentOrBooking.service.nombre] : [])
            };
        }
    }

    // Nombre del servicio actual que se está evaluando
    const currentServiceName = String(
        appointmentOrBooking.nombre ||
        appointmentOrBooking.name ||
        appointmentOrBooking.service?.nombre ||
        ''
    ).toLowerCase();

    // Auxiliar: evaluar si una promoción aplica a ESTE servicio
    const buildPromoInfo = (p: any): PackInfo | null => {
        if (!p) return null;
        if (p.estado === 'inactiva' || p.estado === 'caducada') return null;

        const isPackType = (
            p.tipoPromo === 'combo_pack' ||
            p.tipoPromo === 'pack' ||
            (p.PromotionToService && p.PromotionToService.length > 1) ||
            String(p.titulo || '').toLowerCase().includes('pack') ||
            String(p.titulo || '').toLowerCase().includes('combo')
        );

        // Si es un pack: validar que el servicio actual realmente sea el pack
        // (y no un servicio componente secundario como una simple Consulta Odontológica)
        if (isPackType) {
            const promoTitleLower = String(p.titulo || '').toLowerCase();
            const serviceIsPack = currentServiceName.includes('pack') || 
                                  currentServiceName.includes('combo') ||
                                  promoTitleLower.includes(currentServiceName) ||
                                  currentServiceName.includes(promoTitleLower) ||
                                  !currentServiceName; // si es genérico

            // Si el servicio NO es el pack (ej. "consulta odontológica general" y el pack es "pack sonrisa luminosa"):
            // No aplicamos el pack a la consulta individual
            if (!serviceIsPack && currentServiceName.length > 0) {
                return null;
            }
        }

        // Construir detalles de servicios incluidos
        let incDetails: PackServiceDetail[] = (p.PromotionToService || [])
            .map((pts: any) => ({
                nombre: pts.Service?.nombre || pts.Service?.name,
                duracion: pts.Service?.duracion,
                precio: pts.Service?.precio
            }))
            .filter((s: any) => Boolean(s.nombre));

        // Si es el Pack Sonrisa Luminosa y no tiene servicios desglosados en PromotionToService:
        if (isPackType && incDetails.length <= 1) {
            const titleLower = String(p.titulo || '').toLowerCase();
            if (titleLower.includes('sonrisa luminosa') || (titleLower.includes('blanqueamiento') && titleLower.includes('limpieza'))) {
                incDetails = [
                    { nombre: 'Blanqueamiento Dental Láser LED', duracion: 60, precio: 120 },
                    { nombre: 'Limpieza Dental Profiláctica con Ultrasonido', duracion: 45, precio: 35 }
                ];
            }
        }

        const inc = incDetails.map(d => d.nombre);
        const pPromo = p.precioPromo !== undefined && p.precioPromo !== null ? Number(p.precioPromo) : undefined;
        const pOriginal = (p.precioAnterior || appointmentOrBooking.precioOriginal || appointmentOrBooking.precio)
            ? Number(p.precioAnterior || appointmentOrBooking.precioOriginal || appointmentOrBooking.precio)
            : undefined;
        const ahorro = (pOriginal && pPromo !== undefined && pOriginal > pPromo) ? (pOriginal - pPromo) : undefined;
        const pct = (pOriginal && pPromo !== undefined && pOriginal > pPromo) ? Math.round(((pOriginal - pPromo) / pOriginal) * 100) : undefined;

        return {
            isPack: isPackType,
            titulo: p.titulo,
            descripcion: p.descripcion,
            tipoPromo: p.tipoPromo,
            servicios: inc.length > 0 ? inc : [appointmentOrBooking.nombre || appointmentOrBooking.service?.nombre || p.titulo].filter(Boolean),
            serviciosDetalle: incDetails.length > 0 ? incDetails : undefined,
            precioPromo: pPromo,
            precioOriginal: pOriginal,
            ahorro,
            porcentajeDescuento: pct
        };
    };

    // 3. Parsear desde PromotionToService (en appointment.service o directamente en service)
    const promos = appointmentOrBooking.PromotionToService || appointmentOrBooking.service?.PromotionToService || [];
    for (const rel of promos) {
        const p = rel.Promotion || rel;
        if (targetPromoId && p?.id !== targetPromoId) continue;
        const info = buildPromoInfo(p);
        if (info) return info;
    }

    // 4. Parsear desde promociones / promocion manual directa
    const directPromos = [
        ...(appointmentOrBooking.promociones || []),
        ...(appointmentOrBooking.promocion ? [appointmentOrBooking.promocion] : []),
        ...(appointmentOrBooking.service?.promociones || []),
        ...(appointmentOrBooking.service?.promocion ? [appointmentOrBooking.service.promocion] : [])
    ].filter(Boolean);

    for (const p of directPromos) {
        if (targetPromoId && p?.id !== targetPromoId) continue;
        const info = buildPromoInfo(p);
        if (info) return info;
    }

    return null;
}
