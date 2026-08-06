"use client";

import React from 'react';
import Link from 'next/link';
import { ChefHat, Grid, Users, Package, Truck, UtensilsCrossed, Tags, Settings, Contact, LayoutDashboard } from 'lucide-react';

interface SidebarKitchenProps {
  slug: string;
  activePath?: string;
}

export default function SidebarKitchen({ slug, activePath = '/admin' }: SidebarKitchenProps) {
  const navItems = [
    { name: 'Dashboard', href: `/admin`, icon: LayoutDashboard },
    { name: 'Cocina (KDS)', href: `/admin/cocina`, icon: ChefHat },
    { name: 'Mesas & QR', href: `/admin/mesas`, icon: Grid },
    { name: 'Meseros', href: `/admin/meseros`, icon: Users },
    { name: 'Pedidos', href: `/admin/pedidos`, icon: Package },
    { name: 'Logística', href: `/admin/logistica`, icon: Truck },
    { name: 'Menú & Productos', href: `/admin/productos`, icon: UtensilsCrossed },
    { name: 'Categorías', href: `/admin/categorias`, icon: Tags },
    { name: 'Clientes', href: `/admin/clientes`, icon: Contact },
    { name: 'Configuración', href: `/admin/config`, icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-600/30">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-white text-sm tracking-tight leading-tight">Restaurant Studio</h2>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Business Blueprint</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 text-center">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Citiox Platform v2.0</span>
      </div>
    </aside>
  );
}
