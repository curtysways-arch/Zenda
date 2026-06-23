'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPWAInstall } from '@/lib/pwa-install';

export default function DynamicManifest() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize PWA installation listeners
    initPWAInstall();

    // Extract slug from pathname (assuming /[slug])
    const segments = pathname.split('/').filter(Boolean);
    const adminRoutes = ['admin', 'superadmin', 'login', 'register', 'olvide-password', 'api', 'checkin', 'reserva', 'profesor'];
    const isPublicBusinessPage = segments.length >= 1 && !adminRoutes.includes(segments[0]);
    const isAdminPage = segments.length >= 1 && ['admin', 'superadmin'].includes(segments[0]);
    
    const slug = isPublicBusinessPage ? segments[0] : null;

    // Update manifest link dynamically
    const updateManifest = () => {
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      
      let manifestUrl: string;
      if (slug) {
        // Página pública de negocio: manifest dinámico con datos del negocio
        manifestUrl = `/api/pwa/manifest?slug=${slug}`;
      } else if (isAdminPage) {
        // Panel de administración: manifest CitiOx Admin (id separado = app separada)
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
