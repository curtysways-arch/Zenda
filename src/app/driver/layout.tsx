import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Citiox Driver · Portal del Repartidor',
  description: 'Tus rutas y misiones del día',
  manifest: '/manifest-driver.json',
  icons: {
    icon: '/icons/driver-icon-192x192.png',
    shortcut: '/icons/driver-icon-192x192.png',
    apple: '/icons/driver-icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Citiox Driver',
  },
};

// El layout raíz ya define <html> y <body>; un segundo <html> anidado causaba errores de hidratación.
export default function DriverPortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-slate-950 text-white min-h-screen font-sans antialiased">{children}</div>;
}
