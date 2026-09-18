/**
 * @file gymHelper.ts
 * @module modules/gym/utils
 * @description Utilidades canónicas para la detección y gestión del vertical Gimnasio / Fitness.
 */

/**
 * Determina de forma estricta y segura si un negocio corresponde al vertical de Gimnasio / Fitness.
 */
export function isGymBusiness(negocio: any): boolean {
  if (!negocio) return false;

  let cfg: any = {};
  if (typeof negocio.configuracion === 'string') {
    try {
      cfg = JSON.parse(negocio.configuracion);
    } catch {
      cfg = {};
    }
  } else {
    cfg = negocio.configuracion || {};
  }

  const tipoUpper = (negocio.tipoNegocio || '').toUpperCase().trim();
  const cfgTipoUpper = (cfg.tipoNegocio || '').toUpperCase().trim();
  const blueprintId = (cfg.blueprintId || '').toUpperCase().trim();
  const btSlug = (negocio.BusinessType?.slug || '').toUpperCase().trim();
  const btCode = (negocio.BusinessType?.code || '').toUpperCase().trim();
  const slugUpper = (negocio.slug || '').toUpperCase().trim();
  const nameUpper = (negocio.nombre || '').toUpperCase().trim();

  // Excluir claramente otros verticales
  const isRestaurant = ['RESTAURANTE', 'GASTRONOMIA', 'RESTAURANT', 'BAR'].includes(tipoUpper) ||
    slugUpper.includes('parrilla') || slugUpper.includes('burger');
  if (isRestaurant) return false;

  const isStore = ['TIENDA', 'ECOMMERCE', 'STORE'].includes(tipoUpper);
  if (isStore) return false;

  const isDental = ['ODONTOLOGIA', 'DENTAL', 'DENTISTA'].includes(tipoUpper) || slugUpper.includes('dental');
  if (isDental) return false;

  const isShoeCare = ['SHOE_CARE', 'LAVANDERIA', 'ORDENES-SERVICIO'].includes(tipoUpper);
  if (isShoeCare) return false;

  return (
    tipoUpper === 'GIMNASIO' ||
    tipoUpper === 'GYM' ||
    tipoUpper === 'FITNESS' ||
    cfgTipoUpper === 'GIMNASIO' ||
    cfgTipoUpper === 'GYM' ||
    cfgTipoUpper === 'FITNESS' ||
    blueprintId === 'GYM' ||
    blueprintId === 'GIMNASIO' ||
    btSlug === 'gimnasio' ||
    btSlug === 'gym' ||
    btCode === 'GIMNASIO' ||
    btCode === 'GYM' ||
    slugUpper.includes('gym') ||
    slugUpper.includes('gimnasio') ||
    slugUpper.includes('fitness') ||
    slugUpper.includes('vortex') ||
    nameUpper.includes('GYM') ||
    nameUpper.includes('GIMNASIO') ||
    nameUpper.includes('FITNESS') ||
    nameUpper.includes('VORTEX')
  );
}
