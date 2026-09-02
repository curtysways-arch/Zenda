'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, Edit, Trash2, Loader2, Save, X, ToggleLeft, ToggleRight, 
    ShoppingBag, Search, Tag, Image as ImageIcon, AlertTriangle,
    Package, Layers, DollarSign, HelpCircle, ExternalLink, Copy, Box, Info, Sparkles
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import Image from 'next/image';
import ProductVariantManager from '@/components/admin/ProductVariantManager';

import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Product {
    id: string;
    nombre: string;
    descripcion?: string | null;
    precio: number;
    imagenUrl?: string | null;
    activo: boolean;
    stock?: number | null;
    orden: number;
    llevaEmpaque?: boolean;
    precioEmpaque?: number;
    categoriaId?: string | null;
    categoria?: { id: string; nombre: string } | null;
    tieneVariantes?: boolean;
    variantes?: any[];
}

interface Category {
    id: string;
    nombre: string;
    activo: boolean;
}

export interface DynamicDimension {
    id: string;
    name: string;
    values: string[];
    newValueInput: string;
}

export default function AdminProductos() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    
    // Product Modal states
    const [isOpen, setIsOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [modalTab, setModalTab] = useState<'basic' | 'inventory' | 'variants' | 'pricing' | 'all'>('all');

    // Quick Category Modal states
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    
    // Form fields
    const { data: session } = useSession();
    const [negocio, setNegocio] = useState<any>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('0');
    const [imagenUrl, setImagenUrl] = useState('');
    const [activo, setActivo] = useState(true);
    const [stock, setStock] = useState('');
    const [sku, setSku] = useState('');
    const [tieneVariantes, setTieneVariantes] = useState(false);
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [orden, setOrden] = useState(0);
    const [categoriaId, setCategoriaId] = useState('');
    const [llevaEmpaque, setLlevaEmpaque] = useState(true);
    const [precioEmpaque, setPrecioEmpaque] = useState('0.25');
    const [saving, setSaving] = useState(false);

    // Initial Variants Builder State (For New Product Creation - N Dimensions)
    const [initialVariants, setInitialVariants] = useState<Array<{ nombre: string; sku: string; precio: string; stock: string; atributos: Record<string, string> }>>([]);
    const [dimensions, setDimensions] = useState<DynamicDimension[]>([
        { id: 'd-1', name: 'Color', values: ['Negro', 'Blanco'], newValueInput: '' },
        { id: 'd-2', name: 'Talla', values: ['S', 'M', 'L'], newValueInput: '' }
    ]);
    const [showConvertConfirmModal, setShowConvertConfirmModal] = useState(false);

    useEffect(() => {
        fetch('/api/negocio').then(r => r.ok && r.json()).then(d => d && setNegocio(d)).catch(() => {});
    }, []);

    const tipoUpper = (negocio?.tipoNegocio || (session?.user as any)?.tipoNegocio || '').toUpperCase();
    const blueprintId = typeof negocio?.configuracion === 'string'
        ? (() => { try { return JSON.parse(negocio.configuracion).blueprintId; } catch { return undefined; } })()
        : negocio?.configuracion?.blueprintId;
    const isStore = tipoUpper === 'TIENDA' || tipoUpper === 'STORE' || blueprintId === 'STORE';

    const handleAddDimension = () => {
        setDimensions(prev => [
            ...prev,
            { id: `d-${Date.now()}`, name: '', values: [], newValueInput: '' }
        ]);
    };

    const handleRemoveDimension = (id: string) => {
        setDimensions(prev => prev.filter(d => d.id !== id));
    };

    const handleAddValueToDimension = (dimId: string, val: string) => {
        const cleanVal = val.trim();
        if (!cleanVal) return;
        setDimensions(prev => prev.map(d => {
            if (d.id === dimId) {
                if (d.values.includes(cleanVal)) return { ...d, newValueInput: '' };
                return { ...d, values: [...d.values, cleanVal], newValueInput: '' };
            }
            return d;
        }));
    };

    const handleRemoveValueFromDimension = (dimId: string, valToRemove: string) => {
        setDimensions(prev => prev.map(d => {
            if (d.id === dimId) {
                return { ...d, values: d.values.filter(v => v !== valToRemove) };
            }
            return d;
        }));
    };

    const handleGenerateInitialCombinations = () => {
        const validDims = dimensions.filter(d => d.name.trim() && d.values.length > 0);
        if (validDims.length === 0) {
            alert("Añade al menos 1 dimensión con nombre y al menos 1 valor para generar la matriz.");
            return;
        }

        const combinations = validDims.reduce<Array<{ parts: string[]; attrs: Record<string, string> }>>((acc, dim) => {
            const attrKey = dim.name.trim().toLowerCase();
            if (acc.length === 0) {
                return dim.values.map(v => ({
                    parts: [v],
                    attrs: { [attrKey]: v }
                }));
            }
            const res: Array<{ parts: string[]; attrs: Record<string, string> }> = [];
            for (const prev of acc) {
                for (const v of dim.values) {
                    res.push({
                        parts: [...prev.parts, v],
                        attrs: { ...prev.attrs, [attrKey]: v }
                    });
                }
            }
            return res;
        }, []);

        const baseSkuClean = sku.trim().toUpperCase() || 'PROD';
        const basePriceClean = precio || '0';

        const newVars = combinations.map(c => {
            const varName = c.parts.join(' / ');
            const skuSuffix = c.parts.map(p => p.replace(/\s+/g, '-').toUpperCase()).join('-');
            return {
                nombre: varName,
                sku: `${baseSkuClean}-${skuSuffix}`,
                precio: basePriceClean,
                stock: '10',
                atributos: c.attrs
            };
        });

        // Filtrar duplicados por nombre
        const existingNames = new Set(initialVariants.map(v => v.nombre.toLowerCase()));
        const uniqueNewVars = newVars.filter(v => !existingNames.has(v.nombre.toLowerCase()));

        setInitialVariants(prev => [...prev, ...uniqueNewVars]);
    };

    const handleQuickCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            setCreatingCategory(true);
            const res = await fetch('/api/admin/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: newCategoryName.trim(),
                    activo: true,
                    orden: categories.length
                })
            });

            if (res.ok) {
                const catRes = await fetch('/api/admin/categorias');
                if (catRes.ok) {
                    const catData = await catRes.json();
                    const activeCats = catData.filter((c: any) => c.activo);
                    setCategories(activeCats);
                    const createdCat = activeCats.find((c: any) => c.nombre.toLowerCase() === newCategoryName.trim().toLowerCase()) || activeCats[activeCats.length - 1];
                    if (createdCat) {
                        setCategoriaId(createdCat.id);
                    }
                }
                setNewCategoryName('');
                setIsCategoryModalOpen(false);
            } else {
                alert("Ocurrió un error al crear la categoría.");
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión.");
        } finally {
            setCreatingCategory(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, catRes] = await Promise.all([
                fetch('/api/admin/productos'),
                fetch('/api/admin/categorias')
            ]);
            
            if (prodRes.ok && catRes.ok) {
                const prodData = await prodRes.json();
                const catData = await catRes.json();
                setProducts(prodData);
                setCategories(catData.filter((c: any) => c.activo));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setEditingProduct(null);
        setNombre('');
        setDescripcion('');
        setPrecio('0');
        setImagenUrl('');
        setActivo(true);
        setStock('');
        setSku('');
        setTieneVariantes(false);
        setOrden(products.length);
        setCategoriaId(categories.length > 0 ? categories[0].id : '');
        setLlevaEmpaque(!isStore);
        setPrecioEmpaque('0.25');
        setInitialVariants([]);
        setDimensions([
            { id: 'd-1', name: 'Color', values: ['Negro', 'Blanco'], newValueInput: '' },
            { id: 'd-2', name: 'Talla', values: ['S', 'M', 'L'], newValueInput: '' }
        ]);
        setIsOpen(true);
    };

    const handleOpenEdit = (p: any) => {
        setEditingProduct(p);
        setNombre(p.nombre);
        setDescripcion(p.descripcion || '');
        setPrecio(p.precio.toString());
        setImagenUrl(p.imagenUrl || '');
        setActivo(p.activo);
        setStock(p.stock !== null && p.stock !== undefined ? p.stock.toString() : '');
        setSku(p.sku || '');
        setTieneVariantes(Boolean(p.tieneVariantes));
        setOrden(p.orden);
        setCategoriaId(p.categoriaId || '');
        setLlevaEmpaque(p.llevaEmpaque !== undefined ? p.llevaEmpaque : true);
        setPrecioEmpaque(p.precioEmpaque !== undefined && p.precioEmpaque !== null ? p.precioEmpaque.toString() : '0.25');
        setInitialVariants([]);
        setIsOpen(true);
    };

    const handleToggleTieneVariantes = (checked: boolean) => {
        if (!checked && editingProduct?.id && (editingProduct as any).variantes?.length > 0) {
            setShowConvertConfirmModal(true);
        } else {
            setTieneVariantes(checked);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim() || !precio) return;

        try {
            setSaving(true);
            const isEdit = !!editingProduct;
            const method = isEdit ? 'PUT' : 'POST';
            
            const parseNum = (val: string, fallback = 0) => {
                const clean = String(val || '').replace(',', '.').trim();
                const num = parseFloat(clean);
                return isNaN(num) ? fallback : num;
            };

            const payload = {
                id: editingProduct?.id,
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
                precio: parseNum(precio, 0),
                imagenUrl: imagenUrl || null,
                activo,
                stock: stock.trim() !== '' ? parseInt(stock) : null,
                sku: sku.trim() || null,
                tieneVariantes,
                orden: orden || 0,
                categoriaId: categoriaId || null,
                llevaEmpaque: isStore ? false : llevaEmpaque,
                precioEmpaque: isStore ? 0 : parseNum(precioEmpaque, 0.25),
                variantesIniciales: !isEdit && tieneVariantes ? initialVariants : undefined
            };

            const res = await fetch('/api/admin/productos', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchData();
                setIsOpen(false);
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || "Ocurrió un error al guardar el producto.");
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión al guardar el producto.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro quieres eliminar este producto?")) return;

        try {
            const res = await fetch(`/api/admin/productos?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                alert("No se pudo eliminar el producto.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleActive = async (p: Product) => {
        try {
            const res = await fetch('/api/admin/productos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...p, activo: !p.activo })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Filters
    const filteredProducts = products.filter(p => {
        const matchesCategory = filterCategory === 'all' || p.categoriaId === filterCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-6 text-left">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                        Productos
                    </h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                        Administra el catálogo de pinchos y productos que ofreces
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Link
                        href="/admin/categorias"
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <FolderPlus className="size-4 text-slate-600" />
                        Categorías
                    </Link>
                    <button
                        onClick={handleOpenCreate}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                        <Plus className="size-4" />
                        Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Buscador & Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center px-4 py-3 group focus-within:border-slate-300 transition-colors w-full sm:max-w-md">
                    <Search className="size-4 text-slate-400 mr-3" />
                    <input 
                        type="text" 
                        placeholder="Buscar producto..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full text-xs font-semibold bg-transparent border-none outline-none placeholder:text-slate-400 text-slate-800"
                    />
                </div>

                <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center px-4 py-3 w-full sm:max-w-xs">
                    <Tag className="size-4 text-slate-400 mr-3 shrink-0" />
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="w-full text-xs font-semibold bg-transparent border-none outline-none text-slate-700 cursor-pointer"
                    >
                        <option value="all">Todas las Categorías</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Listado */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="size-8 text-slate-300 animate-spin mb-3" />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Cargando productos...</span>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative size-12 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                                                    {p.imagenUrl ? (
                                                        <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">
                                                            {p.nombre.substring(0, 2)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight">{p.nombre}</h3>
                                                    {p.descripcion && (
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 max-w-[200px] truncate">{p.descripcion}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                {p.categoria?.nombre || 'Sin Categoría'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-slate-800">${p.precio.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-600">
                                                {p.stock !== null && p.stock !== undefined ? `${p.stock} uds` : 'Ilimitado'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => handleToggleActive(p)}
                                                    className="focus:outline-none"
                                                >
                                                    {p.activo ? (
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">Activo</span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-wider">Inactivo</span>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(p)}
                                                    className="size-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="size-8 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <ShoppingBag className="size-12 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-xs font-black text-slate-700 mb-1">Sin productos</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Crea productos para poblar tu menú.</p>
                    </div>
                )}
            </div>

            {/* Modal Creación / Edición Con Estilo Empresarial Intuitivo */}
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fade-in">
                    <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] text-left my-auto">
                        {/* Header Modal */}
                        <div className="px-6 py-4 sm:py-5 border-b border-slate-150 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="size-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                                    <Tag className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-wide flex items-center gap-2">
                                        <span>{editingProduct ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Configura los detalles, inventario y variantes de tu tienda
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="size-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Main Body with Sidebar + Content */}
                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            {/* Sidebar Navigation */}
                            <div className="w-full lg:w-72 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-150 p-4 sm:p-5 flex flex-col justify-between shrink-0 space-y-4 overflow-y-auto">
                                <div className="space-y-2">
                                    {[
                                        { id: 'basic', num: '1', title: 'Información básica', desc: 'Nombre, descripción y categoría', icon: Tag },
                                        { id: 'inventory', num: '2', title: 'Inventario y estado', desc: 'Stock, estado y orden visual', icon: Package },
                                        { id: 'variants', num: '3', title: 'Variantes del producto', desc: 'Crea las variantes y atributos', icon: Layers },
                                        { id: 'pricing', num: '4', title: 'Precio y publicación', desc: 'Precio, impuestos y visibilidad', icon: DollarSign },
                                    ].map(step => {
                                        const IconComp = step.icon;
                                        const isActive = modalTab === step.id || modalTab === 'all';
                                        return (
                                            <button
                                                key={step.id}
                                                type="button"
                                                onClick={() => setModalTab(step.id as any)}
                                                className={`w-full p-3 rounded-2xl text-left transition-all flex items-start gap-3 border cursor-pointer ${
                                                    modalTab === step.id
                                                        ? 'bg-teal-50/90 border-teal-300 text-teal-950 shadow-xs ring-1 ring-teal-500/20'
                                                        : 'bg-white hover:bg-slate-100/70 border-slate-200/80 text-slate-700'
                                                }`}
                                            >
                                                <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                                                    modalTab === step.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    <IconComp className="size-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-extrabold line-clamp-1">
                                                        {step.num}. {step.title}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium line-clamp-1">
                                                        {step.desc}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {modalTab !== 'all' && (
                                        <button
                                            type="button"
                                            onClick={() => setModalTab('all')}
                                            className="w-full text-center text-[10px] font-bold text-teal-700 hover:underline pt-1 cursor-pointer"
                                        >
                                            Mostrar todas las secciones
                                        </button>
                                    )}
                                </div>

                                {/* Guía / Ayuda Box */}
                                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                                    <div className="flex items-center gap-2 text-slate-700 text-xs font-extrabold">
                                        <HelpCircle className="size-4 text-teal-600" />
                                        <span>¿Necesitas ayuda?</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Consulta nuestra guía de variantes e inventario.</p>
                                    <a
                                        href="/admin/ayuda"
                                        target="_blank"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-[10px] font-bold text-slate-700 bg-slate-50 transition-colors w-full justify-center"
                                    >
                                        <span>Ver guía</span>
                                        <ExternalLink className="size-3 text-slate-400" />
                                    </a>
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/30">
                                <form id="productForm" onSubmit={handleSave} className="space-y-6">
                                    
                                    {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
                                    {(modalTab === 'all' || modalTab === 'basic') && (
                                        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                                <Tag className="size-4 text-teal-600" />
                                                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                                                    INFORMACIÓN BÁSICA
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                                {/* Carga Imagen */}
                                                <div className="lg:col-span-4 space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                                        Imagen del Producto
                                                    </label>
                                                    <ImageUploader
                                                        category="products"
                                                        currentUrl={imagenUrl}
                                                        onUploadSuccess={(media) => setImagenUrl(media.url)}
                                                        onRemove={() => setImagenUrl('')}
                                                        label="Subir Foto"
                                                        aspect="square"
                                                    />
                                                </div>

                                                {/* Campos Básicos */}
                                                <div className="lg:col-span-8 space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                        <div className="sm:col-span-8">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                                                                Nombre del producto
                                                            </label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="Camiseta Oversize Black"
                                                                value={nombre}
                                                                onChange={e => setNombre(e.target.value)}
                                                                className="w-full bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
                                                            />
                                                            <span className="text-[10px] text-slate-400 block mt-1">Ej: TSH-OVS-BLACK</span>
                                                        </div>

                                                        <div className="sm:col-span-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                                                    ¿TIENE VARIANTES?
                                                                </span>
                                                                <span title="Activa para crear opciones como talla, color, memoria, etc.">
                                                                    <Info className="size-3.5 text-slate-400" />
                                                                </span>
                                                            </div>
                                                            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={tieneVariantes}
                                                                    onChange={e => handleToggleTieneVariantes(e.target.checked)}
                                                                    className="hidden"
                                                                />
                                                                {tieneVariantes ? (
                                                                    <ToggleRight className="size-7 text-teal-600 stroke-[1.5]" />
                                                                ) : (
                                                                    <ToggleLeft className="size-7 text-slate-300 stroke-[1.5]" />
                                                                )}
                                                                <span className="text-[10px] font-extrabold text-slate-800 line-clamp-1">
                                                                    {tieneVariantes ? 'Sí, tiene variantes' : 'No, producto simple'}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                        <div className="sm:col-span-6">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                                                                Descripción
                                                            </label>
                                                            <textarea
                                                                placeholder="Algodón 100% peruano 240g, corte relajado."
                                                                value={descripcion}
                                                                onChange={e => setDescripcion(e.target.value)}
                                                                rows={2}
                                                                className="w-full bg-slate-50/80 rounded-xl px-4 py-2 border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white resize-none"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-6">
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                                    Categoría
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsCategoryModalOpen(true)}
                                                                    className="text-[9px] font-black text-teal-700 hover:text-teal-800 uppercase tracking-wider flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                                                >
                                                                    <FolderPlus className="size-3" />
                                                                    <span>+ Nueva</span>
                                                                </button>
                                                            </div>
                                                            <select
                                                                required
                                                                value={categoriaId}
                                                                onChange={e => setCategoriaId(e.target.value)}
                                                                className="w-full bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer"
                                                            >
                                                                <option value="" disabled>Seleccionar...</option>
                                                                {categories.map(cat => (
                                                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SECCIÓN 2: INVENTARIO Y ESTADO */}
                                    {(modalTab === 'all' || modalTab === 'inventory') && (
                                        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                                <Package className="size-4 text-teal-600" />
                                                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                                                    INVENTARIO Y ESTADO
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <div className="flex items-center gap-1 mb-1.5">
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                            STOCK (VACÍO = ILIMITADO)
                                                        </label>
                                                        <span title="Si tiene variantes, el stock se controla por cada combinación">
                                                            <Info className="size-3 text-slate-400" />
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        disabled={tieneVariantes}
                                                        placeholder={tieneVariantes ? 'Definido en variantes' : 'Ej: 50'}
                                                        value={stock}
                                                        onChange={e => setStock(e.target.value)}
                                                        className="w-full bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-teal-500 disabled:opacity-60 disabled:bg-slate-100"
                                                    />
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-1 mb-1.5">
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                            ORDEN VISUAL
                                                        </label>
                                                        <span title="Posición relativa de aparición en el catálogo">
                                                            <Info className="size-3 text-slate-400" />
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        value={orden}
                                                        onChange={e => setOrden(parseInt(e.target.value) || 0)}
                                                        className="w-full bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                                                    />
                                                </div>

                                                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                                        ESTADO DEL PRODUCTO
                                                    </span>
                                                    <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={activo}
                                                            onChange={e => setActivo(e.target.checked)}
                                                            className="hidden"
                                                        />
                                                        {activo ? (
                                                            <ToggleRight className="size-7 text-emerald-500 stroke-[1.5]" />
                                                        ) : (
                                                            <ToggleLeft className="size-7 text-slate-300 stroke-[1.5]" />
                                                        )}
                                                        <span className="text-[10px] font-bold text-slate-700">
                                                            {activo ? 'Activo (Visible en tienda)' : 'Inactivo (Oculto)'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 3: VARIANTES DEL PRODUCTO */}
                    {(modalTab === 'all' || modalTab === 'variants') && (
                        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Layers className="size-4 text-teal-600" />
                                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                                            MATRIZ DE VARIANTES DEL PRODUCTO
                                        </h4>
                                        {tieneVariantes && (
                                            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-black rounded-full border border-teal-200 uppercase">
                                                {editingProduct ? `${editingProduct.variantes?.length || 0} Variantes` : `${initialVariants.length} Combinaciones`}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        Visualiza, edita o elimina las variantes de este producto (precio, SKU, stock y estado).
                                    </p>
                                </div>
                                {tieneVariantes && (
                                    <button
                                        type="button"
                                        onClick={() => setIsVariantModalOpen(true)}
                                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start"
                                    >
                                        <Sparkles className="size-3.5 text-cyan-300" />
                                        <span>+ Crear / Generar Variantes</span>
                                    </button>
                                )}
                            </div>

                            {!tieneVariantes ? (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                                    <p className="text-xs text-slate-500 font-medium">Este producto está configurado como producto simple (sin variantes).</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTieneVariantes(true);
                                            setIsVariantModalOpen(true);
                                        }}
                                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
                                    >
                                        <Sparkles className="size-4" />
                                        <span>Activar & Crear Variantes</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Producto Existente: Gestor Completo con Tabla */}
                                    {editingProduct?.id && (
                                        <ProductVariantManager
                                            productId={editingProduct.id}
                                            productName={nombre}
                                            basePrice={parseFloat(precio) || 0}
                                            baseSku={sku}
                                            onVariantsChange={() => fetchData()}
                                        />
                                    )}

                                    {/* Producto Nuevo: Tabla de Variantes Iniciales Generadas */}
                                    {!editingProduct && (
                                        <div className="space-y-4">
                                            {initialVariants.length === 0 ? (
                                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                                                    <p className="text-xs text-slate-500 font-semibold">Aún no has generado ni agregado variantes para este nuevo producto.</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsVariantModalOpen(true)}
                                                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-sm"
                                                    >
                                                        <Sparkles className="size-4" />
                                                        <span>Abrir Generador de Variantes</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                                                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                                            MATRIZ DE VARIANTES A CREAR ({initialVariants.length} COMBINACIONES)
                                                        </h5>
                                                        <button
                                                            type="button"
                                                            onClick={() => setInitialVariants([])}
                                                            className="text-xs font-black text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                                                        >
                                                            <span>Limpiar todo</span>
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                                <th className="p-3.5">Variante</th>
                                                                <th className="p-3.5">SKU</th>
                                                                <th className="p-3.5">Precio ($)</th>
                                                                <th className="p-3.5">Stock</th>
                                                                <th className="p-3.5 text-center">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-150">
                                                            {initialVariants.map((v, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                                    <td className="p-3">
                                                                        <div className="font-extrabold text-slate-900 text-xs mb-0.5">{v.nombre}</div>
                                                                        {v.atributos && (
                                                                            <div className="text-[10px] text-slate-400 font-medium">
                                                                                {Object.entries(v.atributos).map(([k, val]) => `${k}: ${val}`).join(' | ')}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <input
                                                                            type="text"
                                                                            value={v.sku}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                setInitialVariants(prev => prev.map((item, i) => i === idx ? { ...item, sku: val } : item));
                                                                            }}
                                                                            placeholder="SKU"
                                                                            className="w-full max-w-[150px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={v.precio}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                setInitialVariants(prev => prev.map((item, i) => i === idx ? { ...item, precio: val } : item));
                                                                            }}
                                                                            className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 outline-none focus:border-teal-500 focus:bg-white"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <input
                                                                            type="number"
                                                                            value={v.stock}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                setInitialVariants(prev => prev.map((item, i) => i === idx ? { ...item, stock: val } : item));
                                                                            }}
                                                                            className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 outline-none focus:border-teal-500 focus:bg-white"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const copy = { ...v, nombre: `${v.nombre} (Copia)`, sku: v.sku ? `${v.sku}-COPY` : '' };
                                                                                    setInitialVariants(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
                                                                                }}
                                                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                title="Duplicar"
                                                                            >
                                                                                <Copy className="size-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setInitialVariants(prev => prev.filter((_, i) => i !== idx))}
                                                                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                                                                title="Eliminar"
                                                                            >
                                                                                <Trash2 className="size-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                                    {/* SECCIÓN 4: PRECIO Y PUBLICACIÓN (SI NO TIENE VARIANTES O GENERAL) */}
                                    {(modalTab === 'all' || modalTab === 'pricing') && (
                                        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                                <DollarSign className="size-4 text-teal-600" />
                                                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                                                    PRECIO Y PUBLICACIÓN
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                                                        Precio Base del Producto ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        required
                                                        step="0.01"
                                                        min="0"
                                                        value={precio}
                                                        onChange={e => setPrecio(e.target.value)}
                                                        className="w-full bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                                                        SKU Base del Producto
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="TSH-OVS-BLACK"
                                                        value={sku}
                                                        onChange={e => setSku(e.target.value)}
                                                        className="w-full bg-slate-50/80 rounded-xl px-4 py-2.5 border border-slate-200 text-xs font-mono font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Gastronomía Empaque */}
                                    {!isStore && (modalTab === 'all' || modalTab === 'pricing') && (
                                        <div className="p-4 bg-amber-50/60 rounded-3xl border border-amber-200/80 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag className="size-4 text-amber-600" />
                                                    <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                                                        ¿Lleva Empaque para Llevar?
                                                    </span>
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={llevaEmpaque}
                                                        onChange={e => setLlevaEmpaque(e.target.checked)}
                                                        className="hidden"
                                                    />
                                                    {llevaEmpaque ? (
                                                        <ToggleRight className="size-8 text-amber-600 stroke-[1.5]" />
                                                    ) : (
                                                        <ToggleLeft className="size-8 text-slate-300 stroke-[1.5]" />
                                                    )}
                                                    <span className="text-xs font-bold text-amber-900">{llevaEmpaque ? 'Sí' : 'No'}</span>
                                                </label>
                                            </div>

                                            {llevaEmpaque && (
                                                <div className="pt-2 border-t border-amber-200/60">
                                                    <label className="block text-[10px] font-black text-amber-900 uppercase tracking-wider mb-1.5">
                                                        Precio del Empaque ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.25"
                                                        value={precioEmpaque}
                                                        onChange={e => setPrecioEmpaque(e.target.value)}
                                                        className="w-full bg-white rounded-xl px-4 py-2.5 border border-amber-200 text-xs font-extrabold text-amber-950 outline-none focus:border-amber-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>

                        {/* Footer Modal Action Bar */}
                        <div className="px-6 py-4 border-t border-slate-150 bg-white flex items-center justify-between shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer hidden sm:block"
                                >
                                    Guardar borrador
                                </button>
                                <button
                                    type="submit"
                                    form="productForm"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Guardar y continuar</span>
                                            <span className="text-sm">→</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Creación Rápida de Categoría */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 animate-fade-in text-left">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                            <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                                <FolderPlus className="size-4 text-slate-700" />
                                Nueva Categoría
                            </h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={handleQuickCreateCategory} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la Categoría</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej: Pinchos, Bebidas, Combos"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={creatingCategory}
                                className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                {creatingCategory ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" />
                                        Crear y Seleccionar
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Dedicado de Gestión y Generación de Variantes */}
            {isVariantModalOpen && (
                <div className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] text-left my-auto">
                        {/* Header Modal Variantes */}
                        <div className="px-6 py-4.5 border-b border-slate-150 flex items-center justify-between bg-slate-900 text-white shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="size-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0">
                                    <Sparkles className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wide flex items-center gap-2 text-white">
                                        <span>CREAR & GENERAR VARIANTES</span>
                                    </h3>
                                    <p className="text-xs text-slate-300 font-medium">
                                        {nombre ? `Producto: ${nombre}` : 'Configura dimensiones (Color, Talla, Memoria) para generar la matriz'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsVariantModalOpen(false)}
                                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Body Modal Variantes */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50">
                            {editingProduct?.id ? (
                                <ProductVariantManager
                                    productId={editingProduct.id}
                                    productName={nombre || 'Producto'}
                                    basePrice={parseFloat(precio) || 0}
                                    baseSku={sku}
                                    onVariantsChange={() => fetchData()}
                                />
                            ) : (
                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                                    {/* Generador de Variantes para Producto Nuevo */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="size-7 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs">
                                                    <Box className="size-4 text-teal-600" />
                                                </div>
                                                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                                    <span>GENERADOR DE VARIANTES</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[9px] font-black border border-cyan-200 uppercase">
                                                        {dimensions.length} DIMENSIONES
                                                    </span>
                                                </h4>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium">
                                                Selecciona los atributos (ej. Color, Talla) y genera todas las combinaciones posibles.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleAddDimension}
                                                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <Plus className="size-3.5" />
                                                <span>+ AGREGAR ATRIBUTO</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleGenerateInitialCombinations}
                                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <Sparkles className="size-3.5" />
                                                <span>⚡ GENERAR MATRIZ ({dimensions.length} ATRIBUTOS)</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grid de Atributos */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {dimensions.map((dim, index) => (
                                            <div key={dim.id} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3 relative">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="space-y-0.5 flex-1">
                                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                                            Atributo {index + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={dim.name}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setDimensions(prev => prev.map(d => d.id === dim.id ? { ...d, name: val } : d));
                                                            }}
                                                            placeholder="Ej. Color, Talla, Memoria"
                                                            className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl outline-none focus:border-teal-500 w-full"
                                                        />
                                                    </div>
                                                    {dimensions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDimension(dim.id)}
                                                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                                            title="Eliminar atributo"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Chips de Valores con botón de eliminación × */}
                                                <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                                                    {dim.values.map(val => (
                                                        <span
                                                            key={val}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                                                        >
                                                            <span>{val}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveValueFromDimension(dim.id, val)}
                                                                className="text-slate-400 hover:text-rose-600 font-black cursor-pointer text-xs"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Input + Botón para agregar valor */}
                                                <div className="flex gap-2 pt-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Agregar valor"
                                                        value={dim.newValueInput || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setDimensions(prev => prev.map(d => d.id === dim.id ? { ...d, newValueInput: val } : d));
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddValueToDimension(dim.id, dim.newValueInput || '');
                                                            }
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 flex-1 placeholder:text-slate-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddValueToDimension(dim.id, dim.newValueInput || '')}
                                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl cursor-pointer transition-colors"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bloque: VARIANTES A CREAR */}
                                    {initialVariants.length > 0 && (
                                        <div className="space-y-3 pt-4 border-t border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                                    VARIANTES A CREAR ({initialVariants.length} COMBINACIONES)
                                                </h5>
                                                <button
                                                    type="button"
                                                    onClick={() => setInitialVariants([])}
                                                    className="text-xs font-black text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                                                >
                                                    <span>Limpiar lista</span>
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>

                                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                            <th className="p-3.5">Combinación</th>
                                                            <th className="p-3.5">Código (SKU)</th>
                                                            <th className="p-3.5">Precio</th>
                                                            <th className="p-3.5">Stock</th>
                                                            <th className="p-3.5 text-center">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-150">
                                                        {initialVariants.map((v, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                                <td className="p-3">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {v.nombre.split(' / ').map((part, pIdx) => (
                                                                            <React.Fragment key={pIdx}>
                                                                                {pIdx > 0 && <span className="text-slate-400 font-bold text-xs">+</span>}
                                                                                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-extrabold text-[11px] shadow-2xs">
                                                                                    {part}
                                                                                </span>
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 font-mono text-[11px] text-slate-600 font-semibold">{v.sku}</td>
                                                                <td className="p-3 font-bold text-slate-900">${v.precio}</td>
                                                                <td className="p-3 font-bold text-slate-700">{v.stock}</td>
                                                                <td className="p-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setInitialVariants(prev => prev.filter((_, i) => i !== idx))}
                                                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Modal Variantes */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                            <span className="text-xs font-semibold text-slate-500">
                                {editingProduct ? `${editingProduct.variantes?.length || 0} variantes guardadas` : `${initialVariants.length} combinaciones generadas`}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsVariantModalOpen(false)}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-sm"
                            >
                                Guardar y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmación de Conversión Variantes -> Simple */}
            {showConvertConfirmModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 text-left">
                        <div className="flex items-center gap-3 text-amber-600">
                            <AlertTriangle className="size-6 shrink-0" />
                            <h4 className="font-black text-sm uppercase tracking-wider text-slate-900">
                                Convertir a Producto Simple
                            </h4>
                        </div>
                        <p className="text-xs font-semibold text-slate-600">
                            Este producto actualmente posee variantes registradas.
                        </p>
                        <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1.5 font-medium">
                            <p>• Las variantes dejarán de utilizarse para nuevas ventas en la tienda.</p>
                            <p>• Las variantes existentes se conservarán intactas en la base de datos.</p>
                            <p>• El historial de pedidos pasados no será alterado.</p>
                            <p>• Podrás volver a activar las variantes posteriormente en cualquier momento.</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConvertConfirmModal(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTieneVariantes(false);
                                    setShowConvertConfirmModal(false);
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all cursor-pointer"
                            >
                                Convertir a producto simple
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
