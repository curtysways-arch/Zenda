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
    const isPublicBusinessPage = segments.length >= 1 && !['admin', 'superadmin', 'login', 'register', 'api'].includes(segments[0]);
    
    const slug = isPublicBusinessPage ? segments[0] : null;

    // Update manifest link dynamically
    const updateManifest = () => {
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      
      const manifestUrl = slug 
        ? `/api/pwa/manifest?slug=${slug}`
        : `/manifest.json`;

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
