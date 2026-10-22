'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, Phone, Mail, MapPin, Search, CreditCard, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function AdminProveedoresPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [taxId, setTaxId] = useState('');
  const [name, setName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('CONTADO');
  const [creditDays, setCreditDays] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/proveedores?includeInactive=${includeInactive}`);
      if (res.ok) {
        const d = await res.json();
        setSuppliers(d.suppliers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [includeInactive]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxId.trim() || !name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxId,
          name,
          commercialName,
          contactPerson,
          email,
          phone,
          address,
          paymentTerms,
          creditDays: Number(creditDays) || 0,
          notes
        })
      });
      if (res.ok) {
        setTaxId('');
        setName('');
        setCommercialName('');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setAddress('');
        setPaymentTerms('CONTADO');
        setCreditDays(0);
        setNotes('');
        setShowModal(false);
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar proveedor');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: any) => {
    const nextStatus = !supplier.active;
    const confirmMsg = nextStatus
      ? `¿Deseas reactivar al proveedor "${supplier.name}"?`
      : `¿Deseas desactivar al proveedor "${supplier.name}"? (No se borrarán sus compras ni historial)`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/proveedores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: supplier.id, active: nextStatus })
      });
      if (res.ok) {
        fetchSuppliers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar estado del proveedor');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.taxId.includes(search) ||
    (s.commercialName && s.commercialName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-400" /> Directorio de Proveedores
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestión comercial, condiciones de crédito y trazabilidad de proveedores de materias primas e insumos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={e => setIncludeInactive(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
            />
            Ver inactivos
          </label>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            <Plus className="h-4 w-4" /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por RUC/Cédula, Razón Social o Nombre Comercial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Lista / Grid de Proveedores */}
      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const pendingPayables = s.accountsPayable || [];
            const totalPendingDebt = pendingPayables.reduce((acc: number, p: any) => acc + (p.balance || 0), 0);

            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-5 transition ${
                  s.active
                    ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    : 'border-rose-900/40 bg-rose-950/10 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{s.name}</h3>
                    {s.commercialName && (
                      <p className="text-xs text-slate-400">{s.commercialName}</p>
                    )}
                    <p className="text-xs font-mono text-emerald-400 mt-1">RUC: {s.taxId}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
 s.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
 }`}
                  >
                    {s.active ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                    {s.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Condiciones comerciales */}
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 bg-slate-950/40 rounded-xl p-2.5 border border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                    <span>{s.paymentTerms || 'CONTADO'}</span>
                  </div>
                  {s.paymentTerms === 'CREDITO' && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>{s.creditDays || 30} días</span>
                    </div>
                  )}
                </div>

                {/* Datos de contacto */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                  {s.contactPerson && (
                    <p className="text-slate-400">Contacto: <span className="text-white font-medium">{s.contactPerson}</span></p>
                  )}
                  {s.phone && (
                    <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-500" /> {s.phone}</p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-500" /> {s.email}</p>
                  )}
                  {s.address && (
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-500" /> {s.address}</p>
                  )}
                </div>

                {/* Resumen de actividad y saldo */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span>Órdenes: <strong className="text-white">{s.orders?.length || 0}</strong></span>
                    {totalPendingDebt > 0 && (
                      <span className="ml-3 text-amber-400 font-bold">Por Pagar: ${totalPendingDebt.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleStatus(s)}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    {s.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500">
              No se encontraron proveedores registrados.
            </div>
          )}
        </div>
      )}

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Nuevo Proveedor</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">RUC / Cédula *</label>
                  <input
                    type="text"
                    required
                    placeholder="1790011223001"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Molinos del Valle S.A."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={commercialName}
                    onChange={e => setCommercialName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Condición de Pago</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Días de Crédito</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    disabled={paymentTerms !== 'CREDITO'}
                    value={creditDays}
                    onChange={e => setCreditDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Detalles de entrega, banco para transferencias, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                >
                  {submitting ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
