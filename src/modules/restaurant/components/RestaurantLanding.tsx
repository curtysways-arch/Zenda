'use client';
/**
 * @file RestaurantLanding.tsx
 * @module modules/restaurant/components
 * @description Landing Page Pública de Restaurante (FASE 5D) adaptada con el diseño exacto de la app de delivery
 * y respetando rigurosamente los colores configurados por el administrador del negocio en Citiox.
 */

import React, { useState, useEffect } from 'react';
import {
  Search, SlidersHorizontal, MapPin, ChevronDown, Bell, ShoppingBag,
  Heart, Plus, Minus, Truck, Percent, ShieldCheck, Home, Grid, Tag,
  ClipboardList, User, ArrowRight, Utensils, Check, ChevronRight, X
} from 'lucide-react';
import { CartProvider, useCart, CartProduct } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import Link from 'next/link';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  activo?: boolean;
  categoriaId?: string;
  categoria?: { id: string; nombre: string };
}

interface Category {
  id: string;
  nombre: string;
  icono?: string;
}

export default function RestaurantLanding({
  negocio,
  initialProducts = [],
  initialCategories = [],
}: {
  negocio: any;
  initialProducts?: Product[];
  initialCategories?: Category[];
}) {
  const primaryColor = negocio?.colorPrimario || '#ea580c';
  const defaultDeliveryCost = Number((negocio?.configuracion as any)?.costoEnvio) || 2.50;

  return (
    <CartProvider businessId={negocio?.id || 'demo'} defaultDeliveryCost={defaultDeliveryCost}>
      <RestaurantLandingContent
        negocio={negocio}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
      />
    </CartProvider>
  );
}

// Fallback de demostración si el negocio aún no registra productos
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    nombre: 'Hamburguesa Clásica',
    descripcion: 'Carne 150g, lechuga, tomate, queso cheddar y salsa especial.',
    precio: 6.99,
    imagenUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-burgers', nombre: 'Hamburguesas' }
  },
  {
    id: 'demo-2',
    nombre: 'Pizza Pepperoni',
    descripcion: 'Pepperoni, mozzarella jugosa y salsa de tomate casera.',
    precio: 8.50,
    imagenUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-pizzas', nombre: 'Pizzas' }
  },
  {
    id: 'demo-3',
    nombre: 'Ensalada César',
    descripcion: 'Pollo a la parrilla, lechuga fresca, parmesano y aderezo césar.',
    precio: 5.75,
    imagenUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-salads', nombre: 'Ensaladas' }
  },
  {
    id: 'demo-4',
    nombre: 'Combo Familiar Burger',
    descripcion: '2 Hamburguesas dobles + 2 Papas grandes + 2 Gaseosas.',
    precio: 14.99,
    imagenUrl: 'https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&q=80&w=800',
    activo: true,
    categoria: { id: 'cat-combos', nombre: 'Combos' }
  }
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-burgers', nombre: 'Hamburguesas', icono: '🍔' },
  { id: 'cat-pizzas', nombre: 'Pizzas', icono: '🍕' },
  { id: 'cat-salads', nombre: 'Ensaladas', icono: '🥗' },
  { id: 'cat-drinks', nombre: 'Bebidas', icono: '🥤' },
  { id: 'cat-desserts', nombre: 'Postres', icono: '🍰' },
  { id: 'cat-combos', nombre: 'Combos', icono: '📦' },
];

function RestaurantLandingContent({
  negocio,
  initialProducts = [],
  initialCategories = [],
}: {
  negocio: any;
  initialProducts?: Product[];
  initialCategories?: Category[];
}) {
  const {
    totalItemsCount,
    total,
    cart,
    deliveryType,
    setDeliveryType,
    customerData,
    setCustomerData,
    getItemQuantity,
    setItemQuantity,
    addToCart,
    decrementQuantity
  } = useCart();

  // Colores dinámicos del Admin
  const cp = negocio?.colorPrimario || '#ea580c'; // Color primario
  const cs = negocio?.colorSecundario || '#0f172a'; // Color secundario (encabezado / hero oscuro)
  const cn = negocio?.colorNeutral || '#f8fafc'; // Color de fondo claro

  const [products, setProducts] = useState<Product[]>(initialProducts.length > 0 ? initialProducts : FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [showChannelModal, setShowChannelModal] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [activeNavTab, setActiveNavTab] = useState<'inicio' | 'categorias' | 'ofertas' | 'pedidos' | 'cuenta'>('inicio');

  useEffect(() => {
    if (!negocio?.slug) return;
    fetch(`/api/public/${negocio.slug}/products`)
      .then(res => res.json())
      .then(data => {
        if (data.products && data.products.length > 0) setProducts(data.products);
        if (data.categories && data.categories.length > 0) setCategories(data.categories);
      })
      .catch(() => {});
  }, [negocio?.slug]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtrado de productos por categoría y búsqueda
  const filteredProducts = products.filter(p => {
    if (p.activo === false) return false;
    if (selectedCategory !== 'TODOS') {
      const matchCatId = p.categoriaId === selectedCategory;
      const matchCatName = p.categoria?.nombre?.toLowerCase() === selectedCategory.toLowerCase();
      const matchCatObjId = p.categoria?.id === selectedCategory;
      if (!matchCatId && !matchCatName && !matchCatObjId) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.nombre.toLowerCase().includes(q);
      const matchDesc = (p.descripcion || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Hero product highlight
  const heroProduct = products[0] || FALLBACK_PRODUCTS[0];

  return (
    <div style={{ backgroundColor: cn, color: '#0f172a' }} className="min-h-screen font-sans pb-28 select-none">
      {/* ── 1. ENCABEZADO SUPERIOR OSCURO CON BUSCADOR ── */}
      <header
        style={{ backgroundColor: cs }}
        className="text-white px-4 pt-4 pb-5 rounded-b-3xl shadow-xl sticky top-0 z-30 transition-colors"
      >
        <div className="max-w-4xl mx-auto space-y-3.5">
          {/* Fila Saludo + Iconos */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-1.5">
                ¡Hola, {customerData.nombre || 'Cliente'}! 👋
              </h1>
              <p className="text-xs text-slate-300 font-medium">¿Qué se te antoja hoy?</p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Notificaciones */}
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center relative text-slate-200 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span
                  style={{ backgroundColor: cp }}
                  className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-slate-900"
                />
              </button>

              {/* Carrito con Contador */}
              <button
                type="button"
                onClick={() => setShowCartDrawer(true)}
                className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center relative text-slate-200 hover:text-white transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItemsCount > 0 && (
                  <span
                    style={{ backgroundColor: cp }}
                    className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-lg"
                  >
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Pill Selector de Modalidad / Ubicación / Mesa */}
          <button
            type="button"
            onClick={() => setShowChannelModal(true)}
            className="w-full bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-200 transition-all group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                style={{ backgroundColor: `${cp}25`, color: cp }}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider leading-tight">
                  {deliveryType === 'DOMICILIO' ? 'Enviar a' : deliveryType === 'MESA' ? 'Consumo en' : 'Retiro en'}
                </span>
                <span className="font-bold text-white text-xs truncate block">
                  {deliveryType === 'DOMICILIO'
                    ? (customerData.direccion || negocio?.direccion || 'Seleccionar dirección...')
                    : deliveryType === 'MESA'
                    ? (customerData.tableName ? `Mesa ${customerData.tableName}` : 'Mesa Principal')
                    : (negocio?.nombre || 'Retiro en Local')}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Barra de Búsqueda Blanca */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar platos, combos, bebidas..."
              className="w-full bg-white text-slate-900 pl-10 pr-10 py-2.5 rounded-2xl text-xs font-semibold placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': cp } as any}
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-700"
              onClick={() => setSearchQuery('')}
            >
              <SlidersHorizontal className="w-4 h-4" style={{ color: searchQuery ? cp : undefined }} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">
        {/* ── 2. HERO BANNER ("ESPECIAL DE LA CASA") ── */}
        <div
          style={{ backgroundColor: cs }}
          className="relative rounded-3xl p-5 sm:p-6 overflow-hidden text-white shadow-xl border border-slate-800"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center relative z-10">
            {/* Texto e Información Hero */}
            <div className="sm:col-span-7 space-y-2.5">
              <span
                style={{ color: cp }}
                className="text-[11px] font-black tracking-widest uppercase block"
              >
                ESPECIAL DE LA CASA
              </span>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                {heroProduct.nombre.split(' ')[0] || 'BURGER'}
                <span style={{ color: cp }} className="font-serif italic font-normal ml-1.5">
                  {heroProduct.nombre.split(' ').slice(1).join(' ') || 'Clásica'}
                </span>
              </h2>

              <p className="text-xs text-slate-300 line-clamp-2 font-normal leading-relaxed max-w-sm">
                {heroProduct.descripcion || 'Carne jugosa, queso cheddar, lechuga, tomate y nuestra salsa especial.'}
              </p>

              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => addToCart({
                    id: heroProduct.id,
                    nombre: heroProduct.nombre,
                    precio: heroProduct.precio,
                    imagenUrl: heroProduct.imagenUrl,
                    descripcion: heroProduct.descripcion
                  })}
                  style={{ backgroundColor: cp }}
                  className="px-5 py-2.5 rounded-full text-xs font-black text-white shadow-lg flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                >
                  <span>Pedir ahora</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Imagen Hero + Tag de Precio Circular */}
            <div className="sm:col-span-5 relative flex justify-center sm:justify-end mt-2 sm:mt-0">
              <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
                <img
                  src={heroProduct.imagenUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800'}
                  alt={heroProduct.nombre}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Insignia Circular Flotante de Precio */}
              <div
                style={{ backgroundColor: cp }}
                className="absolute -top-2 -left-2 sm:left-4 w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shadow-xl border-2 border-slate-900 text-center font-extrabold rotate-3"
              >
                <span className="text-[8px] tracking-wider leading-none uppercase text-amber-100 font-black">DESDE</span>
                <span className="text-xs font-black leading-tight">${(Number(heroProduct.precio) || 6.99).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Dots del Carrusel */}
          <div className="flex justify-center items-center gap-1.5 mt-4 pt-1">
            <span style={{ backgroundColor: cp }} className="w-6 h-2 rounded-full" />
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
        </div>

        {/* ── 3. BARRA DE CATEGORÍAS (ICONOS SCROLL HORIZONTAL) ── */}
        <div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex flex-col items-center justify-center p-2 shrink-0 transition-all shadow-sm ${
                selectedCategory === 'TODOS'
                  ? 'bg-white shadow-md font-bold'
                  : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-white'
              }`}
              style={{
                borderColor: selectedCategory === 'TODOS' ? cp : undefined,
                color: selectedCategory === 'TODOS' ? cp : undefined
              }}
            >
              <span className="text-2xl mb-1">🍽️</span>
              <span className="text-xs font-bold truncate max-w-full">Todos</span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id || selectedCategory === cat.nombre;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex flex-col items-center justify-center p-2 shrink-0 transition-all shadow-sm ${
                    isActive
                      ? 'bg-white shadow-md font-bold'
                      : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-white'
                  }`}
                  style={{
                    borderColor: isActive ? cp : undefined,
                    color: isActive ? cp : undefined
                  }}
                >
                  <span className="text-2xl mb-1">{cat.icono || '🍲'}</span>
                  <span className="text-xs font-bold truncate max-w-full">{cat.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 4. BARRA DE PROPUESTA DE VALOR (3 DESTACADOS) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 grid grid-cols-3 divide-x divide-slate-100 text-center text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-1">
            <div style={{ color: cp }} className="p-1.5 rounded-full bg-slate-50">
              <Truck className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-black text-slate-900 block leading-tight">Envío rápido</span>
              <span className="text-[11px] text-slate-400">30-45 min</span>
            </div>
            <div className="sm:hidden text-center">
              <span className="font-bold text-slate-900 block text-[11px]">Envío rápido</span>
              <span className="text-[9px] text-slate-400">30-45 min</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-1">
            <div style={{ color: cp }} className="p-1.5 rounded-full bg-slate-50">
              <Percent className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-black text-slate-900 block leading-tight">Promociones</span>
              <span className="text-[11px] text-slate-400">Todos los días</span>
            </div>
            <div className="sm:hidden text-center">
              <span className="font-bold text-slate-900 block text-[11px]">Promociones</span>
              <span className="text-[9px] text-slate-400">Diarias</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-1">
            <div style={{ color: cp }} className="p-1.5 rounded-full bg-slate-50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-black text-slate-900 block leading-tight">Pago seguro</span>
              <span className="text-[11px] text-slate-400">100% protegido</span>
            </div>
            <div className="sm:hidden text-center">
              <span className="font-bold text-slate-900 block text-[11px]">Pago seguro</span>
              <span className="text-[9px] text-slate-400">100% ok</span>
            </div>
          </div>
        </div>

        {/* ── 5. SECCIÓN RECOMENDADOS PARA TI (GRILLA DE PLATOS) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Recomendados para ti
            </h3>
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              style={{ color: cp }}
              className="text-xs font-extrabold flex items-center gap-0.5 hover:underline"
            >
              <span>Ver todo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
              <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No encontramos platillos disponibles</h4>
              <p className="text-xs text-slate-400">Intenta buscar otro término o seleccionar otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5">
              {filteredProducts.map((prod) => {
                const qtyInCart = getItemQuantity(prod.id);
                const isFav = !!favorites[prod.id];

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    {/* Imagen del Producto + Botón Me Gusta */}
                    <div className="relative w-full h-36 sm:h-44 bg-slate-100 overflow-hidden">
                      {prod.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                      )}

                      {/* Icono Corazón Favorito */}
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(prod.id, e)}
                        className="absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-950/40 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={isFav ? '#ef4444' : 'transparent'}
                          color={isFav ? '#ef4444' : '#ffffff'}
                        />
                      </button>
                    </div>

                    {/* Contenido del Producto */}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-1">
                          {prod.nombre}
                        </h4>
                        {prod.descripcion && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 font-normal leading-normal">
                            {prod.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Pie de tarjeta: Precio & Botón [+] */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
                        <span style={{ color: cp }} className="font-extrabold text-sm sm:text-base">
                          ${(Number(prod.precio) || 0).toFixed(2)}
                        </span>

                        {qtyInCart > 0 ? (
                          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => decrementQuantity(prod.id)}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold text-xs flex items-center justify-center shadow-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-extrabold text-slate-900 px-1">{qtyInCart}</span>
                            <button
                              type="button"
                              onClick={() => addToCart({
                                id: prod.id,
                                nombre: prod.nombre,
                                precio: prod.precio,
                                imagenUrl: prod.imagenUrl
                              })}
                              style={{ backgroundColor: cp }}
                              className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart({
                              id: prod.id,
                              nombre: prod.nombre,
                              precio: prod.precio,
                              imagenUrl: prod.imagenUrl
                            })}
                            style={{ backgroundColor: cp }}
                            className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-extrabold shadow-md hover:opacity-90 active:scale-95 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 6. BANNER PROMO "¡ENVÍO GRATIS!" ── */}
        <div
          style={{ backgroundColor: cs }}
          className="rounded-2xl p-4 text-white shadow-xl flex items-center justify-between relative overflow-hidden border border-slate-800"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div
              style={{ backgroundColor: cp }}
              className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-black text-center shadow-lg rotate-[-4deg] shrink-0"
            >
              <span className="text-[9px] leading-tight">GRATIS</span>
              <Truck className="w-5 h-5 mt-0.5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base tracking-wide uppercase leading-tight">
                ¡ENVÍO GRATIS!
              </h4>
              <p style={{ color: cp }} className="text-xs font-bold mt-0.5">
                Por compras desde $15
              </p>
            </div>
          </div>

          <div className="relative z-10 hidden sm:block">
            <div
              style={{ backgroundColor: `${cp}20`, color: cp, borderColor: `${cp}40` }}
              className="px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Aplica automático</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── 7. BARRA FLOTANTE DE CARRITO SI HAY ITEMS ── */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 max-w-md mx-auto pointer-events-none">
          <button
            type="button"
            onClick={() => setShowCartDrawer(true)}
            style={{ backgroundColor: cp }}
            className="pointer-events-auto w-full py-3.5 px-5 rounded-2xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-2xl hover:opacity-95 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Ver mi pedido ({totalItemsCount})</span>
            </div>
            <span className="text-sm font-black">${total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── 8. NAVEGACIÓN INFERIOR FIJA (BOTTOM NAV BAR - 5 PESTAÑAS) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-3 flex justify-around items-center z-50 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveNavTab('inicio')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'inicio' ? cp : '#64748b' }}
        >
          <Home className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('categorias')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'categorias' ? cp : '#64748b' }}
        >
          <Grid className="w-5 h-5" />
          <span>Categorías</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNavTab('ofertas')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'ofertas' ? cp : '#64748b' }}
        >
          <Tag className="w-5 h-5" />
          <span>Ofertas</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveNavTab('pedidos');
            setShowCartDrawer(true);
          }}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors"
          style={{ color: activeNavTab === 'pedidos' ? cp : '#64748b' }}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Mis pedidos</span>
        </button>

        <Link
          href={`/${negocio?.slug || ''}/perfil`}
          onClick={() => setActiveNavTab('cuenta')}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors no-underline"
          style={{ color: activeNavTab === 'cuenta' ? cp : '#64748b' }}
        >
          <User className="w-5 h-5" />
          <span>Mi cuenta</span>
        </Link>
      </nav>

      {/* ── 9. MODAL DE SELECCIÓN DE CANAL DE PEDIDO ── */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-base text-slate-900">¿Cómo deseas tu pedido?</h4>
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeliveryType('DOMICILIO');
                  setShowChannelModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  deliveryType === 'DOMICILIO'
                    ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div style={{ backgroundColor: cp }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-extrabold text-sm">Delivery a Domicilio</span>
                  <span className="text-[11px] text-slate-400 font-normal">Entregas rápidas a tu ubicación</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType('MESA');
                  setShowChannelModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  deliveryType === 'MESA'
                    ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div style={{ backgroundColor: cp }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-extrabold text-sm">Pedir a la Mesa</span>
                  <span className="text-[11px] text-slate-400 font-normal">Consumo directo en el local</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType('RETIRO');
                  setShowChannelModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 transition-all ${
                  deliveryType === 'RETIRO'
                    ? 'border-orange-500 bg-orange-50 text-slate-900 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div style={{ backgroundColor: cp }} className="w-9 h-9 rounded-xl text-white flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-extrabold text-sm">Para Llevar / Retiro</span>
                  <span className="text-[11px] text-slate-400 font-normal">Pasa a retirar por el local</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 10. DRAWER LATERAL DE CHECKOUT Y CARRITO CITIOX ── */}
      <CustomerCartDrawer
        slug={negocio?.slug || ''}
        businessName={negocio?.nombre || 'Restaurante'}
        primaryColor={cp}
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
      />
    </div>
  );
}
