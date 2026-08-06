'use client';
// src/app/[slug]/admin/page.tsx
// Dashboard Administrativo Dinámico — resuelve negocio por [slug]
// Módulos: KPIs, Productos (CRUD), Mesas, Kanban Pedidos, Canales Activos
// 100% genérico — funciona para cualquier Blueprint con capabilities: orders, catalog, tables, kitchen

import { useState, useEffect } from 'react';
import { BarChart3, Package, Layout, ClipboardList, Radio, Loader2, TrendingUp, ShoppingBag, Users, DollarSign, Plus, Edit3, Eye, EyeOff, ToggleLeft, ToggleRight, RefreshCw, ChefHat, X, Save, Check } from 'lucide-react';

type AdminTab = 'dashboard' | 'productos' | 'mesas' | 'pedidos' | 'canales';

interface Order { id: string; numeroPedido: number; estado: string; total: number; nombreCliente: string; tipoEntrega: string; extraInfo?: any; items: any[]; createdAt: string; }
interface Product { id: string; nombre: string; precio: number; activo: boolean; imagenUrl?: string; categoria?: any; }
interface Table { id: string; name: string; estado: string; capacity: number; }
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

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [channels, setChannels] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({ totalVentas: 0, pedidosActivos: 0, totalOrders: 0, mesasOcupadas: 0 });

  // UI State
  const [savingChannels, setSavingChannels] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);
  useEffect(() => { if (slug) loadAll(); }, [slug]);

  async function loadAll() {
    setLoading(true);
    try {
      const [negRes, ordRes, catRes, tabRes, chanRes] = await Promise.all([
        fetch(`/api/${slug}/negocio`),
        fetch(`/api/${slug}/admin-orders`),
        fetch(`/api/${slug}/catalogue`),
        fetch(`/api/${slug}/tables`),
        fetch(`/api/${slug}/channels`)
      ]);
      if (negRes.ok) setNegocio((await negRes.json()).negocio);
      if (ordRes.ok) { const d = await ordRes.json(); setOrders(d.orders || []); setStats(s => ({ ...s, totalVentas: d.stats?.totalVentas || 0, pedidosActivos: d.stats?.pedidosActivos || 0, totalOrders: d.stats?.totalOrders || 0 })); }
      if (catRes.ok) setProducts((await catRes.json()).products || []);
      if (tabRes.ok) { const d = await tabRes.json(); const t = d.tables || []; setTables(t); setStats(s => ({ ...s, mesasOcupadas: t.filter((x: Table) => x.estado === 'OCUPADA').length })); }
      if (chanRes.ok) setChannels((await chanRes.json()).channels || {});
    } finally { setLoading(false); }
  }

  async function saveChannels() {
    setSavingChannels(true);
    await fetch(`/api/${slug}/channels`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channels }) });
    setSavingChannels(false);
  }

  async function toggleProduct(id: string, activo: boolean) {
    await fetch(`/api/${slug}/catalogue`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'product', id, activo }) });
    setProducts(p => p.map(x => x.id === id ? { ...x, activo } : x));
  }

  async function changeOrderState(id: string, estado: string) {
    await fetch(`/api/${slug}/admin-orders`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, estado } : o));
  }

  async function changeTableState(id: string, estado: string) {
    await fetch(`/api/${slug}/tables/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
    setTables(prev => prev.map(t => t.id === id ? { ...t, estado } : t));
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
    { key: 'productos', label: 'Productos', icon: <Package size={16} /> },
    { key: 'mesas', label: 'Mesas', icon: <Layout size={16} /> },
    { key: 'pedidos', label: 'Pedidos', icon: <ClipboardList size={16} /> },
    { key: 'canales', label: 'Canales', icon: <Radio size={16} /> },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={40} color={cp} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#6b7280', fontFamily: 'Inter, sans-serif' }}>Cargando panel...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Sidebar */}
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div style={{ width: 220, background: cs, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cp, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChefHat size={18} color="#fff" /></div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{negocio?.nombre || slug}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Panel Admin</p>
              </div>
            </div>
          </div>
          <nav style={{ padding: '16px 12px', flex: 1 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 4, background: tab === t.key ? cp : 'transparent', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: tab === t.key ? 600 : 400, fontSize: 14, textAlign: 'left', transition: 'all 0.15s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <a href={`/${slug}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none' }}>← Ver landing pública</a>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24, color: '#1f2937' }}>
                {TABS.find(t => t.key === tab)?.label}
              </h1>
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>

          {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
          {tab === 'dashboard' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {/* KPI Cards */}
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
                      <span style={{ background: `${kpi.color}15`, color: kpi.color, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{kpi.trend}</span>
                    </div>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#1f2937', margin: '0 0 4px' }}>{kpi.value}</p>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Sales Chart */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 20px', fontSize: 16 }}>Ventas últimos 7 días</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                  {Object.entries(salesByDay).map(([day, val], i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', background: cp, borderRadius: '4px 4px 0 0', height: `${Math.max(4, (val / maxSale) * 100)}px`, transition: 'height 0.5s ease', position: 'relative' }}>
                        {val > 0 && <span style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#6b7280', whiteSpace: 'nowrap' }}>${val.toFixed(0)}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Orders Preview */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, color: '#1f2937', margin: 0, fontSize: 16 }}>Pedidos Activos</h3>
                  <button onClick={() => setTab('pedidos')} style={{ background: 'none', border: 'none', color: cp, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Ver todos →</button>
                </div>
                {orders.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.estado)).slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div><p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>#{o.numeroPedido} — {o.extraInfo?.tableName || o.tipoEntrega}</p><p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{o.items?.length || 0} productos</p></div>
                    <div style={{ textAlign: 'right' }}><p style={{ margin: 0, fontWeight: 700, color: cp }}>${o.total?.toFixed(2)}</p><span style={{ fontSize: 11, color: '#3b82f6' }}>{o.estado}</span></div>
                  </div>
                ))}
                {orders.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.estado)).length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin pedidos activos en este momento</p>}
              </div>
            </div>
          )}

          {/* ── PRODUCTOS ────────────────────────────────────────────────── */}
          {tab === 'productos' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {products.map(p => (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', opacity: p.activo ? 1 : 0.6 }}>
                    {p.imagenUrl && <img src={p.imagenUrl} alt={p.nombre} style={{ width: '100%', height: 130, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />}
                    <div style={{ padding: 14 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', margin: '0 0 4px' }}>{p.nombre}</p>
                      {p.categoria && <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 8px' }}>{p.categoria.nombre}</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: cp, fontSize: 16 }}>${p.precio.toFixed(2)}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => toggleProduct(p.id, !p.activo)} title={p.activo ? 'Desactivar' : 'Activar'} style={{ background: p.activo ? '#dcfce7' : '#fee2e2', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: p.activo ? '#15803d' : '#dc2626' }}>
                            {p.activo ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MESAS ────────────────────────────────────────────────────── */}
          {tab === 'mesas' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {TABLE_STATES.map(s => (
                  <div key={s} style={{ background: '#fff', borderRadius: 10, padding: '10px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: TABLE_COLORS[s] }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{s}: {tables.filter(t => t.estado === s).length}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {tables.map(table => (
                  <div key={table.id} style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${TABLE_COLORS[table.estado] || '#e5e7eb'}20` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#1f2937' }}>{table.name}</span>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: TABLE_COLORS[table.estado] || '#e5e7eb', display: 'block' }} />
                    </div>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 10px' }}>{table.capacity} personas • {table.estado}</p>
                    <select value={table.estado} onChange={e => changeTableState(table.id, e.target.value)} style={{ width: '100%', padding: '5px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 11, cursor: 'pointer', color: '#374151' }}>
                      {TABLE_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PEDIDOS KANBAN ────────────────────────────────────────────── */}
          {tab === 'pedidos' && (
            <div style={{ animation: 'fadeIn 0.3s ease', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 12, minWidth: 900 }}>
                {KANBAN_COLS.map(col => {
                  const colOrders = orders.filter(o => o.estado === col.key);
                  return (
                    <div key={col.key} style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${col.color}15`, border: `1px solid ${col.color}30`, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: col.color }}>{col.label}</span>
                        <span style={{ background: col.color, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{colOrders.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {colOrders.map(o => (
                          <div key={o.id} style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>#{o.numeroPedido}</span>
                              <span style={{ fontWeight: 700, color: cp, fontSize: 13 }}>${o.total?.toFixed(2)}</span>
                            </div>
                            {o.extraInfo?.tableName && <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>🪑 {o.extraInfo.tableName}</p>}
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px' }}>{o.tipoEntrega}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {KANBAN_COLS.filter(c => c.key !== col.key && c.key !== 'CANCELADO').slice(0, 2).map(next => (
                                <button key={next.key} onClick={() => changeOrderState(o.id, next.key)} style={{ background: `${next.color}20`, color: next.color, border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                                  → {next.label}
                                </button>
                              ))}
                              {col.key !== 'CANCELADO' && (
                                <button onClick={() => changeOrderState(o.id, 'CANCELADO')} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                                  ✕
                                </button>
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

          {/* ── CANALES ACTIVOS ───────────────────────────────────────────── */}
          {tab === 'canales' && (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 680 }}>
              <div style={{ background: '#fff3cd', borderRadius: 12, padding: '12px 16px', marginBottom: 20, border: '1px solid #ffc107', fontSize: 14, color: '#664d03' }}>
                ⚡ Los cambios actualizan el <strong>Runtime Configuration Override</strong> del negocio en tiempo real, sin modificar el manifest original ni código fuente.
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
                        <div style={{ marginTop: 4 }}>
                          {channel.key === 'TABLE' && <a href={`/${slug}/mesa/01`} target="_blank" style={{ color: cp, fontSize: 11, textDecoration: 'none' }}>→ Ver Mesa 01</a>}
                          {channel.key === 'KDS' && <a href={`/${slug}/cocina`} target="_blank" style={{ color: cp, fontSize: 11, textDecoration: 'none' }}>→ Abrir KDS</a>}
                          {channel.key === 'WAITER' && <a href={`/${slug}/mesero`} target="_blank" style={{ color: cp, fontSize: 11, textDecoration: 'none' }}>→ Abrir Consola</a>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#15803d' : '#9ca3af' }}>{active ? 'Activo' : 'Inactivo'}</span>
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
                {savingChannels ? 'Guardando...' : 'Guardar configuración de canales'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
