'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, CheckCircle2, ShieldCheck, Copy, ExternalLink, Settings } from 'lucide-react';

export default function AdminFacturacionPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/facturacion');
      if (res.ok) {
        const d = await res.json();
        setInvoices(d.invoices || []);
        setConfig(d.config);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Clave de acceso copiada al portapapeles');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-400" /> Facturación Electrónica SRI (Ecuador)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Emisión legal de comprobantes con clave de acceso oficial de 49 dígitos y validación tributaria.
          </p>
        </div>

        {config && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>RUC: <strong className="text-white">{config.ruc}</strong></span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {config.ambiente === 1 ? 'Ambiente Pruebas' : 'Producción SRI'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Secuencial</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente / Razón Social</th>
                  <th className="px-4 py-3">Cédula / RUC</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">IVA (15%)</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Estado SRI</th>
                  <th className="px-4 py-3 text-center">Clave de Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {inv.secuencial}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {new Date(inv.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {inv.razonSocialCliente}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {inv.identificacion}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      ${inv.subtotal?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      ${inv.iva15?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                      ${inv.importeTotal?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                        {inv.estadoSRI}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => copyToClipboard(inv.claveAcceso)}
                        title={inv.claveAcceso}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-mono text-slate-300 hover:text-white"
                      >
                        <Copy className="h-3 w-3" /> Copiar 49 Dígitos
                      </button>
                    </td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      Aún no has emitido comprobantes electrónicos. Se generarán automáticamente al cobrar ventas con datos fiscales en POS.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
