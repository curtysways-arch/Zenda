'use client';

import { useState } from 'react';
import {
  Trophy, Trash2, Edit2, CheckCircle2, X, Save,
  Sparkles, Zap, Users, Calendar, Briefcase, Crown, Link,
  Smartphone, UserCheck, Coins, Award, Loader2, Users2, Plus
} from 'lucide-react';
import { GlobalMissionType, GlobalRewardType, MissionCategory, QuestDifficulty } from '@prisma/client';

interface GlobalMission {
  id: string; titulo: string; descripcion: string; tipo: GlobalMissionType;
  objetivo: number; recompensaTipo: GlobalRewardType; recompensaValor: any;
  fechaInicio: string | null; fechaFin: string | null; activa: boolean;
  prioridad: number; icono: string | null; color: string | null;
}
interface ClientMission {
  id: string; nombre: string; descripcion: string; categoria: MissionCategory;
  dificultad: QuestDifficulty; triggerEvent: string; cantidadMeta: number;
  status: string; requiresBusinessReward: boolean; version: string;
}
interface RewardCatalog { id: string; nombre: string; tipo: string; }
type MissionType = 'NEGOCIO' | 'CLIENTE';

const cn = (...cls: (string|boolean|undefined)[]) => cls.filter(Boolean).join(' ');

const TRIGGER_LABELS: Record<string,string> = {
  BOOKING_COMPLETED:'Cita Completada', USER_REGISTERED:'Registro Nuevo',
  REVIEW_CREATED:'Reseña Publicada', REFERRAL_COMPLETED:'Referido Exitoso',
  CHECKIN:'Visita / Check-in', PROFILE_COMPLETED:'Perfil al 100%', APP_DOWNLOADED:'Descarga de App',
};

const renderIcon = (name: string, col: string) => {
  const style = { color: col };
  switch(name){
    case 'Zap': return <Zap size={20} style={style}/>;
    case 'Users': return <Users size={20} style={style}/>;
    case 'Calendar': return <Calendar size={20} style={style}/>;
    case 'Briefcase': return <Briefcase size={20} style={style}/>;
    case 'Crown': return <Crown size={20} style={style}/>;
    case 'Link': return <Link size={20} style={style}/>;
    case 'Smartphone': return <Smartphone size={20} style={style}/>;
    case 'UserCheck': return <UserCheck size={20} style={style}/>;
    case 'Coins': return <Coins size={20} style={style}/>;
    case 'Award': return <Award size={20} style={style}/>;
    default: return <Trophy size={20} style={style}/>;
  }
};

export default function MisionesUnificadasClient({
  initialBusiness, initialClients, rewardCatalog,
}: {
  initialBusiness: GlobalMission[]; initialClients: ClientMission[]; rewardCatalog: RewardCatalog[];
}) {
  const [activeTab, setActiveTab] = useState<'MISIONES' | 'RECOMPENSAS'>('MISIONES');
  const [businessMissions, setBusinessMissions] = useState<GlobalMission[]>(initialBusiness);
  const [clientMissions, setClientMissions] = useState<ClientMission[]>(initialClients);
  const [rewardsList, setRewardsList] = useState<RewardCatalog[]>(rewardCatalog);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [missionType, setMissionType] = useState<MissionType>('CLIENTE');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null);
  const [editingBusiness, setEditingBusiness] = useState<GlobalMission|null>(null);
  const [editingClient, setEditingClient] = useState<ClientMission|null>(null);
  const [editingReward, setEditingReward] = useState<any|null>(null);

  // Negocio form
  const [titulo, setTitulo] = useState('');
  const [descripcionNeg, setDescripcionNeg] = useState('');
  const [tipo, setTipo] = useState<GlobalMissionType>(GlobalMissionType.COMPLETED_RESERVATIONS);
  const [objetivo, setObjetivo] = useState(10);
  const [recompensaTipo, setRecompensaTipo] = useState<GlobalRewardType>(GlobalRewardType.FREE_DAYS);
  const [recompensaValorInput, setRecompensaValorInput] = useState('15');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [activa, setActiva] = useState(true);
  const [prioridad, setPrioridad] = useState(0);
  const [icono, setIcono] = useState('Trophy');
  const [color, setColor] = useState('#6366f1');

  // Cliente form
  const [nombre, setNombre] = useState('');
  const [descripcionCli, setDescripcionCli] = useState('');
  const [categoria, setCategoria] = useState<MissionCategory>('RESERVAS' as MissionCategory);
  const [dificultad, setDificultad] = useState<QuestDifficulty>('MEDIUM' as QuestDifficulty);
  const [triggerEvent, setTriggerEvent] = useState('BOOKING_COMPLETED');
  const [cantidadMeta, setCantidadMeta] = useState(1);
  const [requiresBusinessReward, setRequiresBusinessReward] = useState(false);
  const [version, setVersion] = useState('1.0.0');
  const [selectedRewardIds, setSelectedRewardIds] = useState<string[]>([]);

  // Recompensa Catalog form
  const [rewardNombre, setRewardNombre] = useState('');
  const [rewardDescripcion, setRewardDescripcion] = useState('');
  const [rewardTipo, setRewardTipo] = useState<string>('COUPON');
  const [rewardHandler, setRewardHandler] = useState<string>('coupon');
  const [rewardConfigValor, setRewardConfigValor] = useState('10');
  const [rewardConfigTipo, setRewardConfigTipo] = useState('PORCENTAJE');
  const [rewardCostoPuntos, setRewardCostoPuntos] = useState('500');

  const showToast = (msg: string, type: 'success'|'error'='success') => {
    setToast({msg, type}); setTimeout(()=>setToast(null), 3500);
  };

  const resetNeg = () => {
    setTitulo(''); setDescripcionNeg('');
    setTipo(GlobalMissionType.COMPLETED_RESERVATIONS); setObjetivo(10);
    setRecompensaTipo(GlobalRewardType.FREE_DAYS); setRecompensaValorInput('15');
    setFechaInicio(''); setFechaFin(''); setActiva(true); setPrioridad(0);
    setIcono('Trophy'); setColor('#6366f1');
  };
  const resetCli = () => {
    setNombre(''); setDescripcionCli('');
    setCategoria('RESERVAS' as MissionCategory); setDificultad('MEDIUM' as QuestDifficulty);
    setTriggerEvent('BOOKING_COMPLETED'); setCantidadMeta(1);
    setRequiresBusinessReward(false); setVersion('1.0.0'); setSelectedRewardIds([]);
  };
  const resetReward = () => {
    setRewardNombre(''); setRewardDescripcion('');
    setRewardTipo('COUPON'); setRewardHandler('coupon');
    setRewardConfigValor('10'); setRewardConfigTipo('PORCENTAJE');
    setRewardCostoPuntos('500');
    setEditingReward(null);
  };

  const openCreate = (t: MissionType) => {
    setMissionType(t); setEditingBusiness(null); setEditingClient(null);
    resetNeg(); resetCli(); setIsModalOpen(true);
  };

  const openCreateReward = () => {
    resetReward(); setIsRewardModalOpen(true);
  };

  const openEditReward = (r: any) => {
    setEditingReward(r);
    setRewardNombre(r.nombre);
    setRewardDescripcion(r.descripcion || '');
    setRewardTipo(r.tipo);
    setRewardHandler(r.handler);
    
    // Extraer config
    const conf = r.config || {};
    setRewardCostoPuntos(String(conf.costoPuntos || '500'));
    if (r.tipo === 'COUPON') {
      setRewardConfigValor(String(conf.valor || '10'));
      setRewardConfigTipo(conf.tipo || 'PORCENTAJE');
    } else if (r.tipo === 'XP') {
      setRewardConfigValor(String(conf.xp || '100'));
    } else if (r.tipo === 'FREE_DAYS') {
      setRewardConfigValor(String(conf.dias || '15'));
    } else if (r.tipo === 'CASHBACK' || r.tipo === 'DIAMONDS') {
      setRewardConfigValor(String(conf.valor || '15'));
    } else {
      setRewardConfigValor(JSON.stringify(conf));
    }
    
    setIsRewardModalOpen(true);
  };


  const openEditBusiness = (m: GlobalMission) => {
    setMissionType('NEGOCIO'); setEditingBusiness(m); setEditingClient(null);
    setTitulo(m.titulo); setDescripcionNeg(m.descripcion); setTipo(m.tipo); setObjetivo(m.objetivo);
    setRecompensaTipo(m.recompensaTipo);
    let val = '';
    if(m.recompensaValor){
      if(m.recompensaTipo==='FREE_DAYS') val=String(m.recompensaValor.dias||'');
      else if(m.recompensaTipo==='DIAMONDS') val=String(m.recompensaValor.diamantes||'');
      else if(m.recompensaTipo==='CREDITS') val=String(m.recompensaValor.creditos||'');
      else if(m.recompensaTipo==='BADGE') val=String(m.recompensaValor.badge||'');
      else if(m.recompensaTipo==='UNLOCK_FEATURE') val=String(m.recompensaValor.feature||'');
      else val=JSON.stringify(m.recompensaValor);
    }
    setRecompensaValorInput(val);
    setFechaInicio(m.fechaInicio?m.fechaInicio.split('T')[0]:'');
    setFechaFin(m.fechaFin?m.fechaFin.split('T')[0]:'');
    setActiva(m.activa); setPrioridad(m.prioridad);
    setIcono(m.icono||'Trophy'); setColor(m.color||'#6366f1');
    setIsModalOpen(true);
  };

  const openEditClient = (m: ClientMission) => {
    setMissionType('CLIENTE'); setEditingClient(m); setEditingBusiness(null);
    setNombre(m.nombre); setDescripcionCli(m.descripcion); setCategoria(m.categoria);
    setDificultad(m.dificultad); setTriggerEvent(m.triggerEvent); setCantidadMeta(m.cantidadMeta);
    setRequiresBusinessReward(m.requiresBusinessReward); setVersion(m.version);
    setSelectedRewardIds([]); setIsModalOpen(true);
  };

  const handleRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      let configObj: any = {};
      if (rewardTipo === 'COUPON') {
        configObj = { tipo: rewardConfigTipo, valor: parseFloat(rewardConfigValor) || 0 };
      } else if (rewardTipo === 'XP') {
        configObj = { xp: parseInt(rewardConfigValor) || 0 };
      } else if (rewardTipo === 'FREE_DAYS') {
        configObj = { dias: parseInt(rewardConfigValor) || 0 };
      } else if (rewardTipo === 'CASHBACK') {
        configObj = { valor: parseFloat(rewardConfigValor) || 0 };
      } else if (rewardTipo === 'DIAMONDS') {
        configObj = { valor: parseInt(rewardConfigValor) || 0 };
      } else {
        try { configObj = JSON.parse(rewardConfigValor); } catch { configObj = { valor: rewardConfigValor }; }
      }

      configObj.costoPuntos = parseInt(rewardCostoPuntos) || 0;

      const payload = {
        nombre: rewardNombre,
        descripcion: rewardDescripcion,
        tipo: rewardTipo,
        handler: rewardHandler,
        config: configObj
      };

      const url = editingReward
        ? `/api/superadmin/rewards/${editingReward.id}`
        : '/api/superadmin/rewards';

      const res = await fetch(url, {
        method: editingReward ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al guardar premio');

      showToast(editingReward ? 'Recompensa actualizada' : 'Recompensa creada con éxito');
      setIsRewardModalOpen(false);

      // Recargar catálogo
      const lr = await fetch('/api/superadmin/rewards');
      const ld = await lr.json();
      if (ld.success) setRewardsList(ld.rewards);

    } catch (err: any) {
      showToast(err.message || 'Error de conexión', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReward = async (id: string) => {
    if (!confirm('¿Eliminar esta recompensa del catálogo?')) return;
    try {
      const res = await fetch(`/api/superadmin/rewards/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Recompensa eliminada del catálogo');
        setRewardsList(p => p.filter(r => r.id !== id));
      } else {
        throw new Error(data.error || 'Error al eliminar');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar recompensa', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if(missionType==='NEGOCIO'){
        let rv: any={};
        if(recompensaTipo==='FREE_DAYS') rv={dias:parseInt(recompensaValorInput)||0};
        else if(recompensaTipo==='DIAMONDS') rv={diamantes:parseInt(recompensaValorInput)||0};
        else if(recompensaTipo==='CREDITS') rv={creditos:parseFloat(recompensaValorInput)||0};
        else if(recompensaTipo==='BADGE') rv={badge:recompensaValorInput};
        else if(recompensaTipo==='UNLOCK_FEATURE') rv={feature:recompensaValorInput};
        else{ try{ rv=JSON.parse(recompensaValorInput); }catch{ rv={valor:recompensaValorInput}; } }
        const payload={
          titulo, descripcion:descripcionNeg, tipo,
          objetivo:parseInt(String(objetivo))||1, recompensaTipo, recompensaValor:rv,
          fechaInicio:fechaInicio?new Date(fechaInicio).toISOString():null,
          fechaFin:fechaFin?new Date(fechaFin).toISOString():null,
          activa, prioridad:parseInt(String(prioridad))||0, icono, color
        };
        const url=editingBusiness
          ?`/api/superadmin/misiones-globales/${editingBusiness.id}`
          :'/api/superadmin/misiones-globales';
        const res=await fetch(url,{method:editingBusiness?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const data=await res.json();
        if(!res.ok||!data.success) throw new Error(data.error||'Error al guardar');
        showToast(editingBusiness?'Misión de negocio actualizada':'Misión de negocio creada');
        const lr=await fetch('/api/superadmin/misiones-globales');
        const ld=await lr.json();
        if(ld.success) setBusinessMissions(ld.missions);
      } else {
        const payload={
          nombre, descripcion:descripcionCli, categoria, dificultad,
          triggerEvent, cantidadMeta, requiresBusinessReward, version,
          rewardIds:selectedRewardIds, status:'DRAFT'
        };
        const url=editingClient
          ?`/api/superadmin/mission-definitions/${editingClient.id}`
          :'/api/superadmin/mission-definitions';
        const res=await fetch(url,{method:editingClient?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const data=await res.json();
        if(!res.ok) throw new Error(data.error||'Error al guardar');
        showToast(editingClient?'Misión de cliente actualizada':'Misión de cliente creada');
        const lr=await fetch('/api/superadmin/mission-definitions');
        const ld=await lr.json();
        
        // Fix: admitir tanto arreglo directo como objeto con la propiedad missions
        const rawMissions = Array.isArray(ld) ? ld : (ld.missions || []);
        setClientMissions(rawMissions.map((m:any)=>({
          id:m.id, nombre:m.nombre, descripcion:m.descripcion, categoria:m.categoria,
          dificultad:m.dificultad, triggerEvent:m.triggerEvent, cantidadMeta:m.cantidadMeta,
          status:m.status, requiresBusinessReward:m.requiresBusinessReward, version:m.version
        })));
      }
      setIsModalOpen(false);
    } catch(err:any){ showToast(err.message||'Error de conexión','error'); }
    finally{ setSubmitting(false); }
  };

  const deleteBusiness = async (id:string) => {
    if(!confirm('¿Eliminar esta misión de negocio?')) return;
    const res=await fetch(`/api/superadmin/misiones-globales/${id}`,{method:'DELETE'});
    if(res.ok){showToast('Misión eliminada');setBusinessMissions(p=>p.filter(m=>m.id!==id));}
    else showToast('Error al eliminar','error');
  };
  const deleteClient = async (id:string) => {
    if(!confirm('¿Eliminar esta misión de cliente?')) return;
    const res=await fetch(`/api/superadmin/mission-definitions/${id}`,{method:'DELETE'});
    if(res.ok){showToast('Misión eliminada');setClientMissions(p=>p.filter(m=>m.id!==id));}
    else showToast('Error al eliminar','error');
  };
  const publishClient = async (id:string) => {
    const res=await fetch(`/api/superadmin/mission-definitions/${id}/publish`,{method:'POST'});
    if(res.ok){showToast('Misión publicada');setClientMissions(p=>p.map(m=>m.id===id?{...m,status:'PUBLISHED'}:m));}
    else showToast('Error al publicar','error');
  };
  const toggleActive = async (m:GlobalMission) => {
    const res=await fetch(`/api/superadmin/misiones-globales/${m.id}`,{
      method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({activa:!m.activa})
    });
    if(res.ok){
      showToast(m.activa?'Misión pausada':'Misión activada');
      setBusinessMissions(p=>p.map(x=>x.id===m.id?{...x,activa:!x.activa}:x));
    }
  };

  const rewardLabel=(m:GlobalMission)=>{
    if(m.recompensaTipo==='FREE_DAYS') return `+${m.recompensaValor?.dias??0} Días gratis`;
    if(m.recompensaTipo==='DIAMONDS') return `+${m.recompensaValor?.diamantes??0} Diamantes`;
    if(m.recompensaTipo==='CREDITS') return `+$${m.recompensaValor?.creditos??0} Créditos`;
    if(m.recompensaTipo==='BADGE') return `Insignia: ${m.recompensaValor?.badge??''}`;
    if(m.recompensaTipo==='UNLOCK_FEATURE') return `Función: ${m.recompensaValor?.feature??''}`;
    return 'Promoción';
  };
  const statusStyle=(s:string)=>{
    if(s==='PUBLISHED') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400';
    if(s==='ARCHIVED') return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400';
  };
  const statusLabel=(s:string)=>s==='PUBLISHED'?'Publicada':s==='ARCHIVED'?'Archivada':'Borrador';

  const inputCls='w-full px-4 py-3 bg-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 text-slate-800 placeholder:text-slate-400';

  const labelCls='block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1';

  return (
    <div className="space-y-8">
      {toast&&(
        <div className={cn('fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border text-xs font-black uppercase tracking-widest',
          toast.type==='success'?'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800':'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800')}>
          {toast.type==='success'?<CheckCircle2 size={16}/>:<X size={16}/>} {toast.msg}
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[2rem] gap-2 border border-slate-200 dark:border-slate-800 max-w-md">
        <button onClick={() => setActiveTab('MISIONES')} className={cn('flex-1 py-3 text-center rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all cursor-pointer', activeTab === 'MISIONES' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}>
          Misiones Citiox
        </button>
        <button onClick={() => setActiveTab('RECOMPENSAS')} className={cn('flex-1 py-3 text-center rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all cursor-pointer', activeTab === 'RECOMPENSAS' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}>
          Premios y Cupones
        </button>
      </div>

      {activeTab === 'MISIONES' ? (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"/>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/20 rounded-xl"><Trophy className="text-indigo-400" size={24}/></div>
                <h1 className="text-2xl font-black tracking-tight">Misiones Citiox</h1>
              </div>
              <p className="text-slate-400 text-sm">Gestiona campañas para negocios y retos de gamificación para clientes desde un solo lugar.</p>
            </div>
            <div className="flex gap-3 relative z-10 flex-wrap">
              <button onClick={()=>openCreate('NEGOCIO')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer">
                <Briefcase size={14}/> Nueva (Negocio)
              </button>
              <button onClick={()=>openCreate('CLIENTE')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer">
                <Users2 size={14}/> Nueva (Cliente)
              </button>
            </div>
          </div>

          {/* Seccion Negocio */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-950/40 rounded-xl"><Briefcase size={16} className="text-amber-600 dark:text-amber-400"/></div>
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Misiones de Negocio</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">{businessMissions.length}</span>
            </div>
            {businessMissions.length===0?(
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
                <Briefcase className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={36}/>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sin misiones de negocio. Crea la primera.</p>
              </div>
            ):(
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {businessMissions.map(m=>(
                  <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all group">
                    <div className="p-5 flex-1 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500" style={{backgroundColor:m.color||'#f59e0b'}}/>
                      <div className="relative z-10 flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800" style={{backgroundColor:`${m.color||'#f59e0b'}15`}}>{renderIcon(m.icono||'Trophy',m.color||'#f59e0b')}</div>
                        <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border',m.activa?'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400':'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700')}>{m.activa?'Activa':'Pausada'}</span>
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm mb-1 uppercase tracking-tight">{m.titulo}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{m.descripcion}</p>
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex justify-between"><span className="text-slate-400">Tipo</span><span className="text-slate-700 dark:text-slate-300">{m.tipo.replace(/_/g,' ')} · Meta {m.objetivo}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Premio</span><span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Sparkles size={10}/>{rewardLabel(m)}</span></div>
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <button onClick={()=>toggleActive(m)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all">{m.activa?'Pausar':'Activar'}</button>
                      <div className="flex gap-1">
                        <button onClick={()=>openEditBusiness(m)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"><Edit2 size={14}/></button>
                        <button onClick={()=>deleteBusiness(m.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Seccion Cliente */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl"><Users2 size={16} className="text-indigo-600 dark:text-indigo-400"/></div>
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Misiones de Cliente</h2>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">{clientMissions.length}</span>
            </div>
            {clientMissions.length===0?(
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
                <Users2 className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={36}/>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sin misiones de cliente. Crea la primera.</p>
              </div>
            ):(
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {clientMissions.map(m=>(
                  <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all">
                    <div className="p-5 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl"><Trophy size={16} className="text-indigo-500"/></div>
                        <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border',statusStyle(m.status))}>{statusLabel(m.status)}</span>
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm mb-1 uppercase tracking-tight">{m.nombre}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{m.descripcion}</p>
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex justify-between"><span className="text-slate-400">Trigger</span><span className="text-slate-700 dark:text-slate-300">{TRIGGER_LABELS[m.triggerEvent]||m.triggerEvent} x{m.cantidadMeta}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Categoria</span><span className="text-slate-700 dark:text-slate-300">{m.categoria}</span></div>
                        {m.requiresBusinessReward&&<div className="flex justify-between"><span className="text-slate-400">Premio</span><span className="text-amber-600 dark:text-amber-400">Requiere config. local</span></div>}
                      </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      {m.status!=='PUBLISHED'?<button onClick={()=>publishClient(m.id)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer active:scale-95 transition-all">Publicar</button>:<div/>}
                      <div className="flex gap-1">
                        <button onClick={()=>openEditClient(m)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors"><Edit2 size={14}/></button>
                        <button onClick={()=>deleteClient(m.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Header Catálogo Recompensas */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"/>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/20 rounded-xl"><Coins className="text-indigo-400" size={24}/></div>
                <h1 className="text-2xl font-black tracking-tight">Premios y Cupones Globales</h1>
              </div>
              <p className="text-slate-400 text-sm">Gestiona el catálogo central de recompensas que los negocios pueden usar para sus misiones de cliente.</p>
            </div>
            <div className="flex gap-3 relative z-10">
              <button onClick={openCreateReward} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer">
                <Plus size={14}/> Nuevo Premio / Cupón
              </button>
            </div>
          </div>

          {/* Grid Catálogo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewardsList.map((r: any) => (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <div className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border', r.tipo === 'COUPON' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400')}>
                      {r.tipo}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{r.handler}</span>
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base mb-1 uppercase tracking-tight">{r.nombre}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{r.descripcion || 'Sin descripción'}</p>
                  
                  {/* Detalles Config */}
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-400 mb-1">Configuración técnica</span>
                    {r.tipo === 'COUPON' ? (
                      <div>Cupón: {r.config?.valor || 0}{r.config?.tipo === 'PORCENTAJE' ? '%' : ' USD'} de descuento</div>
                    ) : r.tipo === 'XP' ? (
                      <div>Puntos: +{r.config?.xp || 0} XP para el cliente</div>
                    ) : r.tipo === 'FREE_DAYS' ? (
                      <div>Días: {r.config?.dias || 0} días gratis de suscripción</div>
                    ) : (
                      <pre className="text-[9px] overflow-x-auto">{JSON.stringify(r.config, null, 2)}</pre>
                    )}
                  </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-2">
                  <button onClick={() => openEditReward(r)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-all cursor-pointer"><Edit2 size={14}/></button>
                  <button onClick={() => deleteReward(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL MISIONES */}
      {isModalOpen&&(
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3 flex-wrap">
                {!(editingBusiness||editingClient)&&(
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                    <button type="button" onClick={()=>setMissionType('CLIENTE')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer',missionType==='CLIENTE'?'bg-indigo-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700 dark:text-slate-400')}>
                      <Users2 size={12}/> Cliente
                    </button>
                    <button type="button" onClick={()=>setMissionType('NEGOCIO')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer',missionType==='NEGOCIO'?'bg-amber-500 text-white shadow-sm':'text-slate-500 hover:text-slate-700 dark:text-slate-400')}>
                      <Briefcase size={12}/> Negocio
                    </button>
                  </div>
                )}
                <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">
                  {editingBusiness?'Editar Misión de Negocio':editingClient?'Editar Misión de Cliente':missionType==='NEGOCIO'?'Nueva Misión de Negocio':'Nueva Misión de Cliente'}
                </h3>
              </div>
              <button onClick={()=>setIsModalOpen(false)} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer active:scale-95 transition-all shrink-0"><X size={16}/></button>
            </div>

            <div className={cn('px-8 py-2 text-[9px] font-black uppercase tracking-widest flex items-center gap-2',missionType==='NEGOCIO'?'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400':'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400')}>
              {missionType==='NEGOCIO'?<><Briefcase size={10}/> El dueño del negocio completa esta misión — la recompensa beneficia a su cuenta Citiox</>:<><Users2 size={10}/> El cliente final completa esta misión — la recompensa puede ser global o del negocio</>}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{missionType==='NEGOCIO'?'Título *':'Nombre *'}</label>
                  {missionType==='NEGOCIO'
                    ?<input type="text" required value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej: Consigue tus primeras 10 reservas" className={inputCls}/>
                    :<input type="text" required value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Completa tu primera cita" className={inputCls}/>}
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Descripción *</label>
                  {missionType==='NEGOCIO'
                    ?<textarea required value={descripcionNeg} onChange={e=>setDescripcionNeg(e.target.value)} rows={2} placeholder="Describe el reto para el administrador del negocio." className={inputCls+' resize-none'}/>
                    :<textarea required value={descripcionCli} onChange={e=>setDescripcionCli(e.target.value)} rows={2} placeholder="Describe qué debe hacer el usuario para completar esta misión." className={inputCls+' resize-none'}/>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"/>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{missionType==='NEGOCIO'?'Acción y Objetivo':'Trigger y Condiciones'}</span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"/>
              </div>

              {missionType==='NEGOCIO'&&(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Tipo de Misión</label>
                    <select value={tipo} onChange={e=>setTipo(e.target.value as GlobalMissionType)} className={inputCls}>
                      <option value="COMPLETED_RESERVATIONS">Reservas Completadas</option>
                      <option value="FIRST_RESERVATIONS">Primeras Reservas</option>
                      <option value="CLIENTS_REGISTERED">Clientes Registrados</option>
                      <option value="SERVICES_CREATED">Servicios Creados</option>
                      <option value="STAFF_CREATED">Personal Creado</option>
                      <option value="PROFILE_COMPLETED">Perfil Completo</option>
                      <option value="LOYALTY_ENABLED">Club de Fidelización Activo</option>
                      <option value="REFERRALS">Negocios Invitados</option>
                      <option value="APP_DOWNLOAD">Descarga de App</option>
                      <option value="CONSECUTIVE_RESERVATIONS">Reservas Consecutivas</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Objetivo (meta numérica)</label>
                    <input type="number" required min={1} value={objetivo} onChange={e=>setObjetivo(parseInt(e.target.value)||1)} className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>Tipo de Recompensa</label>
                    <select 
                      value={recompensaTipo} 
                      onChange={e => {
                        const newType = e.target.value as GlobalRewardType;
                        setRecompensaTipo(newType);
                        if (newType === 'UNLOCK_FEATURE') {
                          const validFeatures = [
                            'whatsapp_notifications', 'whatsapp_otp', 'whatsapp_reminders', 'whatsapp_campaigns',
                            'custom_colors', 'custom_logo', 'custom_phrases', 'remove_zenda_branding',
                            'multi_staff', 'multi_branch', 'analytics', 'automation',
                            'tournaments_module', 'courses_module', 'automatic_discounts'
                          ];
                          if (!validFeatures.includes(recompensaValorInput)) {
                            setRecompensaValorInput('whatsapp_notifications');
                          }
                        } else if (newType === 'FREE_DAYS' && isNaN(Number(recompensaValorInput))) {
                          setRecompensaValorInput('15');
                        }
                      }} 
                      className={inputCls}
                    >
                      <option value="FREE_DAYS">Días Gratis (Suscripción)</option>
                      <option value="DIAMONDS">Diamantes Citiox</option>
                      <option value="CREDITS">Créditos / Saldo</option>
                      <option value="BADGE">Insignia Especial</option>
                      <option value="UNLOCK_FEATURE">Desbloquear Función</option>
                      <option value="PROMOTION">Promoción</option>
                    </select>
                  </div>
                  <div>
                    {recompensaTipo === 'UNLOCK_FEATURE' ? (
                      <>
                        <label className={labelCls}>Función a Desbloquear</label>
                        <select 
                          value={recompensaValorInput} 
                          onChange={e => setRecompensaValorInput(e.target.value)} 
                          className={inputCls}
                        >
                          <option value="whatsapp_notifications">Notificaciones básicas por WhatsApp</option>
                          <option value="whatsapp_otp">Verificación OTP por WhatsApp</option>
                          <option value="whatsapp_reminders">Recordatorios automáticos por WhatsApp</option>
                          <option value="whatsapp_campaigns">Campañas de marketing por WhatsApp</option>
                          <option value="custom_colors">Colores de marca personalizados</option>
                          <option value="custom_logo">Carga de logotipo de negocio</option>
                          <option value="custom_phrases">Frases y saludos personalizados</option>
                          <option value="remove_zenda_branding">Remover marca "Powered by CitiOx"</option>
                          <option value="multi_staff">Multi-profesional (Profesionales ilimitados)</option>
                          <option value="multi_branch">Multi-sucursal (Sucursales múltiples)</option>
                          <option value="analytics">Reportes y estadísticas avanzados</option>
                          <option value="automation">Flujos automatizados y seguimientos</option>
                          <option value="tournaments_module">Módulo de portafolio / Torneos</option>
                          <option value="courses_module">Módulo de Academia / Cursos</option>
                          <option value="automatic_discounts">Descuentos automáticos</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label className={labelCls}>Valor {recompensaTipo==='FREE_DAYS'?'(días)':recompensaTipo==='DIAMONDS'?'(cantidad)':recompensaTipo==='CREDITS'?'(monto)':'(id)'}</label>
                        <input type="text" required value={recompensaValorInput} onChange={e=>setRecompensaValorInput(e.target.value)} placeholder={recompensaTipo==='FREE_DAYS'?'15':recompensaTipo==='BADGE'?'Socio VIP':'100'} className={inputCls}/>
                      </>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Icono</label>
                    <select value={icono} onChange={e=>setIcono(e.target.value)} className={inputCls}>
                      {['Trophy','Zap','Users','Calendar','Briefcase','Crown','Link','Smartphone','UserCheck','Coins','Award'].map(i=><option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Color temático</label>
                    <div className="flex gap-2">
                      <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-12 h-11 p-0 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer bg-transparent"/>
                      <input type="text" value={color} onChange={e=>setColor(e.target.value)} className={inputCls+' uppercase'}/>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Fecha Inicio (Opcional)</label>
                    <input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>Fecha Fin (Opcional)</label>
                    <input type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)} className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>Prioridad de Visualización</label>
                    <input type="number" value={prioridad} onChange={e=>setPrioridad(parseInt(e.target.value)||0)} className={inputCls}/>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="chk-activa" checked={activa} onChange={e=>setActiva(e.target.checked)} className="size-4 rounded border-slate-300 text-amber-500 cursor-pointer"/>
                    <label htmlFor="chk-activa" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Campaña activa de inmediato</label>
                  </div>
                </div>
              )}

              {missionType==='CLIENTE'&&(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Evento Disparador *</label>
                    <select value={triggerEvent} onChange={e=>setTriggerEvent(e.target.value)} className={inputCls}>
                      <option value="BOOKING_COMPLETED">Cita Completada</option>
                      <option value="USER_REGISTERED">Registro Nuevo</option>
                      <option value="REVIEW_CREATED">Reseña Publicada</option>
                      <option value="REFERRAL_COMPLETED">Referido Exitoso</option>
                      <option value="CHECKIN">Visita / Check-in</option>
                      <option value="PROFILE_COMPLETED">Perfil al 100%</option>
                      <option value="APP_DOWNLOADED">Descarga de App</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Meta (cantidad de veces)</label>
                    <input type="number" min={1} value={cantidadMeta} onChange={e=>setCantidadMeta(Number(e.target.value))} className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>Categoría</label>
                    <select value={categoria} onChange={e=>setCategoria(e.target.value as MissionCategory)} className={inputCls}>
                      <option value="RESERVAS">Reservas</option>
                      <option value="REFERIDOS">Referidos</option>
                      <option value="PERFIL">Perfil</option>
                      <option value="APP">Descarga App</option>
                      <option value="PAGOS">Pagos</option>
                      <option value="REVIEWS">Reseñas</option>
                      <option value="LEALTAD">Lealtad</option>
                      <option value="ESPECIAL">Especial</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Dificultad</label>
                    <select value={dificultad} onChange={e=>setDificultad(e.target.value as QuestDifficulty)} className={inputCls}>
                      <option value="EASY">Fácil</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HARD">Difícil</option>
                      <option value="EPIC">Épica</option>
                      <option value="LEGENDARY">Legendaria</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Versión</label>
                    <input type="text" value={version} onChange={e=>setVersion(e.target.value)} placeholder="1.0.0" className={inputCls}/>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="chk-biz-req" checked={requiresBusinessReward} onChange={e=>setRequiresBusinessReward(e.target.checked)} className="size-4 rounded border-slate-300 text-indigo-600 cursor-pointer"/>
                    <label htmlFor="chk-biz-req" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Requiere premio personalizado del negocio</label>
                  </div>
                  {rewardsList.length>0&&!requiresBusinessReward&&(
                    <div className="md:col-span-2">
                      <label className={labelCls}>Recompensas del Catálogo Central (Opcional)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        {rewardsList.map(r=>{
                          const sel=selectedRewardIds.includes(r.id);
                          return(
                            <button key={r.id} type="button" onClick={()=>setSelectedRewardIds(p=>sel?p.filter(x=>x!==r.id):[...p,r.id])}
                              className={cn('flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer',sel?'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-700 dark:text-indigo-400':'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300')}>
                              <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',sel?'bg-indigo-600 border-indigo-600':'border-slate-300 dark:border-slate-600')}>
                                {sel&&<CheckCircle2 size={10} className="text-white"/>}
                              </div>
                              <span className="truncate">{r.nombre}</span>
                              <span className="text-[9px] text-slate-400 ml-auto shrink-0">{r.tipo}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={()=>setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer">Cancelar</button>
                <button type="submit" disabled={submitting} className={cn('inline-flex items-center gap-2 px-6 py-3 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 transition-all cursor-pointer',missionType==='NEGOCIO'?'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20':'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20')}>
                  {submitting?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}
                  {submitting?'Guardando...':(editingBusiness||editingClient)?'Guardar Cambios':'Crear Misión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECOMPENSAS */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/80">
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">
                {editingReward ? 'Editar Premio / Cupón' : 'Nuevo Premio / Cupón Global'}
              </h3>
              <button onClick={()=>setIsRewardModalOpen(false)} className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer active:scale-95 transition-all shrink-0"><X size={16}/></button>
            </div>

            <form onSubmit={handleRewardSubmit} className="flex-1 overflow-y-auto p-8 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre del Premio *</label>
                  <input type="text" required value={rewardNombre} onChange={e=>setRewardNombre(e.target.value)} placeholder="Ej: Cupón Descuento 15%" className={inputCls}/>
                </div>
                
                <div>
                  <label className={labelCls}>Descripción</label>
                  <textarea value={rewardDescripcion} onChange={e=>setRewardDescripcion(e.target.value)} rows={2} placeholder="Descripción o detalles internos del premio." className={inputCls+' resize-none'}/>
                </div>

                <div>
                  <label className={labelCls}>Costo de Canje (Puntos de Fidelidad) *</label>
                  <input type="number" required min={0} value={rewardCostoPuntos} onChange={e=>setRewardCostoPuntos(e.target.value)} placeholder="Ej: 500" className={inputCls}/>
                  <p className="text-[10px] text-slate-400 mt-1">Costo en puntos que pagará el cliente en el catálogo para canjear este premio.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Tipo de Premio</label>
                    <select value={rewardTipo} onChange={e=>{
                      const val = e.target.value;
                      setRewardTipo(val);
                      if (val === 'COUPON') {
                        setRewardHandler('coupon');
                        setRewardConfigValor('15');
                      } else if (val === 'FREE_DAYS') {
                        setRewardHandler('free_days');
                        setRewardConfigValor('15');
                      } else if (val === 'SERVICE' || val === 'GIFT') {
                        setRewardHandler('gift');
                        setRewardConfigValor('{}');
                      } else {
                        setRewardHandler('wallet');
                        setRewardConfigValor(val === 'XP' ? '100' : '15');
                      }
                    }} className={inputCls}>
                      <option value="COUPON">🎟️ Cupón de Descuento (Cliente)</option>
                      <option value="XP">🪙 Puntos XP - Nivel (Cliente)</option>
                      <option value="CASHBACK">💵 Cashback / Saldo (Cliente)</option>
                      <option value="DIAMONDS">💎 Diamantes de Club (Cliente)</option>
                      <option value="SERVICE">🎁 Servicio del Negocio (Cliente)</option>
                      <option value="GIFT">📦 Regalo / Producto Físico (Cliente)</option>
                      <option value="FREE_DAYS">⚡ Días de Suscripción Gratis (Negocio)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Método / Handler</label>
                    <select value={rewardHandler} onChange={e=>setRewardHandler(e.target.value)} className={inputCls}>
                      <option value="coupon">coupon (Generación de cupones)</option>
                      <option value="wallet">wallet (Abono directo al saldo)</option>
                      <option value="free_days">free_days (Regalo de días premium)</option>
                      <option value="gift">gift (Servicio o Regalo del Negocio)</option>
                    </select>
                  </div>
                </div>

                {rewardTipo === 'COUPON' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <label className={labelCls}>Tipo de Cupón</label>
                      <select value={rewardConfigTipo} onChange={e=>setRewardConfigTipo(e.target.value)} className={inputCls}>
                        <option value="PORCENTAJE">Porcentaje (%)</option>
                        <option value="FIJO">Fijo ($ USD)</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Monto / Porcentaje</label>
                      <input type="number" required min={0} value={rewardConfigValor} onChange={e=>setRewardConfigValor(e.target.value)} className={inputCls}/>
                    </div>
                  </div>
                )}

                {rewardTipo === 'XP' && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className={labelCls}>Puntos de Experiencia (XP) a otorgar</label>
                    <input type="number" required min={1} value={rewardConfigValor} onChange={e=>setRewardConfigValor(e.target.value)} className={inputCls}/>
                  </div>
                )}

                {rewardTipo === 'CASHBACK' && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className={labelCls}>Monto de Saldo / Cashback ($ USD) a otorgar</label>
                    <input type="number" required min={1} value={rewardConfigValor} onChange={e=>setRewardConfigValor(e.target.value)} className={inputCls}/>
                  </div>
                )}

                {rewardTipo === 'DIAMONDS' && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className={labelCls}>Cantidad de Diamantes a otorgar</label>
                    <input type="number" required min={1} value={rewardConfigValor} onChange={e=>setRewardConfigValor(e.target.value)} className={inputCls}/>
                  </div>
                )}

                {rewardTipo === 'SERVICE' && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold leading-relaxed mb-4">
                    💡 <strong>Premio de tipo Servicio:</strong> No requiere configurar un valor aquí. Cuando un negocio instale una misión con este premio, podrá seleccionar uno de sus servicios locales (ej. Masaje, Facial, Manicura) para entregarlo gratis al cliente que complete el reto.
                  </div>
                )}

                {rewardTipo === 'GIFT' && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold leading-relaxed mb-4">
                    💡 <strong>Premio de tipo Regalo Físico:</strong> No requiere configurar un valor aquí. El negocio podrá definir el regalo físico o producto de stock local que entregará en mano al cliente en la recepción cuando complete el reto.
                  </div>
                )}

                {rewardTipo === 'FREE_DAYS' && (
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className={labelCls}>Días gratis de suscripción</label>
                    <input type="number" required min={1} value={rewardConfigValor} onChange={e=>setRewardConfigValor(e.target.value)} className={inputCls}/>
                  </div>
                )}
              </div>

              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={()=>setIsRewardModalOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer">Cancelar</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 disabled:opacity-50 transition-all cursor-pointer">
                  {submitting ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                  {submitting ? 'Guardando...' : editingReward ? 'Guardar Cambios' : 'Crear Recompensa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

