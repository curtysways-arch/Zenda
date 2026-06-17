// src/components/ui/CreatePlanModal.tsx
"use client";

import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePlanModal({ isOpen, onClose }: CreatePlanModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [planName, setPlanName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: planName, price: Number(price), description }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 1500);
      } else {
        console.error("Error creating plan", await res.text());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 italic">Crear Nuevo Plan</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700">
            <X size={24} />
          </button>
        </div>
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter italic">¡Plan creado!</h3>
            <p className="text-slate-500 font-medium">El nuevo plan está disponible en el listado.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-bold uppercase text-slate-700">Nombre del Plan</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold uppercase text-slate-700">Precio Mensual (USD)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold uppercase text-slate-700">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-900 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !planName || !price}
              className="w-full flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Crear Plan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
