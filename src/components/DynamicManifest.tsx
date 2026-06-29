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
    const isSuperAdminPage = segments.length >= 1 && segments[0] === 'superadmin';
    const isAdminPage = segments.length >= 1 && segments[0] === 'admin';
    
    const slug = isPublicBusinessPage ? segments[0] : null;

    // Update manifest link dynamically
    const updateManifest = () => {
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      
      let manifestUrl: string;
      if (slug) {
        // Página pública de negocio: manifest dinámico con datos del negocio
        manifestUrl = `/api/pwa/manifest?slug=${slug}`;
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
