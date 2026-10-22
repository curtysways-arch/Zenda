/**
 * Etiquetas, colores y formatos del módulo dental (seguro para cliente y servidor).
 */

// ── Fechas ────────────────────────────────────────────────────────────
// Las citas (Appointment.fecha) se guardan como la fecha local a medianoche UTC.
// Para mostrarlas hay que formatear en UTC; si no, en Ecuador (UTC-5) se ve el día anterior.

export function formatApptDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-EC', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

/** Fechas reales (createdAt, fecha de consulta): se muestran en la hora local del navegador. */
export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** YYYY-MM-DD de hoy en la hora local del navegador. */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Clave YYYY-MM-DD de una cita (guardada a medianoche UTC). */
export function apptKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

export function relativeApptDay(value: string | Date) {
  const key = apptKey(value);
  const today = todayKey();
  if (key === today) return 'Hoy';
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (key === tomorrow) return 'Mañana';
  const txt = formatApptDate(value, { weekday: 'short', day: 'numeric', month: 'short', year: undefined });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** Edad exacta (considera si ya cumplió años este año). La fecha de nacimiento se guarda a mediodía UTC. */
export function ageFrom(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const b = new Date(value);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getUTCFullYear();
  const m = now.getMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function birthInputValue(value: string | Date | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function money(value: unknown) {
  const n = Number(value) || 0;
  return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export function initials(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function whatsappLink(phone?: string | null, text?: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  const full = digits.startsWith('0') ? `593${digits.slice(1)}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ── Tratamientos ──────────────────────────────────────────────────────

export const TREATMENT_STATES = [
  { id: 'PLANIFICADO', label: 'Planificado', tone: 'slate' },
  { id: 'PENDIENTE', label: 'Pendiente', tone: 'amber' },
  { id: 'EN_PROCESO', label: 'En proceso', tone: 'violet' },
  { id: 'REALIZADO', label: 'Realizado', tone: 'emerald' },
  { id: 'CANCELADO', label: 'Cancelado', tone: 'rose' },
] as const;

export const ACTIVE_TREATMENT_STATES = ['PLANIFICADO', 'PENDIENTE', 'EN_PROCESO'];

export function treatmentState(id?: string | null) {
  return TREATMENT_STATES.find((s) => s.id === id) || TREATMENT_STATES[0];
}

export const PRIORITIES = [
  { id: 'ALTA', label: 'Alta', tone: 'rose' },
  { id: 'MEDIA', label: 'Media', tone: 'amber' },
  { id: 'BAJA', label: 'Baja', tone: 'slate' },
] as const;

export function priority(id?: string | null) {
  return PRIORITIES.find((p) => p.id === id) || PRIORITIES[1];
}

// ── Citas ─────────────────────────────────────────────────────────────

const APPT_STATES: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Por confirmar', tone: 'amber' },
  pendiente: { label: 'Por confirmar', tone: 'amber' },
  PENDIENTE: { label: 'Por confirmar', tone: 'amber' },
  confirmed: { label: 'Confirmada', tone: 'sky' },
  CONFIRMADA: { label: 'Confirmada', tone: 'sky' },
  client_checked_in: { label: 'En sala de espera', tone: 'violet' },
  in_progress: { label: 'En atención', tone: 'violet' },
  completed: { label: 'Atendida', tone: 'emerald' },
  finalizada: { label: 'Atendida', tone: 'emerald' },
  COMPLETADA: { label: 'Atendida', tone: 'emerald' },
  cancelled: { label: 'Cancelada', tone: 'rose' },
  cancelada: { label: 'Cancelada', tone: 'rose' },
  CANCELADA: { label: 'Cancelada', tone: 'rose' },
  no_show: { label: 'No asistió', tone: 'rose' },
  rejected: { label: 'Rechazada', tone: 'rose' },
  expired: { label: 'Vencida', tone: 'slate' },
};

export function apptState(estado?: string | null) {
  return APPT_STATES[estado || ''] || { label: estado || 'Sin estado', tone: 'slate' as Tone };
}

// ── Archivos ──────────────────────────────────────────────────────────

export const DOC_TYPES = [
  { id: 'RADIOGRAFIA', label: 'Radiografía' },
  { id: 'FOTO_CLINICA', label: 'Foto clínica' },
  { id: 'EXAMEN', label: 'Examen' },
  { id: 'CONSENTIMIENTO', label: 'Consentimiento' },
  { id: 'RECETA', label: 'Receta' },
  { id: 'OTRO', label: 'Otro' },
] as const;

export function docType(id?: string | null) {
  return DOC_TYPES.find((d) => d.id === id) || DOC_TYPES[DOC_TYPES.length - 1];
}

export function isImageDoc(doc: { mimeType?: string | null; archivoUrl?: string | null }) {
  if (doc.mimeType) return doc.mimeType.startsWith('image/') && !/heic|heif/.test(doc.mimeType);
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(doc.archivoUrl || '');
}

export function fileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Historia clínica ─────────────────────────────────────────────────

export const MEDICAL_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'hipertension', label: 'Hipertensión' },
  { id: 'cardiopatia', label: 'Cardiopatía' },
  { id: 'coagulacion', label: 'Problemas de coagulación' },
  { id: 'asma', label: 'Asma' },
  { id: 'hepatitis', label: 'Hepatitis' },
  { id: 'vih', label: 'VIH' },
  { id: 'tuberculosis', label: 'Tuberculosis' },
  { id: 'epilepsia', label: 'Epilepsia' },
  { id: 'embarazo', label: 'Embarazo' },
  { id: 'tiroides', label: 'Tiroides' },
  { id: 'renal', label: 'Enfermedad renal' },
] as const;

export const ALLERGIES = [
  { id: 'medicamentos', label: 'Medicamentos' },
  { id: 'penicilina', label: 'Penicilina' },
  { id: 'anestesia', label: 'Anestesia local' },
  { id: 'latex', label: 'Látex' },
  { id: 'aines', label: 'Antiinflamatorios (AINE)' },
  { id: 'alimentos', label: 'Alimentos' },
] as const;

export const HABITS = [
  { id: 'tabaco', label: 'Fuma' },
  { id: 'alcohol', label: 'Consume alcohol' },
  { id: 'bruxismo', label: 'Bruxismo (aprieta o rechina)' },
  { id: 'onicofagia', label: 'Se muerde las uñas' },
  { id: 'respiradorBucal', label: 'Respira por la boca' },
] as const;

/** Banderas activas legibles (ej. ["Diabetes", "Hipertensión"]). */
export function activeFlags(obj: Record<string, unknown> | null | undefined, catalog: readonly { id: string; label: string }[]) {
  if (!obj) return [] as string[];
  return catalog.filter((c) => obj[c.id] === true).map((c) => c.label);
}

// ── Tonos de color ───────────────────────────────────────────────────

export type Tone = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';

export const TONE_BADGE: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};
