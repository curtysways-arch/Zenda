"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import PlanModal from "./PlanModal";

export default function CreatePlanButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
                <Plus size={20} />
                Crear Nuevo Plan
            </button>

            <PlanModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
