'use client';

/**
 * Piezas de interfaz compartidas por todas las pantallas del panel dental,
 * para que se vean y se comporten igual (tamaños, colores, modales, mensajes).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, X, Search, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { TONE_BADGE, type Tone } from '../../lib/format';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

// ── Layout ────────────────────────────────────────────────────────────

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6 pb-28 lg:pb-8', className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="space-y-2">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ children, className, padded = true }: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-white shadow-sm', padded && 'p-4 sm:p-5', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }: { title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Botones ───────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm disabled:bg-sky-300',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 [&>svg]:shrink-0',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', size = 'md', icon, className, children }: {
  href: string; variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition active:scale-[0.98] [&>svg]:shrink-0',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

// ── Indicadores ───────────────────────────────────────────────────────

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE_BADGE[tone], className)}>
      {children}
    </span>
  );
}

export function Avatar({ text, size = 'md', className }: { text: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700', s, className)}>
      {text}
    </span>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'sky', href }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: Tone; href?: string;
}) {
  const iconTone: Record<Tone, string> = {
    slate: 'bg-slate-100 text-slate-600', sky: 'bg-sky-50 text-sky-600', emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600', violet: 'bg-violet-50 text-violet-600',
  };
  const body = (
    <div className={cx('h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition', href && 'hover:border-sky-300 hover:shadow-md')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', iconTone[tone])}>{icon}</span>}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      {icon && <span className="mb-3 text-slate-300">{icon}</span>}
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {message}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}

// ── Formularios ───────────────────────────────────────────────────────

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50';

export function Field({ label, hint, required, children, className }: {
  label: string; hint?: React.ReactNode; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(inputClass, 'pl-9 pr-9')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Limpiar búsqueda">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Botones de filtro tipo "pastilla" (Todos / Activos / …). */
export function FilterChips<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cx(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
            value === o.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cx('rounded-full px-1.5 text-xs', value === o.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Casillas grandes y fáciles de tocar (antecedentes, alergias, hábitos). */
export function ToggleChip({ checked, onChange, label, tone = 'rose' }: { checked: boolean; onChange: (v: boolean) => void; label: string; tone?: 'rose' | 'amber' | 'sky' }) {
  const on = tone === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-900' : tone === 'sky' ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-rose-300 bg-rose-50 text-rose-900';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        'flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition',
        checked ? cx(on, 'font-medium') : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      )}
    >
      <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-current bg-current' : 'border-slate-300')}>
        {checked && <svg viewBox="0 0 12 12" className="h-3 w-3 text-white"><path d="M2.5 6.5l2.2 2.2 4.8-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      {label}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: React.ReactNode; description?: React.ReactNode;
  children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Guardar onClose en una ref: si el padre pasa una función nueva en cada render,
  // el efecto no debe re-ejecutarse (volvería a enfocar el primer campo mientras se escribe).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Enfocar el primer campo para escribir de inmediato.
    setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select');
      el?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const width = size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cx('flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl', width)}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

// ── Avisos (toast) ────────────────────────────────────────────────────

type ToastState = { id: number; kind: 'success' | 'error' | 'info'; message: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), kind, message });
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3500);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const node = toast ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[110] flex justify-center px-4 lg:bottom-6" aria-live="polite">
      <div
        key={toast.id}
        className={cx(
          'pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg',
          toast.kind === 'error' ? 'bg-rose-600' : toast.kind === 'info' ? 'bg-slate-800' : 'bg-emerald-600'
        )}
      >
        {toast.kind === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : toast.kind === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>{toast.message}</span>
      </div>
    </div>
  ) : null;
  return { show, node };
}

// ── Pestañas ──────────────────────────────────────────────────────────

export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { id: T; label: string; icon?: React.ReactNode; count?: number }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" className="flex min-w-max gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.id)}
              className={cx(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition',
                active ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={cx('rounded-full px-1.5 text-xs', active ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
