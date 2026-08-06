// src/app/[slug]/admin/page.tsx
// Redirección al Business Admin Runtime Central de Citiox (/admin)
// Garantiza que /[slug]/admin y /admin ejecuten el mismo entorno de administración único

import { redirect } from 'next/navigation';

export default async function SlugAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Redirigir al Business Admin central de Citiox
  redirect(`/admin`);
}
