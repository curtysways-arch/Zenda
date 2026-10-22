'use client';

import { useCallback, useEffect, useState } from 'react';

export type TemplateInfo = {
  key: string;
  title: string;
  description: string;
  posicion: 'top' | 'bottom';
  buttonText: string;
  buttonUrl: string;
  html: string;
  exists: boolean;
};

export type PagesContext = {
  negocio: { nombre: string; slug: string; whatsapp: string | null; isDemo: boolean };
  kind: string;
  templates: TemplateInfo[];
};

let cache: PagesContext | null = null;

/** Datos del negocio y plantillas sugeridas para el módulo de páginas. */
export function usePagesContext() {
  const [ctx, setCtx] = useState<PagesContext | null>(cache);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pages/templates', { cache: 'no-store' });
      if (!res.ok) return;
      cache = await res.json();
      setCtx(cache);
    } catch {
      /* sin plantillas: el módulo sigue funcionando */
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { ctx, reload };
}
