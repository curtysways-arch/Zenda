'use client';

import { useState } from 'react';
import { 
  Trophy, Plus, CheckCircle2, AlertTriangle, Play, Pause, 
  Trash2, Award, Zap, Coins, Gift, Percent, HelpCircle, ArrowRight, X
} from 'lucide-react';

interface RewardCatalog {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  valor: any;
}

interface MissionRewardDefinition {
  id: string;
  orden: number;
  RewardCatalog: RewardCatalog;
}

interface MissionPublication {
  id: string;
  fechaInicio: string | null;
  fechaFin: string | null;
}

interface MissionDefinition {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  categoria: string;
  dificultad: string;
  triggerEvent: string;
  cantidadMeta: number;
  requiresBusinessReward: boolean;
  Rewards: MissionRewardDefinition[];
  Publications: MissionPublication[];
}

interface BusinessMission {
  id: string;
  missionDefinitionId: string;
  negocioId: string;
  rewardConfiguration: any;
  status: 'PENDING_REWARD' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  publishedAt: string | null;
  MissionDefinition: MissionDefinition;
}

const mapCategory = (cat: string) => {
  const map: Record<string, string> = {
    RESERVAS: 'Reservas',
    REFERIDOS: 'Referidos',
    PERFIL: 'Perfil',
    APP: 'Descarga App',
    PAGOS: 'Pagos',
    REVIEWS: 'Reseñas',
    LEALTAD: 'Lealtad',
    ESPECIAL: 'Especial'
  };
  return map[cat] || cat;
};

const mapStatus = (status: string) => {
  const map: Record<string, string> = {
    PENDING_REWARD: 'Pendiente de Premio',
    ACTIVE: 'Activa',
    PAUSED: 'Pausada',
    ENDED: 'Finalizada'
  };
  return map[status] || status;
};

const mapDifficulty = (diff: string) => {
  const map: Record<string, string> = {
    EASY: 'Fácil',
    MEDIUM: 'Media',
    HARD: 'Difícil',
    EPIC: 'Épica',
    LEGENDARY: 'Legendaria'
  };
  return map[diff] || diff;
};

const mapTrigger = (trigger: string) => {
  const map: Record<string, string> = {
    BOOKING_COMPLETED: 'Cita Completada (BOOKING_COMPLETED)',
    USER_REGISTERED: 'Registro Nuevo (USER_REGISTERED)',
    REVIEW_CREATED: 'Reseña Publicada (REVIEW_CREATED)',
    REFERRAL_COMPLETED: 'Referido Exitoso (REFERRAL_COMPLETED)',
    CHECKIN: 'Visita / Check-in (CHECKIN)',
    PROFILE_COMPLETED: 'Perfil al 100% (PROFILE_COMPLETED)',
    APP_DOWNLOADED: 'Descarga de Aplicación (APP_DOWNLOADED)'
  };
  return map[trigger] || trigger;
};

interface LocalService {
  id: string;
  nombre: string;
  precio: number;
}

export default function BusinessMissionCatalog({
  initialCatalog,
  initialInstalled,
  primaryColor = '#0ea5e9',
  services = [],
}: {
  initialCatalog: MissionDefinition[];
  initialInstalled: BusinessMission[];
  primaryColor?: string;
  services?: LocalService[];
}) {
  const [catalog, setCatalog] = useState<MissionDefinition[]>(initialCatalog);
  const [installed, setInstalled] = useState<BusinessMission[]>(initialInstalled);
  const [selectedMission, setSelectedMission] = useState<MissionDefinition | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Wizard States
  const [rewardType, setRewardType] = useState<'CASHBACK' | 'COUPON' | 'PRODUCT_GIFT' | 'SERVICE_GIFT' | 'REGALO'>('CASHBACK');
  
  // Cashback fields
  const [cashbackValue, setCashbackValue] = useState(10);
  
  // Coupon/Discount fields
  const [couponValue, setCouponValue] = useState(15);
  const [couponValType, setCouponValType] = useState<'PORCENTAJE' | 'FIJO'>('PORCENTAJE');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [couponExpiry, setCouponExpiry] = useState(30);
  
  // Product/Service fields
  const [giftName, setGiftName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'AUTOMATICO' | 'MANUAL'>('AUTOMATICO');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInstallClick = (mission: MissionDefinition) => {
    setSelectedMission(mission);
    if (mission.requiresBusinessReward) {
      setRewardType('CASHBACK');
      setCashbackValue(10);
      setCouponValue(15);
      setCouponValType('PORCENTAJE');
      setCouponExpiry(30);
      setGiftName('');
      setSelectedServiceId('');
      setDeliveryType('AUTOMATICO');
      setWizardOpen(true);
    } else {
      // Instalar directamente sin premio local requerido
      installMission(mission.id, null);
    }
  };

  const installMission = async (definitionId: string, rewardConfig: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mission-catalog/${definitionId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardConfiguration: rewardConfig })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al instalar la misión');

      showToast('Misión instalada con éxito!', 'success');
      
      // Mover del catálogo a la lista de instaladas
      setCatalog(catalog.filter(m => m.id !== definitionId));
      setInstalled([data.businessMission, ...installed]);
      setWizardOpen(false);
      setSelectedMission(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWizardSubmit = () => {
    if (!selectedMission) return;

    let rewardConfig: any = { rewardType };

    if (rewardType === 'CASHBACK') {
      rewardConfig.valor = Number(cashbackValue);
    } else if (rewardType === 'COUPON') {
      rewardConfig.valor = {
        valor: Number(couponValue),
        tipo: couponValType,
        vencimientoDias: Number(couponExpiry),
        nombre: `Cupón por: ${selectedMission.nombre}`
      };
    } else if (rewardType === 'SERVICE_GIFT') {
      if (!selectedServiceId) {
        showToast('Por favor selecciona un servicio', 'error');
        return;
      }
      rewardConfig.valor = {
        serviceId: selectedServiceId,
        nombre: giftName,
        deliveryType,
        vencimientoDias: 30
      };
    } else {
      if (!giftName.trim()) {
        showToast('Por favor introduce el nombre del premio', 'error');
        return;
      }
      rewardConfig.valor = {
        nombre: giftName,
        deliveryType,
        vencimientoDias: 30
      };
    }

    installMission(selectedMission.id, rewardConfig);
  };

  const handleToggleStatus = async (bm: BusinessMission, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/business-missions/${bm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar estado');

      showToast(`Misión ${nextStatus === 'ACTIVE' ? 'activada' : 'pausada'} correctamente`);
      setInstalled(installed.map(item => item.id === bm.id ? { ...item, status: nextStatus } : item));
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400">
            <Zap className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest leading-none">Marketplace de Misiones</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-none">Misiones Especiales de la Red Citiox</h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Instala misiones oficiales diseñadas por la plataforma. Tus clientes ganan XP globales y recompensas oficiales, mientras tú decides qué premio local ofrecerles.
          </p>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Misiones Disponibles para Instalar</h2>
            <p className="text-xs text-slate-400 mt-1">Explora las campañas activas de Citiox y actívalas en tu local.</p>
          </div>
        </div>

        {catalog.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-850 p-12 rounded-3xl text-center text-slate-400 text-sm bg-white dark:bg-slate-900">
            No hay nuevas misiones del catálogo disponibles en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-500 font-bold uppercase tracking-wider">{mapCategory(m.categoria)}</span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-tight">{m.nombre}</h3>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">{mapDifficulty(m.dificultad)}</span>
                  </div>

                  <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-3">{m.descripcion}</p>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                    <p className="text-xs font-bold text-slate-400">Objetivo del cliente:</p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Hacer <strong className="font-bold text-slate-900 dark:text-white">{m.cantidadMeta}</strong> veces el evento <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{mapTrigger(m.triggerEvent)}</code>
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    {m.requiresBusinessReward ? '🎁 Requiere premio local' : '✨ Premio Citiox directo'}
                  </span>
                  <button 
                    onClick={() => handleInstallClick(m)}
                    className="flex items-center gap-1.5 font-black text-xs text-white px-4 py-2.5 rounded-xl shadow-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Instalar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Installed Grid */}
      <div className="space-y-6 pt-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">Misiones Activas en mi Negocio</h2>
          <p className="text-xs text-slate-400 mt-1">Supervisa y controla el estado de las misiones que tus clientes están jugando actualmente.</p>
        </div>

        {installed.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-850 p-12 rounded-3xl text-center text-slate-400 text-sm bg-white dark:bg-slate-900">
            No has instalado ninguna misión aún. Explora el catálogo de arriba para empezar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {installed.map(bm => (
              <div key={bm.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-lg text-slate-500 font-bold uppercase tracking-wider">{mapCategory(bm.MissionDefinition.categoria)}</span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mt-2 leading-tight">{bm.MissionDefinition.nombre}</h3>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      bm.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' :
                      bm.status === 'PAUSED' ? 'bg-amber-500/10 text-amber-600' :
                      bm.status === 'PENDING_REWARD' ? 'bg-indigo-500/10 text-indigo-650' : 'bg-slate-500/10 text-slate-500'
                    }`}>{mapStatus(bm.status)}</span>
                  </div>

                  {bm.rewardConfiguration && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tu Recompensa Local:</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {bm.rewardConfiguration.rewardType === 'CASHBACK' && `💰 Cashback: $${bm.rewardConfiguration.valor}`}
                        {bm.rewardConfiguration.rewardType === 'COUPON' && `🎟️ Cupón: ${bm.rewardConfiguration.valor.valor}% descuento`}
                        {['PRODUCT_GIFT', 'SERVICE_GIFT', 'REGALO'].includes(bm.rewardConfiguration.rewardType) && `🎁 Regalo: ${bm.rewardConfiguration.valor.nombre}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                  <button 
                    onClick={() => handleToggleStatus(bm, bm.status)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 transition-all font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 py-2.5 rounded-xl"
                  >
                    {bm.status === 'ACTIVE' ? (
                      <><Pause className="w-3.5 h-3.5" /> Pausar</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Activar</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      {wizardOpen && selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
            {/* Wizard Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instalación - Paso Único</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">Configurar Recompensa Local</h3>
              </div>
              <button 
                onClick={() => setWizardOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Form */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[450px]">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Esta misión requiere que tu negocio configure un premio local para activar el juego. El cliente obtendrá este premio de inmediato al completarla.
              </div>

              {/* Selector de Recompensa */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Selecciona el tipo de premio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setRewardType('CASHBACK')}
                    className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${
                      rewardType === 'CASHBACK' 
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Coins className="w-4 h-4" /> Cashback
                  </button>
                  <button 
                    onClick={() => setRewardType('COUPON')}
                    className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${
                      rewardType === 'COUPON' 
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Percent className="w-4 h-4" /> Cupón / Descuento
                  </button>
                  <button 
                    onClick={() => setRewardType('PRODUCT_GIFT')}
                    className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${
                      rewardType === 'PRODUCT_GIFT' 
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Gift className="w-4 h-4" /> Producto gratis
                  </button>
                  <button 
                    onClick={() => setRewardType('SERVICE_GIFT')}
                    className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${
                      rewardType === 'SERVICE_GIFT' 
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Award className="w-4 h-4" /> Servicio gratis
                  </button>
                </div>
              </div>

              {/* Dynamic Inputs based on selection */}
              {rewardType === 'CASHBACK' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Monto de Cashback (USD)</label>
                  <input 
                    type="number" 
                    min={1}
                    value={cashbackValue}
                    onChange={e => setCashbackValue(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {rewardType === 'COUPON' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Monto del Descuento</label>
                      <input 
                        type="number" 
                        min={1}
                        value={couponValue}
                        onChange={e => setCouponValue(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo de Descuento</label>
                      <select 
                        value={couponValType} 
                        onChange={e => setCouponValType(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="PORCENTAJE" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Porcentaje (%)</option>
                        <option value="FIJO" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Fijo ($)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Días de Vencimiento</label>
                    <input 
                      type="number" 
                      min={1}
                      value={couponExpiry}
                      onChange={e => setCouponExpiry(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {rewardType === 'SERVICE_GIFT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Seleccionar Servicio Gratis de tu Spa</label>
                    <select 
                      value={selectedServiceId} 
                      onChange={e => {
                        const sId = e.target.value;
                        setSelectedServiceId(sId);
                        const sObj = services.find(s => s.id === sId);
                        setGiftName(sObj ? sObj.nombre : '');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                      required
                    >
                      <option value="" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">-- Seleccionar Servicio --</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id} className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">
                          {s.nombre} (${s.precio || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo de Entrega</label>
                    <select 
                      value={deliveryType} 
                      onChange={e => setDeliveryType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="AUTOMATICO" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Automático (Canje en App)</option>
                      <option value="MANUAL" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Manual por el Staff</option>
                    </select>
                  </div>
                </div>
              )}

              {['PRODUCT_GIFT', 'REGALO'].includes(rewardType) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nombre del Regalo / Premio</label>
                    <input 
                      type="text" 
                      value={giftName}
                      onChange={e => setGiftName(e.target.value)}
                      placeholder="Ej: Crema Hidratante / Aceite de Masajes"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tipo de Entrega</label>
                    <select 
                      value={deliveryType} 
                      onChange={e => setDeliveryType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="AUTOMATICO" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Automático (Canje en App)</option>
                      <option value="MANUAL" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white">Manual por el Staff</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <button 
                onClick={() => setWizardOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button 
                onClick={handleWizardSubmit}
                disabled={loading}
                className="font-black text-xs text-white px-6 py-3 rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? 'Instalando...' : 'Completar Instalación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
