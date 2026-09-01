'use client';

/**
 * @file StoreLanding.tsx
 * @module modules/store/components
 * @description Landing pública dedicada a la vertical TIENDA / E-COMMERCE en Citiox.
 * @responsibility Proveer la experiencia de e-commerce moderna, rápida y responsive para tiendas de retail, ropa, tecnología y comercio general.
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag, Search, Tag, Filter, MapPin, Truck, Store as StoreIcon,
  Phone, MessageSquare, ChevronRight, Check, X, Flame, Sparkles, ShieldCheck, Clock
} from 'lucide-react';
import { CartProvider, useCart, CartProduct } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import MapSelectionModal from '@/components/public/MapSelectionModal';
import UniversalHeroCarousel from '@/components/public/UniversalHeroCarousel';
import ProductVariantModal, { DetailedProduct } from '@/components/public/ProductVariantModal';

interface Category {
  id: string;
  nombre: string;
  activo?: boolean;
}

export default function StoreLanding({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
}: {
  negocio: any;
  initialProducts?: DetailedProduct[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: any[]; highlights: any[] };
}) {
  const defaultDeliveryCost = Number((negocio?.configuracion as any)?.costoEnvio) || 2.50;

  return (
    <CartProvider businessId={negocio?.id || 'demo'} defaultDeliveryCost={defaultDeliveryCost}>
      <StoreLandingContent
        negocio={negocio}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
        initialHeroContent={initialHeroContent}
      />
    </CartProvider>
  );
}

function StoreLandingContent({
  negocio,
  initialProducts = [],
  initialCategories = [],
  initialHeroContent = { hero: [], highlights: [] },
}: {
  negocio: any;
  initialProducts?: DetailedProduct[];
  initialCategories?: Category[];
  initialHeroContent?: { hero: any[]; highlights: any[] };
}) {
  const primaryColor = negocio?.colorPrimario || '#06b6d4';
  const secondaryColor = negocio?.colorSecundario || '#0f172a';

  const { totalItemsCount, customerData, deliveryType, setDeliveryType, isCartOpen, setIsCartOpen } = useCart();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<DetailedProduct | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      if (!product.activo) return false;

      // Filtro por categoría
      if (selectedCategoryId && product.categoriaId !== selectedCategoryId) {
        return false;
      }

      // Filtro por búsqueda (Nombre, descripción o SKU)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = product.nombre.toLowerCase().includes(q);
        const matchDesc = product.descripcion?.toLowerCase().includes(q);
        const matchSku = product.sku?.toLowerCase().includes(q);
        return matchName || matchDesc || matchSku;
      }

      return true;
    });
  }, [initialProducts, selectedCategoryId, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 sm:pb-12">
      {/* ── 1. TOP HEADER & NAVIGATION ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3 min-w-0">
            {negocio?.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombre}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-100 shadow-2xs shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-2xl text-white font-black flex items-center justify-center text-lg shrink-0 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                🛍️
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1">
                {negocio?.nombre || 'Tienda Oficial'}
              </h1>
              <p className="text-[11px] font-medium text-slate-500 line-clamp-1 flex items-center gap-1">
                <StoreIcon className="w-3 h-3 text-slate-400" /> E-Commerce Oficial
              </p>
            </div>
          </div>

          {/* Acciones Header: Ubicación & Carrito */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-600" />
              <span className="line-clamp-1 max-w-[120px]">
                {customerData.direccion || 'Ubicación'}
              </span>
            </button>

            {/* Botón Carrito */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative px-3.5 py-2.5 rounded-2xl font-black text-xs text-white shadow-md active:scale-95 transition-all flex items-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Carrito</span>
              {totalItemsCount > 0 && (
                <span className="bg-white text-slate-900 px-2 py-0.5 rounded-full text-[11px] font-black shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HERO CAROUSEL UNIVERSAL ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <UniversalHeroCarousel
          heroItems={initialHeroContent?.hero || []}
          negocio={negocio}
          isOpenNow={true}
        />
      </section>

      {/* ── 3. BOTONES DE MODO DE ENTREGA (DELIVERY VS PICKUP) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2 max-w-md mx-auto sm:mx-0">
          <button
            type="button"
            onClick={() => setDeliveryType('DOMICILIO')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              deliveryType === 'DOMICILIO'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" /> Envío a Domicilio
          </button>
          <button
            type="button"
            onClick={() => setDeliveryType('RETIRO')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              deliveryType === 'RETIRO'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <StoreIcon className="w-4 h-4" /> Retiro en Tienda
          </button>
        </div>
      </section>

      {/* ── 4. BUSCADOR & BARRA DE CATEGORÍAS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-4">
        {/* Buscador de productos */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por producto, descripción o SKU..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-slate-200/80 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categorías Pills Horizontal Scroll */}
        {initialCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all ${
                selectedCategoryId === null
                  ? 'text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
              style={{ backgroundColor: selectedCategoryId === null ? primaryColor : undefined }}
            >
              Todos los Productos ({initialProducts.length})
            </button>
            {initialCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const count = initialProducts.filter((p) => p.categoriaId === cat.id && p.activo).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  style={{ backgroundColor: isSelected ? primaryColor : undefined }}
                >
                  {cat.nombre} ({count})
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. GRILLA DE PRODUCTOS ── */}
      <section id="productos" className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600" />
            {selectedCategoryId
              ? initialCategories.find((c) => c.id === selectedCategoryId)?.nombre
              : 'Catálogo de Productos'}
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs max-w-md mx-auto my-8">
            <span className="text-5xl block mb-3">🔎</span>
            <h3 className="font-extrabold text-slate-900 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Intenta con otra palabra clave o limpia el filtro de categorías.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId(null);
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCardItem
                key={product.id}
                product={product}
                primaryColor={primaryColor}
                onSelectOptions={() => setSelectedProductForModal(product)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 6. PIE DE PÁGINA E INFORMACIÓN DEL NEGOCIO ── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Comprando en línea seguro con Citiox E-Commerce</span>
        </div>
        {negocio?.whatsapp && (
          <a
            href={`https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
          >
            <MessageSquare className="w-4 h-4" /> Contactar por WhatsApp
          </a>
        )}
      </footer>

      {/* ── 7. MODALES (VARIANTES, CARRITO & MAPA) ── */}
      <ProductVariantModal
        product={selectedProductForModal}
        isOpen={!!selectedProductForModal}
        onClose={() => setSelectedProductForModal(null)}
        primaryColor={primaryColor}
      />

      <CustomerCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        primaryColor={primaryColor}
        slug={negocio?.slug || ''}
        businessName={negocio?.nombre || 'Tienda'}
      />

      <MapSelectionModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={(lat, lng, address) => {
          setIsMapModalOpen(false);
        }}
      />
    </div>
  );
}

/**
 * Tarjeta individual de producto para StoreLanding
 */
function ProductCardItem({
  product,
  primaryColor,
  onSelectOptions,
}: {
  product: DetailedProduct;
  primaryColor: string;
  onSelectOptions: () => void;
}) {
  const { getItemQuantity } = useCart();

  const activeVariants = (product.variantes || []).filter((v) => v.activo);
  const hasVariants = product.tieneVariantes || activeVariants.length > 0;
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;

  const currentInCart = getItemQuantity(product.id);

  return (
    <div
      onClick={onSelectOptions}
      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer text-left"
    >
      {/* Imagen */}
      <div className="relative w-full h-52 bg-slate-100 overflow-hidden flex items-center justify-center">
        {product.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-4xl">🛍️</span>
        )}

        {/* Badge superior */}
        {hasVariants ? (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-900/80 backdrop-blur-md text-white shadow-xs">
            Opciones disponibles
          </span>
        ) : isOutOfStock ? (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-600 text-white shadow-xs">
            Agotado
          </span>
        ) : null}

        {currentInCart > 0 && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-md animate-pulse"
            style={{ backgroundColor: primaryColor }}
          >
            {currentInCart} en carrito
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-cyan-600 transition-colors">
            {product.nombre}
          </h3>
          {product.descripcion && (
            <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1 leading-normal">
              {product.descripcion.replace(/<!--[\s\S]*?-->/g, '')}
            </p>
          )}
        </div>

        {/* Precio & Acción */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-base sm:text-lg font-black text-slate-900 block">
              ${(Number(product.precio) || 0).toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOptions();
            }}
            className="py-2.5 px-3.5 rounded-2xl font-black text-xs text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            {isOutOfStock ? (
              'Agotado'
            ) : hasVariants ? (
              'Ver Opciones'
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" /> Ver Producto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
