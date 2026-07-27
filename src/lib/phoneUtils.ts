/**
 * Normaliza cualquier número de teléfono ecuatoriano al formato internacional estándar +593XXXXXXXXX
 * Ejemplos:
 * "0959997521"   -> "+593959997521"
 * "959997521"    -> "+593959997521"
 * "+593959997521"-> "+593959997521"
 * "593959997521" -> "+593959997521"
 */
export function formatToEcuadorPhone(phone: string): string {
    if (!phone) return '';
    let clean = phone.trim().replace(/\D/g, '');
    if (clean.startsWith('593')) {
        clean = clean.slice(3);
    }
    if (clean.startsWith('0')) {
        clean = clean.slice(1);
    }
    return `+593${clean}`;
}

/**
 * Devuelve todas las condiciones OR para buscar en Prisma de manera ultra flexible
 */
export function getPhoneSearchConditions(phone: string) {
    const raw = phone.trim();
    const formatted = formatToEcuadorPhone(phone);
    const cleanDigits = phone.replace(/\D/g, '');
    const last9 = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;
    const last7 = cleanDigits.length >= 7 ? cleanDigits.slice(-7) : cleanDigits;

    return [
        { telefonoCliente: { contains: formatted } },
        { telefonoCliente: { contains: `+593${last9}` } },
        { telefonoCliente: { contains: `0${last9}` } },
        { telefonoCliente: { contains: raw } },
        { telefonoCliente: { contains: cleanDigits } },
        { telefonoCliente: { contains: last9 } },
        { telefonoCliente: { contains: last7 } }
    ];
}
