'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Folder, Search, Filter, ExternalLink, Loader2, FileText, Image as ImageIcon
} from 'lucide-react';

export default function DocumentosGlobalPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const url = tipoFilter !== 'ALL' 
        ? `/api/admin/dental/documents?tipo=${tipoFilter}` 
        : '/api/admin/dental/documents';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [tipoFilter]);

  const filtered = documents.filter(d => {
    const term = searchTerm.toLowerCase();
    const paciente = (d.ClinicalRecord?.Cliente?.nombre || '').toLowerCase();
    const titulo = (d.titulo || '').toLowerCase();
    return paciente.includes(term) || titulo.includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Folder className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Documentos & Radiografías Clínicas</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Imágenes de diagnóstico, radiografías panorámicas, periapicales y consentimientos informados.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente o nombre de archivo..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">Todos los Tipos</option>
            <option value="RADIOGRAFIA">Radiografías</option>
            <option value="FOTO_CLINICA">Fotos Clínicas</option>
            <option value="EXAMEN">Exámenes</option>
            <option value="CONSENTIMIENTO">Consentimientos</option>
            <option value="OTRO">Otros</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando documentos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Sin documentos clínicos</h3>
          <p className="text-xs text-slate-400 mt-1">
            Los archivos subidos desde las fichas de los pacientes se consolidarán en este repositorio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 uppercase">
                    {doc.tipo}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900 truncate mb-1">
                  {doc.titulo}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Paciente: <strong>{doc.ClinicalRecord?.Cliente?.nombre || 'Paciente'}</strong>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                {doc.ClinicalRecord?.clienteId && (
                  <Link
                    href={`/admin/pacientes/${doc.ClinicalRecord.clienteId}`}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    Ficha Paciente
                  </Link>
                )}
                <a
                  href={doc.archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver Archivo</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
