// src/components/admin/QuickBlockModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Lock, Wrench, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { OperableResource } from '@/core/resources/types';

interface QuickBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: OperableResource[];
  selectedResourceId?: string;
  selectedDate: string;
  selectedTime?: string;
  onBlockCreated: () => void;
}

export default function QuickBlockModal({
  isOpen,
  onClose,
  resources,
  selectedResourceId,
  selectedDate,
  selectedTime = '08:00',
  onBlockCreated,
}: QuickBlockModalProps) {
  const [canchaId, setCanchaId] = useState(selectedResourceId || (resources[0]?.id || ''));
  const [fecha, setFecha] = useState(selectedDate);
  const [horaInicio, setHoraInicio] = useState(selectedTime);
  
  // Calcular horaFin por defecto (+1 hora)
  const calcDefaultEnd = (start: string) => {
    const [h, m] = (start || '08:00').split(':').map(Number);
    return `${(h + 1).toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}`;
  };

  const [horaFin, setHoraFin] = useState(calcDefaultEnd(selectedTime));
  const [motivo, setMotivo] = useState('Mantenimiento');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canchaId || !fecha || !horaInicio || !horaFin) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/canchas/grilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BLOCK',
          canchaId,
          fecha,
          horaInicio,
          horaFin,
          motivo,
        }),
      });

      if (res.ok) {
        onBlockCreated();
        onClose();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Error al bloquear cancha');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const motivosPredefinidos = [
    'Mantenimiento General',
    'Arreglo de Red / Césped',
    'Condiciones Climáticas / Lluvia',
    'Torneo / Evento Privado',
    'Uso de Escuela / Clase',
    'Cierre Administrativo'
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight">Bloquear Horario</h3>
              <p className="text-xs text-slate-400">Inhabilita la cancha para que no se pueda reservar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Cancha a Bloquear
            </label>
            <select
              value={canchaId}
              onChange={(e) => setCanchaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              required
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.category ? `(${r.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Hora Inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => {
                  setHoraInicio(e.target.value);
                  setHoraFin(calcDefaultEnd(e.target.value));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Hora Fin
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Motivo del Bloqueo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Mantenimiento de luces"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 mb-2"
              required
            />
            {/* Chips de motivos comunes */}
            <div className="flex flex-wrap gap-1.5">
              {motivosPredefinidos.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMotivo(m)}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${
                    motivo === m
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {loading ? 'Bloqueando...' : 'Confirmar Bloqueo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
