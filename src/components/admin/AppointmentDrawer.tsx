// src/components/admin/AppointmentDrawer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Send, 
  Edit3, 
  Wrench,
  Play,
  UserCheck,
  Flag,
  CreditCard,
  ArrowRightLeft,
  MoreVertical,
  Plus,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { GridAppointmentItem } from './ResourceScheduleGrid';

interface PaymentItem {
  id: string;
  monto: number;
  metodo: string;
  referencia?: string | null;
  notas?: string | null;
  fecha: string;
}

interface AlternativeCourt {
  id: string;
  nombre: string;
  precio: number;
  disponible: boolean;
  motivo?: string;
}

interface AppointmentDrawerProps {
  appointment: GridAppointmentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (appointmentId: string, newStatus: string) => Promise<void>;
  onUpdatePayment?: (appointmentId: string, newPayment: string) => Promise<void>;
  onDeleteBlock?: (blockId: string) => Promise<void>;
  onRefresh?: () => void;
}

export default function AppointmentDrawer({
  appointment,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdatePayment,
  onDeleteBlock,
  onRefresh,
}: AppointmentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'none' | 'extend' | 'change_court' | 'change_time' | 'payment' | 'notes' | 'cancel'>('none');
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Estados para subviews
  const [extendMinutes, setExtendMinutes] = useState<number>(30);
  const [alternativeCourts, setAlternativeCourts] = useState<AlternativeCourt[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [selectedNewCourtId, setSelectedNewCourtId] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');

  // Estados para pago
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentsList, setPaymentsList] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Notas operativas
  const [notesText, setNotesText] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');

  // Cargar pagos y datos auxiliares al abrir
  useEffect(() => {
    if (!isOpen || !appointment || appointment.isBlock) {
      setActiveSubView('none');
      setShowMoreActions(false);
      return;
    }

    setNotesText(appointment.comentarios || '');
    setNewStartTime(appointment.startTime || '');
    setNewEndTime(appointment.endTime || '');

    const fetchPayments = async () => {
      try {
        setLoadingPayments(true);
        const res = await fetch(`/api/appointments/${appointment.id}/pagos`);
        if (res.ok) {
          const data = await res.json();
          if (data.pagos) {
            setPaymentsList(data.pagos);
          }
          if (data.pendiente !== undefined) {
            setPaymentAmount(data.pendiente > 0 ? data.pendiente : 0);
          }
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, [isOpen, appointment?.id]);

  if (!isOpen || !appointment) return null;

  const isBlock = appointment.isBlock || appointment.status === 'blocked';
  const total = appointment.price || 0;
  const pagado = appointment.totalPagado !== undefined ? appointment.totalPagado : (appointment.pagoEstado === 'PAGADO' ? total : 0);
  const saldoPendiente = appointment.saldoPendiente !== undefined ? appointment.saldoPendiente : Math.max(0, total - pagado);
  const isPaid = saldoPendiente <= 0 && total > 0;

  // Ejecución de acciones transaccionales del backend
  const executeAction = async (action: string, payload: any = {}) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/canchas/reservas/${appointment.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la acción');
      }

      if (onRefresh) onRefresh();
      setActiveSubView('none');
      setShowMoreActions(false);

      if (action === 'CANCEL' || action === 'NO_SHOW') {
        onClose();
      }
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
      if (appointment.fecha) {
        if (typeof appointment.fecha === 'string') {
          fechaStr = appointment.fecha.split('T')[0];
        } else if ((appointment.fecha as any) instanceof Date) {
          fechaStr = ((appointment.fecha as any) as Date).toISOString().split('T')[0];
        }
      }
      const res = await fetch(
        `/api/admin/canchas/disponibilidad-alternativa?date=${fechaStr}&fecha=${fechaStr}&startTime=${appointment.startTime}&horaInicio=${appointment.startTime}&endTime=${appointment.endTime}&horaFin=${appointment.endTime}&excludeAppointmentId=${appointment.id}`
      );
      if (res.ok) {
        const data = await res.json();
        const allCourts: AlternativeCourt[] = data.canchas || [];
        const otherCourts = allCourts.filter(c => c.id !== appointment.resourceId);
        setAlternativeCourts(otherCourts.length > 0 ? otherCourts : allCourts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCourts(false);
    }
  };

  // Enviar nuevo pago
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments/${appointment.id}/pagos`, {
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

      if (onRefresh) onRefresh();
      setActiveSubView('none');
      setPaymentNotes('');
      setPaymentReference('');
    } catch (err: any) {
      alert(err.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  // Desbloqueo de celda
  const handleRemoveBlock = async () => {
    if (!confirm('¿Deseas desbloquear este horario para que vuelva a estar disponible?')) return;
    if (!onDeleteBlock) return;
    try {
      setLoading(true);
      await onDeleteBlock(appointment.id);
      if (onRefresh) onRefresh();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar bloqueo');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp link
  const cleanPhone = (appointment.clientPhone || '').replace(/\D/g, '');
  const whatsappMsg = encodeURIComponent(
    `Hola ${appointment.clientName}! Te escribimos de ${appointment.canchaNombre || 'la cancha'} respecto a tu reserva programada para hoy de ${appointment.startTime} a ${appointment.endTime} hs.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMsg}`;

  // Renderizador de Badge de Estado Reserva
  const renderStatusBadge = () => {
    switch (appointment.status) {
      case 'pending':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-black uppercase rounded-lg">🟡 Pendiente</span>;
      case 'confirmed':
        return <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[11px] font-black uppercase rounded-lg">🔵 Confirmada</span>;
      case 'client_checked_in':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-black uppercase rounded-lg">🙋 Llegó a Cancha</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-black uppercase rounded-lg animate-pulse">🟢 En Juego</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-slate-200 text-slate-800 text-[11px] font-black uppercase rounded-lg">🏁 Finalizada</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-black uppercase rounded-lg">❌ Cancelada</span>;
      case 'no_show':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-black uppercase rounded-lg">⚠️ No Show</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg">{appointment.status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
              isBlock ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {isBlock ? <Wrench size={18} /> : <Calendar size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-900 text-base uppercase tracking-tight">
                  {isBlock ? 'Bloqueo Operativo' : 'Centro de Cancha'}
                </h2>
                {!isBlock && renderStatusBadge()}
              </div>
              <span className="text-xs font-bold text-slate-500">
                {appointment.canchaNombre || 'Cancha'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5 flex-1">
          {isBlock ? (
            /* CASO BLOQUEO */
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Motivo de Inhabilitación
                </span>
                <p className="text-sm font-semibold">{appointment.motivo || 'Mantenimiento preventivo'}</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Horario Bloqueado:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {appointment.startTime} - {appointment.endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Cancha:</span>
                  <span className="font-bold text-slate-800">{appointment.canchaNombre || 'Cancha'}</span>
                </div>
              </div>

              <button
                onClick={handleRemoveBlock}
                disabled={loading}
                className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 size={16} /> Desbloquear Horario
              </button>
            </div>
          ) : (
            /* CASO RESERVA REGULAR */
            <div className="space-y-5">
              {/* SUBVIEWS CONDICIONALES */}
              {activeSubView === 'extend' && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                      <Plus size={14} className="text-emerald-600" /> Extender Tiempo de Juego
                    </h4>
                    <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Agrega minutos adicionales al partido actual. Se validará que no haya reservas posteriores en esta cancha.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExtendMinutes(30)}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                        extendMinutes === 30 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200'
                      }`}
                    >
                      +30 minutos
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtendMinutes(60)}
                      className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                        extendMinutes === 60 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200'
                      }`}
                    >
                      +60 minutos
                    </button>
                  </div>
                  <button
                    onClick={() => executeAction('EXTEND', { additionalMinutes: extendMinutes })}
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar Extensión'}
                  </button>
                </div>
              )}

              {activeSubView === 'change_court' && (
                <div className="p-4 bg-sky-50 border-2 border-sky-500/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-sky-900 uppercase flex items-center gap-1.5">
                      <ArrowRightLeft size={14} className="text-sky-600" /> Reasignar Cancha
                    </h4>
                    <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-sky-800">
                    Selecciona otra cancha disponible para el horario {appointment.startTime} - {appointment.endTime}:
                  </p>
                  {loadingCourts ? (
                    <div className="py-4 text-center text-xs text-sky-600 flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Consultando disponibilidad...
                    </div>
                  ) : alternativeCourts.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2">No hay otras canchas configuradas.</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {alternativeCourts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => c.disponible && setSelectedNewCourtId(c.id)}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            !c.disponible
                              ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                              : selectedNewCourtId === c.id
                              ? 'bg-sky-600 text-white border-sky-600 font-bold'
                              : 'bg-white hover:bg-sky-100/50 border-slate-200'
                          }`}
                        >
                          <div>
                            <span className="font-bold block">{c.nombre}</span>
                            <span className={`text-[10px] ${selectedNewCourtId === c.id ? 'text-sky-100' : 'text-slate-500'}`}>
                              Tarifa: ${c.precio.toLocaleString()} /h
                            </span>
                          </div>
                          <div>
                            {c.disponible ? (
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
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
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar Cambio de Cancha'}
                  </button>
                </div>
              )}

              {activeSubView === 'change_time' && (
                <div className="p-4 bg-indigo-50 border-2 border-indigo-500/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5">
                      <Clock size={14} className="text-indigo-600" /> Modificar Horario
                    </h4>
                    <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-indigo-950 uppercase block mb-1">Hora Inicio</label>
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-indigo-950 uppercase block mb-1">Hora Fin</label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => executeAction('CHANGE_TIME', { newStartTime, newEndTime })}
                    disabled={loading || !newStartTime || !newEndTime}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Nuevo Horario'}
                  </button>
                </div>
              )}

              {activeSubView === 'payment' && (
                <form onSubmit={handleRegisterPayment} className="p-4 bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-600" /> Registrar Cobro / Pago
                    </h4>
                    <button type="button" onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">Monto ($)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-950 uppercase block mb-1">Método</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Referencia o # Comprobante (opcional)"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar Pago'}
                  </button>
                </form>
              )}

              {activeSubView === 'notes' && (
                <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      <Edit3 size={14} /> Notas Operativas
                    </h4>
                    <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    rows={3}
                    placeholder="Escribe notas operativas o indicaciones especiales..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs"
                  />
                  <button
                    onClick={() => executeAction('UPDATE_NOTES', { notes: notesText })}
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-800 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Notas'}
                  </button>
                </div>
              )}

              {activeSubView === 'cancel' && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-rose-900 uppercase flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" /> Cancelar Reserva
                    </h4>
                    <button onClick={() => setActiveSubView('none')} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-rose-800">
                    Esta acción liberará el horario de la cancha en la grilla.
                  </p>
                  <input
                    type="text"
                    placeholder="Motivo de la cancelación..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => executeAction('CANCEL', { reason: cancelReason })}
                    disabled={loading}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar Cancelación'}
                  </button>
                </div>
              )}

              {/* TARJETA DE CLIENTE */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-sm uppercase shadow-xs">
                      {appointment.clientName.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{appointment.clientName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                        <Phone size={12} /> {appointment.clientPhone || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>

                  {cleanPhone && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1 text-[11px] font-bold shadow-xs transition-all"
                    >
                      <Send size={13} /> WhatsApp
                    </a>
                  )}
                </div>

                {appointment.comentarios && (
                  <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 italic bg-white/60 p-2 rounded-xl">
                    "{appointment.comentarios}"
                  </div>
                )}
              </div>

              {/* HORARIO PROGRAMADO & CANCHA */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">
                    Horario Turno
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900 block">
                    {appointment.startTime} – {appointment.endTime}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {appointment.duracion ? `${appointment.duracion} min` : '60 min'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">
                    Recurso Cancha
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate block">
                    {appointment.canchaNombre || 'Cancha'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Fecha: {appointment.fecha || 'Hoy'}
                  </span>
                </div>
              </div>

              {/* TIEMPOS DE USO REAL */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                  Seguimiento Operativo en Cancha
                </span>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Llegada</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {appointment.checkedInAt ? new Date(appointment.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Inicio Real</span>
                    <span className="text-xs font-mono font-bold text-sky-300">
                      {appointment.startedAt ? new Date(appointment.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Fin Real</span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {appointment.completedAt ? new Date(appointment.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* FINANZAS Y PAGOS */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Estado de Cuenta
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                    isPaid ? 'bg-emerald-100 text-emerald-800' : saldoPendiente < total ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isPaid ? 'Pagado Completo' : saldoPendiente < total ? 'Abono Parcial' : 'Pendiente de Pago'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center bg-white p-2.5 rounded-xl border border-slate-200/60">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Total</span>
                    <span className="text-xs font-mono font-black text-slate-900">${total.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Pagado</span>
                    <span className="text-xs font-mono font-black text-emerald-600">${pagado.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Saldo</span>
                    <span className={`text-xs font-mono font-black ${saldoPendiente > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      ${saldoPendiente.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Historial de pagos si existen */}
                {paymentsList.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pagos Registrados:</span>
                    {paymentsList.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <Receipt size={12} className="text-emerald-600" />
                          <span className="font-bold text-slate-700">{p.metodo}</span>
                          {p.referencia && <span className="text-[9px] text-slate-400 font-mono">({p.referencia})</span>}
                        </div>
                        <span className="font-mono font-bold text-slate-900">+${p.monto.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveSubView('payment')}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CreditCard size={14} /> Registrar Abono / Pago
                </button>
              </div>

              {/* ACCIÓN PRINCIPAL CONTEXTUAL DEL PARTIDO */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Acción Operativa Recomendada
                </span>

                {appointment.status === 'pending' && (
                  <button
                    onClick={() => executeAction('CONFIRM')}
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirmar Reserva
                  </button>
                )}

                {appointment.status === 'confirmed' && (
                  <button
                    onClick={() => executeAction('CHECK_IN')}
                    disabled={loading}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                    Registrar Llegada del Jugador
                  </button>
                )}

                {appointment.status === 'client_checked_in' && (
                  <button
                    onClick={() => executeAction('START_MATCH')}
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer animate-bounce-subtle"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    Iniciar Partido (Entrada a Cancha)
                  </button>
                )}

                {appointment.status === 'in_progress' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => executeAction('FINISH_MATCH')}
                      disabled={loading}
                      className="py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                      Finalizar Partido
                    </button>
                    <button
                      onClick={() => setActiveSubView('extend')}
                      className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Plus size={16} /> + Extender Tiempo
                    </button>
                  </div>
                )}

                {appointment.status === 'completed' && (
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl text-center font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" /> Partido concluido satisfactoriamente
                  </div>
                )}

                {(appointment.status === 'cancelled' || appointment.status === 'no_show') && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-center font-bold text-xs flex items-center justify-center gap-2">
                    <AlertCircle size={16} /> Reserva fuera de operación ({appointment.status})
                  </div>
                )}
              </div>

              {/* BOTÓN MÁS ACCIONES */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreActions(!showMoreActions)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MoreVertical size={14} /> Más Acciones Operativas
                </button>

                {showMoreActions && (
                  <div className="mt-2 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-1 animate-in fade-in">
                    {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => { setShowMoreActions(false); setActiveSubView('extend'); }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <Plus size={14} className="text-emerald-600" /> + Extender tiempo de juego
                        </button>
                        <button
                          onClick={handleOpenChangeCourt}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <ArrowRightLeft size={14} className="text-sky-600" /> Cambiar de cancha
                        </button>
                        <button
                          onClick={() => { setShowMoreActions(false); setActiveSubView('change_time'); }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <Clock size={14} className="text-indigo-600" /> Modificar horario de inicio/fin
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('¿Marcar como No-Show? Esto registrará que el cliente no se presentó.')) {
                              executeAction('NO_SHOW');
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-xl flex items-center gap-2 transition-colors"
                        >
                          <AlertTriangle size={14} className="text-purple-600" /> Marcar como No-Show (No asistió)
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setShowMoreActions(false); setActiveSubView('notes'); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Edit3 size={14} className="text-slate-600" /> Editar notas de la reserva
                    </button>
                    {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      <button
                        onClick={() => { setShowMoreActions(false); setActiveSubView('cancel'); }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors border-t border-slate-100"
                      >
                        <Trash2 size={14} className="text-rose-600" /> Cancelar reserva
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
            REF: {appointment.id.slice(0, 8)}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
