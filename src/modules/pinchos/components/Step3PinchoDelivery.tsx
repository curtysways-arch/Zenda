import React, { useState } from 'react';
import { MapPin, Building2, Compass, ArrowRight, CheckCircle2 } from 'lucide-react';
import MapSelectionModal from '@/components/public/MapSelectionModal';

interface Step3Props {
    deliveryType: 'RETIRO' | 'DOMICILIO';
    setDeliveryType: (val: 'RETIRO' | 'DOMICILIO') => void;
    deliveryAddress: string;
    setDeliveryAddress: (val: string) => void;
    deliveryReference: string;
    setDeliveryReference: (val: string) => void;
    lat?: number | null;
    lng?: number | null;
    onConfirmLocation: (lat: number, lng: number) => void;
    onContinue: () => void;
}

export default function Step3PinchoDelivery({
    deliveryType,
    setDeliveryType,
    deliveryAddress,
    setDeliveryAddress,
    deliveryReference,
    setDeliveryReference,
    lat,
    lng,
    onConfirmLocation,
    onContinue
}: Step3Props) {
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (deliveryType === 'DOMICILIO' && !deliveryAddress.trim()) {
            alert('Por favor ingresa tu dirección de entrega.');
            return;
        }
        onContinue();
    };

    return (
        <div className="max-w-xl mx-auto space-y-5">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5 text-left">
                <div className="border-b border-slate-100 pb-3">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="size-4 text-orange-600" />
                        <span>Modalidad de Entrega</span>
                    </span>
                </div>

                {/* Opciones Retiro vs Domicilio */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setDeliveryType('DOMICILIO')}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            deliveryType === 'DOMICILIO'
                                ? 'bg-orange-50/80 border-orange-500 text-orange-950 shadow-sm ring-2 ring-orange-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        <MapPin className={`size-5 mb-2 ${deliveryType === 'DOMICILIO' ? 'text-orange-600' : 'text-slate-400'}`} />
                        <div>
                            <span className="text-xs font-black uppercase block">A Domicilio</span>
                            <span className="text-[10px] text-slate-500 font-medium">Recibe en tu casa</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDeliveryType('RETIRO')}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            deliveryType === 'RETIRO'
                                ? 'bg-orange-50/80 border-orange-500 text-orange-950 shadow-sm ring-2 ring-orange-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        <Building2 className={`size-5 mb-2 ${deliveryType === 'RETIRO' ? 'text-orange-600' : 'text-slate-400'}`} />
                        <div>
                            <span className="text-xs font-black uppercase block">Retiro en Local</span>
                            <span className="text-[10px] text-slate-500 font-medium">Sin costo de envío</span>
                        </div>
                    </button>
                </div>

                {/* Campos si es Domicilio */}
                {deliveryType === 'DOMICILIO' && (
                    <div className="space-y-3 pt-2">
                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Dirección Principal *
                            </label>
                            <input
                                type="text"
                                required
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Ej: Av. Brasil N45-12 y Zamora"
                                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Referencia o Edificio
                            </label>
                            <input
                                type="text"
                                value={deliveryReference}
                                onChange={(e) => setDeliveryReference(e.target.value)}
                                placeholder="Ej: Frente al parque, Casa blanca de 2 pisos"
                                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                            />
                        </div>

                        {/* Botón Mapa Interactivo */}
                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={() => setIsMapOpen(true)}
                                className="w-full py-3 bg-orange-50 border border-orange-200 text-orange-800 hover:bg-orange-100 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <Compass className="size-4 text-orange-600" />
                                <span>{lat && lng ? '📍 UBICACIÓN EN MAPA CONFIRMADA' : 'SELECCIONAR UBICACIÓN EXACTA EN MAPA'}</span>
                            </button>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                    <span>CONTINUAR A CONFIRMACIÓN</span>
                    <ArrowRight className="size-4" />
                </button>
            </form>

            <MapSelectionModal
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                initialLat={lat || undefined}
                initialLng={lng || undefined}
                onConfirmLocation={(newLat, newLng) => {
                    onConfirmLocation(newLat, newLng);
                    setIsMapOpen(false);
                }}
            />
        </div>
    );
}
