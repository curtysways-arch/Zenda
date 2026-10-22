'use client';

import React from 'react';
import ModuleUpsellGate from '@/components/admin/ModuleUpsellGate';
import { Tags, Sparkles, Gift, Calendar, ShieldCheck } from 'lucide-react';

interface PromotionsUpsellWrapperProps {
  children: React.ReactNode;
}

export default function PromotionsUpsellWrapper({ children }: PromotionsUpsellWrapperProps) {
  return (
    <ModuleUpsellGate
      capabilityKey="PROMOTIONS"
      addonCode="ADDON_PROMOTIONS"
      title="Centro de Promociones & Descuentos"
      subtitle="Crea ofertas por tiempo limitado, combos especiales, cupones y reglas de descuento automáticas para aumentar tus ventas y ticket promedio."
      badgeText="Módulo Plan Crecimiento ($19.99/mes)"
      icon={Tags}
      recommendedPlanName="Plan Crecimiento ($19.99/mes)"
      stats={[
        { value: '+28%', label: 'Ventas con Descuento' },
        { value: '2.5x', label: 'Ticket Promedio' },
        { value: '100%', label: 'Control de Márgenes' },
        { value: 'En Vivo', label: 'Aplicación en Caja & Web' }
      ]}
      benefits={[
        { title: 'Descuentos Fijos y Porcentuales', desc: 'Aplica reglas de descuento automáticas para servicios o productos individuales o por categorías.', icon: Sparkles },
        { title: 'Combos & Paquetes Promocionales', desc: 'Arma kits de productos o paquetes de servicios con precio especial para incentivar compras mayores.', icon: Gift },
        { title: 'Campañas Temporales & Fechas Especiales', desc: 'Programa fechas de inicio y expiración automática para promociones de Black Friday, San Valentín o Navidad.', icon: Calendar },
        { title: 'Integración en Catálogo y Citas', desc: 'Tus clientes verán los precios tachados y el porcentaje de ahorro directamente en tu página web y app.', icon: ShieldCheck }
      ]}
    >
      {children}
    </ModuleUpsellGate>
  );
}
