// src/components/restaurant/RestaurantTheme.ts
// Configuración declarativa de paletas y estilos para el Restaurant Blueprint

export const RestaurantTheme = {
  id: 'RestaurantTheme',
  name: 'Gastronomic Warm & Dark',
  primaryColor: '#ea580c',   // Warm Amber / Burnt Orange
  secondaryColor: '#7c2d12', // Warm Terracotta / Chocolate
  accentColor: '#10b981',    // Emerald Green (Ok / Ready)
  neutralDark: '#020617',    // Deep Midnight
  neutralCard: '#0f172a',    // Dark Slate Card
  fontHeading: 'Inter, sans-serif',
  fontBody: 'Inter, sans-serif',
  styles: {
    badge: 'px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
    buttonPrimary: 'bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg transition-all',
    card: 'bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl'
  }
};
