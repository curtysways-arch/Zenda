'use client';

import { use } from 'react';
import PageEditor from '@/components/admin/pages/PageEditor';

export default function EditarPaginaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PageEditor key={id} pageId={id} />;
}
