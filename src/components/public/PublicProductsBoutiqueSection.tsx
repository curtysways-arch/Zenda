'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, Sparkles, Plus, Check, ArrowRight, Eye, Tag
} from 'lucide-react';
import { CartProvider, useCart, CartProduct } from '@/core/context/CartContext';
import CustomerCartDrawer from '@/components/public/CustomerCartDrawer';
import ProductVariantModal, { DetailedProduct } from '@/components/public/ProductVariantModal';

interface PublicProductsBoutiqueSectionProps {
  productos: DetailedProduct[];
  negocio: any;
  slug: string;
  primaryColor?: string;
}

export default function PublicProductsBoutiqueSection({
  productos = [],
  negocio,
  slug,
  primaryColor = '#ec4899',
}: PublicProductsBoutiqueSectionProps) {
  if (!productos || productos.length === 0) return null;

  const defaultDeliveryCost = Number((negocio?.configuracion as any)?.costoEnvio) || 2.50;

  return (
    <CartProvider businessId={negocio?.id || slug} defaultDeliveryCost={defaultDeliveryCost}>
      <PublicProductsBoutiqueContent
        productos={productos}
        negocio={negocio}
        slug={slug}
        primaryColor={primaryColor}
      />
    </CartProvider>
  );
}

function PublicProductsBoutiqueContent({
  productos = [],
  negocio,
  slug,
  primaryColor = '#ec4899',
}: PublicProductsBoutiqueSectionProps) {
  const { totalItemsCount, total, isCartOpen, setIsCartOpen, addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedProductForModal, setSelectedProductForModal] = useState<DetailedProduct | null>(null);
  const [addedNoticeId, setAddedNoticeId] = useState<string | null>(null);

  // Extraer categorías únicas de los productos
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    productos.forEach(p => {
      if (p.categoriaId && (p as any).categoria?.nombre) {
        map.set(p.categoriaId, (p as any).categoria.nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [productos]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'TODOS') return productos;
    return productos.filter(p => p.categoriaId === selectedCategory);
  }, [productos, selectedCategory]);

  const handleAddToCart = (product: DetailedProduct, e: React.MouseEvent) => {
    e.stopPropagation();

    // Si el producto tiene variantes, abrir modal para que elija opciones
    if (product.tieneVariantes && product.variantes && product.variantes.length > 0) {
      setSelectedProductForModal(product);
      return;
    }

    addToCart({
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagenUrl: product.imagenUrl,
      descripcion: product.descripcion,
      categoriaId: product.categoriaId,
      llevaEmpaque: product.llevaEmpaque,
      precioEmpaque: product.precioEmpaque,
    }, 1);

    setAddedNoticeId(product.id);
    setTimeout(() => {
      setAddedNoticeId(null);
    }, 1500);
  };

  return (
    <section id="tienda-productos" className="px-6 mb-10">
      {/* ── ENCABEZADO DE LA BOUTIQUE ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span 
            className="text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
            style={{ color: primaryColor }}
          >
            <Sparkles size={13} />
            Boutique & Cuidado Personal
          </span>
          <h3 className="text-2xl font-black leading-none text-slate-900 tracking-tight">
            Nuestros Productos
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Lleva la experiencia del spa a tu hogar con nuestra línea exclusiva.
          </p>
        </div>

        {totalItemsCount > 0 && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="hidden sm:flex items-center gap-2.5 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
          >
            <ShoppingBag size={16} />
            <span>Ver Carrito ({totalItemsCount})</span>
            <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full text-[11px] font-black">
              ${total.toFixed(2)}
            </span>
          </button>
        )}
      </div>

      {/* ── CHIPS DE FILTRO POR CATEGORÍA (Si hay más de 1 categoría) ── */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('TODOS')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedCategory === 'TODOS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({productos.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      {/* ── CUADRÍCULA DE PRODUCTOS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredProducts.map(prod => {
          const isAdded = addedNoticeId === prod.id;
          const hasVariants = prod.tieneVariantes && prod.variantes && prod.variantes.length > 0;
          const fallbackImage = (negocio?.imagenes || [])[0]?.url || '/placeholder.png';
          const displayImage = prod.imagenUrl && prod.imagenUrl.trim() !== '' ? prod.imagenUrl : fallbackImage;

          return (
            <div
              key={prod.id}
              onClick={() => setSelectedProductForModal(prod)}
              className="group bg-white rounded-[2rem] border border-slate-100/80 p-3 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden"
            >
              {/* Imagen del Producto */}
              <div className="relative aspect-square w-full rounded-[1.5rem] overflow-hidden bg-slate-50 mb-3">
                <img
                  src={displayImage}
                  alt={prod.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badge de Precio Flotante */}
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-slate-100/60">
                  <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                    ${Number(prod.precio).toFixed(2)}
                  </span>
                </div>

                {/* Badge si tiene variantes */}
                {hasVariants && (
                  <div className="absolute top-2.5 right-2.5 bg-slate-900/80 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-sm tracking-wider">
                    Opciones
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="space-y-1 px-1 mb-3 flex-1 flex flex-col justify-between">
                <div>
                  {(prod as any).categoria?.nombre && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block truncate">
                      {(prod as any).categoria.nombre}
                    </span>
                  )}
                  <h4 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 uppercase italic tracking-tight">
                    {prod.nombre}
                  </h4>
                </div>

                {prod.descripcion && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight mt-1">
                    {prod.descripcion}
                  </p>
                )}
              </div>

              {/* Botón de Acción */}
              <button
                type="button"
                onClick={(e) => handleAddToCart(prod, e)}
                className={`w-full py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                  isAdded
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900 text-white hover:bg-black'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check size={14} />
                    <span>¡Agregado!</span>
                  </>
                ) : hasVariants ? (
                  <>
                    <Eye size={14} />
                    <span>Ver Opciones</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} />
                    <span>Agregar</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── BOTÓN FLOTANTE DEL CARRITO (Móvil y Escritorio) ── */}
      {totalItemsCount > 0 && (
        <aside aria-label="Carrito de compras">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Ver carrito con ${totalItemsCount} ${totalItemsCount === 1 ? 'producto' : 'productos'}`}
            className="fixed bottom-24 sm:bottom-6 right-6 z-40 bg-slate-900 text-white py-3.5 px-5 rounded-full shadow-2xl flex items-center gap-3.5 hover:scale-105 active:scale-95 transition-all border border-slate-700/50"
          >
            <div className="relative">
              <ShoppingBag size={20} className="text-white" />
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black size-5 rounded-full flex items-center justify-center">
                {totalItemsCount}
              </span>
            </div>
            <span className="font-black text-xs uppercase tracking-wider hidden sm:inline">
              Ver Carrito
            </span>
            <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full">
              ${total.toFixed(2)}
            </span>
          </button>
        </aside>
      )}

      {/* ── MODAL DE DETALLE / VARIANTES DEL PRODUCTO ── */}
      {selectedProductForModal && (
        <ProductVariantModal
          product={selectedProductForModal}
          isOpen={!!selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          primaryColor={primaryColor}
        />
      )}

      {/* ── MODAL DRAWER DE CARRITO Y FINALIZACIÓN DE PEDIDO ── */}
      <CustomerCartDrawer
        slug={slug}
        businessName={negocio?.nombre || 'Boutique'}
        primaryColor={primaryColor}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </section>
  );
}
