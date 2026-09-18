/**
 * @file dentalHelper.ts
 * @module modules/dental/utils
 * @description Utilidades canónicas y tipadas para la detección y gestión del vertical Odontología / Salud Dental.
 */

export interface DentalSurfaceState {
  vestibular?: string; // e.g. 'CARIES' | 'OBTURADO' | 'SANO'
  lingual?: string;
  mesial?: string;
  distal?: string;
  oclusal?: string;
}

export interface ToothData {
  diente: string; // FDI code e.g. "18", "11", "55"
  estadoGeneral?: string; // 'SANO' | 'CARIES' | 'OBTURADO' | 'CORONA' | 'ENDODONCIA' | 'AUSENTE' | 'EXTRACCION_INDICADA' | 'PROTESIS' | 'IMPLANTE' | 'SELLANTE'
  superficies?: DentalSurfaceState;
  notas?: string;
}

export const DENTAL_CONDITIONS = [
  { id: 'SANO', label: 'Sano / Normal', color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'CARIES', label: 'Caries (Patología actual)', color: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'OBTURADO', label: 'Obturado / Restaurado previo', color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'CORONA', label: 'Corona protésica', color: '#3b82f6', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'ENDODONCIA', label: 'Endodoncia / Tratamiento conducto', color: '#8b5cf6', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'AUSENTE', label: 'Diente ausente / Perdido', color: '#64748b', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'EXTRACCION_INDICADA', label: 'Extracción indicada', color: '#dc2626', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'PROTESIS', label: 'Prótesis fija / removible', color: '#06b6d4', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'IMPLANTE', label: 'Implante dental', color: '#059669', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'SELLANTE', label: 'Sellante de fosas y fisuras', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
] as const;

// Piezas permanentes nomenclatura FDI
export const PERMANENT_TEETH_QUADRANTS = {
  Q1: ['18', '17', '16', '15', '14', '13', '12', '11'], // Superior Derecho
  Q2: ['21', '22', '23', '24', '25', '26', '27', '28'], // Superior Izquierdo
  Q4: ['48', '47', '46', '45', '44', '43', '42', '41'], // Inferior Derecho
  Q3: ['31', '32', '33', '34', '35', '36', '37', '38'], // Inferior Izquierdo
};

// Piezas temporales / infantiles nomenclatura FDI
export const DECIDUOUS_TEETH_QUADRANTS = {
  Q5: ['55', '54', '53', '52', '51'], // Superior Derecho Temporal
  Q6: ['61', '62', '63', '64', '65'], // Superior Izquierdo Temporal
  Q8: ['85', '84', '83', '82', '81'], // Inferior Derecho Temporal
  Q7: ['71', '72', '73', '74', '75'], // Inferior Izquierdo Temporal
};

/**
 * Determina de forma estricta y segura si un negocio corresponde a Odontología / Clínica Dental.
 */
export function isDentalBusiness(negocio: any): boolean {
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

  const tipoUpper = (negocio.tipoNegocio || '').toUpperCase();
  const cfgTipoUpper = (cfg.tipoNegocio || '').toUpperCase();
  const blueprintId = (cfg.blueprintId || '').toUpperCase();
  const btSlug = (negocio.BusinessType?.slug || '').toUpperCase();
  const btCode = (negocio.BusinessType?.code || '').toUpperCase();
  const slugUpper = (negocio.slug || '').toUpperCase();
  const nameUpper = (negocio.nombre || '').toUpperCase();
  const profileName = (negocio.BusinessProfile?.name || negocio.businessProfile?.name || '').toUpperCase();

  // Si es restaurante, tienda, lavandería o canchas deportivo, NUNCA es dental
  const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA' || tipoUpper === 'RESTAURANT' ||
    cfgTipoUpper === 'RESTAURANTE' || cfgTipoUpper === 'GASTRONOMIA' || blueprintId === 'RESTAURANT' ||
    slugUpper.includes('parrilla') || slugUpper.includes('burger') || slugUpper.includes('pizza');
  if (isRestaurant) return false;

  const isStore = tipoUpper === 'TIENDA' || tipoUpper === 'ECOMMERCE' || tipoUpper === 'STORE' ||
    cfgTipoUpper === 'TIENDA' || blueprintId === 'STORE';
  if (isStore) return false;

  const isShoeCare = tipoUpper === 'SHOE_CARE' || tipoUpper === 'LAVANDERIA' || tipoUpper === 'ORDENES-SERVICIO' ||
    cfgTipoUpper === 'SHOE_CARE' || blueprintId === 'LAUNDRY';
  if (isShoeCare) return false;

  const isCourts = tipoUpper === 'SPORTS_COURTS' || tipoUpper === 'CANCHAS' ||
    cfgTipoUpper === 'SPORTS_COURTS' || blueprintId === 'SPORTS_COURTS';
  if (isCourts) return false;

  // Comprobar indicadores positivos de Odontología / Clínica Dental / Dentista
  return (
    tipoUpper === 'ODONTOLOGIA' ||
    tipoUpper === 'DENTAL' ||
    tipoUpper === 'DENTISTA' ||
    tipoUpper === 'CLINICA_DENTAL' ||
    cfgTipoUpper === 'ODONTOLOGÍA' ||
    cfgTipoUpper === 'ODONTOLOGIA' ||
    cfgTipoUpper === 'DENTAL' ||
    cfgTipoUpper === 'DENTISTA' ||
    blueprintId === 'DENTAL' ||
    blueprintId === 'DENTISTA' ||
    blueprintId === 'CLINIC' ||
    btSlug === 'odontologia' ||
    btSlug === 'dental' ||
    btSlug === 'dentista' ||
    btCode === 'DENTAL' ||
    btCode === 'DENTISTA' ||
    profileName.includes('ODONTOLOG') ||
    profileName.includes('DENTAL') ||
    profileName.includes('DENTISTA') ||
    slugUpper.includes('dental') ||
    slugUpper.includes('odontolog') ||
    slugUpper.includes('dentista') ||
    nameUpper.includes('DENTAL') ||
    nameUpper.includes('ODONTOLOG') ||
    nameUpper.includes('DENTISTA') ||
    nameUpper.includes('CLÍNICA DENTAL') ||
    nameUpper.includes('CLINICA DENTAL')
  );
}

/**
 * Devuelve el color clínico representativo de una condición para el odontograma.
 */
export function getConditionColor(conditionId?: string): string {
  switch (conditionId) {
    case 'CARIES':
      return '#ef4444'; // Rojo: patología activa
    case 'EXTRACCION_INDICADA':
      return '#dc2626'; // Rojo oscuro
    case 'OBTURADO':
      return '#2563eb'; // Azul: tratamiento restaurador previo
    case 'CORONA':
      return '#3b82f6'; // Azul medio
    case 'ENDODONCIA':
      return '#8b5cf6'; // Púrpura
    case 'AUSENTE':
      return '#94a3b8'; // Gris
    case 'IMPLANTE':
      return '#059669'; // Verde
    case 'SELLANTE':
      return '#f59e0b'; // Ámbar
    case 'PROTESIS':
      return '#06b6d4'; // Cian
    default:
      return '#ffffff'; // Sano / neutro
  }
}
