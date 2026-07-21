'use client';

import { useState, useEffect } from 'react';
import { Plus, Tags, Trash2, Edit, Share2 } from 'lucide-react';
import PromotionForm from './PromotionForm';
import { deletePromotion, updatePromotion } from '@/app/actions/promotionActions';
import MobilePromotions from '@/components/admin/mobile/MobilePromotions';
import { getImageUrl } from '@/lib/utils';

export default function PromotionClient({ 
    initialPromotions, 
    negocio, 
    isPromotionsEnabled = true 
}: { 
    initialPromotions: any[], 
    negocio: any, 
    isPromotionsEnabled?: boolean 
}) {
    const [promotions, setPromotions] = useState<any[]>(initialPromotions);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState<any>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    useEffect(() => {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
    }, []);

    const handleEdit = (promo: any) => {
        setSelectedPromotion(promo);
        setIsModalOpen(true);
    };

    const handleShare = (promo: any) => {
        const shareUrl = `${window.location.origin}/${negocio.slug}/promo/${promo.id}`;
        const ahoraTexto = promo.tipoPromo === '2x1' ? '*¡Oferta 2x1!*' : (promo.tipoPromo === '3x1' ? '*¡Oferta 3x1!*' : `*$${promo.precioPromo}*`);
        
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const diasStr = promo.diasValidos 
            ? promo.diasValidos.split(',').map((d: string) => days[parseInt(d)]).join(', ') 
            : 'Todos los días';
            
        const horarioStr = promo.horaInicioValida && promo.horaFinValida 
            ? `${promo.horaInicioValida} - ${promo.horaFinValida}` 
            : (negocio.horarioApertura && negocio.horarioCierre 
                ? `${negocio.horarioApertura} - ${negocio.horarioCierre}` 
                : 'Horario de atención');

        const serviciosStr = promo.services && promo.services.length > 0
            ? promo.services.map((s: any) => `• ${s.nombre}`).join('\n')
            : '';

        const mensaje = `🔥 *PROMOCIÓN ESPECIAL* 🔥 ${negocio.nombre}\n\n*${promo.titulo}*\n${promo.precioAnterior ? `Antes: ~${promo.precioAnterior}~ \n` : ''}Ahora: ${ahoraTexto}\n\n${serviciosStr ? `💆‍♂️ *Servicios incluidos:*\n${serviciosStr}\n\n` : ''}📅 *Días disponibles:* ${diasStr}\n⏰ *Horario:* ${horarioStr}\n\nReserva aquí: ${shareUrl}`;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        window.open(waUrl, '_blank');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPromotion(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
        setLoadingAction(id);
        const res = await deletePromotion(id);
        if (res.success) {
            setPromotions((prev) => prev.filter((p) => p.id !== id));
        } else {
            alert('Error eliminando promoción');
        }
        setLoadingAction(null);
    };

    const toggleEstado = async (promo: any) => {
        setLoadingAction(promo.id + '-status');
        const nuevoEstado = promo.estado === 'activa' ? 'borrador' : (promo.estado === 'caducada' ? 'activa' : 'activa');
        const res = await updatePromotion(promo.id, { estado: nuevoEstado });
        if (res.success) {
            setPromotions((prev) =>
                prev.map((p) => (p.id === promo.id ? { ...p, estado: nuevoEstado } : p))
            );
        } else {
            alert('Error al actualizar estado');
        }
        setLoadingAction(null);
    };

    if (!isPromotionsEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-in fade-in duration-500">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-[2.5rem] blur-2xl w-28 h-28 -translate-x-2 -translate-y-2" />
                    <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl relative z-10">
                        <Tags size={40} className="animate-bounce" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic mb-3">Módulo de Promociones</h1>
                <p className="text-slate-500 max-w-md font-medium text-sm leading-relaxed mb-8">
                    Crea ofertas personalizadas para tus servicios y compártelas directamente en WhatsApp para atraer más clientes. Esta funcionalidad no está incluida en tu plan actual.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <a
                        href="/admin/plan"
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        Actualizar mi Plan
                    </a>
                    <a
                        href={`https://wa.me/573000000000?text=Hola,%20quiero%20solicitar%20el%20módulo%20de%20promociones%20para%20mi%20negocio%20${encodeURIComponent(negocio.nombre)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.59 1.968 14.117.943 11.5.943c-5.442 0-9.87 4.37-9.874 9.8.001 1.83.488 3.615 1.411 5.174l-.995 3.633 3.737-.96c1.52.83 3.111 1.266 4.778 1.266zm10.326-6.83c-.316-.157-1.872-.924-2.163-1.03-.292-.106-.505-.157-.717.157-.213.317-.82.103-1.006.103-.186 0-.372-.093-.688-.25-1.332-.596-2.316-2.185-2.615-2.7-.298-.515-.03-.793.227-1.05.232-.23.505-.595.759-.893.254-.297.34-.51.51-.85.17-.34.085-.63-.042-.892-.127-.26-.957-2.31-1.314-3.172-.346-.833-.699-.72-.958-.733-.247-.012-.53-.015-.812-.015-.282 0-.742.106-1.129.53-.388.425-1.484 1.45-1.484 3.535 0 2.086 1.51 4.103 1.722 4.39.213.287 2.972 4.54 7.2 6.364 1.006.434 1.792.693 2.4.887 1.011.322 1.93.277 2.658.169.81-.12 1.872-.767 2.138-1.472.266-.705.266-1.309.186-1.47-.08-.16-.292-.25-.608-.407z" />
                        </svg>
                        Contactar Soporte
                    </a>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden -mx-5 -mt-5">
                <MobilePromotions 
                    promotions={promotions}
                    primaryColor={primaryColor}
                    onNew={() => {
                        setSelectedPromotion(null);
                        setIsModalOpen(true);
                    }}
                    onEdit={handleEdit}
                    onShare={handleShare}
                    onDelete={handleDelete}
                    onToggleStatus={toggleEstado}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-8 animate-in fade-in duration-500">
                {isModalOpen && (
                    <PromotionForm
                        initialData={selectedPromotion}
                        services={negocio.services || []}
                        onClose={handleCloseModal}
                        onSuccess={(updatedPromos) => {
                            window.location.reload();
                        }}
                    />
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Promociones</h1>
                        <p className="text-gray-500 font-medium text-sm">Crea ofertas y compártelas en WhatsApp.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedPromotion(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-black transition-all duration-300 shadow-xl shadow-gray-200"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                        <Plus size={20} />
                        NUEVA PROMOCIÓN
                    </button>
                </div>

                {promotions.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-16 border-2 border-dashed border-gray-100 flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
                            <Tags size={40} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">No tienes promociones</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">Atrae más clientes creando promociones atractivas.</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="font-black text-xs uppercase tracking-widest transition"
                            style={{ color: 'var(--primary-color)' }}
                        >
                            Crear primera promoción
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {promotions.map((promo) => (
                            <div key={promo.id} className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col"
                                 onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 25px 50px -12px color-mix(in srgb, var(--primary-color), transparent 80%)'}
                                 onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                                <div className="h-48 bg-gray-50 w-full relative transition-colors duration-500 flex items-center justify-center"
                                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)'}
                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(249, 250, 251)'}>
                                    {promo.imageMedia || promo.imagenUrl ? (
                                        <img src={getImageUrl(promo.imageMedia || promo.imagenUrl, 'medium')} alt={promo.titulo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <Tags size={48} className="text-gray-200" />
                                    )}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={() => toggleEstado(promo)}
                                            disabled={loadingAction === promo.id + '-status'}
                                            className={`px-3 py-1 text-xs font-black uppercase rounded-full tracking-widest transition-all ${promo.estado === 'activa'
                                                ? 'shadow-sm ring-1'
                                                : promo.estado === 'caducada'
                                                    ? 'bg-red-50 text-red-500 ring-1 ring-red-200'
                                                    : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-200'
                                                }`}
                                             style={promo.estado === 'activa' ? { backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--primary-color), transparent 80%)' } : {}}>
                                            {promo.estado === 'activa' ? 'ACTIVA' : (promo.estado === 'caducada' ? 'CADUCADA' : 'BORRADOR')}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col flex-1 space-y-4">
                                    <div>
                                        <h3 className="font-black text-xl text-gray-900">{promo.titulo}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{promo.descripcion}</p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-50">
                                        <div className="flex items-end justify-between w-full px-2 pb-4">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                    {promo.tipoPromo === '2x1' ? 'Oferta 2x1' : (promo.tipoPromo === '3x1' ? 'Oferta 3x1' : 'Precio Promo')}
                                                </span>
                                                <span className="text-2xl font-black leading-none" style={{ color: 'var(--primary-color)' }}>
                                                    ${promo.precioPromo}
                                                </span>
                                            </div>
                                            {(promo.precioAnterior || promo.tipoPromo === '2x1' || promo.tipoPromo === '3x1') && (
                                                <div className="text-right flex flex-col justify-end">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Real</span>
                                                    <span className="text-sm text-gray-400 line-through font-medium leading-none">
                                                        ${promo.precioAnterior || (promo.tipoPromo === '2x1' ? promo.precioPromo * 2 : promo.precioPromo * 3)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex text-xs font-medium text-gray-400 justify-between items-center mb-4 px-2">
                                            <span>Compartido {promo.shareCount} veces</span>
                                        </div>

                                        <div className="flex gap-2 mb-2">
                                            <button
                                                onClick={() => handleShare(promo)}
                                                className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white p-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-sm tracking-wide"
                                            >
                                                <Share2 size={16} /> Compartir por WhatsApp
                                            </button>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(promo)}
                                                className="flex-1 bg-gray-900 text-white p-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-sm tracking-wide"
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(17, 24, 39)'; }}
                                            >
                                                <Edit size={16} /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(promo.id)}
                                                disabled={loadingAction === promo.id}
                                                className="bg-red-50 hover:bg-red-500 hover:text-white text-red-500 p-3 rounded-2xl flex items-center justify-center transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para móvil */}
            <div className="md:hidden">
                {isModalOpen && (
                    <div className="fixed inset-0 z-[120] bg-white animate-in slide-in-from-bottom duration-500 overflow-y-auto">
                        <PromotionForm
                            initialData={selectedPromotion}
                            services={negocio.services || []}
                            onClose={handleCloseModal}
                            onSuccess={(updatedPromos) => {
                                window.location.reload();
                            }}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
