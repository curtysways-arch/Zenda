'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Building2, Save, Loader2, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function MetodosPagoAdminPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [methodId, setMethodId] = useState<string>('');
  const [enabled, setEnabled] = useState(true);
  const [soloPagoPrevio, setSoloPagoPrevio] = useState(true);
  const [permiteContraentrega, setPermiteContraentrega] = useState(false);
  const [banco, setBanco] = useState('Banco Pichincha');
  const [titular, setTitular] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Ahorros');
  const [identificacion, setIdentificacion] = useState('');
  const [instructions, setInstructions] = useState('');

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
          setBanco(data.method.banco || 'Banco Pichincha');
          setTitular(data.method.titular || '');
          setNumeroCuenta(data.method.numeroCuenta || '');
          setTipoCuenta(data.method.tipoCuenta || 'Ahorros');
          setIdentificacion(data.method.identificacion || '');
          setInstructions(data.method.instructions || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch('/api/admin/metodos-pago', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: methodId,
          enabled,
          soloPagoPrevio,
          permiteContraentrega,
          banco,
          titular,
          numeroCuenta,
          tipoCuenta,
          identificacion,
          instructions,
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
            Configura los datos bancarios donde tus clientes realizarán las transferencias para sus órdenes de servicio.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 text-purple-900 px-4 py-2.5 rounded-2xl border border-purple-200 text-xs font-black shrink-0">
          <ShieldCheck className="size-5 text-purple-600" />
          <span>Verificación Automática</span>
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
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">🔒 Exigir Pago Previo Obligatorio</span>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    El cliente **debe subir el comprobante de transferencia** para registrar el pedido. El modal de pago **no se puede cerrar** hasta completar la transferencia.
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
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 block">💵 Permitir Pago Contraentrega (Efectivo)</span>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Permite que tus clientes elijan pagar en efectivo al momento de recibir o retirar sus productos.
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
          </div>

          {/* Card Principal Transferencia Bancaria */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Building2 className="size-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Transferencia Bancaria Directa</h2>
                  <p className="text-xs text-slate-500 font-medium">Permite a tus clientes pagar por transferencia y adjuntar el comprobante.</p>
                </div>
              </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Institución Bancaria / Entidad</label>
                <input
                  type="text"
                  required
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Ej: Banco Pichincha / Produbanco"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Titular de la Cuenta</label>
                <input
                  type="text"
                  required
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  placeholder="Ej: Nombre Empresa S.A. o Nombre Personal"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Tipo de Cuenta</label>
                <select
                  value={tipoCuenta}
                  onChange={(e) => setTipoCuenta(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                >
                  <option value="Ahorros">Cuenta de Ahorros</option>
                  <option value="Corriente">Cuenta Corriente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Número de Cuenta</label>
                <input
                  type="text"
                  required
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  placeholder="Ej: 2100987654"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">RUC / Identificación del Titular</label>
                <input
                  type="text"
                  required
                  value={identificacion}
                  onChange={(e) => setIdentificacion(e.target.value)}
                  placeholder="Ej: 1792345678001"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Instrucciones Adicionales</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ej: Adjunta tu comprobante para enviar tu orden a producción."
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>
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
