import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal del Repartidor · Citiox',
  description: 'Tus rutas y misiones del día',
};

export default function DriverPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-white min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
