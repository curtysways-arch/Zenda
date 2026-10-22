/**
 * Sesión del CLIENTE en la página pública (cookie customer_token).
 *
 * Regla de seguridad: reservar con un número NO da acceso a las reservas de ese número.
 * Antes, quien reservaba con el teléfono de otra persona quedaba con la sesión de esa persona
 * (veía y podía cancelar sus reservas). Ahora la sesión solo se crea al verificar el código que
 * llega por WhatsApp (enlace "Ver tus reservas" o inicio de sesión con código), y reservar solo
 * la RENUEVA si el navegador ya tenía la sesión de ese mismo número.
 */
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default_otp_secret_key_change_me');

/** Últimos 9 dígitos: 0991234567, 991234567 y +593991234567 son el mismo número. */
export const phoneKey = (p?: string | null) => String(p || '').replace(/\D/g, '').slice(-9);

export async function currentCustomerPhone(req: Request): Promise<string | null> {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)customer_token=([^;]+)/);
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(decodeURIComponent(m[1]), secret());
    return payload?.telefono ? String(payload.telefono) : null;
  } catch {
    return null;
  }
}

/** ¿El navegador ya tiene sesión verificada del mismo número con el que reserva? */
export async function hasSessionFor(req: Request, telefono: string): Promise<boolean> {
  const current = await currentCustomerPhone(req);
  return Boolean(current && phoneKey(current) && phoneKey(current) === phoneKey(telefono));
}
