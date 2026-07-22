'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, Edit, Trash2, Loader2, Save, X, ToggleLeft, ToggleRight, 
    ShoppingBag, Search, Tag, Image as ImageIcon
} from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import Image from 'next/image';

interface Product {
    id: string;
    nombre: string;
    descripcion?: string | null;
    precio: number;
    imagenUrl?: string | null;
    activo: boolean;
    stock?: number | null;
    orden: number;
    categoriaId?: string | null;
    categoria?: { id: string; nombre: string } | null;
}

interface Category {
    id: string;
    nombre: string;
    activo: boolean;
}

export default function AdminProductos() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    
    // Modal states
    const [isOpen, setIsOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    
    // Form fields
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precio, setPrecio] = useState('0');
    const [imagenUrl, setImagenUrl] = useState('');
    const [activo, setActivo] = useState(true);
    const [stock, setStock] = useState('');
    const [orden, setOrden] = useState(0);
    const [categoriaId, setCategoriaId] = useState('');
    const [saving, setSaving] = useState(false);

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
        setOrden(products.length);
        setCategoriaId(categories.length > 0 ? categories[0].id : '');
        setIsOpen(true);
    };

    const handleOpenEdit = (p: Product) => {
        setEditingProduct(p);
        setNombre(p.nombre);
        setDescripcion(p.descripcion || '');
        setPrecio(p.precio.toString());
        setImagenUrl(p.imagenUrl || '');
        setActivo(p.activo);
        setStock(p.stock !== null && p.stock !== undefined ? p.stock.toString() : '');
        setOrden(p.orden);
        setCategoriaId(p.categoriaId || '');
        setIsOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim() || !precio) return;

        try {
            setSaving(true);
            const isEdit = !!editingProduct;
            const method = isEdit ? 'PUT' : 'POST';
            
            const payload = {
                id: editingProduct?.id,
                nombre,
                descripcion: descripcion.trim() || null,
                precio: parseFloat(precio),
                imagenUrl: imagenUrl || null,
                activo,
                stock: stock.trim() !== '' ? parseInt(stock) : null,
                orden: orden || 0,
                categoriaId: categoriaId || null
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
                alert("Ocurrió un error al guardar el producto.");
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión.");
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
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 w-fit"
                >
                    <Plus className="size-4" />
                    Nuevo Producto
                </button>
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

            {/* Modal Creación / Edición */}
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-fade-in text-left my-8">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                            <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest">
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Carga Imagen */}
                                <div className="w-full md:w-1/3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Imagen del Producto</label>
                                    <ImageUploader
                                        category="products"
                                        currentUrl={imagenUrl}
                                        onUploadSuccess={(media) => setImagenUrl(media.url)}
                                        onRemove={() => setImagenUrl('')}
                                        label="Subir Foto"
                                        aspect="square"
                                    />
                                </div>

                                {/* Formulario */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Producto</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Pincho Mixto Extra Carne"
                                            value={nombre}
                                            onChange={e => setNombre(e.target.value)}
                                            className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Descripción</label>
                                        <textarea
                                            placeholder="Ej: Acompañado de papa, chorizo y ensalada de la casa"
                                            value={descripcion}
                                            onChange={e => setDescripcion(e.target.value)}
                                            rows={2}
                                            className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300 resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Categoría</label>
                                            <select
                                                required
                                                value={categoriaId}
                                                onChange={e => setCategoriaId(e.target.value)}
                                                className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-300 cursor-pointer"
                                            >
                                                <option value="" disabled>Seleccionar...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Precio ($)</label>
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                min="0"
                                                value={precio}
                                                onChange={e => setPrecio(e.target.value)}
                                                className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Stock (Vacio = Ilmt)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Ej: 50"
                                                value={stock}
                                                onChange={e => setStock(e.target.value)}
                                                className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Orden Visual</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={orden}
                                                onChange={e => setOrden(parseInt(e.target.value))}
                                                className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end pb-1.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Estado</span>
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={activo}
                                                    onChange={e => setActivo(e.target.checked)}
                                                    className="hidden"
                                                />
                                                {activo ? (
                                                    <ToggleRight className="size-8 text-emerald-500 stroke-[1.5]" />
                                                ) : (
                                                    <ToggleLeft className="size-8 text-slate-300 stroke-[1.5]" />
                                                )}
                                                <span className="text-[10px] font-bold text-slate-700">{activo ? 'Activo' : 'Inactivo'}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-8 py-4 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" />
                                        Guardar Producto
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
