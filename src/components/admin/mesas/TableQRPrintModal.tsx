'use client';

import React, { useState } from 'react';
import { XCircle, Printer, Download, Check, Sparkles, QrCode } from 'lucide-react';

interface TableQRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Array<{
    id: string;
    nombre: string;
    numero?: number | null;
    token: string;
    activa: boolean;
    permitePedidos: boolean;
  }>;
  businessName: string;
  businessLogo?: string | null;
  slug: string;
  selectedTableId?: string | null;
}

export default function TableQRPrintModal({
  isOpen,
  onClose,
  tables,
  businessName,
  businessLogo,
  slug,
  selectedTableId
}: TableQRPrintModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedTableId ? [selectedTableId] : tables.map(t => t.id)
  );

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://citiox.com';

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(tables.map(t => t.id));
  };

  const handlePrint = () => {
    window.print();
  };

  const activeTablesToPrint = tables.filter(t => selectedIds.includes(t.id));

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header (Oculto al imprimir) */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">Imprimir Códigos QR de Mesas</h3>
              <p className="text-xs text-slate-400 font-medium">Imprime etiquetas físicas permanentes para instalar en tus mesas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
            >
              Seleccionar Todas ({tables.length})
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={activeTablesToPrint.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Seleccionadas ({activeTablesToPrint.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Selección de Mesas (Oculto al imprimir) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 print:hidden shrink-0 max-h-36 overflow-y-auto">
          {tables.map(table => {
            const isSelected = selectedIds.includes(table.id);
            return (
              <button
                key={table.id}
                type="button"
                onClick={() => toggleSelect(table.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isSelected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <div className="size-3.5 rounded-full border border-slate-300" />}
                <span>{table.nombre}</span>
              </button>
            );
          })}
        </div>

        {/* Vista previa de Impresión (Contenido imprimible) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible;
              }
              .print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                padding: 0 !important;
              }
              .page-break {
                page-break-after: always;
              }
            }
          `}</style>

          <div className="print-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 print:gap-8 max-w-3xl mx-auto">
            {activeTablesToPrint.map(table => {
              const tableUrl = `${originUrl}/${slug}/mesa/${table.token}`;
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(tableUrl)}`;

              return (
                <div
                  key={table.id}
                  className="bg-white border-2 border-slate-900 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center space-y-4 print:shadow-none print:border-2 print:border-slate-900 print:rounded-2xl print:break-inside-avoid"
                >
                  {/* Logo o Nombre del Restaurante */}
                  <div className="flex items-center gap-2">
                    {businessLogo ? (
                      <img src={businessLogo} alt={businessName} className="h-8 max-w-[120px] object-contain" />
                    ) : (
                      <span className="text-sm font-black uppercase text-slate-900 tracking-wider">{businessName}</span>
                    )}
                  </div>

                  {/* Nombre de Mesa */}
                  <div className="bg-slate-900 text-white w-full py-2.5 px-4 rounded-2xl shadow-sm">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{table.nombre}</h2>
                  </div>

                  {/* Código QR Físico de Alta Resolución */}
                  <div className="p-3 bg-white border-2 border-dashed border-slate-300 rounded-2xl shadow-inner">
                    <img
                      src={qrImageUrl}
                      alt={`QR ${table.nombre}`}
                      className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                    />
                  </div>

                  {/* Instrucción de uso */}
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Escanea con tu celular para ver el menú
                    </p>
                    {table.permitePedidos && (
                      <p className="text-[11px] text-slate-500 font-bold">
                        🛒 Y realiza tu pedido directo desde tu mesa
                      </p>
                    )}
                  </div>

                  {/* Pie de etiqueta */}
                  <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[9px] text-slate-400 font-semibold uppercase tracking-widest">
                    <span>Powered by Citiox</span>
                    <span>QR Permanente</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
