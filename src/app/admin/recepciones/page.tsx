'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Package,
  Scissors,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Camera,
  AlertCircle,
  Sparkles,
  ArrowRight,
  History,
  Tag,
  DollarSign,
  FileText,
  XCircle,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ClienteFound {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  pedidosCount?: number;
  lastVisit?: string;
  lastService?: string;
  lastPrice?: number;
}

interface Article {
  id: string;
  tipo: string;
  color: string;
  marca: string;
  observaciones: string;
  fotos: {
    frontal?: string;
    lateral?: string;
    suela?: string;
    dano?: string;
    extra?: string[];
  };
}

interface Evaluation {
  nivelSuciedad: 'Baja' | 'Media' | 'Alta';
  manchas: boolean;
  malOlor: boolean;
  rotura: boolean;
  humedad: boolean;
  cordones: boolean;
  otro: boolean;
  observacionesLibres: string;
}

interface ServiceItem {
  id: string;
  nombre: string;
  precio: number;
}

interface RecepcionRow {
  id: string;
  numeroPedido: number;
  createdAt: string;
  nombreCliente: string;
  telefonoCliente: string;
  total: number;
  estado: string;
  extraInfo?: any;
}

// ─── WIZARD COMPONENT ─────────────────────────────────────────────────────────

function NewRecepcionWizard({
  negocioId,
  onClose,
  onCreated,
}: {
  negocioId: string;
  onClose: () => void;
  onCreated: (orderId: string, whatsappData: any) => void;
}) {
  const [step, setStep] = useState(1);

  // Paso 1: Cliente
  const [searchPhone, setSearchPhone] = useState('');
  const [searchCountryCode, setSearchCountryCode] = useState('+593');
  const [searchingClient, setSearchingClient] = useState(false);
  const [cliente, setCliente] = useState<ClienteFound | null>(null);
  const [registeredClients, setRegisteredClients] = useState<any[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [clientSaved, setClientSaved] = useState(false);

  const COUNTRY_CODES = [
    { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+57', flag: '🇨🇴', name: 'Colombia' },
    { code: '+51', flag: '🇵🇪', name: 'Perú' },
    { code: '+52', flag: '🇲🇽', name: 'México' },
    { code: '+1', flag: '🇺🇸', name: 'EE.UU.' },
    { code: '+34', flag: '🇪🇸', name: 'España' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: '+56', flag: '🇨🇱', name: 'Chile' },
  ];

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch(`/api/shoe-care/clients?negocioId=${negocioId}`);
        if (res.ok) setRegisteredClients(await res.json());
      } catch {}
    }
    loadClients();
  }, [negocioId]);

  // Paso 2: Artículos
  const articleTypes = ['Zapato Deportivo', 'Zapato Casual', 'Bota', 'Tacón', 'Botín', 'Otro'];
  const [articles, setArticles] = useState<Article[]>([
    { id: '1', tipo: 'Zapato Deportivo', color: '', marca: '', observaciones: '', fotos: {} },
  ]);

  // Paso 3: Fotos (asociadas al primer artículo)
  const [activeArticleIndex, setActiveArticleIndex] = useState(0);

  // Paso 4: Evaluación
  const [evaluation, setEvaluation] = useState<Evaluation>({
    nivelSuciedad: 'Media',
    manchas: false,
    malOlor: false,
    rotura: false,
    humedad: false,
    cordones: true,
    otro: false,
    observacionesLibres: '',
  });

  // Paso 5: Servicios
  const [catServices, setCatServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Paso 6: Entrega
  const defaultDeliveryDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
  const [fechaEntrega, setFechaEntrega] = useState(defaultDeliveryDate);
  const [horaEntrega, setHoraEntrega] = useState('17:00');
  const [prioridad, setPrioridad] = useState<'Normal' | 'Urgente'>('Normal');

  // General Submit
  const [creating, setCreating] = useState(false);

  // Cargar catálogo de servicios del negocio
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch(`/api/services?negocioId=${negocioId}`);
        if (res.ok) {
          const data = await res.json();
          const items: ServiceItem[] = data.map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            precio: typeof s.precio === 'number' ? s.precio : parseFloat(s.precio || '0'),
          }));
          setCatServices(items);
        }
      } catch (err) {
        console.error('Error cargando catálogo de servicios:', err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadServices();
  }, [negocioId]);

  // Buscar cliente por teléfono
  const handleSearchClient = async () => {
    if (!searchPhone.trim()) return;
    setSearchingClient(true);
    try {
      const res = await fetch(`/api/shoe-care/orders?phone=${encodeURIComponent(searchPhone.trim())}&businessId=${negocioId}`);
      if (res.ok) {
        const orders = await res.json();
        if (Array.isArray(orders) && orders.length > 0) {
          const last = orders[0];
          setCliente({
            id: last.id,
            nombre: last.nombreCliente,
            telefono: last.telefonoCliente,
            email: last.emailCliente || undefined,
            pedidosCount: orders.length,
            lastVisit: new Date(last.createdAt).toLocaleDateString('es-PE'),
            lastService: last.extraInfo?.servicioNombre || 'Lavado de Calzado',
            lastPrice: last.total,
          });
          setClientSaved(true);
        } else {
          setCliente(null);
          setNewClientPhone(searchPhone.trim());
          setClientSaved(false);
        }
      }
    } catch {
      setCliente(null);
    } finally {
      setSearchingClient(false);
    }
  };

  const handleSaveNewClient = () => {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setCliente({
      id: `new_${Date.now()}`,
      nombre: newClientName.trim(),
      telefono: newClientPhone.trim(),
      email: newClientEmail.trim() || undefined,
      pedidosCount: 0,
    });
    setClientSaved(true);
  };

  // Artículos handlers
  const handleAddArticle = () => {
    setArticles(prev => [
      ...prev,
      { id: Date.now().toString(), tipo: 'Zapato Deportivo', color: '', marca: '', observaciones: '', fotos: {} },
    ]);
  };

  const handleUpdateArticle = (index: number, field: string, value: any) => {
    setArticles(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSimulatePhoto = (artIndex: number, photoType: 'frontal' | 'lateral' | 'suela' | 'dano') => {
    const fakeUrl = `/uploads/recepcion/${Date.now()}_${photoType}.jpg`;
    setArticles(prev => {
      const next = [...prev];
      next[artIndex].fotos = { ...next[artIndex].fotos, [photoType]: fakeUrl };
      return next;
    });
  };

  // Selección de servicios
  const toggleService = (srv: ServiceItem) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === srv.id);
      if (exists) return prev.filter(s => s.id !== srv.id);
      return [...prev, srv];
    });
  };

  const subtotal = selectedServices.reduce((sum, s) => sum + s.precio, 0) * articles.length;

  // Finalizar y crear la orden mediante el ServiceEngine (`/api/shoe-care/orders`)
  const handleCreateOrder = async () => {
    if (!cliente) return;
    setCreating(true);

    const servicioNombre = selectedServices.map(s => s.nombre).join(' + ') || 'Lavado de Calzado';

    const payload = {
      negocioId,
      modo: 'LOCAL', // Recepción presencial (Walk-in)
      nombreCliente: cliente.nombre,
      telefonoCliente: cliente.telefono,
      emailCliente: cliente.email || null,
      cantidadPares: articles.length,
      servicioNombre,
      precioServicio: subtotal > 0 ? subtotal / articles.length : 6.0,
      precioEstimado: subtotal > 0 ? subtotal : 6.0 * articles.length,
      fechaEstimadaEntrega: `${fechaEntrega}T${horaEntrega}:00.000Z`,
      observaciones: evaluation.observacionesLibres,
      extraInfo: {
        articulos: articles,
        evaluacion: evaluation,
        prioridad,
        recepcionPresencial: true,
      },
    };

    try {
      const res = await fetch('/api/shoe-care/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la orden');

      // Generar datos de WhatsApp
      const waMessage = [
        `Hola ${cliente.nombre} 👋`,
        ``,
        `Recibimos tus zapatos correctamente.`,
        ``,
        `Orden: *#${data.numeroPedido}*`,
        `Entrega estimada: *${new Date(data.fechaEntrega).toLocaleDateString('es-PE')} - ${horaEntrega}*`,
        ``,
        `Gracias por confiar en BubbleWash 🫧`,
      ].join('\n');

      onCreated(data.id, {
        phone: cliente.telefono,
        message: waMessage,
        url: `https://wa.me/${cliente.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`,
      });
    } catch (err: any) {
      alert(err.message || 'Error al crear la recepción');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Nueva Recepción Presencial</h2>
              <p className="text-xs text-slate-500">Walk-in · Registro rápido de entrada en local</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Wizard Indicator */}
        <div className="flex bg-slate-100 p-2 gap-1 overflow-x-auto text-xs font-bold text-slate-500 border-b">
          {[
            { num: 1, label: '1. Cliente' },
            { num: 2, label: '2. Artículos' },
            { num: 3, label: '3. Fotos' },
            { num: 4, label: '4. Evaluación' },
            { num: 5, label: '5. Servicios' },
            { num: 6, label: '6. Entrega' },
            { num: 7, label: '7. Resumen' },
          ].map(s => (
            <button
              key={s.num}
              onClick={() => s.num < step && setStep(s.num)}
              className={`flex-1 py-2 px-2 rounded-xl text-center transition-all whitespace-nowrap ${
                step === s.num
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : step > s.num
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-transparent text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PASO 1: CLIENTE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Buscar o Registrar Cliente</h3>
                <p className="text-xs text-slate-500">Ingresa el teléfono del cliente para consultar su historial o crear su perfil.</p>
              </div>

              {registeredClients && registeredClients.length > 0 && (
                <div className="space-y-1.5 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                  <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                    <span>👤 Seleccionar Cliente Registrado</span>
                    <span className="text-[9px] text-emerald-600 font-bold">({registeredClients.length} disponibles)</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = registeredClients.find(c => (c.id && c.id === e.target.value) || (c.telefono && c.telefono === e.target.value));
                      if (selected) {
                        setCliente({
                          id: selected.id || `cli_${Date.now()}`,
                          nombre: selected.nombre,
                          telefono: selected.telefono,
                          email: selected.email || undefined,
                          pedidosCount: selected.totalOrdenes || 1
                        });
                        setClientSaved(true);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  >
                    <option value="">-- Cargar cliente registrado... --</option>
                    {registeredClients.map((c, i) => (
                      <option key={c.id || i} value={c.id || c.telefono}>
                        {c.nombre} ({c.telefono})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <select
                  value={searchCountryCode}
                  onChange={(e) => setSearchCountryCode(e.target.value)}
                  className="px-3 py-3 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchClient()}
                  placeholder="Ej: 0998887777"
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <button
                  onClick={handleSearchClient}
                  disabled={searchingClient}
                  className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {searchingClient ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </button>
              </div>

              {/* Cliente Encontrado */}
              {cliente && clientSaved && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Cliente Verificado</span>
                      <h4 className="text-lg font-black text-slate-900">{cliente.nombre}</h4>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-emerald-200/60">
                    <div><span className="text-slate-400">Teléfono:</span> <p className="font-mono font-bold text-slate-800">{cliente.telefono}</p></div>
                    <div><span className="text-slate-400">Total Órdenes:</span> <p className="font-bold text-emerald-700">{cliente.pedidosCount || 0} visitas</p></div>
                    {cliente.lastVisit && (
                      <>
                        <div><span className="text-slate-400">Última Visita:</span> <p className="font-semibold">{cliente.lastVisit}</p></div>
                        <div><span className="text-slate-400">Último Servicio:</span> <p className="font-semibold">{cliente.lastService} (${cliente.lastPrice})</p></div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Nuevo Cliente (si no existe) */}
              {!clientSaved && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">Registrar Nuevo Cliente</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre completo *</label>
                      <input
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                        placeholder="Juan García"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp / Teléfono *</label>
                      <input
                        value={newClientPhone}
                        onChange={e => setNewClientPhone(e.target.value)}
                        placeholder="+593 999888777"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Email (opcional)</label>
                      <input
                        value={newClientEmail}
                        onChange={e => setNewClientEmail(e.target.value)}
                        placeholder="juan@email.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      onClick={handleSaveNewClient}
                      disabled={!newClientName.trim() || !newClientPhone.trim()}
                      className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      ✓ Guardar Cliente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: ARTÍCULOS */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Artículos / Pares</h3>
                  <p className="text-xs text-slate-500">Agrega el detalle de los artículos que el cliente entrega.</p>
                </div>
                <button
                  onClick={handleAddArticle}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar Artículo
                </button>
              </div>

              <div className="space-y-4">
                {articles.map((art, idx) => (
                  <div key={art.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-400">Artículo #{idx + 1}</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Calzado / Prenda</label>
                        <select
                          value={art.tipo}
                          onChange={e => handleUpdateArticle(idx, 'tipo', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none"
                        >
                          {articleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Marca</label>
                        <input
                          value={art.marca}
                          onChange={e => handleUpdateArticle(idx, 'marca', e.target.value)}
                          placeholder="Nike, Adidas..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Color / Detalles</label>
                        <input
                          value={art.color}
                          onChange={e => handleUpdateArticle(idx, 'color', e.target.value)}
                          placeholder="Blanco con suela roja"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Observaciones</label>
                        <input
                          value={art.observaciones}
                          onChange={e => handleUpdateArticle(idx, 'observaciones', e.target.value)}
                          placeholder="Despegado en punta izquierda..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 3: FOTOS DE RECEPCIÓN */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Fotos de Inspección Inicial</h3>
                <p className="text-xs text-slate-500">Fotografía el estado del artículo en la recepción.</p>
              </div>

              {articles.map((art, artIdx) => (
                <div key={art.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">
                    Artículo #{artIdx + 1}: {art.tipo} ({art.marca || 'Sin marca'})
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'frontal', label: 'Foto Frontal' },
                      { key: 'lateral', label: 'Foto Lateral' },
                      { key: 'suela', label: 'Foto Suela' },
                      { key: 'dano', label: 'Foto Daño/Mancha' },
                    ].map(({ key, label }) => {
                      const hasPhoto = Boolean(art.fotos[key as keyof typeof art.fotos]);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSimulatePhoto(artIdx, key as any)}
                          className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                            hasPhoto
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
                          }`}
                        >
                          <Camera className="w-5 h-5" />
                          <span>{label}</span>
                          {hasPhoto && <span className="text-[10px] text-emerald-600">✓ Capturada</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PASO 4: EVALUACIÓN */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Evaluación del Estado</h3>
                <p className="text-xs text-slate-500">Diagnóstico rápido por parte del recepcionista.</p>
              </div>

              {/* Nivel de suciedad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Nivel de suciedad</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Baja', 'Media', 'Alta'] as const).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEvaluation(e => ({ ...e, nivelSuciedad: n }))}
                      className={`py-3 rounded-2xl font-bold text-xs border-2 transition-all ${
                        evaluation.nivelSuciedad === n
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checklist de hallazgos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Checklist de hallazgos</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'manchas', label: 'Tiene manchas' },
                    { key: 'malOlor', label: 'Tiene mal olor' },
                    { key: 'rotura', label: 'Tiene rotura / rasguño' },
                    { key: 'humedad', label: 'Tiene humedad' },
                    { key: 'cordones', label: 'Incluye cordones' },
                    { key: 'otro', label: 'Otros detalles' },
                  ].map(({ key, label }) => {
                    const isChecked = Boolean(evaluation[key as keyof Evaluation]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEvaluation(e => ({ ...e, [key]: !isChecked }))}
                        className={`p-3 rounded-xl border-2 text-left text-xs font-semibold transition-all flex items-center justify-between ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>{label}</span>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones diagnósticas libres</label>
                <textarea
                  value={evaluation.observacionesLibres}
                  onChange={e => setEvaluation(ev => ({ ...ev, observacionesLibres: e.target.value }))}
                  placeholder="Detalles acordados con el cliente..."
                  rows={2}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* PASO 5: SERVICIOS */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Seleccionar Servicios</h3>
                <p className="text-xs text-slate-500">Selecciona uno o varios servicios del catálogo oficial del negocio.</p>
              </div>

              {loadingServices ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Cargando catálogo de servicios...
                </div>
              ) : catServices.length === 0 ? (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-xs">
                  No hay servicios configurados en el catálogo. Se usará la tarifa básica estándar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catServices.map(srv => {
                    const isSelected = selectedServices.some(s => s.id === srv.id);
                    return (
                      <div
                        key={srv.id}
                        onClick={() => toggleService(srv)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm">{srv.nombre}</p>
                          <p className="text-xs font-mono font-bold text-emerald-700">${srv.precio.toFixed(2)}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Subtotal ({articles.length} artículo/s)</p>
                  <p className="text-2xl font-black text-emerald-400">${subtotal.toFixed(2)}</p>
                </div>
                <span className="text-xs text-slate-400">Calculado automáticamente</span>
              </div>
            </div>
          )}

          {/* PASO 6: ENTREGA */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Fecha y Hora Estimada de Entrega</h3>
                <p className="text-xs text-slate-500">Compromiso acordado para la entrega del servicio.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={e => setFechaEntrega(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora Estimada</label>
                  <input
                    type="time"
                    value={horaEntrega}
                    onChange={e => setHoraEntrega(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Prioridad del Trabajo</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Normal', 'Urgente'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridad(p)}
                      className={`py-3 rounded-2xl font-bold text-xs border-2 transition-all ${
                        prioridad === p
                          ? p === 'Urgente'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {p === 'Urgente' ? '⚡ Urgente (+Recargo)' : '✓ Normal'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 7: RESUMEN */}
          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Resumen de Recepción</h3>
                <p className="text-xs text-slate-500">Revisa todos los datos antes de emitir la Orden de Servicio.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-slate-900">{cliente?.nombre} ({cliente?.telefono})</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Artículos:</span>
                  <span className="font-bold text-slate-900">{articles.length} par/es</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Servicios:</span>
                  <span className="font-bold text-slate-900">
                    {selectedServices.map(s => s.nombre).join(', ') || 'Lavado Completo'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Fecha Entrega:</span>
                  <span className="font-bold text-slate-900">{fechaEntrega} a las {horaEntrega} ({prioridad})</span>
                </div>
                <div className="flex justify-between pt-1 text-base">
                  <span className="font-bold text-slate-900">Costo Total:</span>
                  <span className="font-black text-emerald-600">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-5 border-t bg-slate-50">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-3 border border-slate-300 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Atrás
            </button>
          )}

          {step < 7 ? (
            <button
              onClick={() => {
                if (step === 1 && (!cliente || !clientSaved)) {
                  alert('Por favor busca o guarda la información del cliente para continuar.');
                  return;
                }
                setStep(s => s + 1);
              }}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              Siguiente Paso <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreateOrder}
              disabled={creating}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/20"
            >
              {creating ? 'Emitiendo Orden...' : '🚀 Crear Orden de Servicio (RECIBIDO)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function RecepcionesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [recepcionesHoy, setRecepcionesHoy] = useState<RecepcionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [waData, setWaData] = useState<{ phone: string; message: string; url: string } | null>(null);

  const negocioId = (session?.user as any)?.negocioId || 'demo-canchas';

  const fetchRecepcionesHoy = useCallback(async () => {
    try {
      const res = await fetch(`/api/shoe-care/orders?businessId=${negocioId}`);
      if (res.ok) {
        const data = await res.json();
        // Filtrar recepciones hechas hoy (modo LOCAL o estado RECIBIDO)
        const todayStr = new Date().toISOString().split('T')[0];
        const hoy = data.filter((p: any) => {
          const createdStr = new Date(p.createdAt).toISOString().split('T')[0];
          return createdStr === todayStr && (p.extraInfo?.modoIngreso === 'LOCAL' || p.estado === 'RECIBIDO');
        });
        setRecepcionesHoy(hoy);
      }
    } catch (err) {
      console.error('Error cargando recepciones de hoy:', err);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    if (session) fetchRecepcionesHoy();
  }, [session, fetchRecepcionesHoy]);

  const handleCreated = (orderId: string, whatsapp: any) => {
    setShowWizard(false);
    setWaData(whatsapp);
    fetchRecepcionesHoy();
  };

  return (
    <div className="min-h-full bg-slate-50 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Módulo Recepciones</h1>
            <p className="text-xs text-slate-500">Registro presencial de clientes Walk-in · ServiceEngine v1.0.0</p>
          </div>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Nueva Recepción
        </button>
      </div>

      {/* Modal Notificación WhatsApp Post-Creación */}
      {waData && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">¡Recepción Registrada!</h3>
            <p className="text-xs text-slate-500">
              La orden de servicio fue emitida en estado <strong>RECIBIDO</strong>. Puedes notificar al cliente por WhatsApp.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={waData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 bg-emerald-500 text-white font-bold text-sm rounded-2xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Phone className="w-4 h-4" /> Enviar WhatsApp
              </a>
              <button
                onClick={() => setWaData(null)}
                className="py-2.5 border border-slate-200 text-slate-600 font-semibold text-xs rounded-xl hover:bg-slate-50"
              >
                Continuar a Órdenes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Recepciones de Hoy */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recepciones de Hoy</h2>
            <p className="text-xs text-slate-500">Ingresos presenciales registrados durante la jornada</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            {recepcionesHoy.length} recepciones hoy
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Orden #</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Hora</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Servicio</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Monto Total</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Cargando recepciones de hoy...
                </td>
              </tr>
            ) : recepcionesHoy.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-slate-600">Sin recepciones presenciales registradas hoy</p>
                  <p className="text-xs text-slate-400 mt-1">Presiona "+ Nueva Recepción" para registrar un cliente Walk-in</p>
                </td>
              </tr>
            ) : (
              recepcionesHoy.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">#{r.numeroPedido}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{r.nombreCliente}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.telefonoCliente}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.extraInfo?.servicioNombre || 'Lavado de Calzado'}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600">${r.total?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push('/admin/ordenes-servicio')}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                    >
                      Abrir Orden <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Wizard */}
      {showWizard && (
        <NewRecepcionWizard
          negocioId={negocioId}
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
