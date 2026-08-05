import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invitación de Repartidor · Citiox',
  description: 'Completa tu expediente para ser repartidor oficial',
};

export default function InviteLayout({
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
