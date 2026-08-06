'use client';
// src/app/[slug]/mesa/[tableNumber]/page.tsx
// Menú Digital Informativo QR (10/10 Definitivo)
// Exclusivamente para visualizar Categorías, Productos, Fotografías, Descripciones y Precios.
// Sin carrito ni creación de pedidos.

import { useState, useEffect } from 'react';
import { Utensils, Search, Sparkles, Loader2, Info } from 'lucide-react';

interface Product {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagenUrl?: string;
  categoria?: { nombre: string };
  categoriaId?: string;
}

export default function MesaQRPage({ params }: { params: Promise<{ slug: string; tableNumber: string }> }) {
  const [slug, setSlug] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [negocio, setNegocio] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
      console.error('Error cargando menú digital:', e);
    } finally {
      setLoading(false);
    }
  }

  const cp = negocio?.colorPrimario || '#c2410c';
  const cs = negocio?.colorSecundario || '#0f172a';

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.categoria?.nombre === activeCategory || p.categoriaId === activeCategory;
    const matchesSearch = !searchQuery || p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ background: cs, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: cp }} />
          <p style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cargando Menú Digital...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif", paddingBottom: 60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Top Banner & Header */}
      <div style={{ background: cs, color: '#fff', padding: '24px 20px 20px', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: cp, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 999, display: 'inline-block', marginBottom: 6 }}>
              Menú Digital Informativo
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
              {negocio?.nombre || slug}
            </h1>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '8px 14px', textAlign: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', display: 'block' }}>Mesa</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>#{tableNumber}</span>
          </div>
        </div>

        {/* Informative Note Badge */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Info size={16} style={{ color: cp, shrink: 0 }} />
          <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}>
            Consulta las opciones y precios de nuestro menú. Tu mesero tomará tu orden directamente en tu mesa.
          </p>
        </div>
      </div>

      {/* Search Input & Category Filters */}
      <div style={{ padding: '16px 20px', spaceY: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar plato, bebida o ingrediente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#0f172a', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: 8, paddingBottom: 4 }} className="hide-scrollbar">
          {[{ id: 'all', nombre: 'Todos los Platos' }, ...categories].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 12,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: activeCategory === cat.id ? cp : '#fff',
                color: activeCategory === cat.id ? '#fff' : '#64748b',
                boxShadow: activeCategory === cat.id ? `0 4px 12px ${cp}40` : '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog List */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filteredProducts.map(product => (
          <div
            key={product.id}
            style={{
              background: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}
          >
            {product.imagenUrl && (
              <div style={{ height: 180, width: '100%', position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
                <img
                  src={product.imagenUrl}
                  alt={product.nombre}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                {product.categoria?.nombre && (
                  <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 8 }}>
                    {product.categoria.nombre}
                  </span>
                )}
              </div>
            )}
            <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
              <div>
                <h3 style={{ color: '#0f172a', fontWeight: 900, fontSize: 16, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                  {product.nombre}
                </h3>
                {product.descripcion && (
                  <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 14px', lineHeight: 1.4, fontWeight: 500 }}>
                    {product.descripcion}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 6 }}>
                <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Precio
                </span>
                <span style={{ color: cp, fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>
                  ${product.precio.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <Utensils size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            No hay productos registrados en esta categoría.
          </p>
        </div>
      )}
    </div>
  );
}
