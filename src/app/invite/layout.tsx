import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invitación de repartidor · Citiox',
  description: 'Regístrate como repartidor del negocio que te invitó',
};

// El layout raíz ya define <html> y <body>: aquí solo envolvemos el contenido
// (antes había un <html> anidado que causaba errores de hidratación).
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</div>;
}
