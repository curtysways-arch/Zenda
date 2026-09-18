// src/components/admin/canchas/CourtAppointmentDetail.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Send, 
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Play,
  UserCheck,
  Flag,
  ArrowRightLeft,
  MoreVertical,
  AlertTriangle,
  FileText,
  Loader2,
  Receipt,
  Sparkles,
  Zap,
  Clock3
} from 'lucide-react';
import { clsx } from 'clsx';
import { toLocalDateFromUTC } from '@/lib/utils';

interface AlternativeCourt {
  id: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  motivo?: string;
}

interface CourtAppointmentDetailProps {
  reserva: any;
  onRefresh: () => Promise<void> | void;
}

export default function CourtAppointmentDetail({ reserva, onRefresh }: CourtAppointmentDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'none' | 'extend' | 'change_court' | 'change_time' | 'payment' | 'notes' | 'cancel'>('none');
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Estados de extensión y canchas alternativas
  const [extendMinutes, setExtendMinutes] = useState<number>(30);
  const [alternativeCourts, setAlternativeCourts] = useState<AlternativeCourt[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [selectedNewCourtId, setSelectedNewCourtId] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');

  // Estados de pagos
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Notas operativas y cancelación
  const [notesText, setNotesText] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');

  const total = reserva?.total || 0;
  const pagos = reserva?.pagos || reserva?.pagoReserva || [];
  const totalPagado = pagos.reduce((acc: number, p: any) => acc + (p.monto || 0), 0);
  const saldoPendiente = Math.max(0, total - totalPagado);
  const isPaid = saldoPendiente <= 0 && total > 0;

  useEffect(() => {
    if (reserva) {
      setNotesText(reserva.comentarios || reserva.notas || '');
      setNewStartTime(reserva.horaInicio || '');
      setNewEndTime(reserva.horaFin || '');
      setPaymentAmount(saldoPendiente > 0 ? saldoPendiente : 0);
    }
  }, [reserva?.id, saldoPendiente]);

  // Ejecución de acciones transaccionales del backend
  const executeAction = async (action: string, payload: any = {}) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/canchas/reservas/${reserva.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la acción');
      }

      await onRefresh();
      setActiveSubView('none');
      setShowMoreActions(false);
    } catch (err: any) {
      alert(err.message || 'Error en la operación');
    } finally {
      setLoading(false);
    }
  };

  // Abrir vista de cambio de cancha y consultar alternativas
  const handleOpenChangeCourt = async () => {
    setActiveSubView('change_court');
    setShowMoreActions(false);
    try {
      setLoadingCourts(true);
      let fechaStr = '';
      if (reserva.fecha) {
        if (typeof reserva.fecha === 'string') {
          fechaStr = reserva.fecha.split('T')[0];
        } else if (reserva.fecha instanceof Date) {
          fechaStr = reserva.fecha.toISOString().split('T')[0];
        }
      }
      const res = await fetch(
        `/api/admin/canchas/disponibilidad-alternativa?date=${fechaStr}&fecha=${fechaStr}&startTime=${reserva.horaInicio}&horaInicio=${reserva.horaInicio}&endTime=${reserva.horaFin}&horaFin=${reserva.horaFin}&excludeAppointmentId=${reserva.id}`
      );
      if (res.ok) {
        const data = await res.json();
        const allCourts: AlternativeCourt[] = data.canchas || [];
        const currentCourtId = reserva.serviceId || reserva.service?.id;
        const otherCourts = allCourts.filter(c => c.id !== currentCourtId);
        setAlternativeCourts(otherCourts.length > 0 ? otherCourts : allCourts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCourts(false);
    }
  };

  // Registrar cobro / abono
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments/${reserva.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: paymentAmount,
          metodo: paymentMethod,
          referencia: paymentReference,
          notas: paymentNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar pago');

      await onRefresh();
      setActiveSubView('none');
      setPaymentNotes('');
      setPaymentReference('');
    } catch (err: any) {
      alert(err.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp
  const cleanPhone = (reserva.cliente?.telefono || '').replace(/\D/g, '');
  const canchaNombre = reserva.service?.nombre || reserva.nombreServicio || 'Cancha';
  const whatsappMsg = encodeURIComponent(
    `Hola ${reserva.cliente?.nombre}! Te escribimos de ${canchaNombre} respecto a tu reserva para hoy de ${reserva.horaInicio} a ${reserva.horaFin} hs.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  // Render Status Badge
  const renderStatusBadge = () => {
    switch (reserva.estado) {
      case 'pending':
        return <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-black uppercase rounded-xl">🟡 Pendiente</span>;
      case 'confirmed':
      case 'approved':
        return <span className="px-3 py-1.5 bg-sky-100 text-sky-800 text-xs font-black uppercase rounded-xl">🔵 Confirmada</span>;
      case 'client_checked_in':
        return <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-xs font-black uppercase rounded-xl animate-pulse">🙋 Llegó a Cancha</span>;
      case 'in_progress':
        return <span className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-black uppercase rounded-xl animate-pulse">🟢 En Juego</span>;
      case 'completed':
        return <span className="px-3 py-1.5 bg-slate-900 text-white text-xs font-black uppercase rounded-xl">🏁 Finalizada</span>;
      case 'cancelled':
        return <span className="px-3 py-1.5 bg-rose-100 text-rose-800 text-xs font-black uppercase rounded-xl">❌ Cancelada</span>;
      case 'no_show':
        return <span className="px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-black uppercase rounded-xl">⚠️ No Show</span>;
      default:
        return <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl">{reserva.estado}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* TOP BAR / NAVEGACIÓN */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group cursor-pointer"
        >
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest italic">Volver al Panel</span>
        </button>
        <div className="flex items-center gap-3">
          {cleanPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send size={14} /> WhatsApp Cliente
            </a>
          )}
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            REF: #{reserva.id.slice(-8)}
          </span>
        </div>
      </div>

      {/* TARJETA PRINCIPAL DEL CENTRO OPERATIVO */}
      <div className="bg-white rounded-[3rem] p-6 md:p-10 border border-slate-200 shadow-xl space-y-8">
        
        {/* HEADER OPERATIVO: CANCHA + CLIENTE + ESTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-100 pb-8 items-center">
          <div className="flex items-center gap-5">
            <div className="size-16 md:size-20 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center text-2xl md:text-3xl font-black uppercase shadow-lg shadow-emerald-600/20">
              {canchaNombre.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Cancha Asignada
                </span>
                {renderStatusBadge()}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                {canchaNombre}
              </h1>
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                <User size={13} className="text-slate-400" /> {reserva.cliente?.nombre || 'Cliente'} 
                {reserva.cliente?.telefono && (
                  <span className="font-mono text-slate-400 ml-1">({reserva.cliente.telefono})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-center gap-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left md:text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Turno Programado
              </span>
              <p className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                {reserva.horaInicio} – {reserva.horaFin}
              </p>
              <p className="text-xs font-bold text-slate-500 uppercase mt-0.5">
                {format(toLocalDateFromUTC(reserva.fecha), "EEEE d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>
        </div>

        {/* SUBVIEWS CONDICIONALES INTERACTIVAS */}
        {activeSubView === 'extend' && (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-500/30 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-emerald-900 uppercase flex items-center gap-2">
                <Plus size={16} className="text-emerald-600" /> + Extender Tiempo de Juego
              </h4>
              <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <p className="text-xs text-emerald-800">
              Agrega minutos adicionales al turno actual. Se comprobará disponibilidad para asegurar que no interfiera con reservas posteriores.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => setExtendMinutes(30)}
                className={`py-3 px-4 rounded-2xl text-xs font-black border transition-all ${
                  extendMinutes === 30 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-800 border-emerald-200'
                }`}
              >
                +30 minutos
              </button>
              <button
                type="button"
                onClick={() => setExtendMinutes(60)}
                className={`py-3 px-4 rounded-2xl text-xs font-black border transition-all ${
                  extendMinutes === 60 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-800 border-emerald-200'
                }`}
              >
                +60 minutos
              </button>
            </div>
            <button
              onClick={() => executeAction('EXTEND', { additionalMinutes: extendMinutes })}
              disabled={loading}
              className="py-3 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Extensión en Cancha'}
            </button>
          </div>
        )}

        {activeSubView === 'change_court' && (
          <div className="p-6 bg-sky-50 border-2 border-sky-500/30 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-sky-900 uppercase flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-sky-600" /> Reasignar Cancha (Mismo Horario)
              </h4>
              <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <p className="text-xs text-sky-800">
              Selecciona otra cancha disponible para el horario {reserva.horaInicio} - {reserva.horaFin}:
            </p>
            {loadingCourts ? (
              <div className="py-6 text-center text-xs text-sky-600 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Consultando canchas libres...
              </div>
            ) : alternativeCourts.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">No se encontraron otras canchas en esta sede.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                {alternativeCourts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => c.disponible && setSelectedNewCourtId(c.id)}
                    className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      !c.disponible
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : selectedNewCourtId === c.id
                        ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-sm'
                        : 'bg-white hover:bg-sky-100/50 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className="font-black block text-sm">{c.nombre}</span>
                      <span className={`text-[10px] ${selectedNewCourtId === c.id ? 'text-sky-100' : 'text-slate-500'}`}>
                        ${c.precio.toLocaleString()} /hora
                      </span>
                    </div>
                    <div>
                      {c.disponible ? (
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                          selectedNewCourtId === c.id ? 'bg-white text-sky-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Disponible
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          {c.motivo || 'Ocupada'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => executeAction('CHANGE_COURT', { newCanchaId: selectedNewCourtId, newCourtId: selectedNewCourtId })}
              disabled={loading || !selectedNewCourtId}
              className="py-3 px-8 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Reasignación'}
            </button>
          </div>
        )}

        {activeSubView === 'change_time' && (
          <div className="p-6 bg-indigo-50 border-2 border-indigo-500/30 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-indigo-900 uppercase flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" /> Modificar Horario de Cancha
              </h4>
              <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className="text-[10px] font-bold text-indigo-950 uppercase block mb-1">Hora Inicio</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-950 uppercase block mb-1">Hora Fin</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
                />
              </div>
            </div>
            <button
              onClick={() => executeAction('CHANGE_TIME', { newStartTime, newEndTime })}
              disabled={loading || !newStartTime || !newEndTime}
              className="py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Nuevo Horario'}
            </button>
          </div>
        )}

        {activeSubView === 'payment' && (
          <form onSubmit={handleRegisterPayment} className="p-6 bg-emerald-50 border-2 border-emerald-500/30 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-emerald-900 uppercase flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-600" /> Registrar Cobro / Abono
              </h4>
              <button type="button" onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">Monto ($)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">Método</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">Referencia (Opcional)</label>
                <input
                  type="text"
                  placeholder="# Comprobante..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Registro de Pago'}
            </button>
          </form>
        )}

        {activeSubView === 'notes' && (
          <div className="p-6 bg-slate-50 border-2 border-slate-300 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <Edit3 size={16} /> Bitácora / Notas Operativas
              </h4>
              <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={3}
              placeholder="Escribe observaciones operativas sobre este turno..."
              className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs"
            />
            <button
              onClick={() => executeAction('UPDATE_NOTES', { notes: notesText })}
              disabled={loading}
              className="py-3 px-8 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Notas'}
            </button>
          </div>
        )}

        {activeSubView === 'cancel' && (
          <div className="p-6 bg-rose-50 border-2 border-rose-300 rounded-3xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-rose-900 uppercase flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" /> Cancelar Reserva de Cancha
              </h4>
              <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <p className="text-xs text-rose-800">
              Esta acción cancelará la reserva y liberará automáticamente el horario en la grilla.
            </p>
            <input
              type="text"
              placeholder="Motivo de cancelación..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs max-w-md"
            />
            <button
              onClick={() => executeAction('CANCEL', { reason: cancelReason })}
              disabled={loading}
              className="py-3 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar Cancelación'}
            </button>
          </div>
        )}

        {/* DASHBOARD FINANCIERO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200/80 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Turno Total</span>
              <CreditCard size={18} className="text-slate-400" />
            </div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              ${total.toLocaleString()}
            </h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Tarifa de Cancha
            </span>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-md space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Total Cobrado</span>
              <Plus size={18} className="text-emerald-500" />
            </div>
            <h2 className="text-5xl font-black text-emerald-600 tracking-tighter italic uppercase leading-none">
              ${totalPagado.toLocaleString()}
            </h2>
            <button 
              onClick={() => setActiveSubView('payment')}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              REGISTRAR INGRESO
            </button>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-md space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Saldo Pendiente</span>
              <DollarSign size={18} className="text-amber-500" />
            </div>
            <h2 className={clsx(
              "text-5xl font-black tracking-tighter italic uppercase leading-none",
              saldoPendiente > 0 ? "text-amber-600" : "text-slate-300"
            )}>
              ${saldoPendiente.toLocaleString()}
            </h2>
            <div className={clsx(
              "w-full py-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-wider border",
              saldoPendiente === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {saldoPendiente === 0 ? 'LIQUIDADO' : 'DEUDA ACTIVA'}
            </div>
          </div>
        </div>

        {/* SEGUIMIENTO EN CANCHA: TIEMPOS DE USO REAL */}
        <div className="p-6 bg-slate-900 text-white rounded-[2.5rem] space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                Seguimiento Operativo en Cancha
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Tiempos Reales de Juego</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Llegada Cliente</span>
              <span className="text-base font-mono font-black text-emerald-300">
                {reserva.checkedInAt ? new Date(reserva.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Inicio de Partido</span>
              <span className="text-base font-mono font-black text-sky-300">
                {reserva.startedAt ? new Date(reserva.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Fin de Partido</span>
              <span className="text-base font-mono font-black text-amber-300">
                {reserva.completedAt ? new Date(reserva.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ACCIÓN PRINCIPAL CONTEXTUAL DEL PARTIDO */}
        <div className="p-6 md:p-8 bg-slate-50 border border-slate-200/80 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Acción Operativa Recomendada
              </span>
              <h3 className="text-lg font-black text-slate-900 uppercase italic">
                Flujo del Partido en Cancha
              </h3>
            </div>
            <Zap size={20} className="text-emerald-500 animate-pulse" />
          </div>

          <div className="max-w-xl mx-auto">
            {reserva.estado === 'pending' && (
              <button
                onClick={() => executeAction('CONFIRM')}
                disabled={loading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={20} />}
                Confirmar Reserva de Cancha
              </button>
            )}

            {(reserva.estado === 'confirmed' || reserva.estado === 'approved') && (
              <button
                onClick={() => executeAction('CHECK_IN')}
                disabled={loading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all cursor-pointer active:scale-98"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={20} />}
                Registrar Llegada del Jugador
              </button>
            )}

            {reserva.estado === 'client_checked_in' && (
              <button
                onClick={() => executeAction('START_MATCH')}
                disabled={loading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 animate-pulse"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={20} />}
                Iniciar Partido (Entrada a Cancha)
              </button>
            )}

            {reserva.estado === 'in_progress' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => executeAction('FINISH_MATCH')}
                  disabled={loading}
                  className="py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 transition-all cursor-pointer active:scale-98"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />}
                  Finalizar Partido
                </button>
                <button
                  onClick={() => setActiveSubView('extend')}
                  className="py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                >
                  <Plus size={18} /> + Extender Tiempo
                </button>
              </div>
            )}

            {reserva.estado === 'completed' && (
              <div className="p-6 bg-slate-100 rounded-2xl text-center space-y-2 border border-slate-200">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <p className="font-black text-slate-800 uppercase italic text-sm">
                  Partido Finalizado Satisfactoriamente
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  Uso de cancha completado y registrado en la bitácora del club.
                </p>
              </div>
            )}

            {(reserva.estado === 'cancelled' || reserva.estado === 'no_show') && (
              <div className="p-6 bg-rose-50 text-rose-800 rounded-2xl text-center space-y-2 border border-rose-200">
                <XCircle size={32} className="mx-auto text-rose-600" />
                <p className="font-black uppercase italic text-sm">
                  Turno Inactivo ({reserva.estado === 'no_show' ? 'No Show / Inasistencia' : 'Cancelado'})
                </p>
              </div>
            )}
          </div>

          {/* MENÚ MÁS ACCIONES OPERATIVAS */}
          <div className="relative pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="w-full py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MoreVertical size={16} /> Más Acciones de Cancha
            </button>

            {showMoreActions && (
              <div className="mt-2 p-3 bg-white border border-slate-200 rounded-3xl shadow-2xl space-y-1.5 animate-in fade-in">
                {reserva.estado !== 'completed' && reserva.estado !== 'cancelled' && (
                  <>
                    <button
                      onClick={() => { setShowMoreActions(false); setActiveSubView('extend'); }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <Plus size={16} className="text-emerald-600" /> + Extender tiempo de juego (+30 / +60 min)
                    </button>
                    <button
                      onClick={handleOpenChangeCourt}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <ArrowRightLeft size={16} className="text-sky-600" /> Reasignar a otra cancha libre
                    </button>
                    <button
                      onClick={() => { setShowMoreActions(false); setActiveSubView('change_time'); }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <Clock size={16} className="text-indigo-600" /> Modificar horario de inicio/fin
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Marcar como No-Show? Esto registrará que el cliente no se presentó al turno.')) {
                          executeAction('NO_SHOW');
                        }
                      }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <AlertTriangle size={16} className="text-purple-600" /> Marcar como No-Show (Inasistencia)
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setShowMoreActions(false); setActiveSubView('notes'); }}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-3 transition-colors"
                >
                  <Edit3 size={16} className="text-slate-600" /> Editar notas / observaciones
                </button>
                {reserva.estado !== 'cancelled' && reserva.estado !== 'completed' && (
                  <button
                    onClick={() => { setShowMoreActions(false); setActiveSubView('cancel'); }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-3 transition-colors border-t border-slate-100"
                  >
                    <Trash2 size={16} className="text-rose-600" /> Cancelar reserva de cancha
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* HISTORIAL DE PAGOS */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <Receipt size={18} className="text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-widest italic">Historial de Cobros Recibidos</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {pagos.length} registro(s)
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-4">Fecha / Hora</th>
                  <th className="px-6 py-4">Método</th>
                  <th className="px-6 py-4">Comprobante</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagos.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      {p.fecha ? format(new Date(p.fecha), 'dd/MM/yyyy HH:mm') : '—'}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700 uppercase">
                      {p.metodo}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {p.referencia || '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-black font-mono text-slate-900">
                      +${p.monto?.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {pagos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                      No hay pagos registrados para este turno todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* NOTAS OPERATIVAS SI EXISTEN */}
        {reserva.comentarios && (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText size={16} />
              <span className="text-[11px] font-black uppercase tracking-wider">Observaciones Registradas:</span>
            </div>
            <p className="text-xs text-slate-700 italic">
              "{reserva.comentarios}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
