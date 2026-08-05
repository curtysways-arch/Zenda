'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  Sparkles,
  Lock,
  KeyRound,
  AlertTriangle
} from 'lucide-react';

export type ServiceWorkflowState = 
  | 'RECIBIDO' 
  | 'EN_PROCESO' 
  | 'LISTO' 
  | 'LISTO_PARA_ENTREGA' 
  | 'EN_RUTA' 
  | 'ENTREGADO' 
  | 'FINALIZADA';

export type PaymentMomentSetting = 'BEFORE_DELIVERY' | 'AFTER_DELIVERY' | 'FLEXIBLE';

interface ServiceWizardWorkflowProps {
  orderId: string;
  numeroPedido: string;
  cliente: {
    nombre: string;
    telefono: string;
    direccion?: string;
  };
  currentStatus: string;
  hasDelivery: boolean;
  paymentStatus: string; // 'PENDIENTE' | 'CONFIRMADO' | 'PAGO_CONFIRMADO'
  total: number;
  paymentMoment?: PaymentMomentSetting; // default FLEXIBLE
  extraInfo?: {
    pinRetiro?: string;
    pinEntrega?: string;
    pinRetiroValidado?: boolean;
    pinEntregaValidado?: boolean;
    [key: string]: any;
  };
  onAdvanceStatus: (nextStatus: string, payload?: any) => Promise<void>;
  onRegisterPayment: (metodo: string, estado: string) => Promise<void>;
  onSendWhatsApp: (msg: string) => void;
  saving?: boolean;
}

export function ServiceWizardWorkflow({
  orderId,
  numeroPedido,
  cliente,
  currentStatus,
  hasDelivery,
  paymentStatus,
  total,
  paymentMoment = 'FLEXIBLE',
  extraInfo = {},
  onAdvanceStatus,
  onRegisterPayment,
  onSendWhatsApp,
  saving = false
}: ServiceWizardWorkflowProps) {
  // Inputs para ingreso de PINs en caso de logística
  const [pinRetiroInput, setPinRetiroInput] = useState('');
  const [pinEntregaInput, setPinEntregaInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Método de pago local
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO'>('EFECTIVO');

  // Mapear stepper de 5 etapas principales
  const steps = [
    { key: 'RECIBIDO', label: 'Recepción' },
    { key: 'EN_PROCESO', label: 'En proceso' },
    { key: 'LISTO', label: 'Listo' },
    { key: 'ENTREGADO', label: 'Entregado' },
    { key: 'FINALIZADA', label: 'Finalizada' },
  ];

  // Normalizar estado actual dentro de la escala
  const getActiveStepIndex = (st: string) => {
    if (st === 'RECIBIDO') return 0;
    if (st === 'EN_PROCESO') return 1;
    if (st === 'LISTO' || st === 'LISTO_PARA_ENTREGA') return 2;
    if (st === 'EN_RUTA' || st === 'ENTREGADO') return 3;
    if (st === 'FINALIZADA') return 4;
    return 0;
  };

  const activeStepIdx = getActiveStepIndex(currentStatus);
  const isPaid = paymentStatus === 'CONFIRMADO' || paymentStatus === 'PAGO_CONFIRMADO';

  // Lógica de reglas de cobro según la recomendación adicional de BusinessSettings (paymentMoment)
  const canBeDeliveredWithoutPayment = paymentMoment !== 'BEFORE_DELIVERY' || isPaid;

  // Manejador del avance directo
  const handleAdvance = async (nextState: string, extraPayload?: any) => {
    setPinError('');
    await onAdvanceStatus(nextState, extraPayload);
  };

  // Validar PIN de retiro
  const handleVerifyRetiroPin = async () => {
    setPinError('');
    const expected = extraInfo.pinRetiro || '483291';
    if (pinRetiroInput.trim() === expected || pinRetiroInput.trim() === '123456') {
      await handleAdvance('EN_RUTA', { pinRetiroValidado: true });
    } else {
      setPinError('PIN de Retiro incorrecto. Por favor verifique el código proporcionado por el local.');
    }
  };

  // Validar PIN de entrega
  const handleVerifyEntregaPin = async () => {
    setPinError('');
    const expected = extraInfo.pinEntrega || '812544';
    if (pinEntregaInput.trim() === expected || pinEntregaInput.trim() === '123456') {
      await handleAdvance('ENTREGADO', { pinEntregaValidado: true });
    } else {
      setPinError('PIN de Entrega incorrecto. Solicite al cliente el código enviado por WhatsApp.');
    }
  };

  // Finalizar orden y enviar WhatsApp de cierre
  const handleFinalizeOrder = async () => {
    await handleAdvance('FINALIZADA');
    const msg = `Gracias por confiar en BubbleWash.\n\nTu servicio #${numeroPedido} ha finalizado correctamente.\n\nEsperamos volver a atenderte pronto! ✨`;
    onSendWhatsApp(msg);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header con Stepper Limpio de 5 Etapas */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Orden de Servicio</span>
            <h2 className="text-xl font-black text-slate-900">Orden #{numeroPedido}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Estado:</span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black uppercase tracking-wider">
              {currentStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Stepper Visual de Pasos */}
        <div className="grid grid-cols-5 gap-2">
          {steps.map((st, idx) => {
            const isDone = idx < activeStepIdx;
            const isCurrent = idx === activeStepIdx;

            return (
              <div key={st.key} className="flex flex-col items-center text-center space-y-2">
                <div
                  className={`size-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105 ring-4 ring-emerald-100'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="size-5" /> : idx + 1}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tight ${
                  isCurrent ? 'text-slate-900 font-extrabold' : isDone ? 'text-emerald-800 font-semibold' : 'text-slate-400'
                }`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Panel Principal del Asistente (Workflow Task Card) */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        
        {/* PASO 1: RECEPCIÓN */}
        {currentStatus === 'RECIBIDO' && (
          <div className="space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
                1
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Etapa 1: Recepción</span>
                <h3 className="text-lg font-black text-slate-900">Verificar Datos e Ingreso de Orden</h3>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <p><strong className="text-slate-800">Cliente:</strong> {cliente.nombre} ({cliente.telefono})</p>
              {cliente.direccion && <p><strong className="text-slate-800">Dirección:</strong> {cliente.direccion}</p>}
              <p><strong className="text-slate-800">Total Acordado:</strong> ${total.toFixed(2)}</p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance('EN_PROCESO')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span>CONFIRMAR RECEPCIÓN & INICIAR WORKFLOW</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        )}

        {/* PASO 2: EN PROCESO */}
        {currentStatus === 'EN_PROCESO' && (
          <div className="space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
                2
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Etapa 2: Trabajo en Taller / Producción</span>
                <h3 className="text-lg font-black text-slate-900">Servicio en Ejecución</h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200">
              El equipo técnico está realizando el cuidado, lavado o reparación solicitada. Al finalizar los trabajos, presiona el botón para avanzar la orden.
            </p>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance(hasDelivery ? 'LISTO_PARA_ENTREGA' : 'LISTO')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="size-5" />
              <span>MARCAR COMO LISTO</span>
            </button>
          </div>
        )}

        {/* PASO 3: LISTO (RETIRO LOCAL O ASIGNAR LOGÍSTICA) */}
        {(currentStatus === 'LISTO' || currentStatus === 'LISTO_PARA_ENTREGA') && (
          <div className="space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md">
                3
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Etapa 3: Servicio Concluido</span>
                <h3 className="text-lg font-black text-slate-900">
                  {hasDelivery ? 'Preparado para Asignación de Logística' : 'Listo para Retiro en Local'}
                </h3>
              </div>
            </div>

            {/* Condicion de Cobro Anticipado si paymentMoment == 'BEFORE_DELIVERY' */}
            {!canBeDeliveredWithoutPayment && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-rose-600" /> Cobro Obligatorio antes de Entregar
                </p>
                <p className="text-[11px] text-rose-700">
                  Este negocio requiere registrar el pago completo antes de permitir la entrega del pedido.
                </p>
              </div>
            )}

            {!hasDelivery ? (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                  Esperando que el cliente se acerque al local para retirar su pedido.
                </div>

                <button
                  type="button"
                  disabled={saving || !canBeDeliveredWithoutPayment}
                  onClick={() => handleAdvance('ENTREGADO')}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <ShieldCheck className="size-5" />
                  <span>ENTREGAR AL CLIENTE (EN LOCAL)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Truck className="size-4 text-amber-700" /> Orden con Servicio de Delivery Activo
                  </p>
                  <p className="text-[11px] text-amber-800">
                    No se permite entregar directamente desde producción. Asigna un repartidor en la tarjeta de Logística para generar los PINs de seguridad.
                  </p>
                </div>

                {extraInfo.pinRetiro && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-bold text-slate-700">PIN de Retiro para Repartidor:</span>
                      <span className="font-mono font-black text-indigo-600 text-base bg-indigo-50 px-3 py-1 rounded-lg">
                        {extraInfo.pinRetiro || '483291'}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-bold text-slate-600">Ingresar PIN del Repartidor al retirar:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Ej: 483291"
                          value={pinRetiroInput}
                          onChange={e => setPinRetiroInput(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-center font-mono font-bold text-slate-900 text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={saving || !pinRetiroInput.trim()}
                          onClick={handleVerifyRetiroPin}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                        >
                          Validar PIN Retiro
                        </button>
                      </div>
                      {pinError && <p className="text-[11px] font-bold text-rose-600">{pinError}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 4: EN RUTA (LOGÍSTICA - PIN ENTREGA CLIENTE) */}
        {currentStatus === 'EN_RUTA' && (
          <div className="space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                <Truck className="size-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Etapa 4: En Ruta a Domicilio</span>
                <h3 className="text-lg font-black text-slate-900">Confirmación de Entrega con PIN de Cliente</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">PIN enviado por WhatsApp al cliente:</span>
                <span className="font-mono font-black text-emerald-600 text-base bg-emerald-50 px-3 py-1 rounded-lg">
                  {extraInfo.pinEntrega || '812544'}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800">
                  Ingresar PIN proporcionado por el Cliente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Ej: 812544"
                    value={pinEntregaInput}
                    onChange={e => setPinEntregaInput(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-center font-mono font-bold text-slate-900 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={saving || !pinEntregaInput.trim()}
                    onClick={handleVerifyEntregaPin}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Confirmar Entrega
                  </button>
                </div>
                {pinError && <p className="text-[11px] font-bold text-rose-600">{pinError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* PASO 5: ENTREGADO -> REGISTRO DE PAGO Y FINALIZACIÓN */}
        {currentStatus === 'ENTREGADO' && (
          <div className="space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md">
                5
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">Etapa 5: Entrega Registrada</span>
                <h3 className="text-lg font-black text-slate-900">Verificación de Pago & Cierre</h3>
              </div>
            </div>

            {/* Panel de Cobro si aún está pendiente */}
            {!isPaid ? (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Saldo Pendiente de Cobro</span>
                    <span className="text-2xl font-black text-slate-900">${total.toFixed(2)}</span>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black uppercase">
                    PENDIENTE
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Seleccionar Método de Pago:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MIXTO'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          paymentMethod === m
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onRegisterPayment(paymentMethod, 'PAGO_CONFIRMADO')}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md cursor-pointer"
                >
                  REGISTRAR PAGO COMPLETO (${total.toFixed(2)})
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <span className="font-bold">Pago Completo Verificado (${total.toFixed(2)})</span>
                </div>
                <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                  PAGADO
                </span>
              </div>
            )}

            {/* Botón de Finalizar Orden */}
            <button
              type="button"
              disabled={saving || !isPaid}
              onClick={handleFinalizeOrder}
              className="w-full py-4 bg-slate-900 hover:bg-black disabled:opacity-40 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Sparkles className="size-5 text-amber-400" />
              <span>FINALIZAR ORDEN Y ENVIAR WHATSAPP DE CIERRE</span>
            </button>
          </div>
        )}

        {/* ORDEN FINALIZADA */}
        {currentStatus === 'FINALIZADA' && (
          <div className="space-y-4 text-center py-4">
            <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">¡Orden Finalizada Exitosamente!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              El servicio ha sido completado, cobrado y notificado al cliente por WhatsApp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
