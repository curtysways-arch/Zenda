import React from 'react';
import { BusinessRuntime } from '../runtime/types';
import { ExperienceRegistry } from './ExperienceRegistry';
import ShoeCareLanding from '@/modules/shoe-care/components/ShoeCareLanding';
import CanchaPublicLanding from '@/modules/sports-courts/components/CanchaPublicLanding';
import RestaurantLanding from '@/components/restaurant/RestaurantLanding';
import KitchenDashboard from '@/components/restaurant/KitchenDashboard';
import SidebarKitchen from '@/components/restaurant/SidebarKitchen';
import KitchenWorkflow from '@/components/restaurant/KitchenWorkflow';
import KitchenCards from '@/components/restaurant/KitchenCards';
import KitchenForms from '@/components/restaurant/KitchenForms';
import KitchenTables from '@/components/restaurant/KitchenTables';
import { RestaurantTheme } from '@/components/restaurant/RestaurantTheme';

// Registrar componentes de experiencia por defecto
ExperienceRegistry.registerLanding('ShoeCareLanding', ShoeCareLanding);
ExperienceRegistry.registerLanding('CanchaPublicLanding', CanchaPublicLanding);
ExperienceRegistry.registerLanding('RestaurantLanding', RestaurantLanding);
ExperienceRegistry.registerLanding('DefaultLanding', ShoeCareLanding);

ExperienceRegistry.registerDashboard('KitchenDashboard', KitchenDashboard);
ExperienceRegistry.registerAdmin('SidebarKitchen', SidebarKitchen);
ExperienceRegistry.registerWorkflow('KitchenWorkflow', KitchenWorkflow);
ExperienceRegistry.registerCards('KitchenCards', KitchenCards);
ExperienceRegistry.registerForms('KitchenForms', KitchenForms);
ExperienceRegistry.registerTables('KitchenTables', KitchenTables);
ExperienceRegistry.registerTheme('RestaurantTheme', RestaurantTheme);

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
    const RegisteredComponent = ExperienceRegistry.getLanding(landingComponentId);

    if (RegisteredComponent) {
      return (
        <RegisteredComponent
          negocio={negocio}
          reviews={reviews}
          paginasPersonalizadas={paginasPersonalizadas}
          canchas={negocio?.services || []}
        />
      );
    }

    // Default Fallback
    return <ShoeCareLanding negocio={negocio} reviews={reviews} paginasPersonalizadas={paginasPersonalizadas} />;
  }

  if (target === 'DASHBOARD') {
    const dashboardId = runtime.experience?.dashboard?.layoutType || 'CARDS';
    const DashboardComp = ExperienceRegistry.getDashboard(dashboardId);
    if (DashboardComp) {
      return <DashboardComp negocioIdOrSlug={negocio?.id || negocio?.slug} slug={negocio?.slug} />;
    }
  }

  return <div>[Admin Experience Engine Component Placeholder]</div>;
}
