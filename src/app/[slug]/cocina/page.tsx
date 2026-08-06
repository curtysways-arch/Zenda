'use client';
// src/app/[slug]/cocina/page.tsx
// Kitchen Display System (KDS) — activado por capability: kitchen
// Pantalla interactiva de cocina — tarjetas de pedidos con timers y cambio de estado

import { useState, useEffect, useCallback } from 'react';
import { Clock, ChefHat, CheckCircle, Bell, Loader2, RefreshCw, Flame } from 'lucide-react';

interface OrderItem { id: string; nombreProducto: string; cantidad: number; precioUnitario: number; }
interface KDSOrder { id: string; numeroPedido: number; estado: string; tipoEntrega: string; extraInfo?: any; items: OrderItem[]; createdAt: string; notas?: string; }

const KITCHEN_STAGES = [
  { key: 'PAGO_CONFIRMADO', label: 'NUEVO', color: '#f59e0b', bg: '#fffbeb', next: 'EN_PREPARACION', nextLabel: '▶ Iniciar' },
  { key: 'EN_PREPARACION', label: 'PREPARANDO', color: '#3b82f6', bg: '#eff6ff', next: 'LISTO', nextLabel: '✓ Listo' },
  { key: 'LISTO', label: 'LISTO', color: '#10b981', bg: '#f0fdf4', next: 'ENTREGADO', nextLabel: '🚀 Entregar' },
];

function getElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function useElapsedTimer(createdAt: string) {
  const [elapsed, setElapsed] = useState(() => getElapsed(createdAt));
  useEffect(() => {
    const t = setInterval(() => setElapsed(getElapsed(createdAt)), 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

function isUrgent(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 10 * 60 * 1000;
}

function OrderCard({ order, slug, onAdvance }: { order: KDSOrder; slug: string; onAdvance: () => void }) {
  const elapsed = useElapsedTimer(order.createdAt);
  const stage = KITCHEN_STAGES.find(s => s.key === order.estado);
  const urgent = isUrgent(order.createdAt);
  const tableInfo = order.extraInfo?.tableName || order.notas || '';

  async function advance() {
    await fetch(`/api/${slug}/kitchen/${order.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advance: true })
    });
    onAdvance();
  }

  return (
    <div style={{ background: stage?.bg || '#fff', border: `2px solid ${urgent ? '#dc2626' : (stage?.color || '#e0e0e0')}`, borderRadius: 16, padding: 20, animation: urgent ? 'pulse 2s infinite' : 'none', boxShadow: urgent ? '0 0 20px rgba(220,38,38,0.3)' : '0 4px 20px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
      {urgent && <div style={{ position: 'absolute', top: 8, right: 8, background: '#dc2626', color: '#fff', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>⚠️ URGENTE</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ background: stage?.color, color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{stage?.label || order.estado}</span>
          <span style={{ marginLeft: 8, fontWeight: 800, fontSize: 20, color: '#1f2937' }}>#{order.numeroPedido}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: urgent ? '#dc2626' : '#6b7280', fontWeight: 700 }}>
          <Clock size={14} />
          <span style={{ fontSize: 16, fontFamily: 'monospace' }}>{elapsed}</span>
        </div>
      </div>
      {tableInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
          🪑 {tableInfo}
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < order.items.length - 1 ? '1px dashed #e0e0e0' : 'none' }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>{item.cantidad}x {item.nombreProducto}</span>
          </div>
        ))}
      </div>
      {order.notas && !tableInfo && <p style={{ background: '#fef9c3', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#854d0e', margin: '0 0 12px' }}>📝 {order.notas}</p>}
      {stage && stage.next !== 'ENTREGADO' ? (
        <button onClick={advance} style={{ width: '100%', background: stage.color, color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {stage.nextLabel}
        </button>
      ) : stage?.next === 'ENTREGADO' ? (
        <button onClick={advance} style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {stage.nextLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function CocinaPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState('');

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);
  useEffect(() => { if (slug) { fetchOrders(); const t = setInterval(fetchOrders, 8000); return () => clearInterval(t); } }, [slug]);

  const fetchOrders = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/${slug}/kitchen`);
      if (!res.ok) { const d = await res.json(); setError(d.message || 'Error'); return; }
      const data = await res.json();
      setOrders(data.orders || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const byStage = (stateKey: string) => orders.filter(o => o.estado === stateKey);
  const urgentCount = orders.filter(o => isUrgent(o.createdAt)).length;

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap'); @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); } 50% { box-shadow: 0 0 0 10px rgba(220,38,38,0); } }`}</style>

      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#c2410c', borderRadius: 12, padding: 10 }}>
            <ChefHat size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: 0 }}>Kitchen Display System</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
              {slug} • Última actualización: {lastRefresh.toLocaleTimeString()} • Auto-refresh 8s
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {urgentCount > 0 && (
            <div style={{ background: '#dc2626', borderRadius: 999, padding: '6px 14px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={14} />
              {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
            </div>
          )}
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>{byStage('PAGO_CONFIRMADO').length}</span> nuevos •{' '}
            <span style={{ color: '#3b82f6', fontWeight: 700 }}>{byStage('EN_PREPARACION').length}</span> en proceso •{' '}
            <span style={{ color: '#10b981', fontWeight: 700 }}>{byStage('LISTO').length}</span> listos
          </div>
          <button onClick={fetchOrders} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#dc2626', color: '#fff', padding: '10px 24px', fontSize: 14 }}>⚠️ {error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={40} color="#c2410c" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, height: 'calc(100vh - 73px)' }}>
          {KITCHEN_STAGES.map(stage => (
            <div key={stage.key} style={{ borderRight: stage.key !== 'LISTO' ? '1px solid rgba(255,255,255,0.08)' : 'none', padding: 20, overflowY: 'auto' }}>
              {/* Column Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: `${stage.color}20`, border: `1px solid ${stage.color}40` }}>
                {stage.key === 'PAGO_CONFIRMADO' && <Flame size={16} color={stage.color} />}
                {stage.key === 'EN_PREPARACION' && <ChefHat size={16} color={stage.color} />}
                {stage.key === 'LISTO' && <CheckCircle size={16} color={stage.color} />}
                <span style={{ color: stage.color, fontWeight: 700, fontSize: 14 }}>{stage.label}</span>
                <span style={{ marginLeft: 'auto', background: stage.color, color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {byStage(stage.key).length}
                </span>
              </div>

              {byStage(stage.key).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.2)' }}>
                  <ChefHat size={40} style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 13 }}>Sin pedidos en esta etapa</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {byStage(stage.key).map(order => (
                    <OrderCard key={order.id} order={order} slug={slug} onAdvance={fetchOrders} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
