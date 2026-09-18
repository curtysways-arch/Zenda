'use client';

/**
 * @file ProductVariantModal.tsx
 * @module components/public
 * @description Modal unificado de Detalle de Producto / Quick View para E-Commerce CITIOX.
 *   Copia exact del diseño premium de la tienda (Galería lateral de miniaturas, insignias de envío/devolución,
 *   guía de tallas, opciones con círculos de color, resumen de opción seleccionada y botón flotante con favorito).
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  X, ShoppingBag, Check, AlertCircle, PackageCheck, Tag, 
  ChevronRight, Heart, Share2, Search, ShieldCheck, Truck, RotateCcw, 
  Star, Ruler, ChevronDown, ChevronUp, Sparkles, ArrowLeft, Headphones,
  Maximize2, CheckCircle2, ShoppingCart, ThumbsUp, Box, MessageSquarePlus, Loader2
} from 'lucide-react';
import { useCart, CartProduct } from '@/core/context/CartContext';

export interface Variant {
  id: string;
  productoId: string;
  sku?: string | null;
  nombre: string;
  atributos?: Record<string, any> | null;
  precio?: number | null;
  precioAnterior?: number | null;
  stock: number;
  imagenUrl?: string | null;
  activo: boolean;
}

export interface ComboProductItem {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  precioAnterior?: number | null;
  imagenUrl?: string | null;
  sku?: string | null;
  tieneVariantes?: boolean;
  variantes?: Variant[];
}

export interface PromoInfo {
  id: string;
  titulo: string;
  descripcion: string;
  badge?: string;
  precioPromo: number;
  precioAnterior?: number | null;
  tipoPromo?: string;
  descuentoValor?: number;
  esCombo?: boolean;
  comboProducts?: ComboProductItem[];
}

export interface DetailedProduct extends CartProduct {
  negocioId?: string;
  categoriaId?: string;
  categoriaNombre?: string;
  categoria?: string;
  tieneVariantes?: boolean;
  variantes?: Variant[];
  stock?: number | null;
  activo?: boolean;
  sku?: string | null;
  precioAnterior?: number | null;
  extraInfo?: any;
  promoInfo?: PromoInfo | null;
}

interface ProductVariantModalProps {
  product: DetailedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor?: string;
}

export default function ProductVariantModal({
  product,
  isOpen,
  onClose,
  primaryColor = '#06b6d4',
}: ProductVariantModalProps) {
  const { addToCart, totalItemsCount, setIsCartOpen } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToast, setAddedToast] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showOptionsAccordion, setShowOptionsAccordion] = useState<boolean>(true);
  const [copiedShareToast, setCopiedShareToast] = useState<boolean>(false);
  const [comboSelections, setComboSelections] = useState<Record<string, string>>({});
  const [activeDetailTab, setActiveDetailTab] = useState<'descripcion' | 'detalles' | 'resenas'>('descripcion');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Estados para nuevo comentario real de cliente
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [reviewAuthor, setReviewAuthor] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [localReviews, setLocalReviews] = useState<any[] | null>(null);

  // Bandera para evitar dobles llamadas a onClose
  const isClosingRef = useRef(false);

  // Función unificada para volver / cerrar sincronizada con el historial del navegador
  const handleVolver = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onClose();

    // Si el modal fue abierto con entrada en el historial, retrocedemos para no dejar entradas fantasmas
    if (typeof window !== 'undefined' && window.history.state?.isProductModalOpen) {
      window.history.back();
    } else if (typeof window !== 'undefined') {
      try {
        const cleanUrl = new URL(window.location.href);
        if (cleanUrl.searchParams.has('producto') || cleanUrl.searchParams.has('p')) {
          cleanUrl.searchParams.delete('producto');
          cleanUrl.searchParams.delete('p');
          window.history.replaceState(window.history.state, '', cleanUrl.toString());
        }
      } catch (e) {}
    }
  }, [onClose]);

  // Sincronización con el botón "Atrás" del navegador / móvil, tecla Escape y Deep Link URL (?producto=ID)
  useEffect(() => {
    if (typeof window === 'undefined' || !product) return;

    // Construir la URL directa del producto
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('producto', product.id);
    const productUrl = currentUrl.toString();

    // Agregar entrada al historial si no existe ya para que presionar "Atrás" cierre el modal
    if (!window.history.state?.isProductModalOpen) {
      try {
        window.history.pushState({ isProductModalOpen: true, productId: product.id }, '', productUrl);
      } catch (e) {
        console.error('Error al registrar historial para modal:', e);
      }
    } else {
      try {
        window.history.replaceState({ ...window.history.state, productId: product.id }, '', productUrl);
      } catch (e) {}
    }

    // Escuchar evento popstate (botón Atrás del navegador o swipe back de celular)
    const handlePopState = () => {
      if (!isClosingRef.current) {
        isClosingRef.current = true;
        onClose();
      }
    };

    // Escuchar tecla Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleVolver();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      // Limpiar el parámetro de la URL si el modal se desmonta
      if (typeof window !== 'undefined') {
        try {
          const cleanUrl = new URL(window.location.href);
          if (cleanUrl.searchParams.has('producto') || cleanUrl.searchParams.has('p')) {
            cleanUrl.searchParams.delete('producto');
            cleanUrl.searchParams.delete('p');
            window.history.replaceState(window.history.state, '', cleanUrl.toString());
          }
        } catch (e) {}
      }
    };
  }, [handleVolver, onClose, product]);

  // Compartir producto con su URL directa y única
  const handleShareProduct = useCallback(async () => {
    if (!product || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('producto', product.id);
    const shareUrl = url.toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.nombre,
          text: `Echa un vistazo a ${product.nombre} en nuestra tienda:`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: Copiar enlace al portapapeles
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareToast(true);
      setTimeout(() => setCopiedShareToast(false), 2500);
    } catch (e) {
      prompt('Copia este enlace directo del producto:', shareUrl);
    }
  }, [product]);

  // Filtrar variantes activas
  const activeVariants = useMemo(() => {
    return (product?.variantes || []).filter(v => v.activo);
  }, [product]);

  // Lista unificada de imágenes del producto (galería)
  const productImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];

    // 1. Galería de extraInfo.imagenes subida desde el admin
    if (product.extraInfo && typeof product.extraInfo === 'object' && Array.isArray(product.extraInfo.imagenes)) {
      list.push(...product.extraInfo.imagenes.filter(Boolean));
    }

    // 2. Imagen principal si no está repetida
    if (product.imagenUrl && !list.includes(product.imagenUrl)) {
      list.unshift(product.imagenUrl);
    }

    // 3. Imágenes de las variantes
    if (product.variantes) {
      product.variantes.forEach(v => {
        if (v.imagenUrl && !list.includes(v.imagenUrl)) {
          list.push(v.imagenUrl);
        }
      });
    }

    // 4. Imágenes de los productos incluidos en el combo
    if (product.promoInfo?.comboProducts) {
      product.promoInfo.comboProducts.forEach(cp => {
        if (cp.imagenUrl && !list.includes(cp.imagenUrl)) {
          list.push(cp.imagenUrl);
        }
      });
    }

    return list.length > 0 ? list : [];
  }, [product]);

  // Manejar el mapa de llaves y valores de atributos dinámicos
  const { attributeKeys, attributeValuesMap } = useMemo(() => {
    if (!product?.tieneVariantes || activeVariants.length === 0) {
      return { attributeKeys: [], attributeValuesMap: {} };
    }

    const map: Record<string, Set<string>> = {};

    activeVariants.forEach(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        Object.entries(v.atributos).forEach(([key, val]) => {
          if (val) {
            if (!map[key]) map[key] = new Set();
            map[key].add(String(val));
          }
        });
      } else if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        const defaultKeys = ['Color', 'Talla', 'Versión'];
        parts.forEach((part, idx) => {
          const keyName = defaultKeys[idx] || `Opción ${idx + 1}`;
          if (!map[keyName]) map[keyName] = new Set();
          map[keyName].add(part);
        });
      } else {
        const keyName = 'Opción';
        if (!map[keyName]) map[keyName] = new Set();
        map[keyName].add(v.nombre);
      }
    });

    const resultKeys = Object.keys(map);
    const resultMap: Record<string, string[]> = {};
    resultKeys.forEach(k => {
      resultMap[k] = Array.from(map[k]);
    });

    return { attributeKeys: resultKeys, attributeValuesMap: resultMap };
  }, [product, activeVariants]);

  // Autoseleccionar la primera variante / atributos al abrir
  useEffect(() => {
    if (!product || !isOpen) return;

    setQuantity(1);
    setAddedToast(false);
    setSelectedImageIndex(0);

    if (product.tieneVariantes && activeVariants.length > 0) {
      const firstAvailable = activeVariants.find(v => v.stock > 0) || activeVariants[0];

      if (firstAvailable) {
        setSelectedVariantId(firstAvailable.id);

        if (firstAvailable.atributos && typeof firstAvailable.atributos === 'object' && Object.keys(firstAvailable.atributos).length > 0) {
          const initialAttr: Record<string, string> = {};
          Object.entries(firstAvailable.atributos).forEach(([k, v]) => {
            initialAttr[k] = String(v);
          });
          setSelectedAttributes(initialAttr);
        } else if (firstAvailable.nombre.includes('/')) {
          const parts = firstAvailable.nombre.split('/').map(p => p.trim());
          const initialAttr: Record<string, string> = {};
          attributeKeys.forEach((keyName, idx) => {
            if (parts[idx]) initialAttr[keyName] = parts[idx];
          });
          setSelectedAttributes(initialAttr);
        } else if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
          setSelectedAttributes({ Opción: firstAvailable.nombre });
        }
      }
    } else {
      setSelectedVariantId(null);
      setSelectedAttributes({});
    }
  }, [product, isOpen, activeVariants, attributeKeys]);

  // Inicializar selecciones de opciones/tallas para cada producto dentro del combo
  useEffect(() => {
    if (!product || !isOpen) return;
    if (product.promoInfo?.comboProducts && product.promoInfo.comboProducts.length > 0) {
      const initialMap: Record<string, string> = {};
      product.promoInfo.comboProducts.forEach(cp => {
        if (cp.tieneVariantes && cp.variantes && cp.variantes.length > 0) {
          const firstInStock = cp.variantes.find(v => v.stock > 0 && v.activo !== false) || cp.variantes[0];
          if (firstInStock) {
            initialMap[cp.id] = firstInStock.nombre;
          }
        }
      });
      setComboSelections(initialMap);
    }
  }, [product, isOpen]);

  // Buscar la variante que coincide exactamente con los atributos seleccionados
  const selectedVariant = useMemo(() => {
    if (!product?.tieneVariantes || activeVariants.length === 0) return null;
    if (Object.keys(selectedAttributes).length < attributeKeys.length) return null;

    return activeVariants.find(v => {
      if (v.atributos && typeof v.atributos === 'object' && Object.keys(v.atributos).length > 0) {
        return Object.entries(selectedAttributes).every(([k, val]) => String(v.atributos?.[k]) === val);
      }
      if (v.nombre.includes('/')) {
        const parts = v.nombre.split('/').map(p => p.trim());
        return attributeKeys.every((k, idx) => selectedAttributes[k] === parts[idx]);
      }
      if (attributeKeys.length === 1 && attributeKeys[0] === 'Opción') {
        return selectedAttributes['Opción'] === v.nombre;
      }
      return false;
    }) || null;
  }, [product, activeVariants, selectedAttributes, attributeKeys]);

  // Actualizar imagen al cambiar variante
  useEffect(() => {
    if (selectedVariant?.imagenUrl) {
      const idx = productImages.indexOf(selectedVariant.imagenUrl);
      if (idx !== -1) setSelectedImageIndex(idx);
    }
  }, [selectedVariant, productImages]);

  // Mapa de definición de dimensiones desde extraInfo.dimensiones
  const dimensionsInfoMap = useMemo(() => {
    const map: Record<string, { tipo?: string; opcionesMap?: Record<string, { hex?: string; imagenUrl?: string }> }> = {};
    if (product?.extraInfo && typeof product.extraInfo === 'object' && Array.isArray(product.extraInfo.dimensiones)) {
      product.extraInfo.dimensiones.forEach((d: any) => {
        if (d && (d.name || d.id)) {
          map[d.name || d.id] = {
            tipo: d.tipo || 'PERSONALIZADO',
            opcionesMap: d.opcionesMap || {}
          };
        }
      });
    }
    return map;
  }, [product]);

  // Imagen opcional asociada a la opción seleccionada actualmente
  const selectedOptionImage = useMemo(() => {
    if (!selectedAttributes || Object.keys(selectedAttributes).length === 0) return null;
    for (const [attrKey, val] of Object.entries(selectedAttributes)) {
      const dimInfo = dimensionsInfoMap[attrKey];
      if (dimInfo?.opcionesMap?.[val]?.imagenUrl) {
        return dimInfo.opcionesMap[val].imagenUrl;
      }
    }
    return null;
  }, [selectedAttributes, dimensionsInfoMap]);

  // Resolución jerárquica determinista de imagen principal:
  // 1. Imagen manual clickeada en la galería (si selectedImageIndex > 0)
  // 2. Imagen específica de la variante seleccionada (selectedVariant.imagenUrl)
  // 3. Imagen de la opción seleccionada (selectedOptionImage)
  // 4. Imagen principal del producto
  // 5. Primera foto de la galería extraInfo
  const currentDisplayImage = useMemo(() => {
    if (selectedImageIndex > 0 && productImages[selectedImageIndex]) {
      return productImages[selectedImageIndex];
    }
    if (selectedVariant?.imagenUrl) {
      return selectedVariant.imagenUrl;
    }
    if (selectedOptionImage) {
      return selectedOptionImage;
    }
    return productImages[0] || product?.imagenUrl || '';
  }, [selectedImageIndex, productImages, selectedVariant, selectedOptionImage, product]);

  if (!isOpen || !product) return null;

  const isComboWithMultipleProducts = Boolean(
    product.promoInfo?.esCombo &&
    product.promoInfo.comboProducts &&
    product.promoInfo.comboProducts.length > 0
  );
  const comboProductsList = product.promoInfo?.comboProducts || [];

  const hasVariants = Boolean(product.tieneVariantes && activeVariants.length > 0);
  const isIndividualVariantIncomplete = !isComboWithMultipleProducts && hasVariants && !selectedVariant;
  const isComboSelectionIncomplete = isComboWithMultipleProducts && comboProductsList.some(
    cp => Boolean(cp.tieneVariantes && cp.variantes && cp.variantes.length > 0) && !comboSelections[cp.id]
  );
  const isVariantSelectionIncomplete = isComboWithMultipleProducts ? isComboSelectionIncomplete : isIndividualVariantIncomplete;

  const effectivePrice = isComboWithMultipleProducts
    ? (product.promoInfo?.precioPromo ?? product.precio)
    : selectedVariant
    ? (selectedVariant.precio ?? product.precio)
    : product.precio;

  const effectivePreviousPrice = isComboWithMultipleProducts
    ? (product.promoInfo?.precioAnterior ?? product.precioAnterior ?? null)
    : selectedVariant
    ? (selectedVariant.precioAnterior ?? product.precioAnterior ?? null)
    : (product.precioAnterior ?? null);

  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : (product.stock !== null && product.stock !== undefined ? product.stock : 99);

  const isOutOfStock = effectiveStock <= 0;
  const currentSku = selectedVariant?.sku || product.sku;

  const handleSelectAttribute = (key: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [key]: value }));
  };

  const subtotal = (Number(effectivePrice) || 0) * quantity;

  const handleAddToCart = () => {
    if (isOutOfStock || isVariantSelectionIncomplete) return;

    let comboNotes = '';
    if (isComboWithMultipleProducts && comboProductsList.length > 0) {
      const parts = comboProductsList.map(cp => {
        const sel = comboSelections[cp.id];
        return sel ? `${cp.nombre} (${sel})` : cp.nombre;
      });
      comboNotes = `Incluye: ${parts.join(' + ')}`;
    }

    const cartProduct: CartProduct = {
      ...product,
      nombre: product.promoInfo?.titulo || product.nombre,
      descripcion: comboNotes || product.descripcion,
      precio: effectivePrice,
      imagenUrl: productImages[selectedImageIndex] || selectedVariant?.imagenUrl || product.imagenUrl,
      varianteId: selectedVariant ? selectedVariant.id : (selectedVariantId || null),
      varianteNombre: comboNotes || (selectedVariant ? selectedVariant.nombre : null),
      sku: currentSku || product.sku,
    };

    addToCart(cartProduct, quantity);

    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onClose();
    }, 1200);
  };

  // Ayudante de color dot / HEX
  const getColorStyle = (attrKey: string, colorName: string) => {
    const dimInfo = dimensionsInfoMap[attrKey];
    const hex = dimInfo?.opcionesMap?.[colorName]?.hex;
    if (hex) return { backgroundColor: hex };

    const lower = colorName.toLowerCase();
    if (lower.includes('negro') || lower.includes('black')) return { backgroundColor: '#09090b' };
    if (lower.includes('verde') || lower.includes('green')) return { backgroundColor: '#047857' };
    if (lower.includes('azul') || lower.includes('blue')) return { backgroundColor: '#1d4ed8' };
    if (lower.includes('rojo') || lower.includes('red')) return { backgroundColor: '#dc2626' };
    if (lower.includes('blanco') || lower.includes('white')) return { backgroundColor: '#ffffff', border: '1px solid #cbd5e1' };
    if (lower.includes('amarillo') || lower.includes('yellow')) return { backgroundColor: '#fbbf24' };
    if (lower.includes('gris') || lower.includes('grey')) return { backgroundColor: '#94a3b8' };
    return { backgroundColor: primaryColor };
  };

  // Ayudantes de visualización estilo Mockup
  const savings = useMemo(() => {
    if (effectivePreviousPrice && Number(effectivePreviousPrice) > Number(effectivePrice)) {
      return Number(effectivePreviousPrice) - Number(effectivePrice);
    }
    return 0;
  }, [effectivePrice, effectivePreviousPrice]);

  const savingsPercent = useMemo(() => {
    if (effectivePreviousPrice && Number(effectivePreviousPrice) > Number(effectivePrice)) {
      return Math.round(((Number(effectivePreviousPrice) - Number(effectivePrice)) / Number(effectivePreviousPrice)) * 100);
    }
    return 0;
  }, [effectivePrice, effectivePreviousPrice]);

  const categoryLabel = useMemo(() => {
    if (product?.categoriaNombre) return product.categoriaNombre;
    if (product?.extraInfo?.categoria) return product.extraInfo.categoria;
    return 'GORRAS & MODA';
  }, [product]);

  // Lista de imágenes para la galería de detalle en la pestaña de descripción
  const detailImages = useMemo(() => {
    if (productImages.length >= 3) return productImages.slice(0, 3);
    if (productImages.length === 2) return [productImages[0], productImages[1], productImages[0]];
    if (productImages.length === 1) return [productImages[0], productImages[0], productImages[0]];
    return [];
  }, [productImages]);

  const productExtra = useMemo(() => {
    return (product?.extraInfo && typeof product.extraInfo === 'object') ? product.extraInfo : {};
  }, [product]);

  const featuresList = useMemo(() => {
    if (Array.isArray(productExtra.caracteristicas) && productExtra.caracteristicas.length > 0) {
      return productExtra.caracteristicas;
    }
    return [
      'Confección estructurada de máxima durabilidad',
      'Materiales premium con acabado suave y transpirable',
      'Bordados y costuras de alta densidad reforzadas',
      'Ajuste cómodo y resistente para uso prolongado'
    ];
  }, [productExtra]);

  const techSheet = useMemo(() => {
    const sheet = productExtra.fichaTecnica || {};
    return {
      material: sheet.material || '100% Algodón Premium / Mezcla reforzada',
      cuidados: sheet.cuidados || 'Lavar con agua fría, no usar lejía ni blanqueadores',
      garantia: sheet.garantia || 'Garantía oficial de 30 días por defectos de fábrica',
      corte: sheet.corte || 'Estructurado / Confort fit',
      origen: sheet.origen || null,
      peso: sheet.peso || null
    };
  }, [productExtra]);

  const detailCards = useMemo(() => {
    if (Array.isArray(productExtra.fotosDetalle) && productExtra.fotosDetalle.length > 0) {
      return [0, 1, 2].map(i => {
        const item = productExtra.fotosDetalle[i];
        return {
          url: item?.url || detailImages[i] || currentDisplayImage,
          label: item?.label || (i === 0 ? 'Bordado 3D de alta densidad' : i === 1 ? 'Ajuste snapback' : 'Visera plana premium')
        };
      });
    }
    return [
      { url: detailImages[0] || currentDisplayImage, label: 'Bordado 3D de alta densidad' },
      { url: detailImages[1] || currentDisplayImage, label: 'Ajuste snapback' },
      { url: detailImages[2] || currentDisplayImage, label: 'Visera plana premium' }
    ];
  }, [productExtra, detailImages, currentDisplayImage]);

  const reviewsData = useMemo(() => {
    const rc = productExtra.resenasConfig || {};
    const effectiveReviews = localReviews !== null ? localReviews : (Array.isArray(rc.reviews) && rc.reviews.length > 0 ? rc.reviews : [
      { autor: 'Carlos M.', calif: 5, comentario: '¡Calidad insuperable! La tela y el acabado son de primer nivel. El envío llegó en menos de 24 horas.' },
      { autor: 'Sofía R.', calif: 5, comentario: 'La talla queda perfecta y los colores son exactamente iguales a las fotos. Muy recomendada.' },
      { autor: 'Mateo G.', calif: 5, comentario: 'Excelente compra, la mejor gorra que he tenido. Volveré a pedir más colores.' }
    ]);
    return {
      rating: rc.rating || 4.9,
      totalOpiniones: Math.max(effectiveReviews.length, rc.totalOpiniones || 0),
      reviews: effectiveReviews
    };
  }, [productExtra, localReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id || !reviewAuthor.trim() || !reviewComment.trim()) return;

    try {
      setSubmittingReview(true);
      setReviewSuccessMsg(null);

      const res = await fetch('/api/public/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: product.id,
          autor: reviewAuthor.trim(),
          rating: reviewRating,
          comentario: reviewComment.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviewSuccessMsg('¡Gracias por tu opinión! Se ha publicado exitosamente.');
        setLocalReviews(data.resenasConfig?.reviews || [
          { autor: reviewAuthor.trim(), calif: reviewRating, comentario: reviewComment.trim() },
          ...reviewsData.reviews
        ]);
        setReviewAuthor('');
        setReviewComment('');
        setTimeout(() => {
          setShowReviewForm(false);
          setReviewSuccessMsg(null);
        }, 2000);
      } else {
        alert(data.error || 'Error al publicar la opinión.');
      }
    } catch (err: any) {
      alert('Error de conexión al enviar la opinión.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white overflow-hidden h-full w-full animate-in slide-in-from-bottom duration-300 text-left">
      
      {/* ── 1. HEADER SUPERIOR EXACTO AL MOCKUP DE LA IMAGEN ── */}
      <div className="px-4 sm:px-8 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
        {/* Botón Volver con Flecha y Texto */}
        <button
          type="button"
          onClick={handleVolver}
          className="flex items-center gap-2 text-slate-800 hover:text-cyan-600 transition-colors cursor-pointer group font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-slate-700" />
          <span>Volver</span>
        </button>

        {/* Logo Central: Bolsa Turquesa + Citiox Tienda Online */}
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20">
            <ShoppingBag className="size-5 text-white stroke-[2.5]" />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block">Citiox</span>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider block -mt-0.5">Tienda Online</span>
          </div>
        </div>

        {/* Acciones Derecha: Buscar, Compartir, Favorito & Carrito con Badge */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Lupa Buscar */}
          <button
            type="button"
            onClick={handleVolver}
            className="size-9 sm:size-10 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Buscar productos"
          >
            <Search className="w-4.5 h-4.5 text-slate-600" />
          </button>

          {/* Compartir */}
          <div className="relative">
            <button
              type="button"
              onClick={handleShareProduct}
              className={`size-9 sm:size-10 rounded-full border shadow-2xs flex items-center justify-center transition-all cursor-pointer ${
                copiedShareToast ? 'border-emerald-500 text-emerald-600 bg-emerald-50 scale-105' : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600'
              }`}
              title="Compartir producto"
            >
              {copiedShareToast ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4.5 h-4.5 text-slate-600" />
              )}
            </button>
            {copiedShareToast && (
              <span className="absolute top-11 right-0 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xl z-50 animate-in fade-in">
                ¡Enlace copiado!
              </span>
            )}
          </div>

          {/* Favorito */}
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`size-9 sm:size-10 rounded-full border shadow-2xs flex items-center justify-center transition-colors cursor-pointer ${
              isFavorite 
                ? 'text-rose-500 bg-rose-50 border-rose-200' 
                : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600'
            }`}
            title="Favoritos"
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Carrito con Badge Contador Turquesa */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="size-9 sm:size-10 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center transition-colors cursor-pointer relative shadow-2xs"
            title="Ver carrito"
          >
            <ShoppingCart className="w-4.5 h-4.5 text-slate-800" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-cyan-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. CUERPO DE CONTENIDO SCROLLABLE ── */}
      <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar bg-slate-50/40">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-10">
          
          {/* ── SECCIÓN SUPERIOR: GALERÍA (IZQUIERDA) + INFO DE COMPRA (DERECHA) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-white p-4 sm:p-8 rounded-3xl border border-slate-150 shadow-2xs">
            
            {/* ── COLUMNA IZQUIERDA: MINIATURAS VERTICALES + VISOR PRINCIPAL ── */}
            <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4 items-start">
              
              {/* Miniaturas verticales apiladas a la izquierda */}
              {productImages.length > 1 && (
                <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-y-auto max-h-[480px] w-full sm:w-20 pr-1 scrollbar-none">
                  {productImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`size-16 sm:size-18 rounded-2xl overflow-hidden border-2 bg-slate-50 transition-all cursor-pointer p-1 shrink-0 ${
                        selectedImageIndex === idx
                          ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-md scale-102 bg-white'
                          : 'border-slate-200/80 opacity-70 hover:opacity-100 hover:border-slate-300'
                      }`}
                      title={`Ver foto ${idx + 1}`}
                    >
                      <img src={imgUrl} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Visor de Imagen Principal */}
              <div className="flex-1 w-full rounded-3xl bg-slate-50/90 border border-slate-200/80 p-6 sm:p-8 relative flex items-center justify-center min-h-[360px] sm:min-h-[460px] overflow-hidden group">
                
                {/* Badge Superior Izquierdo: ✨ Nuevo */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-slate-950 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Nuevo</span>
                  </span>
                </div>

                {/* Badge Superior Derecho: 🎲 3D */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="bg-white/95 backdrop-blur-md text-slate-800 font-black text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-cyan-600" />
                    <span>3D</span>
                  </span>
                </div>

                {/* Imagen del Producto (Object Contain para no cortar viseras, gorras o prendas) */}
                <img
                  src={currentDisplayImage}
                  alt={product.nombre}
                  className="max-h-[340px] sm:max-h-[380px] w-auto h-auto object-contain drop-shadow-sm select-none transition-transform duration-300 group-hover:scale-103"
                />

                {/* Dots de paginación abajo al centro */}
                {productImages.length > 1 && (
                  <div className="flex items-center gap-1.5 absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
                    {productImages.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={() => setSelectedImageIndex(dotIdx)}
                        className={`transition-all ${
                          selectedImageIndex === dotIdx 
                            ? 'w-4 h-1.5 bg-cyan-600 rounded-full' 
                            : 'w-1.5 h-1.5 bg-slate-300 rounded-full hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Botón Pantalla Completa abajo a la derecha */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentDisplayImage) window.open(currentDisplayImage, '_blank');
                  }}
                  className="absolute bottom-4 right-4 size-9 sm:size-10 rounded-2xl bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all cursor-pointer z-10"
                  title="Ampliar imagen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: INFORMACIÓN DEL PRODUCTO & COMPRA ── */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Badge de Categoría */}
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                  <Tag className="size-3 text-slate-400" />
                  <span>{categoryLabel}</span>
                </span>
              </div>

              {/* Título Principal */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {product.nombre}
              </h1>

              {/* Rating y Reseñas */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center text-amber-400">
                  <Star className="size-4 fill-amber-400" />
                  <Star className="size-4 fill-amber-400" />
                  <Star className="size-4 fill-amber-400" />
                  <Star className="size-4 fill-amber-400" />
                  <Star className="size-4 fill-amber-400" />
                </div>
                <span className="font-black text-slate-800">4.9</span>
                <span className="text-slate-400 font-medium">(124 reseñas)</span>
              </div>

              {/* Descripción Corta */}
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                {product.descripcion 
                  ? product.descripcion.replace(/<!--[\s\S]*?-->/g, '')
                  : 'Prenda estructurada de calidad premium confeccionada con materiales de alta densidad y acabado de precisión.'}
              </p>

              {/* Precios & Badge de Ahorro */}
              <div className="flex items-baseline gap-3 flex-wrap pt-1">
                <span className="text-3xl sm:text-4xl font-black text-cyan-600 font-mono tracking-tight">
                  ${Number(effectivePrice).toFixed(2)}
                </span>
                
                {effectivePreviousPrice && Number(effectivePreviousPrice) > Number(effectivePrice) && (
                  <span className="text-base sm:text-lg font-bold text-slate-400 line-through">
                    ${Number(effectivePreviousPrice).toFixed(2)}
                  </span>
                )}

                {savings > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 font-black text-xs rounded-full border border-emerald-200 shadow-2xs">
                    <Tag className="size-3 text-emerald-600" />
                    <span>Ahorra ${savings.toFixed(2)} ({savingsPercent}%)</span>
                  </span>
                )}
              </div>

              {/* Recuadro de Garantías y Confianza */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <ShieldCheck className="size-4.5 text-cyan-600 shrink-0" />
                  <div>
                    <span className="font-black block text-slate-900">Compra 100% segura</span>
                    <span className="text-[11px] text-slate-500 font-normal">Tus datos están protegidos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-800 font-bold pt-2 border-t border-slate-200/50">
                  <Truck className="size-4.5 text-cyan-600 shrink-0" />
                  <div>
                    <span className="font-black block text-slate-900">Envío en 24 – 48h</span>
                    <span className="text-[11px] text-slate-500 font-normal">a todo el país</span>
                  </div>
                </div>
              </div>

              {/* ── SI ES COMBO: LISTA DE PRENDAS INCLUIDAS CON TALLAS ── */}
              {isComboWithMultipleProducts && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="size-4 text-cyan-600" />
                      <span>Artículos incluidos en el combo ({comboProductsList.length}):</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                      Pack Completo
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {comboProductsList.map((cp, idx) => {
                      const hasCpVariants = Boolean(cp.tieneVariantes && cp.variantes && cp.variantes.length > 0);
                      const currentSelected = comboSelections[cp.id] || '';

                      return (
                        <div key={cp.id || idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {cp.imagenUrl ? (
                                <img src={cp.imagenUrl} alt={cp.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <span>🛍️</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-black text-slate-900 truncate block">{cp.nombre}</span>
                              <span className="text-[10px] text-slate-400 font-mono">${Number(cp.precio).toFixed(2)}</span>
                            </div>
                          </div>

                          {hasCpVariants && cp.variantes && (
                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/40">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Talla:</span>
                              <div className="flex flex-wrap gap-1">
                                {cp.variantes.filter(v => v.activo !== false).map(v => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setComboSelections(prev => ({ ...prev, [cp.id]: v.nombre }))}
                                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                                      currentSelected === v.nombre
                                        ? 'bg-cyan-600 text-white shadow-xs'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:border-cyan-300'
                                    }`}
                                  >
                                    {v.nombre}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── SELECTOR DE OPCIONES/TALLAS/COLORES (PRODUCTO INDIVIDUAL) ── */}
              {!isComboWithMultipleProducts && hasVariants && attributeKeys.length > 0 && (
                <div className="space-y-3.5 pt-2 border-t border-slate-100">
                  {attributeKeys.map(attrKey => {
                    const availableValues = attributeValuesMap[attrKey] || [];
                    const currentSelectedVal = selectedAttributes[attrKey];
                    const dimInfo = dimensionsInfoMap[attrKey];
                    const isColorAttr = attrKey.toLowerCase().includes('color');
                    const isSizeAttr = attrKey.toLowerCase().includes('talla') || attrKey.toLowerCase().includes('size');

                    return (
                      <div key={attrKey} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>{attrKey}</span>
                            {currentSelectedVal && (
                              <span className="text-cyan-600 font-bold normal-case">: {currentSelectedVal}</span>
                            )}
                          </span>

                          {isSizeAttr && (
                            <button
                              type="button"
                              onClick={() => setShowSizeGuide(!showSizeGuide)}
                              className="text-cyan-600 font-bold flex items-center gap-1 hover:underline cursor-pointer text-xs"
                            >
                              <Ruler className="w-3.5 h-3.5" /> Guía de tallas
                            </button>
                          )}
                        </div>

                        {/* Chips de Opciones */}
                        <div className="flex flex-wrap gap-2">
                          {availableValues.map(val => {
                            const isSelected = currentSelectedVal === val;

                            if (isColorAttr) {
                              const styleObj = getColorStyle(attrKey, val);
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleSelectAttribute(attrKey, val)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-cyan-500'
                                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <span className="size-4 rounded-full border border-black/10 shrink-0" style={styleObj} />
                                  <span>{val}</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleSelectAttribute(attrKey, val)}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-500/20'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── FILA DE CANTIDAD Y BOTÓN AGREGAR AL CARRITO (IDÉNTICO A LA IMAGEN) ── */}
              <div className="pt-2 space-y-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Cantidad</span>
                
                <div className="flex items-center gap-3">
                  {/* Selector Horizontal [-] 1 [+] */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="size-10 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-800 font-black text-base flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-black text-slate-900 text-sm font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                      disabled={quantity >= effectiveStock || isOutOfStock}
                      className="size-10 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-800 font-black text-base flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Botón Turquesa Principal: Agregar al Carrito */}
                  <button
                    type="button"
                    disabled={isOutOfStock || isVariantSelectionIncomplete}
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-98 transition-all text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: addedToast ? '#10b981' : (primaryColor || '#06b6d4') }}
                  >
                    {addedToast ? (
                      <>
                        <Check className="size-4.5 text-white" />
                        <span>¡Agregado al Carrito!</span>
                      </>
                    ) : isOutOfStock ? (
                      <span>Producto Agotado</span>
                    ) : isVariantSelectionIncomplete ? (
                      <span>Selecciona las opciones</span>
                    ) : (
                      <>
                        <ShoppingCart className="size-4.5 text-white" />
                        <span>Agregar al carrito</span>
                        <span className="ml-1 font-mono">${(Number(effectivePrice) * quantity).toFixed(2)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botón Favoritos y Compartir Secundarios */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`flex-1 py-3 px-4 rounded-2xl border transition-all text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                    isFavorite 
                      ? 'bg-rose-50 border-rose-200 text-rose-600' 
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Heart className={`size-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                  <span>{isFavorite ? 'Guardado en favoritos' : 'Agregar a favoritos'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareProduct}
                  className="size-11 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
                  title="Compartir"
                >
                  <Share2 className="size-4" />
                </button>
              </div>

            </div>
          </div>

          {/* ── 3. BANNER DE 4 GARANTÍAS / BENEFICIOS (EXACTO AL MOCKUP) ── */}
          <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-2xs grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-2">
              <div className="size-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Truck className="size-5 text-cyan-600" />
              </div>
              <div className="text-left leading-tight">
                <span className="font-black text-slate-900 text-xs block">Envíos rápidos</span>
                <span className="text-[11px] text-slate-400 font-medium">a todo el país</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="size-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-cyan-600" />
              </div>
              <div className="text-left leading-tight">
                <span className="font-black text-slate-900 text-xs block">Compra segura</span>
                <span className="text-[11px] text-slate-400 font-medium">Tus datos protegidos</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="size-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Headphones className="size-5 text-cyan-600" />
              </div>
              <div className="text-left leading-tight">
                <span className="font-black text-slate-900 text-xs block">Soporte en línea</span>
                <span className="text-[11px] text-slate-400 font-medium">Estamos para ayudarte</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="size-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <RotateCcw className="size-5 text-cyan-600" />
              </div>
              <div className="text-left leading-tight">
                <span className="font-black text-slate-900 text-xs block">Devoluciones</span>
                <span className="text-[11px] text-slate-400 font-medium">hasta 7 días</span>
              </div>
            </div>
          </div>

          {/* ── 4. PESTAÑAS DE INFORMACIÓN (DESCRIPCIÓN, DETALLES, RESEÑAS) ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-150 shadow-2xs space-y-6">
            {/* Cabecera de Tabs */}
            <div className="flex items-center gap-6 sm:gap-8 border-b border-slate-150 pb-3">
              {[
                { id: 'descripcion', label: 'Descripción' },
                { id: 'detalles', label: 'Detalles' },
                { id: 'resenas', label: `Reseñas (${reviewsData.totalOpiniones})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`pb-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer relative ${
                    activeDetailTab === tab.id
                      ? 'text-cyan-600 border-b-2 border-cyan-600'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Contenido según pestaña */}
            {activeDetailTab === 'descripcion' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Columna Izquierda: Texto y Viñetas con Checks Turquesas */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Estilo y comodidad en cada detalle
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                    {product.descripcion 
                      ? product.descripcion.replace(/<!--[\s\S]*?-->/g, '')
                      : `El artículo ${product.nombre} combina un diseño vanguardista con materiales de alta calidad. Su acabado premium y confección cuidada le dan un estilo moderno y versátil, ideal para el uso diario o actividades al aire libre.`}
                  </p>

                  <div className="space-y-2.5 pt-2">
                    {featuresList.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                        <div className="size-5 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0">
                          <Check className="size-3 text-white stroke-[3]" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Columna Derecha: Grid de 3 Fotos de Detalle con Badges Oscuros */}
                <div className="lg:col-span-5 space-y-3">
                  {/* Foto 1 Superior (Ancha) */}
                  <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img 
                      src={detailCards[0]?.url || currentDisplayImage} 
                      alt={detailCards[0]?.label || "Detalle 1"} 
                      className="w-full h-full object-cover" 
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-3 py-1 bg-slate-950/80 backdrop-blur-md text-white font-black text-[10px] rounded-lg shadow-sm">
                      {detailCards[0]?.label || 'Bordado 3D de alta densidad'}
                    </span>
                  </div>

                  {/* Fotos 2 y 3 Inferiores */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img 
                        src={detailCards[1]?.url || currentDisplayImage} 
                        alt={detailCards[1]?.label || "Detalle 2"} 
                        className="w-full h-full object-cover" 
                      />
                      <span className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-slate-950/80 backdrop-blur-md text-white font-black text-[9px] rounded-lg shadow-sm">
                        {detailCards[1]?.label || 'Ajuste snapback'}
                      </span>
                    </div>

                    <div className="relative h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img 
                        src={detailCards[2]?.url || currentDisplayImage} 
                        alt={detailCards[2]?.label || "Detalle 3"} 
                        className="w-full h-full object-cover" 
                      />
                      <span className="absolute bottom-2 left-2 px-2.5 py-0.5 bg-slate-950/80 backdrop-blur-md text-white font-black text-[9px] rounded-lg shadow-sm">
                        {detailCards[2]?.label || 'Visera plana premium'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'detalles' && (
              <div className="space-y-4 max-w-2xl text-xs">
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Ficha Técnica del Producto</h3>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50/50">
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-slate-500">Material</span>
                    <span className="font-extrabold text-slate-800">{techSheet.material}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-slate-500">SKU / Código</span>
                    <span className="font-extrabold font-mono text-slate-800">{currentSku || product.id.slice(0, 10).toUpperCase()}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-slate-500">Categoría</span>
                    <span className="font-extrabold text-slate-800">{categoryLabel}</span>
                  </div>
                  {techSheet.corte && (
                    <div className="p-3 flex justify-between">
                      <span className="font-bold text-slate-500">Corte / Ajuste</span>
                      <span className="font-extrabold text-slate-800">{techSheet.corte}</span>
                    </div>
                  )}
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-slate-500">Cuidados</span>
                    <span className="font-extrabold text-slate-800">{techSheet.cuidados}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-slate-500">Garantía</span>
                    <span className="font-extrabold text-slate-800">{techSheet.garantia}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="font-bold text-slate-500">Disponibilidad</span>
                    <span className="font-extrabold text-emerald-600">En stock para despacho inmediato</span>
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'resenas' && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-900">{reviewsData.rating.toFixed(1)}</span>
                    <div>
                      <div className="flex text-amber-400">
                        {[...Array(Math.min(5, Math.max(1, Math.round(reviewsData.rating))))].map((_, s) => (
                          <Star key={s} className="size-4 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-slate-500 font-medium mt-0.5 block">Basado en {reviewsData.totalOpiniones} opiniones verificadas</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-sm active:scale-95"
                  >
                    <MessageSquarePlus className="size-4" />
                    <span>{showReviewForm ? 'Cerrar Formulario' : 'Escribir una opinión'}</span>
                  </button>
                </div>

                {/* Formulario para dejar opinión real */}
                {showReviewForm && (
                  <form onSubmit={handleSubmitReview} className="p-4 sm:p-5 bg-cyan-50/40 rounded-2xl border border-cyan-200/80 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-cyan-600" /> Tu opinión sobre este producto
                      </span>
                      {reviewSuccessMsg && (
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-4" /> {reviewSuccessMsg}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tu Nombre</label>
                        <input
                          type="text"
                          required
                          placeholder="ej: Valentina M."
                          value={reviewAuthor}
                          onChange={e => setReviewAuthor(e.target.value)}
                          className="w-full bg-white rounded-xl px-3 py-2 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Calificación</label>
                        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-slate-200">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="cursor-pointer p-0.5"
                            >
                              <Star className={`size-5 ${star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                            </button>
                          ))}
                          <span className="text-xs font-extrabold text-amber-600 ml-1">{reviewRating} de 5</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Tu Comentario</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Cuéntanos qué te pareció la calidad, el envío o el producto..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        className="w-full bg-white rounded-xl p-3 border border-slate-200 text-xs font-medium text-slate-800 resize-none focus:outline-none focus:border-cyan-600"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {submittingReview ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Publicar Opinión
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {reviewsData.reviews.map((rev: any, rIdx: number) => (
                    <div key={rIdx} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800">{rev.autor}</span>
                          {rev.verificada !== false && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded-md border border-emerald-200">
                              Compra Verificada
                            </span>
                          )}
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(rev.calif || 5)].map((_, s) => (
                            <Star key={s} className="size-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 font-medium">{rev.comentario}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 5. BANNER INFERIOR CTA TURQUESA (EXACTO AL MOCKUP) ── */}
          <div className="bg-gradient-to-r from-cyan-600 to-teal-500 rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-600/15">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="size-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-white leading-tight">
                  ¡Luce increíble, todos los días!
                </h4>
                <p className="text-xs text-cyan-100 font-medium">
                  Compra ahora y recibe tu pedido en la puerta de tu casa.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shrink-0">
              <Truck className="size-5 text-white" />
              <div className="text-left leading-none">
                <span className="text-xs font-black block text-white">Envío en 24 – 48h</span>
                <span className="text-[10px] text-cyan-100 font-medium">a todo el país</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
