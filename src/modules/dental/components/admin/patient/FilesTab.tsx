'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, ExternalLink, FolderOpen, Loader2, Download } from 'lucide-react';
import { useConfirm } from '@/components/admin/ConfirmContext';
import { api, uploadClinicalFile } from '../../../lib/api';
import { DOC_TYPES, docType, fileSize, formatDate, isImageDoc } from '../../../lib/format';
import { Button, Card, EmptyState, Badge, FilterChips, inputClass, cx } from '../ui';

export default function FilesTab({
  clienteId,
  documents,
  onChanged,
  onError,
}: {
  clienteId: string;
  documents: any[];
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { confirm } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState('RADIOGRAFIA');
  const [titulo, setTitulo] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [preview, setPreview] = useState<any | null>(null);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    let ok = 0;
    for (const file of list) {
      setUploading(`Subiendo ${file.name}…`);
      try {
        const up = await uploadClinicalFile(file);
        await api('/api/admin/dental/documents', {
          method: 'POST',
          json: {
            clienteId,
            tipo,
            titulo: (list.length === 1 && titulo.trim()) || file.name.replace(/\.[^.]+$/, ''),
            archivoUrl: up.url,
            mimeType: up.mimeType,
            tamanoBytes: up.size,
          },
        });
        ok++;
      } catch (e: any) {
        onError(`${file.name}: ${e.message}`);
      }
    }
    setUploading(null);
    setTitulo('');
    if (inputRef.current) inputRef.current.value = '';
    if (ok) onChanged(ok === 1 ? 'Archivo guardado.' : `${ok} archivos guardados.`);
  };

  const remove = async (doc: any) => {
    const res = await confirm(`¿Quitar "${doc.titulo}" de la ficha del paciente?`, { title: 'Eliminar archivo', confirmText: 'Eliminar', type: 'danger' });
    if (!(res === true || (typeof res === 'object' && res.confirmed))) return;
    try {
      await api(`/api/admin/dental/documents?id=${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      setPreview(null);
      onChanged('Archivo eliminado.');
    } catch (e: any) {
      onError(e.message);
    }
  };

  const counts: Record<string, number> = {};
  documents.forEach((d) => { counts[d.tipo] = (counts[d.tipo] || 0) + 1; });
  const shown = filter === 'ALL' ? documents : documents.filter((d) => d.tipo === filter);

  return (
    <div className="space-y-4">
      {/* Zona de carga */}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tipo de archivo</span>
            <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {DOC_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Nombre <span className="font-normal text-slate-400">(opcional)</span></span>
            <input className={inputClass} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Panorámica inicial" />
          </label>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading) upload(e.dataTransfer.files); }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cx(
            'mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition',
            dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
              <p className="text-sm text-slate-600">{uploading}</p>
            </>
          ) : (
            <>
              <Upload className="h-7 w-7 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Toca para elegir o arrastra aquí los archivos</p>
              <p className="text-xs text-slate-500">Fotos, radiografías (JPG, PNG, HEIC) o PDF · hasta 20 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.pdf,.heic,.heif"
            className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">Los archivos son privados: solo los ve el personal de la clínica.</p>
      </Card>

      {documents.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-12 w-12" />} title="Sin archivos" description="Sube radiografías, fotos clínicas o consentimientos firmados." />
      ) : (
        <>
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'ALL', label: 'Todos', count: documents.length },
              ...DOC_TYPES.filter((d) => counts[d.id]).map((d) => ({ id: d.id, label: d.label, count: counts[d.id] })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((doc) => (
              <div key={doc.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button type="button" onClick={() => (isImageDoc(doc) ? setPreview(doc) : window.open(doc.archivoUrl, '_blank', 'noopener'))} className="block w-full">
                  {isImageDoc(doc) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doc.archivoUrl} alt={doc.titulo} loading="lazy" className="aspect-[4/3] w-full bg-slate-100 object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50">
                      <FileText className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                </button>
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-medium text-slate-900" title={doc.titulo}>{doc.titulo}</p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="slate">{docType(doc.tipo).label}</Badge>
                    <span className="text-xs text-slate-400">{formatDate(doc.createdAt, { year: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">{fileSize(doc.tamanoBytes)}</span>
                    <div className="flex gap-1">
                      <a href={doc.archivoUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Abrir">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button type="button" onClick={() => remove(doc)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Visor de imágenes */}
      {preview && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/90" onClick={() => setPreview(null)}>
          <div className="flex items-center justify-between gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="truncate font-medium">{preview.titulo}</p>
              <p className="text-xs text-white/60">{docType(preview.tipo).label} · {formatDate(preview.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              <a href={`${preview.archivoUrl}${preview.archivoUrl.includes('?') ? '&' : '?'}download=1`} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Descargar">
                <Download className="h-5 w-5" />
              </a>
              <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>Cerrar</Button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.archivoUrl} alt={preview.titulo} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}
