'use client';
// src/app/[slug]/admin/page.tsx
// Dashboard Administrativo Dinámico Completo
// Módulos: KPIs, Productos (CRUD), Categorías, Mesas (CRUD), Pedidos (Kanban), Identidad (Colores/Logo/Banner/Horarios), Promociones (CRUD), Canales
// 100% genérico — funciona para cualquier Blueprint con capabilities

import { useState, useEffect } from 'react';
import {
  BarChart3, Package, Layout, ClipboardList, Radio, Loader2, TrendingUp, ShoppingBag, Users,
  DollarSign, Plus, Edit3, Eye, EyeOff, ToggleLeft, ToggleRight, RefreshCw, ChefHat, X, Save,
  Check, Trash2, Palette, Sparkles, Tag, Image as ImageIcon, Clock, Phone, MapPin, Settings
} from 'lucide-react';

type AdminTab = 'dashboard' | 'identidad' | 'productos' | 'mesas' | 'pedidos' | 'promociones' | 'canales';

interface Order { id: string; numeroPedido: number; estado: string; total: number; nombreCliente: string; tipoEntrega: string; extraInfo?: any; items: any[]; createdAt: string; }
interface Category { id: string; nombre: string; orden: number; }
interface Product { id: string; nombre: string; descripcion?: string; precio: number; activo: boolean; imagenUrl?: string; categoriaId?: string; categoria?: any; }
interface Table { id: string; name: string; estado: string; capacity: number; }
interface Promotion { id: string; titulo: string; descripcion: string; precioPromo: number; precioAnterior?: number; imagenUrl: string; estado: string; fechaFin: string; }
interface Channel { key: string; label: string; desc: string; icon: string; }

const CHANNELS: Channel[] = [
  { key: 'TABLE', label: 'Atención en Mesa', desc: 'Pedidos asociados a mesas físicas', icon: '🪑' },
  { key: 'QR_ORDER', label: 'Menú QR', desc: 'Menú digital accesible por código QR', icon: '📱' },
  { key: 'WAITER', label: 'Consola Mesero', desc: 'App de gestión para meseros', icon: '🧑‍🍳' },
  { key: 'KDS', label: 'Pantalla Cocina KDS', desc: 'Kitchen Display System de cocina', icon: '📺' },
  { key: 'DELIVERY', label: 'Delivery / Domicilio', desc: 'Pedidos con entrega a domicilio', icon: '🛵' },
  { key: 'PICKUP', label: 'Pickup / Retiro', desc: 'Pedidos para retirar en local', icon: '🏪' },
  { key: 'POS', label: 'Punto de Venta POS', desc: 'Caja registradora y cobro presencial', icon: '💳' },
];

const KANBAN_COLS = [
  { key: 'PAGO_CONFIRMADO', label: 'CONFIRMADO', color: '#f59e0b' },
  { key: 'EN_PREPARACION', label: 'EN COCINA', color: '#3b82f6' },
  { key: 'LISTO', label: 'LISTO', color: '#10b981' },
  { key: 'ENTREGADO', label: 'ENTREGADO', color: '#6b7280' },
  { key: 'CANCELADO', label: 'CANCELADO', color: '#ef4444' },
];

const TABLE_STATES = ['DISPONIBLE', 'OCUPADA', 'RESERVADA'];
const TABLE_COLORS: Record<string, string> = { DISPONIBLE: '#10b981', OCUPADA: '#f59e0b', RESERVADA: '#6366f1' };

export default function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [negocio, setNegocio] = useState<any>(null);
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [channels, setChannels] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({ totalVentas: 0, pedidosActivos: 0, totalOrders: 0, mesasOcupadas: 0 });

  // UI / Modals State
  const [savingChannels, setSavingChannels] = useState(false);
  const [savingIdentidad, setSavingIdentidad] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Form States
  const [productForm, setProductForm] = useState({ id: '', nombre: '', descripcion: '', precio: '', imagenUrl: '', categoriaId: '', activo: true });
  const [categoryForm, setCategoryForm] = useState({ nombre: '', orden: 0 });
  const [tableForm, setTableForm] = useState({ id: '', name: '', capacity: 4, estado: 'DISPONIBLE' });
  const [promoForm, setPromoForm] = useState({ id: '', titulo: '', descripcion: '', precioPromo: '', precioAnterior: '', imagenUrl: '', estado: 'publicada' });

  // Business Identity Form
  const [identidadForm, setIdentidadForm] = useState({
    nombre: '', logoUrl: '', colorPrimario: '#c2410c', colorSecundario: '#1c0a00', colorTerciario: '#ea580c',
    heroTitulo: '', heroSubtitulo: '', bannerUrl: '', whatsapp: '', direccion: '', ciudad: '', horarioApertura: '', horarioCierre: ''
  });

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);
  useEffect(() => { if (slug) loadAll(); }, [slug]);

  async function loadAll() {
    setLoading(true);
    try {
      const [negRes, ordRes, catRes, tabRes, chanRes, promoRes] = await Promise.all([
        fetch(`/api/${slug}/negocio`),
        fetch(`/api/${slug}/admin-orders`),
        fetch(`/api/${slug}/catalogue`),
        fetch(`/api/${slug}/tables`),
        fetch(`/api/${slug}/channels`),
        fetch(`/api/${slug}/promotions`)
      ]);

      if (negRes.ok) {
        const nData = (await negRes.json()).negocio;
        setNegocio(nData);
        setIdentidadForm({
          nombre: nData.nombre || '',
          logoUrl: nData.logoUrl || '',
          colorPrimario: nData.colorPrimario || '#c2410c',
          colorSecundario: nData.colorSecundario || '#1c0a00',
          colorTerciario: nData.colorTerciario || '#ea580c',
          heroTitulo: nData.heroTitulo || '',
          heroSubtitulo: nData.heroSubtitulo || '',
          bannerUrl: nData.configuracion?.bannerUrl || '',
          whatsapp: nData.whatsapp || '',
          direccion: nData.direccion || '',
          ciudad: nData.ciudad || '',
          horarioApertura: nData.horarioApertura || '11:00',
          horarioCierre: nData.horarioCierre || '22:00'
        });
      }

      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrders(d.orders || []);
        setStats(s => ({ ...s, totalVentas: d.stats?.totalVentas || 0, pedidosActivos: d.stats?.pedidosActivos || 0, totalOrders: d.stats?.totalOrders || 0 }));
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        setProducts(cData.products || []);
        setCategories(cData.categories || []);
      }

      if (tabRes.ok) {
        const tData = await tabRes.json();
        const tList = tData.tables || [];
        setTables(tList);
        setStats(s => ({ ...s, mesasOcupadas: tList.filter((x: Table) => x.estado === 'OCUPADA').length }));
      }

      if (chanRes.ok) setChannels((await chanRes.json()).channels || {});
      if (promoRes.ok) setPromotions((await promoRes.json()).promotions || []);

    } finally { setLoading(false); }
  }

  // Identidad Actions
  async function saveIdentidad() {
    setSavingIdentidad(true);
    try {
      const res = await fetch(`/api/${slug}/negocio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identidadForm)
      });
      if (res.ok) {
        const data = await res.json();
        setNegocio(data.negocio);
        alert('✅ Identidad y configuración actualizadas exitosamente');
      }
    } finally { setSavingIdentidad(false); }
  }

  // Channels Actions
  async function saveChannels() {
    setSavingChannels(true);
    await fetch(`/api/${slug}/channels`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channels }) });
    setSavingChannels(false);
  }

  // Product Actions
  async function saveProduct() {
    if (!productForm.nombre || !productForm.precio) return;
    const isEdit = !!productForm.id;
    const method = isEdit ? 'PUT' : 'POST';
    const body = isEdit ? { type: 'product', ...productForm } : { type: 'product', ...productForm };

    const res = await fetch(`/api/${slug}/catalogue`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      setShowProductModal(false);
      setProductForm({ id: '', nombre: '', descripcion: '', precio: '', imagenUrl: '', categoriaId: '', activo: true });
      loadAll();
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    await fetch(`/api/${slug}/catalogue?type=product&id=${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function toggleProduct(id: string, activo: boolean) {
    await fetch(`/api/${slug}/catalogue`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'product', id, activo }) });
    setProducts(p => p.map(x => x.id === id ? { ...x, activo } : x));
  }

  // Category Actions
  async function saveCategory() {
    if (!categoryForm.nombre) return;
    const res = await fetch(`/api/${slug}/catalogue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'category', ...categoryForm })
    });
    if (res.ok) {
      setShowCategoryModal(false);
      setCategoryForm({ nombre: '', orden: 0 });
      loadAll();
    }
  }

  // Table Actions
  async function saveTable() {
    if (!tableForm.name) return;
    const isEdit = !!tableForm.id;
    const res = isEdit
      ? await fetch(`/api/${slug}/tables/${tableForm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableForm) })
      : await fetch(`/api/${slug}/tables`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableForm) });

    if (res.ok) {
      setShowTableModal(false);
      setTableForm({ id: '', name: '', capacity: 4, estado: 'DISPONIBLE' });
      loadAll();
    }
  }

  async function deleteTable(id: string) {
    if (!confirm('¿Seguro que deseas eliminar esta mesa?')) return;
    await fetch(`/api/${slug}/tables/${id}`, { method: 'DELETE' });
    setTables(prev => prev.filter(t => t.id !== id));
  }

  async function changeTableState(id: string, estado: string) {
    await fetch(`/api/${slug}/tables/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    setTables(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
  }

  // Promo Actions
  async function savePromo() {
    if (!promoForm.titulo) return;
    const isEdit = !!promoForm.id;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(`/api/${slug}/promotions`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promoForm)
    });
    if (res.ok) {
      setShowPromoModal(false);
      setPromoForm({ id: '', titulo: '', descripcion: '', precioPromo: '', precioAnterior: '', imagenUrl: '', estado: 'publicada' });
      loadAll();
    }
  }

  async function deletePromo(id: string) {
    if (!confirm('¿Seguro de eliminar esta promoción?')) return;
    await fetch(`/api/${slug}/promotions?id=${id}`, { method: 'DELETE' });
    setPromotions(prev => prev.filter(p => p.id !== id));
  }

  async function changeOrderState(id: string, estado: string) {
    await fetch(`/api/${slug}/admin-orders`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, estado } : o));
  }

  const cp = negocio?.colorPrimario || '#c2410c';
  const cs = negocio?.colorSecundario || '#1c0a00';

  // Sales chart data (last 7 days)
  const salesByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('es-ES', { weekday: 'short' });
    salesByDay[key] = 0;
  }
  orders.forEach(o => {
    if (!['CANCELADO', 'PENDIENTE_PAGO'].includes(o.estado)) {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString('es-ES', { weekday: 'short' });
      if (salesByDay[key] !== undefined) salesByDay[key] += o.total || 0;
    }
  });
  const maxSale = Math.max(...Object.values(salesByDay), 1);

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { key: 'identidad', label: 'Identidad & Colores', icon: <Palette size={16} /> },
    { key: 'productos', label: 'Productos & Menú', icon: <Package size={16} /> },
    { key: 'mesas', label: 'Mesas & Capacidad', icon: <Layout size={16} /> },
    { key: 'pedidos', label: 'Pedidos (Kanban)', icon: <ClipboardList size={16} /> },
    { key: 'promociones', label: 'Promociones', icon: <Sparkles size={16} /> },
    { key: 'canales', label: 'Canales Activos', icon: <Radio size={16} /> },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={40} color={cp} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Cargando panel de administración...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Sidebar */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div style={{ width: 230, background: cs, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {negocio?.logoUrl ? (
                <img src={negocio.logoUrl} alt={negocio.nombre} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: `2px solid ${cp}` }} onError={e => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cp, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChefHat size={18} color="#fff" /></div>
              )}
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{negocio?.nombre || slug}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Runtime Control Center</p>
              </div>
            </div>
          </div>
          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, background: tab === t.key ? cp : 'transparent', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: tab === t.key ? 700 : 500, fontSize: 13, textAlign: 'left', transition: 'all 0.15s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <a href={`/${slug}`} target="_blank" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>↗</span> Ver landing pública
            </a>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24, color: '#1f2937' }}>
                {TABS.find(t => t.key === tab)?.label}
              </h1>
              <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13 }}>
                Instancia en tiempo real para <strong>{negocio?.nombre}</strong> ({slug})
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 600 }}>
                <RefreshCw size={14} /> Recargar datos
              </button>
            </div>
          </div>

          {/* ── DASHBOARD TAB ──────────────────────────────────────────────── */}
          {tab === 'dashboard' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Ventas del día', value: `$${stats.totalVentas.toFixed(2)}`, icon: <DollarSign size={20} />, color: cp, trend: '+12%' },
                  { label: 'Pedidos activos', value: stats.pedidosActivos, icon: <ShoppingBag size={20} />, color: '#3b82f6', trend: 'ahora' },
                  { label: 'Mesas ocupadas', value: `${stats.mesasOcupadas}/${tables.length}`, icon: <Users size={20} />, color: '#f59e0b', trend: `${tables.length > 0 ? Math.round((stats.mesasOcupadas / tables.length) * 100) : 0}%` },
                  { label: 'Pedidos hoy', value: stats.totalOrders, icon: <TrendingUp size={20} />, color: '#10b981', trend: 'total' },
                ].map((kpi, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ background: `${kpi.color}15`, borderRadius: 10, padding: 10, color: kpi.color }}>{kpi.icon}</div>
                      <span style={{ background: `${kpi.color}15`, color: kpi.color, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{kpi.trend}</span>
                    </div>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#1f2937', margin: '0 0 4px' }}>{kpi.value}</p>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Sales Chart */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 20px', fontSize: 16 }}>Ventas de la semana</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
                  {Object.entries(salesByDay).map(([day, val], i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: '100%', background: cp, borderRadius: '6px 6px 0 0', height: `${Math.max(6, (val / maxSale) * 100)}px`, transition: 'height 0.5s ease', position: 'relative' }}>
                        {val > 0 && <span style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>${val.toFixed(0)}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize', fontWeight: 600 }}>{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Orders Preview */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, color: '#1f2937', margin: 0, fontSize: 16 }}>Pedidos Activos Recientes</h3>
                  <button onClick={() => setTab('pedidos')} style={{ background: 'none', border: 'none', color: cp, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Ver Kanban →</button>
                </div>
                {orders.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.estado)).slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div><p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>#{o.numeroPedido} — {o.extraInfo?.tableName || o.tipoEntrega}</p><p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{o.items?.length || 0} productos</p></div>
                    <div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontWeight: 800, color: cp }}>${o.total?.toFixed(2)}</p><span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>{o.estado}</span></div>
                  </div>
                ))}
                {orders.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.estado)).length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin pedidos activos en este momento</p>}
              </div>
            </div>
          )}

          {/* ── IDENTIDAD & COLORES TAB ────────────────────────────────────── */}
          {tab === 'identidad' && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 800 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontWeight: 700, color: '#1f2937', fontSize: 18 }}>Identidad Visual & Branding</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Nombre del Negocio</label>
                    <input type="text" value={identidadForm.nombre} onChange={e => setIdentidadForm(f => ({ ...f, nombre: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>URL del Logo</label>
                    <input type="text" value={identidadForm.logoUrl} onChange={e => setIdentidadForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {identidadForm.logoUrl && (
                  <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={identidadForm.logoUrl} alt="Vista previa Logo" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Vista previa del logo cargado</span>
                  </div>
                )}

                <h4 style={{ margin: '20px 0 12px', fontWeight: 700, color: '#1f2937', fontSize: 15 }}>Paleta de Colores Corporativa</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                  {[
                    { key: 'colorPrimario', label: 'Color Primario (Accent)' },
                    { key: 'colorSecundario', label: 'Color Secundario (Background)' },
                    { key: 'colorTerciario', label: 'Color Terciario (Highlights)' },
                  ].map(c => (
                    <div key={c.key}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>{c.label}</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={(identidadForm as any)[c.key]} onChange={e => setIdentidadForm(f => ({ ...f, [c.key]: e.target.value }))} style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                        <input type="text" value={(identidadForm as any)[c.key]} onChange={e => setIdentidadForm(f => ({ ...f, [c.key]: e.target.value }))} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <h4 style={{ margin: '20px 0 12px', fontWeight: 700, color: '#1f2937', fontSize: 15 }}>Banner Principal (Hero Landing)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Título Principal (Hero)</label>
                    <input type="text" value={identidadForm.heroTitulo} onChange={e => setIdentidadForm(f => ({ ...f, heroTitulo: e.target.value }))} placeholder="Ej: La Parrilla Citiox" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Subtítulo Hero</label>
                    <input type="text" value={identidadForm.heroSubtitulo} onChange={e => setIdentidadForm(f => ({ ...f, heroSubtitulo: e.target.value }))} placeholder="Ej: Los mejores cortes a la parrilla..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <h4 style={{ margin: '20px 0 12px', fontWeight: 700, color: '#1f2937', fontSize: 15 }}>Información de Contacto y Operación</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>WhatsApp / Teléfono</label>
                    <input type="text" value={identidadForm.whatsapp} onChange={e => setIdentidadForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+593 99..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>Dirección</label>
                    <input type="text" value={identidadForm.direccion} onChange={e => setIdentidadForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Av. Principal 123" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>Ciudad</label>
                    <input type="text" value={identidadForm.ciudad} onChange={e => setIdentidadForm(f => ({ ...f, ciudad: e.target.value }))} placeholder="Quito / Guayaquil" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>Horario Apertura</label>
                    <input type="text" value={identidadForm.horarioApertura} onChange={e => setIdentidadForm(f => ({ ...f, horarioApertura: e.target.value }))} placeholder="11:00" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 6 }}>Horario Cierre</label>
                    <input type="text" value={identidadForm.horarioCierre} onChange={e => setIdentidadForm(f => ({ ...f, horarioCierre: e.target.value }))} placeholder="22:00" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  </div>
                </div>

                <button onClick={saveIdentidad} disabled={savingIdentidad} style={{ background: cp, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: savingIdentidad ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: savingIdentidad ? 0.7 : 1 }}>
                  {savingIdentidad ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                  {savingIdentidad ? 'Guardando cambios...' : 'Guardar Identidad y Configuración'}
                </button>
              </div>
            </div>
          )}

          {/* ── PRODUCTOS & CATEGORÍAS TAB ─────────────────────────────────── */}
          {tab === 'productos' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setProductForm({ id: '', nombre: '', descripcion: '', precio: '', imagenUrl: '', categoriaId: categories[0]?.id || '', activo: true }); setShowProductModal(true); }}
                    style={{ background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={16} /> Crear Producto
                  </button>
                  <button onClick={() => setShowCategoryModal(true)}
                    style={{ background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={16} /> Nueva Categoría
                  </button>
                </div>
                <div style={{ color: '#6b7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span><strong>{products.length}</strong> productos</span>
                  <span><strong>{categories.length}</strong> categorías</span>
                </div>
              </div>

              {/* Product Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {products.map(p => (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', opacity: p.activo ? 1 : 0.6, border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}>
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} style={{ width: '100%', height: 140, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ height: 140, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={36} /></div>
                    )}
                    <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15, color: '#1f2937', margin: '0 0 4px' }}>{p.nombre}</p>
                        {p.descripcion && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.4 }}>{p.descripcion}</p>}
                        {p.categoria && <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{p.categoria.nombre}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontWeight: 900, color: cp, fontSize: 18 }}>${p.precio.toFixed(2)}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => toggleProduct(p.id, !p.activo)} title={p.activo ? 'Desactivar' : 'Activar'} style={{ background: p.activo ? '#dcfce7' : '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: p.activo ? '#15803d' : '#dc2626' }}>
                            {p.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button onClick={() => { setProductForm({ id: p.id, nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio.toString(), imagenUrl: p.imagenUrl || '', categoriaId: p.categoriaId || '', activo: p.activo }); setShowProductModal(true); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#475569' }}>
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#dc2626' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MESAS TAB ──────────────────────────────────────────────────── */}
          {tab === 'mesas' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <button onClick={() => { setTableForm({ id: '', name: `Mesa ${tables.length + 1}`, capacity: 4, estado: 'DISPONIBLE' }); setShowTableModal(true); }}
                  style={{ background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> Crear Nueva Mesa
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  {TABLE_STATES.map(s => (
                    <div key={s} style={{ background: '#fff', borderRadius: 10, padding: '8px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: TABLE_COLORS[s] }} />
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>{s}: {tables.filter(t => t.estado === s).length}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {tables.map(table => (
                  <div key={table.id} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${TABLE_COLORS[table.estado] || '#e5e7eb'}20`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 17, color: '#1f2937' }}>{table.name}</span>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: TABLE_COLORS[table.estado] || '#e5e7eb' }} />
                      </div>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Capacidad: <strong>{table.capacity} p.</strong></p>
                    </div>

                    <div>
                      <select value={table.estado} onChange={e => changeTableState(table.id, e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, cursor: 'pointer', color: '#374151', marginBottom: 8, fontWeight: 600 }}>
                        {TABLE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setTableForm({ id: table.id, name: table.name, capacity: table.capacity, estado: table.estado }); setShowTableModal(true); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#475569' }}><Edit3 size={13} /></button>
                        <button onClick={() => deleteTable(table.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PEDIDOS KANBAN TAB ─────────────────────────────────────────── */}
          {tab === 'pedidos' && (
            <div style={{ animation: 'fadeIn 0.3s ease', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 14, minWidth: 960 }}>
                {KANBAN_COLS.map(col => {
                  const colOrders = orders.filter(o => o.estado === col.key);
                  return (
                    <div key={col.key} style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${col.color}15`, border: `1px solid ${col.color}30`, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: col.color }}>{col.label}</span>
                        <span style={{ background: col.color, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{colOrders.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {colOrders.map(o => (
                          <div key={o.id} style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: 15, color: '#1f2937' }}>#{o.numeroPedido}</span>
                              <span style={{ fontWeight: 800, color: cp, fontSize: 14 }}>${o.total?.toFixed(2)}</span>
                            </div>
                            {o.extraInfo?.tableName && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px', fontWeight: 600 }}>🪑 {o.extraInfo.tableName}</p>}
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>{o.tipoEntrega} • {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {KANBAN_COLS.filter(c => c.key !== col.key && c.key !== 'CANCELADO').slice(0, 2).map(next => (
                                <button key={next.key} onClick={() => changeOrderState(o.id, next.key)} style={{ background: `${next.color}20`, color: next.color, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                                  → {next.label}
                                </button>
                              ))}
                              {col.key !== 'CANCELADO' && (
                                <button onClick={() => changeOrderState(o.id, 'CANCELADO')} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PROMOCIONES TAB ────────────────────────────────────────────── */}
          {tab === 'promociones' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <button onClick={() => { setPromoForm({ id: '', titulo: '', descripcion: '', precioPromo: '', precioAnterior: '', imagenUrl: '', estado: 'publicada' }); setShowPromoModal(true); }}
                  style={{ background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={16} /> Crear Promoción / Banner
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                {promotions.map(promo => (
                  <div key={promo.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                    {promo.imagenUrl && <img src={promo.imagenUrl} alt={promo.titulo} style={{ width: '100%', height: 140, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <h4 style={{ fontWeight: 800, fontSize: 16, color: '#1f2937', margin: 0 }}>{promo.titulo}</h4>
                        <span style={{ background: promo.estado === 'publicada' ? '#dcfce7' : '#f3f4f6', color: promo.estado === 'publicada' ? '#15803d' : '#6b7280', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{promo.estado}</span>
                      </div>
                      {promo.descripcion && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>{promo.descripcion}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                        <div>
                          <span style={{ fontWeight: 900, color: cp, fontSize: 18 }}>${promo.precioPromo.toFixed(2)}</span>
                          {promo.precioAnterior && <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 8 }}>${promo.precioAnterior.toFixed(2)}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setPromoForm({ id: promo.id, titulo: promo.titulo, descripcion: promo.descripcion, precioPromo: promo.precioPromo.toString(), precioAnterior: promo.precioAnterior ? promo.precioAnterior.toString() : '', imagenUrl: promo.imagenUrl, estado: promo.estado }); setShowPromoModal(true); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#475569' }}><Edit3 size={14} /></button>
                          <button onClick={() => deletePromo(promo.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {promotions.length === 0 && <p style={{ color: '#9ca3af', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>Sin promociones registradas. Haz clic en "Crear Promoción".</p>}
              </div>
            </div>
          )}

          {/* ── CANALES ACTIVOS TAB ────────────────────────────────────────── */}
          {tab === 'canales' && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 700 }}>
              <div style={{ background: '#fff3cd', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid #ffc107', fontSize: 13, color: '#664d03', lineHeight: 1.5 }}>
                ⚡ Modificar los canales activa o desactiva las capacidades del Runtime en tiempo real (Override declarativo), sin alterar el manifest base.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {CHANNELS.map(channel => {
                  const active = channels[channel.key] !== false;
                  return (
                    <div key={channel.key} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16, border: `2px solid ${active ? '#dcfce7' : '#f3f4f6'}` }}>
                      <div style={{ fontSize: 28, width: 44, textAlign: 'center' }}>{channel.icon}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 2px', fontSize: 15 }}>{channel.label}</p>
                        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{channel.desc}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#15803d' : '#9ca3af' }}>{active ? 'Activo' : 'Inactivo'}</span>
                        <button onClick={() => setChannels(c => ({ ...c, [channel.key]: !active }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: active ? '#10b981' : '#d1d5db', display: 'flex' }}>
                          {active ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={saveChannels} disabled={savingChannels} style={{ marginTop: 20, background: cp, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontWeight: 700, fontSize: 15, cursor: savingChannels ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: savingChannels ? 0.7 : 1 }}>
                {savingChannels ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                {savingChannels ? 'Guardando...' : 'Guardar canales'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL PRODUCTO ──────────────────────────────────────────────── */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: 18, color: '#1f2937' }}>{productForm.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Nombre del Producto *</label>
                <input type="text" value={productForm.nombre} onChange={e => setProductForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Bife de Chorizo" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Descripción</label>
                <textarea value={productForm.descripcion} onChange={e => setProductForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción del producto..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 60 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Precio ($) *</label>
                  <input type="number" step="0.01" value={productForm.precio} onChange={e => setProductForm(f => ({ ...f, precio: e.target.value }))} placeholder="18.50" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Categoría</label>
                  <select value={productForm.categoriaId} onChange={e => setProductForm(f => ({ ...f, categoriaId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>URL de Imagen</label>
                <input type="text" value={productForm.imagenUrl} onChange={e => setProductForm(f => ({ ...f, imagenUrl: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={saveProduct} style={{ width: '100%', background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CATEGORÍA ─────────────────────────────────────────────── */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: 17, color: '#1f2937' }}>Nueva Categoría</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Nombre *</label>
                <input type="text" value={categoryForm.nombre} onChange={e => setCategoryForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Entradas, Bebidas..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={saveCategory} style={{ width: '100%', background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
                Guardar Categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MESA ─────────────────────────────────────────────────── */}
      {showTableModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: 17, color: '#1f2937' }}>{tableForm.id ? 'Editar Mesa' : 'Agregar Nueva Mesa'}</h3>
              <button onClick={() => setShowTableModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Nombre / Identificador de Mesa *</label>
                <input type="text" value={tableForm.name} onChange={e => setTableForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Mesa 21" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Capacidad de Personas</label>
                <input type="number" value={tableForm.capacity} onChange={e => setTableForm(f => ({ ...f, capacity: parseInt(e.target.value) || 1 }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={saveTable} style={{ width: '100%', background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
                Guardar Mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PROMOCIÓN ────────────────────────────────────────────── */}
      {showPromoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: 18, color: '#1f2937' }}>{promoForm.id ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
              <button onClick={() => setShowPromoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Título de la Promoción *</label>
                <input type="text" value={promoForm.titulo} onChange={e => setPromoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Combo Familiar 2x1" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Descripción</label>
                <textarea value={promoForm.descripcion} onChange={e => setPromoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Detalles de la promoción..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 60 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Precio Oferta ($)</label>
                  <input type="number" step="0.01" value={promoForm.precioPromo} onChange={e => setPromoForm(f => ({ ...f, precioPromo: e.target.value }))} placeholder="24.99" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>Precio Anterior ($)</label>
                  <input type="number" step="0.01" value={promoForm.precioAnterior} onChange={e => setPromoForm(f => ({ ...f, precioAnterior: e.target.value }))} placeholder="35.00" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4 }}>URL Imagen Banner</label>
                <input type="text" value={promoForm.imagenUrl} onChange={e => setPromoForm(f => ({ ...f, imagenUrl: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={savePromo} style={{ width: '100%', background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
                Guardar Promoción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
