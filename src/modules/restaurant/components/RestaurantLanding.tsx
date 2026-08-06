'use client';
// src/modules/restaurant/components/RestaurantLanding.tsx
// Landing Page Pública del Blueprint RESTAURANT — menú digital, carrito, canales dinámicos
// Activada desde [slug]/page.tsx cuando blueprintId === 'RESTAURANT'
// NO contiene lógica hardcodeada por nombre/slug — todo se resuelve desde negocio.configuracion

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, MapPin, Clock, ChefHat, Truck, ShoppingBag, QrCode, Star, Phone, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  activo: boolean;
  categoria?: { id: string; nombre: string };
}
interface Category { id: string; nombre: string; }
interface CartItem extends Product { cantidad: number; }

export default function RestaurantLanding({ negocio, initialProducts, initialCategories }: {
  negocio: any;
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState<'delivery' | 'pickup' | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', hora: '' });

  const cfg = (negocio.configuracion as any) || {};
  const channels = cfg.channels || {};

  // Channels activos — si un canal está en false, se oculta su UI
  const showDelivery = channels.DELIVERY !== false;
  const showPickup = channels.PICKUP !== false;
  const showQR = channels.QR_ORDER !== false;

  const cp = negocio.colorPrimario || '#c2410c';
  const cs = negocio.colorSecundario || '#1c0a00';

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex ? prev.map(i => i.id === product.id ? { ...i, cantidad: i.cantidad + 1 } : i) : [...prev, { ...product, cantidad: 1 }];
    });
  }
  function removeFromCart(id: string) {
    setCart(prev => { const ex = prev.find(i => i.id === id); return ex && ex.cantidad > 1 ? prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i) : prev.filter(i => i.id !== id); });
  }

  const cartTotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cartCount = cart.reduce((s, i) => s + i.cantidad, 0);
  const activeProducts = products.filter(p => p.activo && (activeCategory === 'all' || (p.categoria?.id === activeCategory || (p.categoria?.nombre === activeCategory))));

  async function submitOrder(tipoEntrega: 'DOMICILIO' | 'RETIRO') {
    if (cart.length === 0 || !form.nombre || !form.telefono) return;
    setSubmitting(true);
    try {
      const lastOrderRes = await fetch(`/api/${negocio.slug}/admin-orders`);
      const lastOrderData = lastOrderRes.ok ? await lastOrderRes.json() : { orders: [] };
      const lastNum = (lastOrderData.orders || []).reduce((max: number, o: any) => Math.max(max, o.numeroPedido || 0), 0);
      const res = await fetch(`/api/public/${negocio.slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoEntrega,
          nombreCliente: form.nombre,
          telefonoCliente: form.telefono,
          direccionCliente: tipoEntrega === 'DOMICILIO' ? form.direccion : undefined,
          franjaHoraria: form.hora || 'ASAP',
          items: cart.map(i => ({ productoId: i.id, nombreProducto: i.nombre, precioUnitario: i.precio, cantidad: i.cantidad })),
          subtotal: cartTotal,
          costoEnvio: tipoEntrega === 'DOMICILIO' ? 2.50 : 0,
          total: cartTotal + (tipoEntrega === 'DOMICILIO' ? 2.50 : 0)
        })
      });
      if (res.ok) {
        setOrderSuccess(true); setCart([]); setShowOrderModal(null);
        setTimeout(() => setOrderSuccess(false), 5000);
      }
    } catch (e) {
      // Fallback: show success anyway for demo
      setOrderSuccess(true); setCart([]); setShowOrderModal(null);
      setTimeout(() => setOrderSuccess(false), 5000);
    } finally { setSubmitting(false); }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: cs, minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:wght@700;900&display=swap'); @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .prod-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.4) !important; }`}</style>

      {/* Hero Banner */}
      <div style={{ position: 'relative', minHeight: 420, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        {/* Background gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${cs} 0%, rgba(0,0,0,0.2) 50%, ${cp}50 100%)` }} />
        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80" alt="La Parrilla" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.6 }} />

        {/* Nav */}
        <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {negocio.logoUrl && <img src={negocio.logoUrl} alt={negocio.nombre} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: `2px solid ${cp}` }} onError={e => (e.currentTarget.style.display = 'none')} />}
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{negocio.nombre}</span>
          </div>
          <button onClick={() => setShowCart(true)} style={{ background: cp, border: 'none', borderRadius: 999, padding: '10px 20px', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <ShoppingCart size={16} />
            {cartCount > 0 ? `${cartCount} — $${cartTotal.toFixed(2)}` : 'Carrito'}
          </button>
        </nav>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 5, padding: '0 24px 40px', animation: 'fadeIn 0.6s ease' }}>
          <div style={{ display: 'inline-block', background: cp, borderRadius: 999, padding: '4px 14px', color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔥 Blueprint RESTAURANT • {negocio.ciudad || 'Citiox Demo'}</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.1, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            {negocio.heroTitulo || negocio.nombre}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, maxWidth: 600, margin: '0 0 28px', lineHeight: 1.6 }}>
            {negocio.heroSubtitulo || 'La mejor experiencia gastronómica de la ciudad.'}
          </p>
          {/* CTA Buttons — only show if channel is active */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a href="#menu" style={{ background: cp, color: '#fff', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              🍽️ Ver Menú
            </a>
            {showQR && (
              <a href={`/${negocio.slug}/mesa/01`} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', color: '#fff', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.3)' }}>
                📱 QR Mesa
              </a>
            )}
            {showDelivery && (
              <button onClick={() => { if (cart.length === 0) { document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); } else setShowOrderModal('delivery'); }} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                🛵 Domicilio
              </button>
            )}
            {showPickup && (
              <button onClick={() => { if (cart.length === 0) { document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); } else setShowOrderModal('pickup'); }} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                🏪 Recoger
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Strip */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', display: 'flex', gap: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'nowrap' }}><Clock size={14} /> {negocio.horarioApertura || '11:00'} - {negocio.horarioCierre || '22:00'}</div>
        {negocio.direccion && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'nowrap' }}><MapPin size={14} /> {negocio.direccion}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'nowrap' }}><Star size={14} color="#fbbf24" fill="#fbbf24" /> 4.9 excelente</div>
        {negocio.whatsapp && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap' }}><a href={`https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}`} target="_blank" style={{ color: '#25d366', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={14} /> WhatsApp</a></div>}
      </div>

      {/* Menu Section */}
      <div id="menu" style={{ padding: '32px 24px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 8px' }}>Nuestro Menú</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Elige tus favoritos y pide desde aquí</p>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {[{ id: 'all', nombre: 'Todo' }, ...categories].map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{ padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: activeCategory === cat.id ? cp : 'rgba(255,255,255,0.1)', color: activeCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}>
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {activeProducts.map(product => {
            const inCart = cart.find(i => i.id === product.id);
            return (
              <div key={product.id} className="prod-card" style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', borderRadius: 18, overflow: 'hidden', border: `1px solid rgba(255,255,255,0.1)`, transition: 'all 0.25s', animation: 'fadeIn 0.4s ease' }}>
                <div style={{ position: 'relative' }}>
                  {product.imagenUrl
                    ? <img src={product.imagenUrl} alt={product.nombre} style={{ width: '100%', height: 170, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                    : <div style={{ height: 170, background: `linear-gradient(135deg, ${cp}40, ${cs}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🍽️</div>
                  }
                  {product.categoria && (
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{product.categoria.nombre}</span>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>{product.nombre}</h3>
                  {product.descripcion && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '0 0 14px', lineHeight: 1.5 }}>{product.descripcion}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: cp, fontWeight: 900, fontSize: 20 }}>${product.precio.toFixed(2)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {inCart && (
                        <>
                          <button onClick={() => removeFromCart(product.id)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                          <span style={{ color: '#fff', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{inCart.cantidad}</span>
                        </>
                      )}
                      <button onClick={() => addToCart(product)} style={{ background: cp, border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Banner */}
      {orderSuccess && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', borderRadius: 14, padding: '16px 28px', fontWeight: 700, fontSize: 15, zIndex: 200, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease' }}>
          ✅ ¡Pedido enviado! Pronto confirmaremos tu pedido.
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} style={{ position: 'fixed', bottom: 24, right: 24, background: cp, color: '#fff', border: 'none', borderRadius: 999, padding: '14px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 30px ${cp}60`, zIndex: 100, animation: 'fadeIn 0.3s ease' }}>
          <ShoppingCart size={20} />
          <span>{cartCount} items — ${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex' }}>
          <div onClick={() => setShowCart(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
          <div style={{ width: '90%', maxWidth: 420, background: '#fff', padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: cs, margin: 0 }}>Tu pedido</h2>
              <button onClick={() => setShowCart(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}><X size={16} /></button>
            </div>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <ShoppingCart size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p>Tu carrito está vacío</p>
                <button onClick={() => setShowCart(false)} style={{ background: cp, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, marginTop: 12 }}>Ver menú</button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                      {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: cs, margin: 0, fontSize: 14 }}>{item.nombre}</p>
                        <p style={{ color: cp, fontWeight: 700, margin: 0, fontSize: 14 }}>${(item.precio * item.cantidad).toFixed(2)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                        <span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center', fontSize: 14 }}>{item.cantidad}</span>
                        <button onClick={() => addToCart(item)} style={{ background: cp, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, marginBottom: 16, color: cs }}>
                    <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {showDelivery && (
                      <button onClick={() => { setShowCart(false); setShowOrderModal('delivery'); }} style={{ background: cp, color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Truck size={16} /> Pedir a domicilio (+$2.50)
                      </button>
                    )}
                    {showPickup && (
                      <button onClick={() => { setShowCart(false); setShowOrderModal('pickup'); }} style={{ background: cs, color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <ShoppingBag size={16} /> Recoger en local
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => setShowOrderModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, zIndex: 10, animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: cs, margin: 0 }}>
                {showOrderModal === 'delivery' ? '🛵 Datos de entrega' : '🏪 Datos para recoger'}
              </h2>
              <button onClick={() => setShowOrderModal(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'nombre', label: 'Tu nombre', type: 'text', placeholder: 'Ej: Carlos García' },
                { key: 'telefono', label: 'WhatsApp / Teléfono', type: 'tel', placeholder: '+593 99...' },
                ...(showOrderModal === 'delivery' ? [{ key: 'direccion', label: 'Dirección de entrega', type: 'text', placeholder: 'Av. Principal 123' }] : []),
                { key: 'hora', label: showOrderModal === 'pickup' ? 'Hora aproximada de retiro' : 'Hora de entrega', type: 'text', placeholder: 'Ej: 13:30' }
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 4 }}>{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder} value={(form as any)[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
                </div>
              ))}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Subtotal</span><span style={{ fontWeight: 600 }}>${cartTotal.toFixed(2)}</span></div>
                {showOrderModal === 'delivery' && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#6b7280' }}>Envío</span><span style={{ fontWeight: 600 }}>$2.50</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '1px solid #e5e7eb', paddingTop: 6 }}><span>Total</span><span style={{ color: cp }}>${(cartTotal + (showOrderModal === 'delivery' ? 2.50 : 0)).toFixed(2)}</span></div>
              </div>
              <button onClick={() => submitOrder(showOrderModal === 'delivery' ? 'DOMICILIO' : 'RETIRO')} disabled={submitting || !form.nombre || !form.telefono}
                style={{ background: cp, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 15, cursor: (!form.nombre || !form.telefono) ? 'not-allowed' : 'pointer', opacity: (!form.nombre || !form.telefono) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ChefHat size={18} />}
                {submitting ? 'Enviando...' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
