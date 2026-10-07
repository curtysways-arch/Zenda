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
  Filter,
  Eye,
  MessageCircle,
  Check,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Inbox
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
  const [allOrders, setAllOrders] = useState<RecepcionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [waData, setWaData] = useState<{ phone: string; message: string; url: string } | null>(null);
  const [timeFilter, setTimeFilter] = useState<'HOY' | 'SEMANA' | 'MES' | 'TODAS'>('HOY');
  const [searchQuery, setSearchQuery] = useState('');
  const [negocio, setNegocio] = useState<any>(null);

  useEffect(() => {
    fetch('/api/negocio')
      .then(r => r.json())
      .then(d => { if (d && d.id) setNegocio(d); })
      .catch(() => {});
  }, []);

  const sessionNegocioId = (session?.user as any)?.negocioId;
  const negocioId = negocio?.id || sessionNegocioId || '';

  const fetchRecepciones = useCallback(async () => {
    setLoading(true);
    try {
      const url = negocioId ? `/api/shoe-care/orders?businessId=${negocioId}` : '/api/shoe-care/orders';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Incluir órdenes de recepción (modo LOCAL, tipoEntrega RETIRO o estado inicial RECIBIDO/PENDIENTE)
        setAllOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando recepciones:', err);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    fetchRecepciones();
  }, [fetchRecepciones]);

  const handleCreated = (orderId: string, whatsapp: any) => {
    setShowWizard(false);
    setWaData(whatsapp);
    fetchRecepciones();
  };

  // Filtrado temporal y por texto
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredOrders = allOrders.filter(ord => {
    const createdDate = new Date(ord.createdAt);
    const createdStr = createdDate.toISOString().split('T')[0];

    // Filtro temporal
    let matchTime = true;
    if (timeFilter === 'HOY') {
      matchTime = createdStr === todayStr;
    } else if (timeFilter === 'SEMANA') {
      matchTime = createdDate >= startOfWeek;
    } else if (timeFilter === 'MES') {
      matchTime = createdDate >= startOfMonth;
    }

    // Filtro texto
    const q = searchQuery.toLowerCase().trim();
    const matchText = !q ||
      (ord.nombreCliente || '').toLowerCase().includes(q) ||
      (ord.telefonoCliente || '').includes(q) ||
      (ord.numeroPedido || '').toString().includes(q) ||
      (ord.extraInfo?.servicioNombre || '').toLowerCase().includes(q);

    return matchTime && matchText;
  });

  // Métricas rápidas
  const countHoy = allOrders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === todayStr).length;
  const countSemana = allOrders.filter(o => new Date(o.createdAt) >= startOfWeek).length;
  const totalMontoHoy = allOrders
    .filter(o => new Date(o.createdAt).toISOString().split('T')[0] === todayStr)
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="min-h-full bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── BANNER CABECERA ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Módulo Recepciones
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Walk-In
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Recepción presencial de calzado y prendas · Generación rápida de órdenes en mostrador
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            onClick={() => router.push('/admin/ordenes-servicio')}
            className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" /> Todas las Órdenes
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Nueva Recepción
          </button>
        </div>
      </div>

      {/* ── TARJETAS DE RESUMEN RÁPIDO ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Hoy</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{countHoy}</span>
            <span className="text-xs font-bold text-emerald-600">${totalMontoHoy.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ingresos presenciales</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Esta Semana</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-900">{countSemana}</span>
            <span className="text-xs font-bold text-slate-400">7 días</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total recepciones</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Histórico</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{allOrders.length}</span>
            <span className="text-xs font-bold text-purple-600">Registradas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Base total de órdenes</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 sm:p-5 rounded-2xl text-white shadow-md shadow-emerald-600/15 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100 block">Flujo Ágil</span>
          <p className="text-xs font-bold leading-snug mt-1">
            Crea la orden y compártela a WhatsApp al instante.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-2 text-left text-xs font-black underline underline-offset-2 hover:text-emerald-100 flex items-center gap-1"
          >
            + Ingreso rápido <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── CONTROLES Y FILTROS ─────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Pestañas de rango temporal */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full lg:w-auto overflow-x-auto">
          {[
            { id: 'HOY', label: 'Hoy', count: countHoy },
            { id: 'SEMANA', label: 'Esta Semana', count: countSemana },
            { id: 'MES', label: 'Este Mes' },
            { id: 'TODAS', label: 'Todas', count: allOrders.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                timeFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  timeFilter === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono o #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ── LISTADO / TABLA DE RECEPCIONES ─────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              {timeFilter === 'HOY' ? 'Recepciones de Hoy' :
               timeFilter === 'SEMANA' ? 'Recepciones de Esta Semana' :
               timeFilter === 'MES' ? 'Recepciones de Este Mes' :
               'Historial Completo de Recepciones'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </p>
          </div>
          <button
            onClick={fetchRecepciones}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-bold">Cargando recepciones...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {timeFilter === 'HOY' ? 'Sin ingresos registrados hoy' : 'No se encontraron recepciones'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {timeFilter === 'HOY'
                  ? 'Aún no se ha registrado ningún cliente presencial en la jornada de hoy. Puedes ver el historial de esta semana o crear una nueva recepción.'
                  : 'Prueba cambiando los filtros o buscando con otro término.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              {timeFilter === 'HOY' && countSemana > 0 && (
                <button
                  onClick={() => setTimeFilter('SEMANA')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Ver recepciones de esta semana ({countSemana})
                </button>
              )}
              <button
                onClick={() => setShowWizard(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nueva Recepción
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map(r => {
              const extra = (r.extraInfo as any) || {};
              const pares = extra.cantidadPares || (Array.isArray(extra.articulos) ? extra.articulos.length : 1);
              const articulosDesc = Array.isArray(extra.articulos) && extra.articulos.length > 0
                ? extra.articulos.map((a: any) => `${a.cantidad || 1}x ${a.tipo || 'Calzado'}`).join(' · ')
                : extra.servicioNombre || `${pares} artículo(s)`;
              const cleanPhone = (r.telefonoCliente || '').replace(/\D/g, '');

              return (
                <div
                  key={r.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-sm shrink-0">
                      {(r.nombreCliente || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-emerald-600 text-xs">
                          #{r.numeroPedido}
                        </span>
                        <h4 className="font-black text-slate-900 text-sm truncate">
                          {r.nombreCliente}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {r.estado || 'RECIBIDO'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {articulosDesc}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>📱 {r.telefonoCliente}</span>
                        <span>·</span>
                        <span>🕒 {new Date(r.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} {new Date(r.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        ${(r.total || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {pares} {pares === 1 ? 'par' : 'pares'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(r.nombreCliente || '')}%2C%20te%20escribimos%20de%20BubbleWash%20sobre%20tu%20orden%20%23${r.numeroPedido}`}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp"
                          className="p-2 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 transition"
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                      <button
                        onClick={() => router.push(`/admin/service-orders/${r.id}`)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1"
                      >
                        Abrir <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL NOTIFICACIÓN WHATSAPP POST-CREACIÓN ─────────────────────── */}
      {waData && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">¡Recepción Registrada!</h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden fue creada en estado <strong>RECIBIDO</strong>. Puedes enviarle el comprobante al cliente por WhatsApp.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={waData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <Phone className="w-4 h-4" /> Enviar WhatsApp
              </a>
              <button
                onClick={() => setWaData(null)}
                className="py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL WIZARD DE RECEPCIÓN ────────────────────────────────────── */}
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
