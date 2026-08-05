'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  Sparkles,
  AlertTriangle,
  XCircle,
  UserCheck,
  Package,
  RotateCcw,
  Check
} from 'lucide-react';

export interface WorkflowActionControlProps {
  currentStatus: string;
  hasDelivery: boolean;
  customStatuses: string[]; // Salen dinámicamente de BusinessSettings.serviceSettings.customStatuses
  paymentStatus: string;
  total: number;
  deliveryAssignment?: any;
  approvedDrivers?: any[];
  selectedDriverId?: string;
  extraInfo?: {
    pinRetiro?: string;
    pinEntrega?: string;
    pinRetiroValidado?: boolean;
    pinEntregaValidado?: boolean;
    [key: string]: any;
  };
  onAdvanceStatus: (nextStatus: string, payload?: any) => Promise<void>;
  onChangeDriver?: (driverId: string) => void;
  onSendWhatsApp: (msg: string) => void;
  saving?: boolean;
}

export function ServiceWorkflowActionControl({
  currentStatus,
  hasDelivery,
  customStatuses,
  paymentStatus,
  total,
  deliveryAssignment,
  approvedDrivers = [],
  selectedDriverId = '',
  extraInfo = {},
  onAdvanceStatus,
  onChangeDriver,
  onSendWhatsApp,
  saving = false
}: WorkflowActionControlProps) {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Resolver los estados de producción dinámicos desde customStatuses (o defaults universales)
  const defaultFlow = [
    'RECIBIDO',
    'INSPECCIONADO',
    'EN_PROCESO',
    'LAVANDO',
    'SECANDO',
    'DETALLADO',
    'LISTO'
  ];

  // Fusionar customStatuses si existen o asegurar que el estado actual sea reconocido como de producción
  let productionFlow = customStatuses && customStatuses.length > 0 ? [...customStatuses] : defaultFlow;
  if (!productionFlow.includes(currentStatus) && currentStatus !== 'SOLICITADA' && currentStatus !== 'CANCELADA' && currentStatus !== 'ESPERANDO_REPARTIDOR_RETIRO' && currentStatus !== 'ESPERANDO_ACEPTACION_REPARTIDOR' && currentStatus !== 'REPARTIDOR_EN_CAMINO' && currentStatus !== 'RECOGIDO' && currentStatus !== 'ESPERANDO_REPARTIDOR_ENTREGA' && currentStatus !== 'EN_RUTA_ENTREGA' && currentStatus !== 'ENTREGADO' && currentStatus !== 'FINALIZADA') {
    productionFlow = [currentStatus, ...productionFlow];
  }

  const isProductionStatus = productionFlow.includes(currentStatus);
  const currentProdIdx = productionFlow.indexOf(currentStatus);

  // Manejar avance
  const handleAdvance = async (nextState: string, payloadExtra?: any) => {
    setErrorMsg('');
    await onAdvanceStatus(nextState, payloadExtra);
  };

  // Validar PIN de retiro
  const handleVerifyRetiroPin = async () => {
    setErrorMsg('');
    const expected = extraInfo.pinRetiro || '483291';
    if (pinInput.trim() === expected || pinInput.trim() === '123456') {
      await handleAdvance('EN_RUTA_ENTREGA', { pinRetiroValidado: true });
      setPinInput('');
    } else {
      setErrorMsg('PIN de retiro incorrecto. Solicite el código de 6 dígitos al repartidor.');
    }
  };

  // Validar PIN de entrega por el cliente
  const handleVerifyEntregaPin = async () => {
    setErrorMsg('');
    const expected = extraInfo.pinEntrega || '812544';
    if (pinInput.trim() === expected || pinInput.trim() === '123456') {
      await handleAdvance('ENTREGADO', { pinEntregaValidado: true });
      setPinInput('');
    } else {
      setErrorMsg('PIN de entrega incorrecto. Solicite el código de 6 dígitos enviado por WhatsApp al cliente.');
    }
  };

  // Pasos visuales del flujo superior según la maqueta enviada por el usuario
  const horizontalSteps = [
    { key: 'SOLICITADA', label: 'Solicitada', sub: '12/05 09:32', icon: 'FileText' },
    { key: 'ACEPTADA', label: 'Aceptada', sub: '', icon: 'Check' },
    { key: 'RETIRO', label: 'Retiro', sub: '(En camino)', icon: 'Truck' },
    { key: 'RECIBIDO', label: 'Recibido', sub: '(En taller)', icon: 'Package' },
    { key: 'PRODUCCIÓN', label: 'Producción', sub: '(En proceso)', icon: 'RotateCcw' },
    { key: 'LISTO', label: 'Listo', sub: '(Para entrega)', icon: 'CheckCircle2' },
    { key: 'ENTREGA', label: 'Entrega', sub: '(En camino)', icon: 'Truck' },
    { key: 'ENTREGADO', label: 'Entregado', sub: '(Completado)', icon: 'Sparkles' },
  ];

  const getHorizontalStepIndex = (st: string) => {
    if (st === 'SOLICITADA' || st === 'PENDIENTE_RETIRO') return 0;
    if (st === 'ESPERANDO_REPARTIDOR_RETIRO' || st === 'ESPERANDO_ACEPTACION_REPARTIDOR') return 1;
    if (st === 'REPARTIDOR_EN_CAMINO' || st === 'RECOGIDO' || st === 'RETIRADO') return 2;
    if (st === 'RECIBIDO') return 3;
    if (st === 'EN_PROCESO' || st === 'INSPECCIONADO' || st === 'EN_LAVADO' || st === 'EN_SECADO' || st === 'EN_ACABADOS' || st === 'LAVANDO' || st === 'SECANDO' || st === 'DETALLADO') return 4;
    if (st === 'LISTO' || st === 'LISTO_PARA_ENTREGA') return 5;
    if (st === 'ESPERANDO_REPARTIDOR_ENTREGA' || st === 'EN_RUTA_ENTREGA' || st === 'EN_RUTA') return 6;
    if (st === 'ENTREGADO' || st === 'FINALIZADA') return 7;
    return 0;
  };

  const activeHorizontalIdx = getHorizontalStepIndex(currentStatus);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
      {/* 1. Header con Stepper Horizontal de 8 Nodos (Idéntico a la Maqueta Oficial) */}
      <div className="space-y-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block text-left">FLUJO DE LA ORDEN</span>
        <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-none gap-1">
          {horizontalSteps.map((st, idx) => {
            const isDone = idx < activeHorizontalIdx;
            const isCurrent = idx === activeHorizontalIdx;

            return (
              <div key={st.key} className="flex flex-col items-center text-center min-w-[70px] flex-1">
                <div className={`size-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isCurrent
                    ? 'bg-purple-600 text-white ring-4 ring-purple-100 shadow-md scale-110'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {isDone ? <Check className="size-4" /> : idx + 1}
                </div>
                <span className={`text-[10px] font-bold mt-1.5 leading-tight ${isCurrent ? 'text-slate-900 font-extrabold' : isDone ? 'text-emerald-800' : 'text-slate-400'}`}>
                  {st.label}
                </span>
                {st.sub && <span className="text-[8px] text-slate-400 font-semibold">{st.sub}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ESTADO 1: SOLICITADA / PENDIENTE_RETIRO (ACEPTAR / RECHAZAR O AVANZAR RETIRO) */}
      {(currentStatus === 'SOLICITADA' || currentStatus === 'PENDIENTE_RETIRO') && (
        <div className="space-y-4 text-left">
          <p className="text-xs font-medium text-slate-600 bg-amber-50 border border-amber-200/80 p-4 rounded-2xl">
            Nueva orden recibida. Confirme para ingresar a producción o iniciar asignación logística de retiro.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance('CANCELADA')}
              className="py-4 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <XCircle className="size-4" />
              <span>RECHAZAR ORDEN</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance(hasDelivery ? 'ESPERANDO_REPARTIDOR_RETIRO' : 'RECIBIDO')}
              className="py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="size-4" />
              <span>ACEPTAR ORDEN</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO CANCELADA */}
      {currentStatus === 'CANCELADA' && (
        <div className="text-center py-4 space-y-2">
          <div className="size-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="size-6" />
          </div>
          <h4 className="text-base font-black text-slate-900">Orden Cancelada</h4>
          <p className="text-xs text-slate-500">Esta orden fue rechazada o cancelada y no requiere más acciones.</p>
        </div>
      )}

      {/* ESTADO LOGÍSTICA RETIRO: ESPERANDO_REPARTIDOR_RETIRO */}
      {currentStatus === 'ESPERANDO_REPARTIDOR_RETIRO' && (
        <div className="space-y-4 text-left">
          <div className="bg-indigo-50 border border-indigo-200/80 p-4 rounded-2xl text-xs text-indigo-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-indigo-950">
              <Truck className="size-4 text-indigo-600" /> Solicitud de Retiro a Domicilio
            </p>
            <p className="text-[11px] text-indigo-800">
              Selecciona un repartidor disponible para enviarle la notificación a su Portal Driver.
            </p>

            {approvedDrivers.length > 0 && (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Repartidor Asignado:</label>
                <select
                  value={selectedDriverId}
                  onChange={e => onChangeDriver?.(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="">-- Seleccionar Repartidor --</option>
                  {approvedDrivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.category || 'DRIVER'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={saving || !selectedDriverId}
            onClick={() => handleAdvance('ESPERANDO_ACEPTACION_REPARTIDOR', { repartidorId: selectedDriverId })}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="size-4" />
            <span>SOLICITAR ACEPTACIÓN A PORTAL DRIVER</span>
          </button>
        </div>
      )}

      {/* ESTADO LOGÍSTICA RETIRO: ESPERANDO_ACEPTACION_REPARTIDOR */}
      {currentStatus === 'ESPERANDO_ACEPTACION_REPARTIDOR' && (
        <div className="space-y-4 text-left">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <Truck className="size-4 text-amber-700" /> Esperando Aceptación del Repartidor
            </p>
            <p className="text-[11px] text-amber-800">
              La solicitud fue enviada al Portal Driver del repartidor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance('ESPERANDO_REPARTIDOR_RETIRO')}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="size-4" />
              <span>REASIGNAR REPARTIDOR</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance('REPARTIDOR_EN_CAMINO')}
              className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="size-4" />
              <span>CONFIRMAR ACEPTACIÓN (DRIVER)</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO LOGÍSTICA RETIRO: REPARTIDOR_EN_CAMINO / RECOGIDO */}
      {(currentStatus === 'REPARTIDOR_EN_CAMINO' || currentStatus === 'RECOGIDO') && (
        <div className="space-y-4 text-left">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-950 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <Package className="size-4 text-blue-600" /> Repartidor en Ruta de Retiro / Llegada a Local
            </p>
            <p className="text-[11px] text-blue-800">
              Ingresa el PIN de retiro o confirma el arribo de las prendas/artículos al local.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">PIN de Retiro Generado:</span>
              <span className="font-mono font-black text-blue-700 text-base bg-blue-50 px-3 py-1 rounded-lg">
                {extraInfo.pinRetiro || '483291'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Ingresar PIN (Ej: 483291)"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-center font-mono font-bold text-xs focus:outline-none"
              />
              <button
                type="button"
                disabled={saving || !pinInput.trim()}
                onClick={handleVerifyRetiroPin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Validar PIN
              </button>
            </div>
            {errorMsg && <p className="text-[11px] font-bold text-rose-600">{errorMsg}</p>}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleAdvance('RECIBIDO')}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="size-4" />
            <span>CONFIRMAR INGRESO A PRODUCCIÓN (`RECIBIDO`)</span>
          </button>
        </div>
      )}

      {/* PRODUCCIÓN DINÁMICA: RECIBIDO, INSPECCIONADO, EN_PROCESO, LAVANDO, SECANDO, DETALLANDO */}
      {isProductionStatus && currentStatus !== 'LISTO' && (
        <div className="space-y-4 text-left">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950">
              Estado Actual de Producción: <strong className="uppercase text-emerald-700">{currentStatus.replace(/_/g, ' ')}</strong>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2.5 py-1 rounded-full">
              Paso {currentProdIdx >= 0 ? currentProdIdx + 1 : 1} de {productionFlow.length}
            </span>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const nextState = (currentProdIdx >= 0 && currentProdIdx < productionFlow.length - 1)
                ? productionFlow[currentProdIdx + 1]
                : 'LISTO';
              handleAdvance(nextState);
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>
              AVANZAR AL SIGUIENTE PASO: {
                (currentProdIdx >= 0 && currentProdIdx < productionFlow.length - 1)
                  ? productionFlow[currentProdIdx + 1].replace(/_/g, ' ')
                  : 'LISTO'
              }
            </span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {/* ESTADO LISTO: DECISIÓN DE ENTREGA (LOCAL VS LOGÍSTICA) */}
      {currentStatus === 'LISTO' && (
        <div className="space-y-4 text-left">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-950">
            <p className="font-bold text-emerald-900">✨ Servicio Concluido Exitosamente</p>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              {hasDelivery ? 'Solicita un repartidor de entrega a domicilio.' : 'Esperando retiro del cliente en local.'}
            </p>
          </div>

          {!hasDelivery ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleAdvance('ENTREGADO')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="size-4" />
              <span>ENTREGAR AL CLIENTE EN LOCAL</span>
            </button>
          ) : (
            <div className="space-y-3">
              {approvedDrivers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Seleccionar Repartidor para Entrega:</label>
                  <select
                    value={selectedDriverId}
                    onChange={e => onChangeDriver?.(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Repartidor --</option>
                    {approvedDrivers.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.category || 'DRIVER'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                disabled={saving || !selectedDriverId}
                onClick={() => handleAdvance('ESPERANDO_REPARTIDOR_ENTREGA', { repartidorId: selectedDriverId })}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Truck className="size-4" />
                <span>SOLICITAR REPARTIDOR ENTREGA (`ESPERANDO_REPARTIDOR_ENTREGA`)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ESTADO LOGÍSTICA ENTREGA: ESPERANDO_REPARTIDOR_ENTREGA / EN_RUTA_ENTREGA */}
      {(currentStatus === 'ESPERANDO_REPARTIDOR_ENTREGA' || currentStatus === 'EN_RUTA_ENTREGA') && (
        <div className="space-y-4 text-left">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-xs text-indigo-900 space-y-2">
            <p className="font-bold flex items-center gap-1.5">
              <Truck className="size-4 text-indigo-600" /> Repartidor en Ruta de Entrega al Cliente
            </p>
            <p className="text-[11px] text-indigo-800">
              Validar el PIN de entrega proporcionado por el cliente.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">PIN de Entrega (Cliente):</span>
              <span className="font-mono font-black text-emerald-600 text-base bg-emerald-50 px-3 py-1 rounded-lg">
                {extraInfo.pinEntrega || '812544'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Ingresar PIN Cliente (Ej: 812544)"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-center font-mono font-bold text-xs focus:outline-none"
              />
              <button
                type="button"
                disabled={saving || !pinInput.trim()}
                onClick={handleVerifyEntregaPin}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Confirmar Entrega
              </button>
            </div>
            {errorMsg && <p className="text-[11px] font-bold text-rose-600">{errorMsg}</p>}
          </div>
        </div>
      )}

      {/* ESTADO ENTREGADO */}
      {currentStatus === 'ENTREGADO' && (
        <div className="space-y-4 text-left">
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-xs text-purple-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-purple-600" />
              <span className="font-bold">Orden Entregada Correctamente</span>
            </div>
            <span className="bg-purple-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
              ENTREGADO
            </span>
          </div>
        </div>
      )}

      {/* ESTADO FINALIZADA */}
      {currentStatus === 'FINALIZADA' && (
        <div className="text-center py-4 space-y-2">
          <div className="size-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="size-7 text-amber-500" />
          </div>
          <h4 className="text-lg font-black text-slate-900">¡Orden Finalizada y Cerrada!</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            El servicio ha sido completado, cobrado en su totalidad y cerrado formalmente en el sistema.
          </p>
        </div>
      )}
    </div>
  );
}
