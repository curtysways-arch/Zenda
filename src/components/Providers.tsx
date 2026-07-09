'use client';

import { SessionProvider } from 'next-auth/react';
import PushNotificationManager from './PushNotificationManager';
import PWAInstallPrompt from './ui/PWAInstallPrompt';
import DynamicManifest from './DynamicManifest';
import GlobalAnnouncements from './GlobalAnnouncements';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <GlobalAnnouncements />
            {children}
            <PushNotificationManager />
            <DynamicManifest />
            <PWAInstallPrompt />
        </SessionProvider>
    );
}
