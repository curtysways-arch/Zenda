'use client';
/**
 * @file RestaurantLanding.tsx
 * @module modules/restaurant/components
 * @description Landing Page Pública del Blueprint RESTAURANT — menú digital, promociones, carrito [-] N [+] y checkout (FASE 5D).
 * @responsibility Renderizar catálogo de productos, selector de cantidades por tarjeta, desglose del carrito y checkout conectado a /api/public/[slug]/orders.
 * @dependencies CartContext, ProductQuantityCard, CustomerCartDrawer, PromotionsSection
 * @status Stable (FASE 5D - Customer Ordering Experience)
 */

import { useState, useEffect } from 'react';
import { ShoppingBag, ShoppingCart, User, Clock, MapPin, Star, Phone, ChevronRight } from 'lucide-react';
import PromotionsSection from '@/components/public/PromotionsSection';
import ProductQuantityCard from '@/components/public/ProductQuantityCard';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import { CartProvider, useCart } from '@/core/context/CartContext';
import Link from 'next/link';

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

export default function RestaurantLanding({
  negocio,
  initialProducts,
  initialCategories,
}: {
  negocio: any;
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  return (
    <CartProvider businessId={negocio.id} defaultDeliveryCost={2.50}>
      <RestaurantLandingContent
        negocio={negocio}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
      />
    </CartProvider>
  );
}

function RestaurantLandingContent({
  negocio,
  initialProducts,
  initialCategories,
}: {
  negocio: any;
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  const { totalItemsCount, total, cart } = useCart();
  const [products] = useState<Product[]>(initialProducts);
  const [categories] = useState<Category[]>(initialCategories);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderSuccessBanner, setOrderSuccessBanner] = useState(false);

  const cfg = (negocio.configuracion as any) || {};
  const cp = negocio.colorPrimario || '#c2410c';
  const cs = negocio.colorSecundario || '#1c0a00';

  useEffect(() => {
    async function fetchPromos() {
      try {
        const res = await fetch(`/api/${negocio.slug}/promotions`);
        if (res.ok) {
          const data = await res.json();
          setPromotions(data.promotions || []);
        }
      } catch (_) {}
    }
    fetchPromos();
  }, [negocio.slug]);

  const activeProducts = products.filter(
    p => p.activo && (activeCategory === 'all' || p.categoria?.id === activeCategory || p.categoria?.nombre === activeCategory)
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: cs, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Hero Banner */}
      <div style={{ position: 'relative', minHeight: 400, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${cs} 0%, rgba(0,0,0,0.3) 50%, ${cp}50 100%)` }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={(Array.isArray(cfg.bannerUrls) && cfg.bannerUrls.length > 0 ? cfg.bannerUrls[0] : null) || cfg.bannerUrl || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80"}
          alt={negocio.nombre}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.6 }}
        />

        {/* Nav (Móvil únicamente) */}
        <nav className="md:hidden" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {negocio.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={negocio.logoUrl} alt={negocio.nombre} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: `2px solid ${cp}` }} onError={e => (e.currentTarget.style.display = 'none')} />
            )}
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{negocio.nombre}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href={`/${negocio.slug}/perfil`} style={{ color: '#fff', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '10px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={16} /> Perfil
            </Link>
            <button
              onClick={() => setShowCartDrawer(true)}
              style={{ background: cp, border: 'none', borderRadius: 999, padding: '10px 20px', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
            >
              <ShoppingCart size={16} />
              {totalItemsCount > 0 ? `${totalItemsCount} — $${total.toFixed(2)}` : 'Mi Pedido'}
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div style={{ position: 'relative', zIndex: 5, padding: '0 24px 40px', animation: 'fadeIn 0.6s ease' }}>
          <div style={{ display: 'inline-block', background: cp, borderRadius: 999, padding: '4px 14px', color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            🔥 Menú Digital & Pedidos Directos • {negocio.ciudad || 'Citiox Demo'}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.1 }}>
            {negocio.heroTitulo || negocio.nombre}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, maxWidth: 600, margin: '0 0 24px', lineHeight: 1.6 }}>
            {negocio.heroSubtitulo || 'Selecciona tus platillos favoritos, ajusta cantidades y pide a domicilio o retiro.'}
          </p>
        </div>
      </div>

      {/* Info Strip */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', display: 'flex', gap: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'nowrap' }}>
          <Clock size={14} /> {negocio.horarioApertura || '11:00'} - {negocio.horarioCierre || '22:00'}
        </div>
        {negocio.direccion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'nowrap' }}>
            <MapPin size={14} /> {negocio.direccion}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, whiteSpace: 'nowrap' }}>
          <Star size={14} color="#fbbf24" fill="#fbbf24" /> 4.9 Excelente
        </div>
      </div>

      {/* Promociones Citiox */}
      {promotions.length > 0 && (
        <div style={{ padding: '24px 24px 0' }}>
          <PromotionsSection
            promociones={promotions}
            slug={negocio.slug}
            primaryColor={cp}
            tertiaryColor={negocio.colorTerciario || '#ea580c'}
            textColor="#ffffff"
            showPrices={true}
          />
        </div>
      )}

      {/* Menú de Productos con [-] N [+] */}
      <div id="catalogo" style={{ padding: '32px 24px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 8px' }}>
          Nuestro Menú
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
          Selecciona la cantidad de cada producto y presiona Agregar
        </p>

        {/* Categorías */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {[{ id: 'all', nombre: 'Todo' }, ...categories].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
                background: activeCategory === cat.id ? cp : 'rgba(255,255,255,0.1)',
                color: activeCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s',
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Grid de Productos con ProductQuantityCard [-] N [+] */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {activeProducts.map(product => (
            <ProductQuantityCard
              key={product.id}
              product={{
                id: product.id,
                nombre: product.nombre,
                precio: product.precio,
                imagenUrl: product.imagenUrl,
                descripcion: product.descripcion,
              }}
              primaryColor={cp}
              secondaryColor={cs}
            />
          ))}
        </div>
      </div>

      {/* Floating Bar Carrito (Móvil y Desktop) */}
      {totalItemsCount > 0 && !showCartDrawer && (
        <div className="fixed bottom-20 sm:bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => setShowCartDrawer(true)}
            className="pointer-events-auto w-full max-w-md sm:max-w-lg text-white border-0 rounded-2xl py-3.5 px-6 font-extrabold text-base flex items-center justify-between shadow-2xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
            style={{
              backgroundColor: cp,
              boxShadow: `0 12px 36px ${cp}80`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5" />
              <span>Ver Mi Pedido ({totalItemsCount} items)</span>
            </div>
            <span className="text-base font-black">${total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Drawer de Carrito y Checkout */}
      <CustomerCartDrawer
        slug={negocio.slug}
        businessName={negocio.nombre}
        primaryColor={cp}
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        onOrderSuccess={() => {
          setOrderSuccessBanner(true);
          setTimeout(() => setOrderSuccessBanner(false), 6000);
        }}
      />

      {/* Banner de Confirmación */}
      {orderSuccessBanner && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: '#fff',
            borderRadius: 14,
            padding: '16px 28px',
            fontWeight: 700,
            fontSize: 15,
            zIndex: 200,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}
        >
          ✅ ¡Pedido recibido con éxito! Ha sido enviado a la cocina.
        </div>
      )}
    </div>
  );
}
