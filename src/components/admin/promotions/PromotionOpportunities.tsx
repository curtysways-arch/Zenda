'use client';

import React from 'react';
import { Lightbulb, TrendingUp, Clock, Users, ArrowRight, Zap, ShoppingBag, Sparkles } from 'lucide-react';

interface PromotionOpportunitiesProps {
  products: any[];
  categories: any[];
  onSelectOpportunity: (prefilledData: any) => void;
}

export default function PromotionOpportunities({
  products,
  categories,
  onSelectOpportunity,
}: PromotionOpportunitiesProps) {

  const opportunities = [
    {
      id: 'opp_happy_hour',
      icon: Clock,
      title: '🕐 Llenar horas de baja demanda (Happy Hour)',
      badge: 'Baja Demanda (15:00 - 17:00)',
      color: 'border-amber-200 bg-amber-50/50 text-amber-900',
      description: 'Tus ventas bajan un 40% durante las tardes de lunes a jueves. Crea una promoción temporal entre 15:00 y 17:00 para impulsar la ocupación de cocina.',
      presetData: {
        goalPreset: 'HAPPY_HOUR',
        titulo: '🔥 Happy Hour del Chef (15:00 - 17:00)',
        descripcion: 'Disfruta de 20% OFF en consumo durante las horas seleccionadas.',
        tipoPromo: 'PORCENTAJE',
        precioPromo: 20,
        diasValidos: ['1', '2', '3', '4'],
        horaInicioValida: '15:00',
        horaFinValida: '17:00',
        canales: ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING']
      }
    },
    {
      id: 'opp_combo_bundle',
      icon: ShoppingBag,
      title: '🍔 Combo de Hamburguesa + Acompañamiento + Bebida',
      badge: 'Venta Cruzada Impulsada',
      color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
      description: 'El 65% de los clientes que piden platos fuertes también compran bebidas o acompañantes. Aumenta el ticket promedio creando un Combo especial.',
      presetData: {
        goalPreset: 'BUNDLE',
        titulo: '🍔 Combo Parrillero Especial',
        descripcion: 'Plato principal + Acompañante + Bebida fría por precio especial.',
        tipoPromo: 'COMBO',
        precioPromo: 10.99,
        precioAnterior: 14.00,
        canales: ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING']
      }
    },
    {
      id: 'opp_new_customer',
      icon: Users,
      title: '🆕 Cupón de Bienvenida para Clientes Nuevos',
      badge: 'Captación de Clientes',
      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
      description: 'Conduce a nuevos comensales a probar tu restaurante regalando $3.00 en su primer pedido online con el código BIENVENIDO.',
      presetData: {
        goalPreset: 'NEW_CLIENT',
        titulo: '🎁 15% OFF en Tu Primer Pedido Online',
        descripcion: 'Ingresa el código BIENVENIDO al finalizar tu pedido.',
        tipoPromo: 'CUPON',
        cuponCodigo: 'BIENVENIDO',
        precioPromo: 15,
        tipoCliente: 'NEW',
        montoMinimo: 12.00,
        canales: ['LANDING', 'DELIVERY', 'PICKUP']
      }
    },
    {
      id: 'opp_slow_moving',
      icon: TrendingUp,
      title: '⚡ Impulsar Producto de Baja Rotación',
      badge: 'Rotación de Inventario',
      color: 'border-purple-200 bg-purple-50/50 text-purple-900',
      description: 'Crea una promoción de 2x1 o Descuento Fijo en productos seleccionados para acelerar las ventas de la semana.',
      presetData: {
        goalPreset: 'PRODUCT_BOOST',
        titulo: '⚡ 2x1 en Bebidas & Especiales',
        descripcion: 'Pide 2 y paga solo 1 en la categoría seleccionada.',
        tipoPromo: 'DOS_POR_UNO',
        canales: ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING']
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-200" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-200">Centro de Oportunidades & Crecimiento</span>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight">Recomendaciones Basadas en Tus Datos</h2>
          <p className="text-amber-100/90 text-xs font-medium leading-relaxed">
            Identificamos patrones en tu restaurante para ayudarte a pasar de “Quiero vender más” a una promoción real precargada en 1 solo clic.
          </p>
        </div>
        <div className="bg-white/15 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center shrink-0">
          <span className="text-2xl font-black block">4</span>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">Oportunidades Hoy</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.map(opp => {
          const IconComp = opp.icon;
          return (
            <div
              key={opp.id}
              className={`p-5 rounded-3xl border ${opp.color} space-y-4 flex flex-col justify-between transition-all hover:shadow-md`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-2xl bg-white p-2 text-slate-800 shadow-xs flex items-center justify-center">
                      <IconComp className="size-5 text-amber-600" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider">{opp.badge}</span>
                  </div>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">{opp.title}</h3>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">{opp.description}</p>
              </div>

              <button
                type="button"
                onClick={() => onSelectOpportunity(opp.presetData)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-2xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Zap className="size-4 text-amber-400 fill-amber-400" />
                <span>Crear Promoción Precargada</span>
                <ArrowRight className="size-4 ml-auto" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
