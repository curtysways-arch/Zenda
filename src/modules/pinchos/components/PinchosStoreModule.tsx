'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, Plus, Minus, User, ZoomIn, X, Share2, Check } from 'lucide-react';
import PinchoCheckoutStepper from './PinchoCheckoutStepper';
import Step1PinchoCart from './Step1PinchoCart';
import Step2PinchoAuth from './Step2PinchoAuth';
import Step3PinchoDelivery from './Step3PinchoDelivery';
import Step4PinchoConfirm from './Step4PinchoConfirm';
import Step5PinchoPayment from './Step5PinchoPayment';
import Step6PinchoWaitingConfirmation from './Step6PinchoWaitingConfirmation';
import PinchoSmartActiveOrderBanner from './PinchoSmartActiveOrderBanner';
import PinchoClientOrdersHistory from './PinchoClientOrdersHistory';
import PinchoProductDetailModal from './PinchoProductDetailModal';
import { PinchoCartService, PinchoCartItem, PinchoCartState } from '../services/pinchoCartService';

interface StoreProps {
    negocio: {
        id: string;
        nombre: string;
        slug: string;
        logoUrl?: string | null;
        heroTitulo?: string | null;
        heroSubtitulo?: string | null;
        colorPrimario?: string | null;
        whatsapp?: string | null;
        configuracion?: any;
    };
    initialProducts?: any[];
    initialCategories?: any[];
}

export default function PinchosStoreModule({ negocio, initialProducts = [], initialCategories = [] }: StoreProps) {
    const primaryColor = negocio.colorPrimario || '#ff6b2b';
    const storeSlug = negocio.slug;

    // View state: 'catalog' | 'checkout' | 'orders_history'
    const [view, setView] = useState<'catalog' | 'checkout' | 'orders_history'>('catalog');
    const [currentStep, setCurrentStep] = useState<number>(1);

    // Products & Categories
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [categories, setCategories] = useState<any[]>(initialCategories);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [zoomProduct, setZoomProduct] = useState<any>(null);

    // Cart State
    const [cartState, setCartState] = useState<PinchoCartState>(() => PinchoCartService.loadCart(negocio.id));

    // Client & Order States
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [createdOrder, setCreatedOrder] = useState<any>(null);
    const [bankConfig, setBankConfig] = useState<any>(null);

    // Submission & Loading States
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showShareToast, setShowShareToast] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');

    // Load initial products if not provided
    useEffect(() => {
        if (initialProducts.length === 0) {
            fetch(`/api/public/${storeSlug}/catalogue`)
                .then(r => r.json())
                .then(d => {
                    // API returns { products, categories }
                    if (d.products) setProducts(d.products);
                    if (d.categories) setCategories(d.categories);
                })
                .catch(err => console.error("Error loading catalogue:", err));
        }
    }, [storeSlug, initialProducts.length]);


    // Session ID initialization for temporary draft
    useEffect(() => {
        if (typeof window !== 'undefined') {
            let sId = localStorage.getItem(`pincho_session_${negocio.id}`);
            if (!sId) {
                sId = `sess_${crypto.randomUUID()}`;
                localStorage.setItem(`pincho_session_${negocio.id}`, sId);
            }
            setSessionId(sId);

            const savedPhone = localStorage.getItem('pinchos_client_phone') || localStorage.getItem('user_phone') || '';
            const savedName = localStorage.getItem('pinchos_client_name') || localStorage.getItem('user_name') || '';
            if (savedPhone) setClientPhone(savedPhone);
            if (savedName) setClientName(savedName);

            // Fetch Active Order for Banner
            if (savedPhone) {
                fetch(`/api/public/pinchos/orders/active?slug=${storeSlug}&phone=${encodeURIComponent(savedPhone)}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.activeOrder) setActiveOrder(data.activeOrder);
                    })
                    .catch(() => {});
            }

            // Fetch Bank Details
            fetch(`/api/public/${storeSlug}/bank-details`)
                .then(r => r.json())
                .then(data => {
                    if (data.success && data.method) setBankConfig(data.method);
                })
                .catch(() => {});
        }
    }, [negocio.id, storeSlug]);

    // Save cart state whenever it updates
    useEffect(() => {
        PinchoCartService.saveCart(negocio.id, cartState);
    }, [cartState, negocio.id]);

    // Cart Helper Actions
    const handleUpdateQuantity = (productId: string, delta: number) => {
        setCartState(prev => {
            const existingIndex = prev.items.findIndex(i => i.product.id === productId);
            if (existingIndex === -1 && delta > 0) {
                const prod = products.find(p => p.id === productId);
                if (!prod) return prev;
                return {
                    ...prev,
                    items: [...prev.items, { product: prod, quantity: 1 }]
                };
            }
            if (existingIndex !== -1) {
                const updatedItems = [...prev.items];
                const currentQty = updatedItems[existingIndex].quantity;
                const newQty = currentQty + delta;
                if (newQty <= 0) {
                    updatedItems.splice(existingIndex, 1);
                } else {
                    updatedItems[existingIndex].quantity = newQty;
                }
                return { ...prev, items: updatedItems };
            }
            return prev;
        });
    };

    const handleAddToCartWithQuantity = (product: any, qtyToAdd: number) => {
        setCartState(prev => {
            const existingIndex = prev.items.findIndex(i => i.product.id === product.id);
            if (existingIndex === -1) {
                return {
                    ...prev,
                    items: [...prev.items, { product, quantity: qtyToAdd }]
                };
            } else {
                const updatedItems = [...prev.items];
                updatedItems[existingIndex].quantity += qtyToAdd;
                return { ...prev, items: updatedItems };
            }
        });
    };

    const handleRemoveItem = (productId: string) => {
        setCartState(prev => ({
            ...prev,
            items: prev.items.filter(i => i.product.id !== productId)
        }));
    };

    // Reorder action from Order History
    const handleReorder = (items: PinchoCartItem[]) => {
        setCartState(prev => ({
            ...prev,
            items
        }));
        setView('checkout');
        setCurrentStep(1);
    };

    // Step 4 -> Create Order In DB and move to Payment Step (Step 5)
    const handleCreateOrderAndProceedToPayment = async () => {
        if (cartState.items.length === 0) return;
        try {
            setSubmitting(true);
            const res = await fetch('/api/public/pinchos/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: storeSlug,
                    storeId: negocio.id,
                    sessionId,
                    clientName,
                    clientPhone,
                    deliveryType: cartState.deliveryType,
                    clientAddress: cartState.deliveryAddress,
                    clientReference: cartState.deliveryReference,
                    lat: cartState.lat,
                    lng: cartState.lng,
                    items: cartState.items.map(i => ({
                        productId: i.product.id,
                        cantidad: i.quantity
                    }))
                })
            });

            const data = await res.json();
            if (data.success && data.pedido) {
                setCreatedOrder(data.pedido);
                setActiveOrder(data.pedido);
                setCurrentStep(5);
                
                // Clear cart locally
                PinchoCartService.clearCart(negocio.id);
                setCartState(PinchoCartService.getInitialState());
            } else {
                alert(data.error || 'No se pudo registrar el pedido.');
            }
        } catch (e) {
            alert('Error de conexión al registrar el pedido.');
        } finally {
            setSubmitting(false);
        }
    };

    // Step 5 -> Upload Payment Evidence
    const handleUploadEvidence = async (file: File) => {
        if (!createdOrder) return;
        try {
            setUploading(true);
            setUploadError(null);

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/public/${storeSlug}/orders/${createdOrder.id}/payment-evidence`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.success) {
                setCurrentStep(6);
            } else {
                setUploadError(data.error || 'Error al subir el comprobante.');
            }
        } catch (e: any) {
            setUploadError('Error de red al subir comprobante.');
        } finally {
            setUploading(false);
        }
    };

    // Totals Calculation
    const { subtotal, shippingCost, total, totalItemsCount } = PinchoCartService.calculateTotals(
        cartState.items,
        cartState.deliveryType === 'DOMICILIO' ? 1.50 : 0,
        cartState.couponDiscount
    );

    // Filtered Products
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.categoriaId === selectedCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (view === 'orders_history') {
        return (
            <PinchoClientOrdersHistory
                storeSlug={storeSlug}
                storeName={negocio.nombre}
                onReorder={handleReorder}
                onBackToStore={() => setView('catalog')}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-36 font-sans">
            {/* Top Bar Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
                <div 
                    onClick={() => { setView('catalog'); setCurrentStep(1); }}
                    className="flex items-center gap-2 cursor-pointer"
                >
                    {negocio.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={negocio.logoUrl} alt={negocio.nombre} className="size-9 rounded-xl object-contain border bg-white" />
                    ) : (
                        <div className="size-9 rounded-xl flex items-center justify-center text-white text-xs font-black uppercase" style={{ backgroundColor: primaryColor }}>
                            {negocio.nombre.substring(0, 2)}
                        </div>
                    )}
                    <div className="text-left">
                        <h1 className="text-sm font-black text-slate-900 leading-tight">{negocio.nombre}</h1>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pedidos Online</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setView('orders_history')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                        Mis Pedidos
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (view === 'catalog' && cartState.items.length > 0) {
                                setView('checkout');
                                setCurrentStep(1);
                            } else {
                                setView('catalog');
                            }
                        }}
                        className="relative p-2 text-slate-700 active:scale-95 transition-transform cursor-pointer"
                    >
                        <ShoppingBag className="size-6 text-orange-600" />
                        {totalItemsCount > 0 && (
                            <span className="absolute -top-1 -right-1 size-5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                                {totalItemsCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Smart Active Order Banner */}
            {activeOrder && (
                <PinchoSmartActiveOrderBanner
                    order={activeOrder}
                    storeSlug={storeSlug}
                />
            )}

            {/* View Switcher: Checkout Flow vs Catalog */}
            {view === 'checkout' ? (
                <div>
                    <PinchoCheckoutStepper
                        currentStep={currentStep}
                        onStepClick={(step) => setCurrentStep(step)}
                    />

                    <main className="px-4 pt-6">
                        {currentStep === 1 && (
                            <Step1PinchoCart
                                items={cartState.items}
                                onUpdateQuantity={handleUpdateQuantity}
                                onRemoveItem={handleRemoveItem}
                                couponCode={cartState.couponCode || ''}
                                setCouponCode={(code) => setCartState(prev => ({ ...prev, couponCode: code }))}
                                onContinue={() => setCurrentStep(2)}
                            />
                        )}

                        {currentStep === 2 && (
                            <Step2PinchoAuth
                                clientName={clientName}
                                setClientName={setClientName}
                                clientPhone={clientPhone}
                                setClientPhone={setClientPhone}
                                storeSlug={storeSlug}
                                onAuthenticated={(name, phone) => {
                                    setClientName(name);
                                    setClientPhone(phone);
                                    setCurrentStep(3);
                                }}
                            />
                        )}

                        {currentStep === 3 && (
                            <Step3PinchoDelivery
                                deliveryType={cartState.deliveryType}
                                setDeliveryType={(type) => setCartState(prev => ({ ...prev, deliveryType: type }))}
                                deliveryAddress={cartState.deliveryAddress}
                                setDeliveryAddress={(addr) => setCartState(prev => ({ ...prev, deliveryAddress: addr }))}
                                deliveryReference={cartState.deliveryReference}
                                setDeliveryReference={(ref) => setCartState(prev => ({ ...prev, deliveryReference: ref }))}
                                lat={cartState.lat}
                                lng={cartState.lng}
                                onConfirmLocation={(lat, lng) => setCartState(prev => ({ ...prev, lat, lng }))}
                                onContinue={() => setCurrentStep(4)}
                            />
                        )}

                        {currentStep === 4 && (
                            <Step4PinchoConfirm
                                items={cartState.items}
                                clientName={clientName}
                                clientPhone={clientPhone}
                                deliveryType={cartState.deliveryType}
                                deliveryAddress={cartState.deliveryAddress}
                                deliveryReference={cartState.deliveryReference}
                                shippingCost={shippingCost}
                                subtotal={subtotal}
                                total={total}
                                submitting={submitting}
                                onCreateOrderAndProceedToPayment={handleCreateOrderAndProceedToPayment}
                            />
                        )}

                        {currentStep === 5 && (
                            <Step5PinchoPayment
                                order={createdOrder || activeOrder}
                                bankConfig={bankConfig}
                                uploading={uploading}
                                uploadError={uploadError}
                                onUploadEvidence={handleUploadEvidence}
                            />
                        )}

                        {currentStep === 6 && (
                            <Step6PinchoWaitingConfirmation
                                order={createdOrder || activeOrder}
                                onViewOrder={() => setView('orders_history')}
                            />
                        )}
                    </main>
                </div>
            ) : (
                /* Catalog View */
                <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="size-4 text-slate-400 absolute left-4 top-3.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar deliciosos pinchos, combos y bebidas..."
                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 shadow-2xs focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    {/* Category Tabs */}
                    {categories.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('all')}
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                                    selectedCategory === 'all'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-white text-slate-600 border border-slate-200/80'
                                }`}
                            >
                                Todos
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                                        selectedCategory === cat.id
                                            ? 'bg-orange-600 text-white shadow-md'
                                            : 'bg-white text-slate-600 border border-slate-200/80'
                                    }`}
                                >
                                    {cat.nombre}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map((prod) => {
                            const cartItem = cartState.items.find(i => i.product.id === prod.id);
                            const qty = cartItem ? cartItem.quantity : 0;

                            return (
                                <div key={prod.id} className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 text-left hover:shadow-md transition-shadow">
                                    <div 
                                        onClick={() => setZoomProduct(prod)}
                                        className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 group cursor-pointer"
                                    >
                                        {prod.imagenUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={prod.imagenUrl} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍢</div>
                                        )}
                                        <div className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-xl backdrop-blur-md opacity-80 group-hover:opacity-100 transition-opacity">
                                            <ZoomIn className="size-4" />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 leading-tight">{prod.nombre}</h3>
                                        {prod.descripcion && (
                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">{prod.descripcion}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span className="text-base font-black text-slate-900 font-mono">${prod.precio.toFixed(2)}</span>

                                        {qty > 0 ? (
                                            <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-2 border border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQuantity(prod.id, -1)}
                                                    className="size-8 bg-white text-slate-800 rounded-xl flex items-center justify-center font-black shadow-xs active:scale-90 transition-transform cursor-pointer"
                                                >
                                                    <Minus className="size-3.5 stroke-[2.5]" />
                                                </button>
                                                <span className="text-xs font-mono font-black text-slate-900 min-w-[16px] text-center">{qty}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQuantity(prod.id, 1)}
                                                    className="size-8 bg-white text-slate-800 rounded-xl flex items-center justify-center font-black shadow-xs active:scale-90 transition-transform cursor-pointer"
                                                >
                                                    <Plus className="size-3.5 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQuantity(prod.id, 1)}
                                                className="h-10 px-5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Plus className="size-3.5 stroke-[2.5]" />
                                                <span>AGREGAR</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            )}

            {/* Redesigned Product Detail Modal */}
            <PinchoProductDetailModal
                product={zoomProduct}
                onClose={() => setZoomProduct(null)}
                onAddToCart={handleAddToCartWithQuantity}
                currentCartQuantity={
                    zoomProduct 
                        ? (cartState.items.find(i => i.product.id === zoomProduct.id)?.quantity || 0)
                        : 0
                }
            />
        </div>
    );
}
