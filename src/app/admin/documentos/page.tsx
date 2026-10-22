'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, FileText, ExternalLink } from 'lucide-react';
import { api } from '@/modules/dental/lib/api';
import { DOC_TYPES, docType, formatDate, isImageDoc, normalize } from '@/modules/dental/lib/format';
import { Page, PageHeader, SearchInput, FilterChips, Spinner, ErrorBox, EmptyState, Badge } from '@/modules/dental/components/admin/ui';

export default function DocumentosPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    try {
      const d = await api<{ documents: any[] }>('/api/admin/dental/documents');
      setDocs(d.documents || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    docs.forEach((d) => { c[d.tipo] = (c[d.tipo] || 0) + 1; });
    return c;
  }, [docs]);

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return docs.filter((d) => {
      if (filter !== 'ALL' && d.tipo !== filter) return false;
      if (!q) return true;
      return normalize(d.titulo || '').includes(q) || normalize(d.ClinicalRecord?.Cliente?.nombre || '').includes(q);
    });
  }, [docs, query, filter]);

  return (
    <Page>
      <PageHeader
        title="Radiografías y archivos"
        description="Todos los archivos clínicos de tus pacientes. Para subir uno nuevo, entra a la ficha del paciente → Archivos."
        icon={<FolderOpen className="h-5 w-5" />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}

      {loading ? <Spinner label="Cargando archivos…" /> : docs.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="Aún no hay archivos"
          description="Sube radiografías, fotos o consentimientos desde la ficha de cada paciente."
          action={<Link href="/admin/pacientes" className="text-sm font-semibold text-sky-600">Ir a pacientes</Link>}
        />
      ) : (
        <>
          <div className="space-y-3">
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar por paciente o nombre del archivo…" />
            <FilterChips
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'ALL', label: 'Todos', count: docs.length },
                ...DOC_TYPES.filter((d) => counts[d.id]).map((d) => ({ id: d.id, label: d.label, count: counts[d.id] })),
              ]}
            />
          </div>

          {shown.length === 0 ? (
            <EmptyState title="Ningún archivo coincide" description="Prueba con otra búsqueda o tipo." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((doc) => (
                <div key={doc.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <a href={doc.archivoUrl} target="_blank" rel="noopener noreferrer" className="block">
                    {isImageDoc(doc) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={doc.archivoUrl} alt={doc.titulo} loading="lazy" className="aspect-[4/3] w-full bg-slate-100 object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50">
                        <FileText className="h-10 w-10 text-slate-300" />
                      </div>
                    )}
                  </a>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium text-slate-900" title={doc.titulo}>{doc.titulo}</p>
                    <Link href={`/admin/pacientes/${doc.ClinicalRecord?.clienteId}?tab=archivos`} className="block truncate text-sm text-sky-700 hover:underline">
                      {doc.ClinicalRecord?.Cliente?.nombre || 'Paciente'}
                    </Link>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <Badge tone="slate">{docType(doc.tipo).label}</Badge>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        {formatDate(doc.createdAt, { year: '2-digit' })}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
