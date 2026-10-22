/**
 * Qué lava el negocio: zapatos, ropa o ambos. Cambia los textos que ven el cliente,
 * el repartidor y el local. Se guarda en la configuración del negocio (tipoArticulo).
 * Por defecto: SHOE_CARE → zapatos; cualquier otra lavandería → zapatos y prendas.
 */
export type TipoArticulo = 'ZAPATOS' | 'ROPA' | 'AMBOS';

function parseCfg(raw: any) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

export function tipoArticuloOf(negocio: any): TipoArticulo {
  const cfg = parseCfg(negocio?.configuracion);
  const t = String(cfg?.tipoArticulo || '').toUpperCase();
  if (t === 'ZAPATOS' || t === 'ROPA' || t === 'AMBOS') return t;
  return String(negocio?.tipoNegocio || '').toUpperCase() === 'SHOE_CARE' ? 'ZAPATOS' : 'AMBOS';
}

export type LaundryWords = {
  /** "zapatos" · "prendas" · "zapatos o prendas" */
  cosas: string;
  /** "tus zapatos" · "tus prendas" · "tus zapatos o prendas" */
  tusCosas: string;
  /** "los zapatos" · "las prendas" · "los artículos" */
  lasCosas: string;
  heroTitle: string;
  heroSub: string;
};

export function laundryWords(t: TipoArticulo): LaundryWords {
  if (t === 'ZAPATOS') {
    return {
      cosas: 'zapatos',
      tusCosas: 'tus zapatos',
      lasCosas: 'los zapatos',
      heroTitle: 'Tus zapatos como nuevos, sin salir de casa.',
      heroSub: 'Pasamos a retirarlos, los lavamos con cuidado y te los devolvemos. Sigue cada paso desde tu celular.',
    };
  }
  if (t === 'ROPA') {
    return {
      cosas: 'prendas',
      tusCosas: 'tus prendas',
      lasCosas: 'las prendas',
      heroTitle: 'Tu ropa limpia, sin salir de casa.',
      heroSub: 'Pasamos a retirarla, la lavamos con cuidado y te la devolvemos. Sigue cada paso desde tu celular.',
    };
  }
  return {
    cosas: 'zapatos o prendas',
    tusCosas: 'tus zapatos o prendas',
    lasCosas: 'los artículos',
    heroTitle: 'Tus zapatos y tu ropa como nuevos, sin salir de casa.',
    heroSub: 'Pasamos a retirarlos, los lavamos con cuidado y te los devolvemos. Sigue cada paso desde tu celular.',
  };
}

export const wordsFor = (negocio: any) => laundryWords(tipoArticuloOf(negocio));
