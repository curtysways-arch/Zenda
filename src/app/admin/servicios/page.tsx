'use client';

import { useEffect, useState } from 'react';
import { Plus, Scissors, Users, CheckCircle2, ChevronRight, Loader2, Clock } from 'lucide-react';
import ServiceForm from '@/components/admin/ServiceForm';
import { useSession } from 'next-auth/react';
import MobileServices from '@/components/admin/mobile/MobileServices';
import { getImageUrl } from '@/lib/utils';

export default function ServicesAdminPage() {
    const { data: session } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [primaryColor, setPrimaryColor] = useState('#0ea5e9');

    const fetchServices = async () => {
        if (!session?.user) {
            return;
        }
        try {
            const negocioId = (session.user as any).negocioId;
            const res = await fetch(`/api/services?negocioId=${negocioId}`);
            if (res.ok) {
                const data = await res.json();
                setServices(Array.isArray(data) ? data : []);
            } else {
                setServices([]);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchServices();
        }
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (color) setPrimaryColor(color);
    }, [session]);

    const handleEdit = (service: any) => {
        setSelectedService(service);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedService(null);
    };

    if (loading) {
        return (
            <div className="h-96 flex flex-col items-center justify-center text-gray-400 gap-4">
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary-color)' }} />
                <p className="font-medium animate-pulse">Cargando tus servicios...</p>
            </div>
        );
    }

    return (
        <>
            {/* VISTA MÓVIL */}
            <div className="md:hidden -mx-5 -mt-5">
                <MobileServices 
                    services={services}
                    primaryColor={primaryColor}
                    onNew={() => {
                        setSelectedService(null);
                        setIsModalOpen(true);
                    }}
                    onEdit={handleEdit}
                />
            </div>

            {/* VISTA ESCRITORIO */}
            <div className="hidden md:block space-y-8 animate-in fade-in duration-500">
                {isModalOpen && (
                    <ServiceForm
                        key={selectedService?.id || 'new'}
                        initialData={selectedService}
                        onClose={handleCloseModal}
                        onSuccess={fetchServices}
                    />
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mis Servicios</h1>
                        <p className="text-gray-500 font-medium text-sm">Gestiona tus servicios de belleza y tratamientos.</p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedService(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-black transition-all duration-300 shadow-xl shadow-gray-200"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                        <Plus size={20} />
                        NUEVO SERVICIO
                    </button>
                </div>

                {services.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-16 border-2 border-dashed border-gray-100 flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
                            <Scissors size={40} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">No tienes servicios registrados</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">Comienza agregando tu primer servicio para recibir citas.</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="font-black text-xs uppercase tracking-widest transition"
                            style={{ color: 'var(--primary-color)' }}
                        >
                            Registrar primer servicio
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service) => (
                            <div key={service.id} className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col"
                                 onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 25px 50px -12px color-mix(in srgb, var(--primary-color), transparent 80%)'}
                                 onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                                <div className="h-40 bg-gray-50 flex items-center justify-center relative transition-colors duration-500"
                                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color), transparent 90%)'}
                                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(249, 250, 251)'}>
                                    {service.imageMedia || (service.imagenes && service.imagenes.length > 0) ? (
                                        <img
                                            src={getImageUrl(service.imageMedia || service.imagenes[0]?.url, 'medium')}
                                            alt={service.nombre}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <Scissors size={64} className="text-gray-200 group-hover:text-emerald-200 group-hover:scale-110 transition-all duration-700" />
                                    )}
                                    {service.estaActivo && (
                                        <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm ring-1 uppercase tracking-widest"
                                             style={{ color: 'var(--primary-color)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--primary-color), transparent 90%)' }}>
                                            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-color)' }} />
                                            ACTIVO
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 space-y-6 flex-1 flex flex-col">
                                    <div className="space-y-1">
                                        <h3 className="font-black text-gray-900 text-xl tracking-tight leading-none transition-colors">{service.nombre}</h3>
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] block">{service.tipo}</span>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                                                <Clock size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-gray-600">{service.duracion} min.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                 style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color), transparent 90%)', color: 'var(--primary-color)' }}>
                                                <span className="text-xs font-black">$</span>
                                            </div>
                                            <span className="text-lg font-black text-gray-900">
                                                {Number(service.precio).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-50 flex gap-3 mt-auto">
                                        <button
                                            onClick={() => handleEdit(service)}
                                            className="flex-[3] bg-gray-900 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-gray-100"
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-color)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(17, 24, 39)'; }}
                                        >
                                            Editar
                                        </button>
                                        <button className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-2xl transition-all flex items-center justify-center group/btn">
                                            <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para móvil (full screen o similar) */}
            <div className="md:hidden">
                {isModalOpen && (
                    <div className="fixed inset-0 z-[120] bg-white animate-in slide-in-from-bottom duration-500">
                        <ServiceForm
                            key={selectedService?.id || 'new-mobile'}
                            initialData={selectedService}
                            onClose={handleCloseModal}
                            onSuccess={fetchServices}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
