// src/components/admin/QuickBookingModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, DollarSign, Plus, CheckCircle2 } from 'lucide-react';
import { OperableResource } from '@/core/resources/types';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: OperableResource[];
  selectedResourceId?: string;
  selectedDate: string;
  selectedTime?: string;
  onBookingCreated: () => void;
}

export default function QuickBookingModal({
  isOpen,
  onClose,
  resources,
  selectedResourceId,
  selectedDate,
  selectedTime = '08:00',
  onBookingCreated,
}: QuickBookingModalProps) {
  const [canchaId, setCanchaId] = useState(selectedResourceId || (resources[0]?.id || ''));
  const [fecha, setFecha] = useState(selectedDate);
  const [horaInicio, setHoraInicio] = useState(selectedTime);
  const [duracionMinutos, setDuracionMinutos] = useState(60);

  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [total, setTotal] = useState('');
  const [loading, setLoading] = useState(false);

  // Sincronizar estado cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      const targetCancha = selectedResourceId || (resources[0]?.id || '');
      setCanchaId(targetCancha);
      setFecha(selectedDate || new Date().toISOString().split('T')[0]);
      setHoraInicio(selectedTime || '08:00');
      setClienteNombre('');
      setClienteTelefono('');
      setNotas('');

      const selected = resources.find((r) => r.id === targetCancha);
      if (selected?.metadata?.precioHora) {
        setTotal(selected.metadata.precioHora.toString());
      } else {
        setTotal('0');
      }
    }
  }, [isOpen, selectedResourceId, selectedDate, selectedTime, resources]);

  // Recalcular total cuando cambia la cancha o la duración
  React.useEffect(() => {
    const selected = resources.find((r) => r.id === canchaId);
    if (selected?.metadata?.precioHora) {
      const price = selected.metadata.precioHora * (duracionMinutos / 60);
      setTotal(price.toString());
    }
  }, [canchaId, duracionMinutos, resources]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación estricta con alerta visible si falta algún dato
    const targetCanchaId = canchaId || resources[0]?.id;
    if (!targetCanchaId) {
      alert('Debes seleccionar una cancha.');
      return;
    }
    if (!clienteNombre.trim()) {
      alert('Por favor, ingresa el nombre del cliente.');
      return;
    }
    if (!horaInicio) {
      alert('Por favor, ingresa la hora de inicio.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/canchas/grilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'QUICK_RESERVE',
          canchaId: targetCanchaId,
          fecha: fecha || selectedDate,
          horaInicio,
          duracion: duracionMinutos,
          clienteNombre: clienteNombre.trim(),
          clienteTelefono: clienteTelefono.trim(),
          notas: notas.trim(),
          total: total || '0',
        }),
      });

      const d = await res.json().catch(() => ({}));

      if (res.ok && d.success) {
        onBookingCreated();
        onClose();
      } else {
        alert(d.error || 'No se pudo crear la reserva.');
      }
    } catch (err: any) {
      console.error('Error al enviar formulario de reserva:', err);
      alert('Error de conexión: ' + (err?.message || 'Intenta de nuevo'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight">Nueva Reserva</h3>
              <p className="text-xs text-slate-400">Agendar turno manual en cancha</p>
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
              Cancha Asignada
            </label>
            <select
              value={canchaId}
              onChange={(e) => setCanchaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              required
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.category ? `(${r.category})` : ''} {r.metadata?.precioHora ? `- $${r.metadata.precioHora}/h` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Hora de Inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Duración
              </label>
              <select
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value={60}>60 minutos (1h)</option>
                <option value={90}>90 minutos (1.5h - Pádel)</option>
                <option value={120}>120 minutos (2h)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  placeholder="Ej. 3001234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  Tarifa Acordada ($)
                </label>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Notas / Observaciones
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. Pagó seña por transferencia"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none"
              />
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {loading ? 'Agendando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
