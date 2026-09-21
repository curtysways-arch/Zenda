import crypto from 'crypto';

export interface GymAccessConfig {
  primaryMethod: 'QR' | 'MANUAL';
  backupMethods: {
    manual: boolean;
    qr: boolean;
  };
  adminQr: {
    mode: 'DYNAMIC' | 'STATIC_PRINTABLE';
    dynamicIntervalSeconds: number; // 30, 60, 90, 120, 180
    staticToken?: string;
  };
}

export const DEFAULT_GYM_ACCESS_CONFIG: GymAccessConfig = {
  primaryMethod: 'QR',
  backupMethods: {
    manual: true,
    qr: false,
  },
  adminQr: {
    mode: 'DYNAMIC',
    dynamicIntervalSeconds: 90,
  }
};

export const ALLOWED_DYNAMIC_INTERVALS = [30, 60, 90, 120, 180];

/**
 * Parsea y sanitiza la configuración de acceso al gimnasio con valores seguros por defecto.
 */
export function getGymAccessConfig(configuracion: any): GymAccessConfig {
  let parsed: any = configuracion;
  if (typeof configuracion === 'string') {
    try {
      parsed = JSON.parse(configuracion);
    } catch {
      parsed = {};
    }
  } else if (!parsed || typeof parsed !== 'object') {
    parsed = {};
  }

  const custom = parsed.gymAccessConfig;
  if (!custom || typeof custom !== 'object') {
    return { ...DEFAULT_GYM_ACCESS_CONFIG };
  }

  const primaryMethod: 'QR' | 'MANUAL' = custom.primaryMethod === 'MANUAL' ? 'MANUAL' : 'QR';
  const backupManual = custom.backupMethods?.manual !== undefined ? Boolean(custom.backupMethods.manual) : true;
  const backupQr = custom.backupMethods?.qr !== undefined ? Boolean(custom.backupMethods.qr) : false;

  const mode: 'DYNAMIC' | 'STATIC_PRINTABLE' = custom.adminQr?.mode === 'STATIC_PRINTABLE' ? 'STATIC_PRINTABLE' : 'DYNAMIC';
  const interval = Number(custom.adminQr?.dynamicIntervalSeconds);
  const dynamicIntervalSeconds = ALLOWED_DYNAMIC_INTERVALS.includes(interval) ? interval : 90;

  return {
    primaryMethod,
    backupMethods: {
      manual: backupManual,
      qr: backupQr,
    },
    adminQr: {
      mode,
      dynamicIntervalSeconds,
      staticToken: typeof custom.adminQr?.staticToken === 'string' ? custom.adminQr.staticToken : undefined,
    }
  };
}

/**
 * Genera el token seguro para el afiche impreso / QR fijo de recepción.
 */
export function generateStaticTotemToken(businessId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'citiox_totem_secret_key_2026';
  const dataToSign = `CITIOX_STATIC:${businessId}`;
  const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex').slice(0, 16);
  return `CITIOX_TOTEM_STATIC:${businessId}:${signature}`;
}

/**
 * Valida si un token estático corresponde al negocio indicado y tiene la firma correcta.
 */
export function verifyStaticTotemToken(token: string, businessId: string): boolean {
  if (!token || !businessId) return false;
  const parts = token.split(':');
  if (parts.length !== 3 || parts[0] !== 'CITIOX_TOTEM_STATIC') return false;
  const [_, tokenBusinessId, signature] = parts;
  if (tokenBusinessId !== businessId) return false;

  const secret = process.env.NEXTAUTH_SECRET || 'citiox_totem_secret_key_2026';
  const expectedSig = crypto.createHmac('sha256', secret).update(`CITIOX_STATIC:${businessId}`).digest('hex').slice(0, 16);
  return signature === expectedSig;
}
