'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';
import ImageUploader from '@/components/ui/ImageUploader';
import PaymentMethodsConfig from '@/components/admin/PaymentMethodsConfig';

interface Props {
    negocio: any;
    onSaveNegocio: (data: any) => Promise<void>;
    saving: boolean;
    message: { type: 'success' | 'error'; text: string } | null;
}

export default function ProductsConfig({ negocio, onSaveNegocio, saving, message }: Props) {
    const config = negocio?.configuracion || {};

    const [nombre, setNombre] = useState(negocio?.nombre || '');
    const [whatsapp, setWhatsapp] = useState(negocio?.whatsapp || '');
    const [direccion, setDireccion] = useState(negocio?.direccion || '');
    const [logoUrl, setLogoUrl] = useState(negocio?.logoUrl || '');

    // Parámetros de envío y tienda
    const [montoMinimoPedido, setMontoMinimoPedido] = useState(config.montoMinimoPedido !== undefined ? config.montoMinimoPedido.toString() : '5.00');
    const [tiempoMaximoEntrega, setTiempoMaximoEntrega] = useState(config.tiempoMaximoEntrega || '30-45 min');
    const [costoEnvio, setCostoEnvio] = useState(config.costoEnvio !== undefined ? config.costoEnvio.toString() : '1.50');
    const [costoEnvioPorKm, setCostoEnvioPorKm] = useState(config.costoEnvioPorKm !== undefined ? config.costoEnvioPorKm.toString() : '0.25');
    const [latitudNegocio, setLatitudNegocio] = useState(config.latitudNegocio !== undefined ? config.latitudNegocio.toString() : '-0.180653');
    const [longitudNegocio, setLongitudNegocio] = useState(config.longitudNegocio !== undefined ? config.longitudNegocio.toString() : '-78.467838');
    const [horaLimiteMismoDia, setHoraLimiteMismoDia] = useState(config.horaLimiteMismoDia || '18:00');

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveNegocio({
            nombre,
            whatsapp,
            direccion,
            logoUrl,
            configuracion: {
                ...config,
                wizardCompleted: true,
                montoMinimoPedido: parseFloat(montoMinimoPedido) || 0,
                tiempoMaximoEntrega,
                costoEnvio: parseFloat(costoEnvio) || 0,
                costoEnvioPorKm: parseFloat(costoEnvioPorKm) || 0,
                latitudNegocio: parseFloat(latitudNegocio) || 0,
                longitudNegocio: parseFloat(longitudNegocio) || 0,
                horaLimiteMismoDia
            }
        });
    };

    return (
        <div className="space-y-8 text-left max-w-4xl pb-10">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase">
                    Configuración de Negocio
                </h1>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    Gestiona los parámetros operativos de tu local y envíos a domicilio
                </p>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
                    <span className="text-xs font-black uppercase tracking-wider">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo Uploader */}
                <div className="md:col-span-1 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4 h-fit">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Logo de la Marca</label>
                    <ImageUploader
                        category="logo"
                        currentUrl={logoUrl}
                        onUploadSuccess={(media) => setLogoUrl(media.url)}
                        onRemove={() => setLogoUrl('')}
                        label="Subir Logo"
                        aspect="square"
                    />
                </div>

                {/* Formulario */}
                <div className="md:col-span-2 space-y-6">
                    {/* Sección General */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-2">Información Básica</h3>
                        
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre comercial</label>
                            <input
                                type="text"
                                required
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">WhatsApp de pedidos</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: 593998877665"
                                    value={whatsapp}
                                    onChange={e => setWhatsapp(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Dirección física</label>
                                <input
                                    type="text"
                                    required
                                    value={direccion}
                                    onChange={e => setDireccion(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Parámetros Operativos */}
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-2">Parámetros de Entrega y Envíos</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Monto Mínimo de Pedido ($)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.50"
                                    min="0"
                                    value={montoMinimoPedido}
                                    onChange={e => setMontoMinimoPedido(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Costo de Envío Base ($)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0"
                                    value={costoEnvio}
                                    onChange={e => setCostoEnvio(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Costo por Km Adicional ($)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0"
                                    value={costoEnvioPorKm}
                                    onChange={e => setCostoEnvioPorKm(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tiempo de Entrega Estimado</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: 30-45 min"
                                    value={tiempoMaximoEntrega}
                                    onChange={e => setTiempoMaximoEntrega(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Hora Límite Pedidos Mismo Día</label>
                                <input
                                    type="time"
                                    required
                                    value={horaLimiteMismoDia}
                                    onChange={e => setHoraLimiteMismoDia(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Latitud GPS (Local)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.000001"
                                    value={latitudNegocio}
                                    onChange={e => setLatitudNegocio(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Longitud GPS (Local)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.000001"
                                    value={longitudNegocio}
                                    onChange={e => setLongitudNegocio(e.target.value)}
                                    className="w-full bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-semibold leading-relaxed">
                            <MapPin className="size-4 shrink-0 text-slate-400 mt-0.5" />
                            <span>
                                Las coordenadas GPS se usan para calcular la distancia lineal exacta (Haversine) hasta el punto de entrega del cliente, cobrando automáticamente <strong>${parseFloat(costoEnvioPorKm).toFixed(2)} por cada kilómetro</strong> sobre el costo base de envío.
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="size-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* SECCIÓN DE DATOS BANCARIOS Y MÉTODOS DE PAGO */}
            <div className="mt-8">
                <PaymentMethodsConfig />
            </div>
        </div>
    );
}
