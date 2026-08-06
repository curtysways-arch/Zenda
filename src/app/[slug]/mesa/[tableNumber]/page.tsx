'use client';
// src/app/[slug]/mesa/[tableNumber]/page.tsx
// Flujo de Pedido QR Mesa — Menú completo + carrito + envío a KDS
// 100% dinámico: resuelve negocio por slug, verifica channel TABLE, usa Order Runtime genérico

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, CheckCircle, Clock, ChefHat, Truck, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  categoria?: { nombre: string };
}

interface CartItem extends Product {
  cantidad: number;
}

const ORDER_STATES: Record<string, { label: string; color: string; icon: string }> = {
  'PAGO_CONFIRMADO': { label: 'Pedido enviado', color: '#f59e0b', icon: '⏳' },
  'EN_PREPARACION': { label: 'En preparación', color: '#3b82f6', icon: '👨‍🍳' },
  'LISTO': { label: '¡Listo! En camino a tu mesa', color: '#10b981', icon: '✅' },
  'ENTREGADO': { label: 'Entregado', color: '#6b7280', icon: '🎉' },
};

export default function MesaQRPage({ params }: { params: Promise<{ slug: string; tableNumber: string }> }) {
  const [slug, setSlug] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [negocio, setNegocio] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setSlug(p.slug);
      setTableNumber(p.tableNumber);
    });
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetchData();
  }, [slug]);

  // Poll order state every 5s once order is placed
  useEffect(() => {
    if (!order || !slug) return;
    if (['ENTREGADO', 'CANCELADO'].includes(order.estado)) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/${slug}/kitchen/${order.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order) setOrder(data.order);
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [order, slug]);

  async function fetchData() {
    try {
      const [negRes, catRes] = await Promise.all([
        fetch(`/api/public/negocio?slug=${slug}`),
        fetch(`/api/${slug}/catalogue`)
      ]);
      if (negRes.ok) {
        const negData = await negRes.json();
        setNegocio(negData.negocio || negData);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setProducts(catData.products || []);
        setCategories(catData.categories || []);
      }
    } catch (e) {
      setError('No se pudo cargar el menú. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...product, cantidad: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => {
      const existing = prev.find(i => i.id === productId);
      if (existing && existing.cantidad > 1) return prev.map(i => i.id === productId ? { ...i, cantidad: i.cantidad - 1 } : i);
      return prev.filter(i => i.id !== productId);
    });
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.cantidad, 0);
  const filteredProducts = activeCategory === 'all' ? products : products.filter(p => p.categoria?.nombre === activeCategory || (p as any).categoriaId === activeCategory);

  async function sendOrder() {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      const res = await fetch(`/api/${slug}/mesa-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          tableName: `Mesa ${tableNumber}`,
          items: cart.map(i => ({
            productoId: i.id,
            nombreProducto: i.nombre,
            precioUnitario: i.precio,
            cantidad: i.cantidad
          })),
          nombreCliente: 'Cliente Mesa'
        })
      });
      const data = await res.json();
      if (data.success) {
        setOrder({ ...data.pedido, estado: 'PAGO_CONFIRMADO' });
        setCart([]);
        setShowCart(false);
      } else {
        setError(data.error || 'Error al enviar pedido');
      }
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setOrdering(false);
    }
  }

  const cp = negocio?.colorPrimario || '#c2410c';
  const cs = negocio?.colorSecundario || '#1c0a00';

  if (loading) return (
    <div style={{ background: cs, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 18 }}>Cargando menú...</p>
      </div>
    </div>
  );

  if (order) {
    const stateInfo = ORDER_STATES[order.estado] || { label: order.estado, color: '#6b7280', icon: '📋' };
    return (
      <div style={{ background: cs, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');`}</style>
        <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{stateInfo.icon}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: cs, marginBottom: 8 }}>Pedido #{order.numeroPedido}</h2>
          <div style={{ background: stateInfo.color, color: '#fff', borderRadius: 999, padding: '8px 20px', display: 'inline-block', fontWeight: 600, marginBottom: 24 }}>{stateInfo.label}</div>
          <p style={{ color: '#666', marginBottom: 24 }}>Mesa <strong>{tableNumber}</strong></p>
          <div style={{ background: '#f8f8f8', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            {order.items?.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                <span>{item.cantidad}x {item.nombreProducto}</span>
                <span>${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #e0e0e0', marginTop: 8, paddingTop: 8, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>Total</span><span>${order.total?.toFixed(2)}</span>
            </div>
          </div>
          {!['ENTREGADO', 'CANCELADO'].includes(order.estado) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#888', fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Actualizando en tiempo real...</span>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: cs, minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .product-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important; }`}</style>

      {/* Header */}
      <div style={{ background: cp, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>Estás en</p>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Mesa {tableNumber} — {negocio?.nombre || slug}</h1>
        </div>
        <button onClick={() => setShowCart(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
          <ShoppingCart size={18} />
          {cartCount > 0 && <span style={{ background: '#fff', color: cp, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{cartCount}</span>}
          {cartTotal > 0 ? `$${cartTotal.toFixed(2)}` : 'Carrito'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#dc2626', color: '#fff', padding: '12px 20px', textAlign: 'center', fontSize: 14 }}>
          {error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ padding: '16px 20px', overflowX: 'auto', display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
        {[{ id: 'all', nombre: '🍽️ Todo' }, ...categories].map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: activeCategory === cat.id ? cp : 'rgba(255,255,255,0.1)', color: activeCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}>
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filteredProducts.map(product => {
          const inCart = cart.find(i => i.id === product.id);
          return (
            <div key={product.id} className="product-card" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s', cursor: 'pointer', animation: 'fadeIn 0.3s ease' }}>
              {product.imagenUrl && (
                <img src={product.imagenUrl} alt={product.nombre} style={{ width: '100%', height: 160, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              <div style={{ padding: 16 }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>{product.nombre}</h3>
                {product.descripcion && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 12px', lineHeight: 1.4 }}>{product.descripcion}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: cp, fontWeight: 800, fontSize: 18 }}>${product.precio.toFixed(2)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {inCart && (
                      <>
                        <button onClick={() => removeFromCart(product.id)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Minus size={14} />
                        </button>
                        <span style={{ color: '#fff', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{inCart.cantidad}</span>
                      </>
                    )}
                    <button onClick={() => addToCart(product)} style={{ background: cp, border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
          <div onClick={() => setShowCart(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ width: '90%', maxWidth: 400, background: '#fff', padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: cs }}>Tu pedido — Mesa {tableNumber}</h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <ShoppingCart size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Tu carrito está vacío</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: cs, margin: 0, fontSize: 14 }}>{item.nombre}</p>
                        <p style={{ color: cp, fontWeight: 700, margin: 0 }}>${(item.precio * item.cantidad).toFixed(2)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: '#f0f0f0', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                        <span style={{ fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.cantidad}</span>
                        <button onClick={() => addToCart(item)} style={{ background: cp, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginBottom: 16, color: cs }}>
                    <span>Total</span><span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={sendOrder} disabled={ordering} style={{ width: '100%', background: cp, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 16, cursor: ordering ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: ordering ? 0.7 : 1 }}>
                    {ordering ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ChefHat size={18} />}
                    {ordering ? 'Enviando a cocina...' : 'Enviar pedido a cocina'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
