// src/core/experience/ExperienceEngine.tsx
// Renderizador declarativo universal de la capa de apariencia (Landing / Admin)

import React from 'react';
import { BusinessRuntime } from '../runtime/types';
import { ExperienceRegistry } from './ExperienceRegistry';
import ShoeCareLanding from '@/modules/shoe-care/components/ShoeCareLanding';
import CanchaPublicLanding from '@/modules/sports-courts/components/CanchaPublicLanding';

// Registrar componentes de landing por defecto al importar la aplicación
ExperienceRegistry.registerLanding('ShoeCareLanding', ShoeCareLanding);
ExperienceRegistry.registerLanding('CanchaPublicLanding', CanchaPublicLanding);
ExperienceRegistry.registerLanding('DefaultLanding', ShoeCareLanding);

interface ExperienceEngineProps {
  runtime: BusinessRuntime;
  negocio: any;
  reviews?: any[];
  paginasPersonalizadas?: any[];
  target?: 'LANDING' | 'ADMIN' | 'DASHBOARD';
}

export default function ExperienceEngine({
  runtime,
  negocio,
  reviews = [],
  paginasPersonalizadas = [],
  target = 'LANDING'
}: ExperienceEngineProps) {
  if (target === 'LANDING') {
    const landingComponentId = runtime.experience?.landing?.component || 'DefaultLanding';
    
    // Si la landing registrada es ShoeCareLanding
    if (landingComponentId === 'ShoeCareLanding') {
      return (
        <ShoeCareLanding 
          negocio={negocio} 
          reviews={reviews} 
          paginasPersonalizadas={paginasPersonalizadas} 
        />
      );
    }

    // Si es CanchaPublicLanding
    if (landingComponentId === 'CanchaPublicLanding') {
      return (
        <CanchaPublicLanding 
          negocio={negocio} 
          canchas={negocio?.services || []} 
        />
      );
    }

    // Resolver desde el ExperienceRegistry
    const RegisteredComponent = ExperienceRegistry.getLanding(landingComponentId);
    if (RegisteredComponent) {
      return <RegisteredComponent negocio={negocio} reviews={reviews} paginasPersonalizadas={paginasPersonalizadas} />;
    }

    // Default Fallback
    return <ShoeCareLanding negocio={negocio} reviews={reviews} paginasPersonalizadas={paginasPersonalizadas} />;
  }

  return <div>[Admin Experience Engine Component Placeholder]</div>;
}
