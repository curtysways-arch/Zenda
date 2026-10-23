/**
 * Ventana de retiro de un pedido (día + franja horaria), en la hora de Ecuador.
 *
 * Los pedidos nuevos guardan la fecha exacta (`retiroFecha` = 'AAAA-MM-DD', `retiroDesde`/`retiroHasta` = 'HH:MM').
 * Los pedidos anteriores solo tienen el texto `fechaHoraRetiro` ("Mañana (02:00 - 04:00 PM)"): ese "Mañana"
 * se interpreta respecto al día en que se creó el pedido, no respecto a hoy.
 * Funciones puras: se usan en el servidor y en las apps (repartidor, panel, cliente).
 */

export const ZONA = 'America/Guayaquil';
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export interface VentanaRetiro {
    fecha: string | null;   // 'AAAA-MM-DD'
    desde: string | null;   // 'HH:MM'
    hasta: string | null;   // 'HH:MM'
}

/** Fecha 'AAAA-MM-DD' de un instante, en la hora de Ecuador. */
export function ymdEnZona(d: Date = new Date()): string {
    try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch {
        const x = new Date(d.getTime() - 5 * 3600000);
        return x.toISOString().slice(0, 10);
    }
}

/** Minutos desde la medianoche de Ecuador para un instante. */
export function minutosEnZona(d: Date = new Date()): number {
    try {
        const p = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
        const [h, m] = p.split(':').map(Number);
        return ((h % 24) * 60) + (m || 0);
    } catch {
        const x = new Date(d.getTime() - 5 * 3600000);
        return x.getUTCHours() * 60 + x.getUTCMinutes();
    }
}

export function sumarDias(ymd: string, n: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const t = new Date(Date.UTC(y, (m || 1) - 1, d || 1) + n * 86400000);
    return t.toISOString().slice(0, 10);
}

/** Días entre hoy (Ecuador) y la fecha dada: 0 = hoy, 1 = mañana, -1 = ayer. */
export function diasDesdeHoy(ymd: string, ahora: Date = new Date()): number {
    const a = Date.parse(`${ymdEnZona(ahora)}T00:00:00Z`);
    const b = Date.parse(`${ymd}T00:00:00Z`);
    return Math.round((b - a) / 86400000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "09:00 - 11:00 AM", "11:00 AM - 01:00 PM", "02:00 - 04:00 PM" → { desde: '14:00', hasta: '16:00' } */
export function parseFranja(texto?: string | null): { desde: string | null; hasta: string | null } {
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM|a\.?\s?m\.?|p\.?\s?m\.?)?\s*(?:-|–|a|hasta)\s*(\d{1,2}):(\d{2})\s*(AM|PM|a\.?\s?m\.?|p\.?\s?m\.?)?/i.exec(String(texto || ''));
    if (!m) return { desde: null, hasta: null };
    const mer = (s?: string) => (s ? (/p/i.test(s) ? 'PM' : 'AM') : '');
    const m2 = mer(m[6]); const m1 = mer(m[3]) || m2;
    const to24 = (h: number, mm: number, me: string) => {
        let hh = h;
        if (me === 'PM' && hh < 12) hh += 12;
        if (me === 'AM' && hh === 12) hh = 0;
        return `${pad(hh)}:${pad(mm)}`;
    };
    return { desde: to24(+m[1], +m[2], m1), hasta: to24(+m[4], +m[5], m2) };
}

/** Interpreta la ventana de retiro guardada en el pedido. */
export function ventanaRetiro(extra: any, creadoEn?: string | Date | null): VentanaRetiro {
    const ex = extra || {};
    if (ex.retiroFecha && /^\d{4}-\d{2}-\d{2}$/.test(ex.retiroFecha)) {
        return { fecha: ex.retiroFecha, desde: ex.retiroDesde || null, hasta: ex.retiroHasta || null };
    }
    const texto = String(ex.fechaHoraRetiro || ex.fechaRetiro || '').trim();
    if (!texto) return { fecha: null, desde: null, hasta: null };
    const base = ymdEnZona(creadoEn ? new Date(creadoEn) : new Date());
    const t = texto.toLowerCase();
    let fecha: string | null = null;
    if (t.startsWith('pasado')) fecha = sumarDias(base, 2);
    else if (t.startsWith('mañana') || t.startsWith('manana')) fecha = sumarDias(base, 1);
    else if (t.startsWith('hoy')) fecha = base;
    else {
        const iso = /(\d{4}-\d{2}-\d{2})/.exec(texto);
        if (iso) fecha = iso[1];
    }
    return { fecha, ...parseFranja(texto) };
}

/** "Hoy", "Mañana", "jue 23 oct" */
export function etiquetaDia(ymd: string, ahora: Date = new Date()): string {
    const n = diasDesdeHoy(ymd, ahora);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    if (n === -1) return 'Ayer';
    const [y, m, d] = ymd.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return `${DIAS[dow]} ${d} ${MESES[m - 1]}`;
}

const hora12 = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${pad(m)}${h < 12 ? ' am' : ' pm'}`;
};

/** Texto corto para mostrar: "Mañana, 2:00 pm – 4:00 pm". */
export function textoVentana(v: VentanaRetiro, ahora: Date = new Date()): string {
    if (!v.fecha) return 'A coordinar';
    const dia = etiquetaDia(v.fecha, ahora);
    if (v.desde && v.hasta) return `${dia}, ${hora12(v.desde)} – ${hora12(v.hasta)}`;
    if (v.desde) return `${dia}, desde ${hora12(v.desde)}`;
    return dia;
}

/** Texto absoluto para guardar en el pedido: "jue 23 oct, 2:00 pm – 4:00 pm" (no envejece como "Mañana"). */
export function textoAbsoluto(v: VentanaRetiro): string {
    if (!v.fecha) return '';
    const [y, m, d] = v.fecha.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const dia = `${DIAS[dow]} ${d} ${MESES[m - 1]}`;
    if (v.desde && v.hasta) return `${dia}, ${hora12(v.desde)} – ${hora12(v.hasta)}`;
    return dia;
}

/**
 * ¿El retiro es para más adelante? (agendado: el repartidor no debe estar "en misión" todavía).
 * Es para más adelante si es otro día, o si es hoy y faltan más de `margenMin` minutos para la franja.
 */
/** Minutos antes del inicio de la franja en que el retiro agendado arranca y se avisa al repartidor. */
export const MINUTOS_ANTES_DE_INICIAR = 45;

export function esParaMasTarde(v: VentanaRetiro, ahora: Date = new Date(), margenMin = MINUTOS_ANTES_DE_INICIAR): boolean {
    if (!v.fecha) return false;
    const n = diasDesdeHoy(v.fecha, ahora);
    if (n > 0) return true;
    if (n < 0 || !v.desde) return false;
    const [h, m] = v.desde.split(':').map(Number);
    return (h * 60 + m) - minutosEnZona(ahora) > margenMin;
}

/** Calcula la ventana a partir de lo que elige el cliente al pedir (día relativo + franja). */
export function ventanaDesdeSeleccion(dia: 'HOY' | 'MANANA' | 'PASADO' | string, franjaTexto: string, ahora: Date = new Date()): VentanaRetiro {
    const offset = dia === 'MANANA' ? 1 : dia === 'PASADO' ? 2 : 0;
    return { fecha: sumarDias(ymdEnZona(ahora), offset), ...parseFranja(franjaTexto) };
}
