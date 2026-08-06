'use client';
// src/app/[slug]/mesero/page.tsx
// Consola del Mesero — vista móvil para ver mesas, crear pedidos y gestionar entregas
// 100% dinámico por [slug] usando Table Runtime y Order Runtime

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, CheckCircle, Loader2, RefreshCw, ChefHat, Send, X, Minus } from 'lucide-react';

interface Table { id: string; name: string; estado: string; capacity: number; metadata?: any; }
interface Product { id: string; nombre: string; precio: number; imagenUrl?: string; }
interface CartItem extends Product { cantidad: number; }
interface Order { id: string; numeroPedido: number; estado: string; extraInfo?: any; items: any[]; total: number; createdAt: string; }

const TABLE_STATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DISPONIBLE: { bg: '#dcfce7', text: '#15803d', label: '✓ Libre' },
  OCUPADA: { bg: '#fef3c7', text: '#d97706', label: '● Ocupada' },
  RESERVADA: { bg: '#e0e7ff', text: '#4338ca', label: '◆ Reservada' },
};

export default function MeseroPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mesas' | 'pedidos' | 'nuevo-pedido'>('mesas');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);
  useEffect(() => { if (slug) { loadData(); const t = setInterval(loadData, 15000); return () => clearInterval(t); } }, [slug]);

  async function loadData() {
    try {
      const [tabRes, catRes, ordRes] = await Promise.all([
        fetch(`/api/${slug}/tables`),
        fetch(`/api/${slug}/catalogue`),
        fetch(`/api/${slug}/kitchen`)
      ]);
      if (tabRes.ok) setTables((await tabRes.json()).tables || []);
      if (catRes.ok) setProducts((await catRes.json()).products || []);
      if (ordRes.ok) setOrders((await ordRes.json()).orders || []);
    } finally {
      setLoading(false);
    }
  }

  async function changeTableState(tableId: string, estado: string) {
    await fetch(`/api/${slug}/tables/${tableId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    loadData();
  }

  async function advanceOrder(orderId: string) {
    await fetch(`/api/${slug}/kitchen/${orderId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advance: true })
    });
    loadData();
  }

  async function sendTableOrder() {
    if (!selectedTable || cart.length === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/${slug}/mesa-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: selectedTable.metadata?.number || selectedTable.name,
          tableName: selectedTable.name,
          items: cart.map(i => ({ productoId: i.id, nombreProducto: i.nombre, precioUnitario: i.precio, cantidad: i.cantidad })),
          nombreCliente: 'Pedido de Mesero'
        })
      });
      if (res.ok) {
        await changeTableState(selectedTable.id, 'OCUPADA');
        setCart([]); setSelectedTable(null); setActiveTab('pedidos');
        loadData();
      }
    } finally {
      setSending(false);
    }
  }

  function addToCart(p: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      return ex ? prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i) : [...prev, { ...p, cantidad: 1 }];
    });
  }
  function removeFromCart(id: string) {
    setCart(prev => { const ex = prev.find(i => i.id === id); return ex && ex.cantidad > 1 ? prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i) : prev.filter(i => i.id !== id); });
  }

  const activeOrders = orders.filter(o => !['ENTREGADO', 'CANCELADO'].includes(o.estado));
  const cartTotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const STATE_LABEL: Record<string, string> = { PAGO_CONFIRMADO: '⏳ Nuevo', EN_PREPARACION: '👨‍🍳 Preparando', LISTO: '✅ Listo' };

  if (loading) return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#c2410c' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", maxWidth: 480, margin: '0 auto' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: '#c2410c', padding: '16px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ margin: 0, fontWeight: 900, fontSize: 20 }}>🍽️ Consola Mesero</h1><p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{slug}</p></div>
          <button onClick={loadData} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px', color: '#fff', cursor: 'pointer' }}><RefreshCw size={16} /></button>
        </div>
        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 13 }}>🪑 {tables.filter(t => t.estado === 'DISPONIBLE').length} libres</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 13 }}>🔴 {tables.filter(t => t.estado === 'OCUPADA').length} ocupadas</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 13 }}>📋 {activeOrders.length} activos</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        {(['mesas', 'pedidos', 'nuevo-pedido'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? '#c2410c' : '#6b7280', borderBottom: activeTab === tab ? '2px solid #c2410c' : '2px solid transparent' }}>
            {tab === 'mesas' && '🪑 Mesas'}
            {tab === 'pedidos' && `📋 Pedidos${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}`}
            {tab === 'nuevo-pedido' && '➕ Nuevo'}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* MESAS TAB */}
        {activeTab === 'mesas' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {tables.map(table => {
              const s = TABLE_STATE_COLORS[table.estado] || TABLE_STATE_COLORS.DISPONIBLE;
              return (
                <div key={table.id} style={{ background: s.bg, borderRadius: 12, padding: 12, border: `2px solid ${s.text}30`, cursor: 'pointer' }}
                  onClick={() => { setSelectedTable(table); setActiveTab('nuevo-pedido'); }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#1f2937', margin: '0 0 4px' }}>{table.name}</p>
                  <span style={{ color: s.text, fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {table.estado !== 'DISPONIBLE' && (
                      <button onClick={(e) => { e.stopPropagation(); changeTableState(table.id, 'DISPONIBLE'); }} style={{ background: '#dcfce7', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: '#15803d', cursor: 'pointer', fontWeight: 600 }}>Liberar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PEDIDOS TAB */}
        {activeTab === 'pedidos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><ClipboardList size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p>Sin pedidos activos</p></div>
            ) : activeOrders.map(order => (
              <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#1f2937' }}>Pedido #{order.numeroPedido}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{STATE_LABEL[order.estado] || order.estado}</span>
                </div>
                {order.extraInfo?.tableName && <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 8px' }}>🪑 {order.extraInfo.tableName}</p>}
                <div style={{ marginBottom: 10 }}>
                  {order.items?.map((item: any, i: number) => <p key={i} style={{ margin: '2px 0', fontSize: 13, color: '#4b5563' }}>• {item.cantidad}x {item.nombreProducto}</p>)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#c2410c' }}>${order.total?.toFixed(2)}</span>
                  <button onClick={() => advanceOrder(order.id)} style={{ background: '#c2410c', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {order.estado === 'LISTO' ? '🚀 Marcar entregado' : '▶ Avanzar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NUEVO PEDIDO TAB */}
        {activeTab === 'nuevo-pedido' && (
          <div>
            {/* Select Table */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <p style={{ fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>Mesa seleccionada:</p>
              {selectedTable ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef3c7', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontWeight: 700 }}>{selectedTable.name}</span>
                  <button onClick={() => setSelectedTable(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tables.filter(t => t.estado === 'DISPONIBLE').slice(0, 8).map(t => (
                    <button key={t.id} onClick={() => setSelectedTable(t)} style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#15803d' }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {products.slice(0, 10).map(p => {
                const inCart = cart.find(i => i.id === p.id);
                return (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div><p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{p.nombre}</p><p style={{ margin: 0, fontWeight: 700, color: '#c2410c', fontSize: 13 }}>${p.precio.toFixed(2)}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {inCart && <><button onClick={() => removeFromCart(p.id)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button><span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{inCart.cantidad}</span></>}
                      <button onClick={() => addToCart(p)} style={{ background: '#c2410c', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Send Order */}
            {cart.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'sticky', bottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 12, color: '#1f2937' }}>
                  <span>{cart.reduce((s, i) => s + i.cantidad, 0)} productos</span>
                  <span style={{ color: '#c2410c' }}>${cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={sendTableOrder} disabled={sending || !selectedTable} style={{ width: '100%', background: selectedTable ? '#c2410c' : '#e5e7eb', color: selectedTable ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: selectedTable ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                  {!selectedTable ? 'Selecciona una mesa' : sending ? 'Enviando...' : 'Enviar a cocina'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
