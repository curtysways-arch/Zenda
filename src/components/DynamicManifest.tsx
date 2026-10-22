'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPWAInstall, getPwaContext } from '@/lib/pwa-install';

export default function DynamicManifest() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize PWA installation listeners
    initPWAInstall();

    const ctx = getPwaContext(pathname);
    const slug = ctx.kind === 'business' ? ctx.slug : null;
    const isDriverPage = ctx.kind === 'driver';
    const isSuperAdminPage = ctx.kind === 'superadmin';
    const isAdminPage = ctx.kind === 'admin';

    // Update manifest link dynamically
    const updateManifest = () => {
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      
      let manifestUrl: string;
      if (slug) {
        // Página pública de negocio: manifest dinámico con datos del negocio
        manifestUrl = `/api/pwa/manifest?slug=${slug}`;
      } else if (isDriverPage) {
        // App de Repartidores: manifest exclusivo Citiox Driver con scope /driver
        manifestUrl = `/manifest-driver.json`;
      } else if (isSuperAdminPage) {
        // Panel de SuperAdmin: manifest exclusivo con scope /superadmin
        manifestUrl = `/manifest-superadmin.json`;
      } else if (isAdminPage) {
        // Panel de administración: manifest CitiOx Admin con scope /admin
        manifestUrl = `/manifest.json`;
      } else {
        // Página de inicio u otras: manifest admin por defecto
        manifestUrl = `/manifest.json`;
      }

      if (manifestLink) {
        manifestLink.href = manifestUrl;
      } else {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestUrl;
        document.head.appendChild(manifestLink);
      }
    };

    updateManifest();
  }, [pathname]);

  return null;
}
