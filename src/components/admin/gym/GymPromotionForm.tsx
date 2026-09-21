'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Percent, DollarSign, Dumbbell, GraduationCap, Gift, Calculator } from 'lucide-react';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
}

interface GymPromotionFormProps {
  plans: MembershipPlan[];
  initialData?: Partial<GymPromoData>;
  onDescriptionChange: (fullDescription: string, meta: GymPromoMeta) => void;
}

export interface GymPromoMeta {
  membershipPlanId: string | null;
  benefitType: string;
  discountValue: number;
  finalPrice: number | null;
}

const BENEFIT_TYPES = [
  { value: 'DESCUENTO_PORCENTAJE', label: 'Descuento %', icon: Percent, example: 'Ej. 20% de descuento' },
  { value: 'DESCUENTO_FIJO', label: 'Descuento fijo', icon: DollarSign, example: 'Ej. $10 de descuento' },
  { value: 'PRECIO_ESPECIAL', label: 'Precio especial', icon: Tag, example: 'Precio directo para el plan' },
  { value: 'INSCRIPCION_GRATIS', label: 'Inscripción gratis', icon: GraduationCap, example: '0 en inscripción' },
  { value: 'MATRICULA_GRATIS', label: 'Matrícula gratis', icon: Gift, example: 'Matrícula incluida' },
];

interface GymPromoData {
  membershipPlanId: string;
  benefitType: string;
  discountValue: number;
  userDescription: string;
}

export default function GymPromotionForm({
  plans,
  initialData,
  onDescriptionChange
}: GymPromotionFormProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(initialData?.membershipPlanId || '');
  const [benefitType, setBenefitType] = useState(initialData?.benefitType || 'DESCUENTO_PORCENTAJE');
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue || 0);
  const [userDescription, setUserDescription] = useState(initialData?.userDescription || '');

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || null;

  const calcFinalPrice = (): number | null => {
    if (!selectedPlan) return null;
    const base = selectedPlan.price;
    switch (benefitType) {
      case 'DESCUENTO_PORCENTAJE':
        return Math.max(0, base - (base * discountValue / 100));
      case 'DESCUENTO_FIJO':
        return Math.max(0, base - discountValue);
      case 'PRECIO_ESPECIAL':
        return discountValue;
      case 'INSCRIPCION_GRATIS':
      case 'MATRICULA_GRATIS':
        return base; // El precio del plan no cambia, el beneficio es el concepto
      default:
        return base;
    }
  };

  const showDiscountInput = ['DESCUENTO_PORCENTAJE', 'DESCUENTO_FIJO', 'PRECIO_ESPECIAL'].includes(benefitType);
  const finalPrice = calcFinalPrice();

  // Emitir cambios al padre
  useEffect(() => {
    const meta: GymPromoMeta = {
      membershipPlanId: selectedPlanId || null,
      benefitType,
      discountValue,
      finalPrice
    };

    // Generar descripción serializada con patrón CITIOX_META
    const metaComment = `<!-- CITIOX_META:${JSON.stringify(meta)}-->`;
    const fullDescription = userDescription + '\n' + metaComment;
    onDescriptionChange(fullDescription, meta);
  }, [selectedPlanId, benefitType, discountValue, userDescription, finalPrice]);

  const discountLabel = benefitType === 'DESCUENTO_PORCENTAJE' ? '% de descuento'
    : benefitType === 'PRECIO_ESPECIAL' ? 'Precio especial ($)'
    : 'Descuento fijo ($)';

  return (
    <div className="space-y-5 p-5 bg-orange-50 border border-orange-100 rounded-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Dumbbell size={18} className="text-orange-500" />
        <h3 className="font-bold text-gray-800 text-sm">Configuración de Promoción — Gimnasio</h3>
      </div>

      {/* Plan Vinculado */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Plan de Membresía vinculado
        </label>
        <select
          value={selectedPlanId}
          onChange={e => setSelectedPlanId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange-400 focus:outline-none text-sm"
        >
          <option value="">— Sin plan específico (aplica a todos) —</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.currency} {p.price} / {p.durationDays === 30 ? 'mes' : p.durationDays === 365 ? 'año' : `${p.durationDays}d`}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo de Beneficio */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
          Tipo de Beneficio
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BENEFIT_TYPES.map(bt => {
            const Icon = bt.icon;
            return (
              <button
                key={bt.value}
                type="button"
                onClick={() => setBenefitType(bt.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                  benefitType === bt.value
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{bt.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {BENEFIT_TYPES.find(b => b.value === benefitType)?.example}
        </p>
      </div>

      {/* Valor del descuento */}
      {showDiscountInput && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            {discountLabel}
          </label>
          <input
            type="number"
            min={0}
            step={benefitType === 'DESCUENTO_PORCENTAJE' ? 1 : 0.01}
            max={benefitType === 'DESCUENTO_PORCENTAJE' ? 100 : undefined}
            value={discountValue}
            onChange={e => setDiscountValue(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange-400 focus:outline-none text-sm"
          />
        </div>
      )}

      {/* Descripción visible */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
          Descripción visible en la landing
        </label>
        <textarea
          value={userDescription}
          onChange={e => setUserDescription(e.target.value)}
          placeholder="Ej. Aprovecha este precio especial solo por tiempo limitado..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-orange-400 focus:outline-none text-sm resize-none"
        />
      </div>

      {/* Preview de precio */}
      {selectedPlan && finalPrice !== null && (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-orange-100">
          <Calculator size={18} className="text-orange-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Vista previa del precio</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-gray-900">
                {selectedPlan.currency} {finalPrice.toFixed(2)}
              </span>
              {finalPrice < selectedPlan.price && (
                <span className="text-sm text-gray-400 line-through">
                  {selectedPlan.currency} {selectedPlan.price.toFixed(2)}
                </span>
              )}
              <span className="text-xs text-gray-500">
                / {selectedPlan.durationDays === 30 ? 'mes' : selectedPlan.durationDays === 365 ? 'año' : `${selectedPlan.durationDays}d`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
