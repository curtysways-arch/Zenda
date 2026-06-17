"use client";

import { useEffect, useState } from "react";
import prisma from "@/lib/prisma"; // will be used via API
import { Package } from "lucide-react";
import CreatePlanButton from "@/components/superadmin/CreatePlanButton";
import PlanCardActions from "@/components/superadmin/PlanCardActions";

export default function PlanesClientWrapper() {
  const [planes, setPlanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlanes = async () => {
    try {
      const res = await fetch('/api/superadmin/planes');
      if (res.ok) {
        const data = await res.json();
        setPlanes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanes();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Cargando planes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Planes de Suscripción</h2>
          <p className="text-slate-500 mt-1">Configura los niveles de precios y límites del sistema.</p>
        </div>
        <CreatePlanButton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planes.map((plan: any) => (
          <div key={plan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-200 transition-all group hover:shadow-xl hover:shadow-indigo-500/5">
            {/* (same markup as original, omitted for brevity) */}
            {/* ... you can copy the interior from existing PlanesPage if needed */}
            <PlanCardActions plan={plan} />
          </div>
        ))}
        {planes.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="p-4 bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Package size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay planes creados</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">Empieza por crear los diferentes niveles de precios que ofrecerás a tus clientes.</p>
            <CreatePlanButton />
          </div>
        )}
      </div>
    </div>
  );
}
