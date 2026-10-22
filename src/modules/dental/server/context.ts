/**
 * Contexto de seguridad compartido por todas las APIs del módulo dental.
 *
 * - Usa la sesión efectiva del panel (incluye el acceso delegado del superadmin).
 * - Rechaza sesiones sin negocio, accesos delegados vencidos y cuentas de clientes.
 * - Resuelve la zona horaria del negocio para calcular "hoy" correctamente
 *   (las citas se guardan con la fecha local a medianoche UTC).
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';

const CUSTOMER_ROLES = new Set(['CLIENTE', 'CLIENT', 'CUSTOMER', 'USUARIO_FINAL']);
const DEFAULT_TIME_ZONE = 'America/Guayaquil';

export type DentalContext = {
  negocioId: string;
  userName: string;
  userEmail: string | null;
  staffId: string | null;
  timeZone: string;
};

/**
 * Resultado de getDentalContext. Uso:
 *   const access = await getDentalContext();
 *   if (!access.ok) return access.response;
 * (Tipo plano en vez de unión discriminada porque el proyecto compila con strict: false.)
 */
export type DentalContextResult = { ok: boolean; ctx: DentalContext; response: NextResponse };

function deny(message: string, status: number): DentalContextResult {
  return { ok: false, ctx: null as unknown as DentalContext, response: jsonError(message, status) };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function readTimeZone(configuracion: unknown): string {
  try {
    const cfg = typeof configuracion === 'string' ? JSON.parse(configuracion) : (configuracion as any);
    const tz = cfg?.timeZone || cfg?.timezone;
    if (tz && typeof tz === 'string') {
      // Validar que la zona exista; si no, Intl lanza RangeError.
      new Intl.DateTimeFormat('en-CA', { timeZone: tz });
      return tz;
    }
  } catch {
    /* zona inválida o configuración corrupta: usar la predeterminada */
  }
  return DEFAULT_TIME_ZONE;
}

export async function getDentalContext(opts: { withStaff?: boolean } = {}): Promise<DentalContextResult> {
  const session = await getEffectiveAdminSession();
  const user = session?.user as any;

  if (!user || user.isDelegatedExpired) {
    return deny('Tu sesión terminó. Vuelve a iniciar sesión.', 401);
  }

  const role = String(user.role || '').toUpperCase();
  if (CUSTOMER_ROLES.has(role)) {
    return deny('No tienes acceso al panel clínico.', 403);
  }

  let negocioId: string | null = user.negocioId || null;
  if (!negocioId && user.email && !user.isAdminUser) {
    const u = await prisma.usuario.findUnique({ where: { email: user.email }, select: { negocioId: true } });
    negocioId = u?.negocioId || null;
  }
  if (!negocioId) {
    return deny('Tu cuenta no está asociada a una clínica.', 403);
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: negocioId },
    select: { id: true, configuracion: true },
  });
  if (!negocio) {
    return deny('Clínica no encontrada.', 404);
  }

  let staffId: string | null = null;
  let userName: string = user.name || user.email || 'Profesional';
  if (opts.withStaff && user.email && !user.isDelegated) {
    const st = await prisma.staff.findFirst({
      where: { businessId: negocioId, Usuario: { email: user.email } },
      select: { id: true, name: true },
    });
    if (st) {
      staffId = st.id;
      userName = st.name;
    }
  }

  return {
    ok: true,
    response: null as unknown as NextResponse,
    ctx: {
      negocioId,
      userName,
      userEmail: user.email || null,
      staffId,
      timeZone: readTimeZone(negocio.configuracion),
    },
  };
}

/** Fecha local del negocio en formato YYYY-MM-DD. */
export function localDateKey(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Hora local del negocio en formato HH:mm. */
export function localTimeKey(timeZone: string, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Convierte "YYYY-MM-DD" en el rango UTC con el que se guardan las citas de ese día. */
export function dayRangeUTC(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
    end: new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)),
  };
}

export function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Estados de cita que ya no ocupan la agenda. */
export const INACTIVE_APPOINTMENT_STATES = [
  'cancelled', 'cancelada', 'CANCELADA',
  'rejected', 'RECHAZADA',
  'expired', 'EXPIRADA',
  'no_show',
];

/** Verifica que un registro clínico pertenezca a la clínica. */
export async function findOwnedRecord(negocioId: string, clinicalRecordId: unknown) {
  if (typeof clinicalRecordId !== 'string' || !clinicalRecordId) return null;
  const record = await prisma.clinicalRecord.findUnique({
    where: { id: clinicalRecordId },
    select: { id: true, negocioId: true, clienteId: true },
  });
  return record && record.negocioId === negocioId ? record : null;
}

/** Devuelve el staffId si es válido para la clínica, null si viene vacío y false si no pertenece. */
export async function validateStaffId(negocioId: string, staffId: unknown): Promise<string | null | false> {
  if (!staffId) return null;
  if (typeof staffId !== 'string') return false;
  const st = await prisma.staff.findUnique({ where: { id: staffId }, select: { businessId: true } });
  return st && st.businessId === negocioId ? staffId : false;
}

export async function validateServiceId(negocioId: string, serviceId: unknown): Promise<string | null | false> {
  if (!serviceId) return null;
  if (typeof serviceId !== 'string') return false;
  const sv = await prisma.service.findUnique({ where: { id: serviceId }, select: { negocioId: true } });
  return sv && sv.negocioId === negocioId ? serviceId : false;
}

export async function validateAppointmentId(negocioId: string, appointmentId: unknown): Promise<string | null | false> {
  if (!appointmentId) return null;
  if (typeof appointmentId !== 'string') return false;
  const ap = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { negocioId: true } });
  return ap && ap.negocioId === negocioId ? appointmentId : false;
}

export function cleanText(value: unknown, max = 2000): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

/**
 * Resuelve la historia clínica a partir de clinicalRecordId o de clienteId
 * (en ese caso la crea si el paciente aún no tiene). Devuelve null si no pertenece a la clínica.
 */
export async function resolveRecord(negocioId: string, body: { clinicalRecordId?: unknown; clienteId?: unknown }) {
  if (body.clinicalRecordId) {
    return findOwnedRecord(negocioId, body.clinicalRecordId);
  }
  if (typeof body.clienteId === 'string' && body.clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: body.clienteId }, select: { negocioId: true } });
    if (!cliente || cliente.negocioId !== negocioId) return null;
    const rec = await ensureClinicalRecord(negocioId, body.clienteId);
    return { id: rec.id, negocioId: rec.negocioId, clienteId: rec.clienteId };
  }
  return null;
}

/** Crea (si no existe) la historia clínica del paciente y la devuelve. */
export async function ensureClinicalRecord(negocioId: string, clienteId: string) {
  const existing = await prisma.clinicalRecord.findUnique({
    where: { negocioId_clienteId: { negocioId, clienteId } },
  });
  if (existing) return existing;
  const count = await prisma.clinicalRecord.count({ where: { negocioId } });
  try {
    return await prisma.clinicalRecord.create({
      data: {
        negocioId,
        clienteId,
        numeroHistoria: `HC-${String(count + 1).padStart(5, '0')}`,
        antecedentesMedicos: {},
        alergias: {},
        habitos: {},
      },
    });
  } catch (err) {
    // Otra petición la creó al mismo tiempo: devolver la existente.
    const again = await prisma.clinicalRecord.findUnique({
      where: { negocioId_clienteId: { negocioId, clienteId } },
    });
    if (again) return again;
    throw err;
  }
}
