'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Plus, Phone, Calendar, FileText, Activity, 
  ChevronRight, Loader2, Smile, AlertCircle, Sparkles, Filter, X
} from 'lucide-react';

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFechaNac, setNewFechaNac] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clientes');
      if (res.ok) {
        const data = await res.json();
        setPacientes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  const handleCreatePaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newTelefono) {
      setErrorMsg('Nombre y teléfono son obligatorios');
      return;
    }
    setCreating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newNombre,
          telefono: newTelefono,
          email: newEmail || undefined,
          fechaNacimiento: newFechaNac || undefined
        })
      });
      if (res.ok) {
        setIsNewModalOpen(false);
        setNewNombre('');
        setNewTelefono('');
        setNewEmail('');
        setNewFechaNac('');
        await fetchPacientes();
      } else {
        const d = await res.json();
        setErrorMsg(d.error || 'Error creando paciente');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const filtered = pacientes.filter(p => {
    const term = searchTerm.toLowerCase();
    const nom = (p.nombre || '').toLowerCase();
    const tel = (p.telefono || '');
    const em = (p.email || '').toLowerCase();
    return nom.includes(term) || tel.includes(term) || em.includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Gestión de Pacientes</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fichas clínicas, historias odontológicas, odontogramas y planes de tratamiento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Paciente</span>
        </button>
      </div>

      {/* ─── BARRA DE BÚSQUEDA Y FILTRO ─────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">
          Total: {filtered.length} paciente{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* ─── LISTADO DE PACIENTES ───────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando pacientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <Smile className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No se encontraron pacientes</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Comienza registrando tu primer paciente para abrir su historia clínica.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((paciente) => (
            <div
              key={paciente.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 font-black text-base flex items-center justify-center shrink-0">
                      {paciente.nombre?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {paciente.nombre}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {paciente.telefono || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {paciente.email && (
                    <p className="truncate text-slate-500">
                      ✉ {paciente.email}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100">
                      {paciente.totalCitas || paciente._count?.Appointment || 0} citas
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600">Ficha activa</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <Link
                  href={`/admin/pacientes/${paciente.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 active:scale-98 transition-all"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>Abrir Ficha Odontológica</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL NUEVO PACIENTE ───────────────────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900">Nuevo Paciente</h3>
                <p className="text-xs text-slate-400">Registrar paciente para atención clínica</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePaciente} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej: Carlos Mendoza"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  placeholder="Ej: +51 999 888 777"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="paciente@correo.com"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fecha de Nacimiento (Opcional)
                </label>
                <input
                  type="date"
                  value={newFechaNac}
                  onChange={(e) => setNewFechaNac(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                >
                  {creating ? 'Registrando...' : 'Crear Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
