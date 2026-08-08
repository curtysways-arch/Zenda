'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Building2, Save, Loader2, CheckCircle2, ShieldCheck, Plus, Trash2, Banknote, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface BankAccount {
  id: string;
  banco: string;
  titular: string;
  numeroCuenta: string;
  tipoCuenta: string;
  identificacion: string;
  instructions: string;
}

export default function MetodosPagoAdminPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [methodId, setMethodId] = useState<string>('');
  const [enabled, setEnabled] = useState(true);
  const [soloPagoPrevio, setSoloPagoPrevio] = useState(true);
  const [permiteContraentrega, setPermiteContraentrega] = useState(false);
  const [metodosContraentrega, setMetodosContraentrega] = useState<string[]>(['EFECTIVO', 'TRANSFERENCIA']);
  
  // Lista de Cuentas Bancarias
  const [cuentas, setCuentas] = useState<BankAccount[]>([
    {
      id: 'acc_1',
      banco: 'Banco Pichincha',
      titular: '',
      numeroCuenta: '',
      tipoCuenta: 'Ahorros',
      identificacion: '',
      instructions: 'Adjunta tu comprobante para procesar tu orden.'
    }
  ]);

  const fetchPaymentMethod = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/metodos-pago');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.method) {
          setMethodId(data.method.id || '');
          setEnabled(data.method.enabled ?? true);
          setSoloPagoPrevio(data.method.soloPagoPrevio ?? true);
          setPermiteContraentrega(data.method.permiteContraentrega ?? false);
          
          if (Array.isArray(data.method.metodosContraentrega)) {
            setMetodosContraentrega(data.method.metodosContraentrega);
          }

          if (Array.isArray(data.method.cuentas) && data.method.cuentas.length > 0) {
            setCuentas(data.method.cuentas);
          } else {
            setCuentas([
              {
                id: 'acc_1',
                banco: data.method.banco || 'Banco Pichincha',
                titular: data.method.titular || '',
                numeroCuenta: data.method.numeroCuenta || '',
                tipoCuenta: data.method.tipoCuenta || 'Ahorros',
                identificacion: data.method.identificacion || '',
                instructions: data.method.instructions || 'Adjunta tu comprobante para procesar tu orden.'
              }
            ]);
          }
        }
      }
    } catch (e) {
      console.error('Error cargando métodos de pago:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethod();
  }, []);

  const handleAddCuenta = () => {
    const newId = `acc_${Date.now()}`;
    setCuentas(prev => [
      ...prev,
      {
        id: newId,
        banco: 'Banco Pichincha',
        titular: prev[0]?.titular || '',
        numeroCuenta: '',
        tipoCuenta: 'Ahorros',
        identificacion: prev[0]?.identificacion || '',
        instructions: 'Transferir el monto exacto y subir comprobante.'
      }
    ]);
  };

  const handleRemoveCuenta = (id: string) => {
    if (cuentas.length <= 1) {
      alert("Debes mantener al menos una cuenta bancaria configurada.");
      return;
    }
    setCuentas(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCuenta = (id: string, field: keyof BankAccount, value: string) => {
    setCuentas(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const toggleMetodoContraentrega = (metodo: string) => {
    setMetodosContraentrega(prev => 
      prev.includes(metodo) ? prev.filter(m => m !== metodo) : [...prev, metodo]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const mainAcc = cuentas[0] || {};

      const res = await fetch('/api/admin/metodos-pago', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: methodId,
          enabled,
          soloPagoPrevio,
          permiteContraentrega,
          metodosContraentrega,
          cuentas,
          banco: mainAcc.banco,
          titular: mainAcc.titular,
          numeroCuenta: mainAcc.numeroCuenta,
          tipoCuenta: mainAcc.tipoCuenta,
          identificacion: mainAcc.identificacion,
          instructions: mainAcc.instructions
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '¡Métodos de pago guardados correctamente!' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar cambios.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error de conexión al servidor.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 font-sans">
      {/* Header Admin */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block">Configuración Comercial</span>
          <h1 className="text-2xl font-black text-slate-900">Métodos de Pago & Transferencias</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Configura las políticas de cobro y las cuentas bancarias donde tus clientes enviarán los pagos de sus pedidos.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 text-purple-900 px-4 py-2.5 rounded-2xl border border-purple-200 text-xs font-black shrink-0">
          <ShieldCheck className="size-5 text-purple-600" />
          <span>Verificación de Comprobante</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <CheckCircle2 className="size-4" />
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-purple-600 animate-spin" />
          <span className="ml-3 text-slate-500 font-bold text-xs">Cargando métodos de pago...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {/* Card de Reglas de Cobro en Landing */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="size-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                <CreditCard className="size-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Políticas y Reglas de Cobro en Landing</h2>
                <p className="text-xs text-slate-500 font-medium">Define cómo deben abonar los clientes al realizar un pedido desde la App Web / Landing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Toggle Solo Pago Previo */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">🔒 Exigir Pago Previo Obligatorio</span>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    El cliente <strong>debe subir el comprobante de transferencia</strong> para registrar el pedido. El modal de pago <strong>no se puede cerrar</strong> hasta completar el pago.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={soloPagoPrevio}
                    onChange={(e) => setSoloPagoPrevio(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
                </label>
              </div>

              {/* Toggle Permitir Contraentrega */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">💵 Permitir Pago Contraentrega (Al Entregar)</span>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Permite que tus clientes elijan pagar al momento de recibir o retirar sus productos.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={permiteContraentrega}
                    onChange={(e) => setPermiteContraentrega(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Opciones de Métodos Contraentrega si está habilitado */}
            {permiteContraentrega && (
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">Métodos Aceptados en Contraentrega:</span>
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={metodosContraentrega.includes('EFECTIVO')}
                      onChange={() => toggleMetodoContraentrega('EFECTIVO')}
                      className="size-4 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>💵 Efectivo en Mano</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={metodosContraentrega.includes('TRANSFERENCIA')}
                      onChange={() => toggleMetodoContraentrega('TRANSFERENCIA')}
                      className="size-4 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>📲 Transferencia en Vivo al Entregar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={metodosContraentrega.includes('DATAFONO')}
                      onChange={() => toggleMetodoContraentrega('DATAFONO')}
                      className="size-4 rounded-md text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>💳 Datáfono / Tarjeta al Entregar</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Card Cuentas Bancarias Múltiples */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Cuentas Bancarias para Transferencias ({cuentas.length})</h2>
                  <p className="text-xs text-slate-500 font-medium">Agrega una o más cuentas bancarias para que tus clientes elijan a cuál transferir.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddCuenta}
                  className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-black rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Añadir Otra Cuenta</span>
                </button>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>
            </div>

            {/* Listado de Cuentas */}
            <div className="space-y-6">
              {cuentas.map((cuenta, index) => (
                <div key={cuenta.id} className="p-5 sm:p-6 bg-slate-50/80 border border-slate-200 rounded-3xl space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                    <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                      <Wallet className="size-4 text-purple-600" />
                      <span>Cuenta #{index + 1} {cuenta.banco ? `- ${cuenta.banco}` : ''}</span>
                    </span>

                    {cuentas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCuenta(cuenta.id)}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="Eliminar esta cuenta"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Institución Bancaria / Entidad</label>
                      <input
                        type="text"
                        required
                        value={cuenta.banco}
                        onChange={(e) => handleUpdateCuenta(cuenta.id, 'banco', e.target.value)}
                        placeholder="Ej: Banco Pichincha / Produbanco"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Titular de la Cuenta</label>
                      <input
                        type="text"
                        required
                        value={cuenta.titular}
                        onChange={(e) => handleUpdateCuenta(cuenta.id, 'titular', e.target.value)}
                        placeholder="Ej: Nombre Empresa S.A. o Nombre Personal"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Tipo de Cuenta</label>
                      <select
                        value={cuenta.tipoCuenta}
                        onChange={(e) => handleUpdateCuenta(cuenta.id, 'tipoCuenta', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 transition-all"
                      >
                        <option value="Ahorros">Cuenta de Ahorros</option>
                        <option value="Corriente">Cuenta Corriente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Número de Cuenta</label>
                      <input
                        type="text"
                        required
                        value={cuenta.numeroCuenta}
                        onChange={(e) => handleUpdateCuenta(cuenta.id, 'numeroCuenta', e.target.value)}
                        placeholder="Ej: 2100987654"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-purple-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">RUC / Identificación del Titular</label>
                      <input
                        type="text"
                        required
                        value={cuenta.identificacion}
                        onChange={(e) => handleUpdateCuenta(cuenta.id, 'identificacion', e.target.value)}
                        placeholder="Ej: 1792345678001"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-purple-600 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Instrucciones Específicas</label>
                      <input
                        type="text"
                        value={cuenta.instructions}
                        onChange={(e) => handleUpdateCuenta(cuenta.id, 'instructions', e.target.value)}
                        placeholder="Ej: Transferencia directa Banco Pichincha"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
