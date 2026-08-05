'use client';

import { useEffect } from 'react';

interface DynamicFaviconProps {
  negocio?: any;
  defaultTitle?: string;
  defaultIcon?: string;
}

export default function DynamicFavicon({ negocio, defaultTitle, defaultIcon }: DynamicFaviconProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nombre = negocio?.nombre || defaultTitle;
    const iconUrl = negocio?.logoUrl || negocio?.faviconUrl || defaultIcon || '/images/bubblewash/hero_sneakers.jpg';

    // 1. Actualizar Título de la Pestaña
    if (nombre) {
      document.title = `${nombre} | CitiOx SaaS`;
    }

    // 2. Actualizar Favicon del Navegador
    if (iconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = iconUrl;
    }
  }, [negocio, defaultTitle, defaultIcon]);

  return null;
}
