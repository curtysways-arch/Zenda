'use client';

import React from 'react';
import { Lightbulb, TrendingUp, Clock, Users, ArrowRight, Zap, ShoppingBag, Sparkles } from 'lucide-react';

interface PromotionOpportunitiesProps {
  products: any[];
  categories: any[];
  onSelectOpportunity: (prefilledData: any) => void;
  negocio?: any;
}

export default function PromotionOpportunities({
  products,
  categories,
  onSelectOpportunity,
  negocio,
}: PromotionOpportunitiesProps) {
  const tipoUpper = (negocio?.tipoNegocio || '').toUpperCase();
  const isRestaurant = tipoUpper === 'RESTAURANTE' || tipoUpper === 'GASTRONOMIA';
  const isBeautySpa = tipoUpper === 'SPA' || tipoUpper === 'CENTRO_ESTETICA' || tipoUpper === 'PELUQUERIA' || tipoUpper === 'BARBERIA';
  const isLaundry = tipoUpper === 'SHOE_CARE' || tipoUpper === 'LAVANDERIA';

  const defaultChannels = isRestaurant
    ? ['POS', 'MESEROS', 'DELIVERY', 'PICKUP', 'LANDING']
    : isBeautySpa
    ? ['POS', 'CITAS', 'DOMICILIO', 'LOCAL', 'LANDING']
    : isLaundry
    ? ['POS', 'SOLICITUDES', 'RETIRO', 'LOCAL', 'LANDING']
    : ['POS', 'ONLINE', 'DELIVERY', 'LOCAL', 'LANDING'];

  const getOpportunitiesList = () => {
    if (isBeautySpa) {
      return [
        {
          id: 'opp_happy_hour',
          icon: Clock,
          title: '🕐 Llenar agenda en horas de baja demanda (Happy Spa)',
          badge: 'Baja Ocupación (14:00 - 16:00)',
          color: 'border-amber-200 bg-amber-50/50 text-amber-900',
          description: 'La asistencia suele bajar durante las primeras horas de la tarde. Ofrece 20% OFF en citas agendadas entre 14:00 y 16:00 de lunes a jueves.',
          presetData: {
            goalPreset: 'HAPPY_HOUR',
            titulo: '✨ Citas con 20% OFF en Tardes (14:00 - 16:00)',
            descripcion: 'Disfruta de descuento especial en todos tus servicios agendados en horario preferencial.',
            tipoPromo: 'PORCENTAJE',
            precioPromo: 20,
            diasValidos: ['Lunes', 'Martes', 'Miércoles', 'Jueves'],
            horaInicioValida: '14:00',
            horaFinValida: '16:00',
            canales: defaultChannels
          }
        },
        {
          id: 'opp_combo_bundle',
          icon: ShoppingBag,
          title: '💆 Paquete Especial: Servicio Principal + Tratamiento Extra',
          badge: 'Venta Cruzada Impulsada',
          color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
          description: 'Aumenta el ticket promedio ofreciendo un paquete combinado de Servicio de Masaje / Limpieza + Mascarilla / Manicura a precio especial.',
          presetData: {
            goalPreset: 'BUNDLE',
            titulo: '✨ Paquete Spa Renacer Total',
            descripcion: 'Servicio Principal + Tratamiento Extra con descuento exclusivo.',
            tipoPromo: 'COMBO',
            precioPromo: 25.00,
            precioAnterior: 35.00,
            canales: defaultChannels
          }
        },
        {
          id: 'opp_new_customer',
          icon: Users,
          title: '🆕 Cupón de Bienvenida para Primeras Citas',
          badge: 'Captación de Clientes',
          color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
          description: 'Atrae nuevos clientes regalando $5.00 de descuento en su primera reserva online con el código BIENVENIDO.',
          presetData: {
            goalPreset: 'NEW_CLIENT',
            titulo: '🎁 $5.00 OFF en Tu Primera Reserva',
            descripcion: 'Ingresa el código BIENVENIDO al agendar tu primera cita.',
            tipoPromo: 'CUPON',
            cuponCodigo: 'BIENVENIDO',
            precioPromo: 5,
            tipoCliente: 'NEW',
            montoMinimo: 20.00,
            canales: defaultChannels
          }
        },
        {
          id: 'opp_slow_moving',
          icon: TrendingUp,
          title: '⚡ Impulsar Servicios con 2x1 o Descuento Especial',
          badge: 'Impulso de Servicios',
          color: 'border-purple-200 bg-purple-50/50 text-purple-900',
          description: 'Lanza una oferta 2x1 en servicios seleccionados (ej. 2x1 en manicura para amigas) para llenar tu local.',
          presetData: {
            goalPreset: 'PRODUCT_BOOST',
            titulo: '👯 Promo Amigas: 2x1 en Servicios Seleccionados',
            descripcion: 'Ven con un acompañante y disfruten la promoción 2x1.',
            tipoPromo: 'DOS_POR_UNO',
            canales: defaultChannels
          }
        }
      ];
    }

    if (isLaundry) {
      return [
        {
          id: 'opp_happy_hour',
          icon: Clock,
          title: '🕐 Descuento en Retiros a Domicilio Semanales',
          badge: 'Impulso Logístico',
          color: 'border-amber-200 bg-amber-50/50 text-amber-900',
          description: 'Incentiva los pedidos a domicilio a inicio de semana con 15% OFF en recolecciones programadas.',
          presetData: {
            goalPreset: 'HAPPY_HOUR',
            titulo: '🚚 Lunes & Martes de Limpieza: 15% OFF',
            descripcion: 'Aprovecha descuento especial en el retiro de tu calzado o prendas.',
            tipoPromo: 'PORCENTAJE',
            precioPromo: 15,
            diasValidos: ['Lunes', 'Martes'],
            canales: defaultChannels
          }
        },
        {
          id: 'opp_combo_bundle',
          icon: ShoppingBag,
          title: '👟 Kit de Limpieza Profunda + Impermeabilizante',
          badge: 'Venta Cruzada',
          color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
          description: 'Combina el servicio de lavado de zapatos o mochilas con desinfección / impermeabilizante a tarifa preferencial.',
          presetData: {
            goalPreset: 'BUNDLE',
            titulo: '👟 Kit Limpieza Profunda + Protecciones',
            descripcion: 'Limpieza de Calzado + Impermeabilizante a precio especial.',
            tipoPromo: 'COMBO',
            precioPromo: 12.00,
            precioAnterior: 16.00,
            canales: defaultChannels
          }
        },
        {
          id: 'opp_new_customer',
          icon: Users,
          title: '🆕 Cupón de Bienvenida para Nuevos Retiros',
          badge: 'Captación de Clientes',
          color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
          description: 'Regala un cupón de $3.00 OFF en la primera solicitud online de recolección.',
          presetData: {
            goalPreset: 'NEW_CLIENT',
            titulo: '🎁 $3.00 OFF en Tu Primera Solicitud',
            descripcion: 'Usa el código LIMPIEZA10 en tu primera solicitud a domicilio.',
            tipoPromo: 'CUPON',
            cuponCodigo: 'LIMPIEZA10',
            precioPromo: 3,
            tipoCliente: 'NEW',
            montoMinimo: 10.00,
            canales: defaultChannels
          }
        },
        {
          id: 'opp_slow_moving',
          icon: TrendingUp,
          title: '⚡ Promo 3x2 en Lavado de Calzado o Prendas',
          badge: 'Volumen de Artículos',
          color: 'border-purple-200 bg-purple-50/50 text-purple-900',
          description: 'Lanza una oferta 3x2 (Lleva 3 pares y paga 2) para aumentar la cantidad de artículos por solicitud.',
          presetData: {
            goalPreset: 'PRODUCT_BOOST',
            titulo: '👟 Promo 3x2: Limpia 3 Pares y Paga 2',
            descripcion: 'Válido para calzado deportivo y prendas seleccionadas.',
            tipoPromo: 'TRES_POR_DOS',
            canales: defaultChannels
          }
        }
      ];
    }

    // Default / Restaurant
    return [
      {
        id: 'opp_happy_hour',
        icon: Clock,
        title: '🕐 Llenar horas de baja demanda (Happy Hour)',
        badge: 'Baja Demanda (15:00 - 17:00)',
        color: 'border-amber-200 bg-amber-50/50 text-amber-900',
        description: 'Tus ventas bajan un 40% durante las tardes de lunes a jueves. Crea una promoción temporal entre 15:00 y 17:00 para impulsar la ocupación.',
        presetData: {
          goalPreset: 'HAPPY_HOUR',
          titulo: '🔥 Happy Hour Especial (15:00 - 17:00)',
          descripcion: 'Disfruta de 20% OFF durante las horas seleccionadas.',
          tipoPromo: 'PORCENTAJE',
          precioPromo: 20,
          diasValidos: ['Lunes', 'Martes', 'Miércoles', 'Jueves'],
          horaInicioValida: '15:00',
          horaFinValida: '17:00',
          canales: defaultChannels
        }
      },
      {
        id: 'opp_combo_bundle',
        icon: ShoppingBag,
        title: '🍔 Combo de Productos / Servicios Principales',
        badge: 'Venta Cruzada Impulsada',
        color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
        description: 'Aumenta el ticket promedio creando un Combo especial con varios productos o servicios incluidos.',
        presetData: {
          goalPreset: 'BUNDLE',
          titulo: '🎁 Combo Especial Dúo',
          descripcion: 'Producto Principal + Acompañante a precio especial.',
          tipoPromo: 'COMBO',
          precioPromo: 10.99,
          precioAnterior: 14.00,
          canales: defaultChannels
        }
      },
      {
        id: 'opp_new_customer',
        icon: Users,
        title: '🆕 Cupón de Bienvenida para Clientes Nuevos',
        badge: 'Captación de Clientes',
        color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900',
        description: 'Conduce a nuevos clientes a probar tu negocio regalando un descuento especial en su primer pedido u orden online con el código BIENVENIDO.',
        presetData: {
          goalPreset: 'NEW_CLIENT',
          titulo: '🎁 15% OFF en Tu Primer Pedido Online',
          descripcion: 'Ingresa el código BIENVENIDO al finalizar tu pedido.',
          tipoPromo: 'CUPON',
          cuponCodigo: 'BIENVENIDO',
          precioPromo: 15,
          tipoCliente: 'NEW',
          montoMinimo: 12.00,
          canales: defaultChannels
        }
      },
      {
        id: 'opp_slow_moving',
        icon: TrendingUp,
        title: '⚡ Impulsar Producto / Servicio de Baja Rotación',
        badge: 'Rotación de Inventario',
        color: 'border-purple-200 bg-purple-50/50 text-purple-900',
        description: 'Crea una promoción de 2x1 o Descuento Fijo en productos o servicios seleccionados para acelerar las ventas de la semana.',
        presetData: {
          goalPreset: 'PRODUCT_BOOST',
          titulo: '⚡ 2x1 en Selección Especial',
          descripcion: 'Pide 2 y paga solo 1 en la categoría seleccionada.',
          tipoPromo: 'DOS_POR_UNO',
          canales: defaultChannels
        }
      }
    ];
  };

  const opportunities = getOpportunitiesList();

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
