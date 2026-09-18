'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Scissors, FileSpreadsheet } from 'lucide-react';
import ServiceImportModal from '@/components/admin/ServiceImportModal';

export default function ServiciosImportarPage() {
    const router = useRouter();

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-6 px-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
                <Link
                    href="/admin/servicios"
                    className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition shadow-2xs"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                        Importador de Servicios
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">
                        Carga y actualiza tu menú de tratamientos y servicios masivamente desde Excel o CSV.
                    </p>
                </div>
            </div>

            {/* Modal activo por defecto en la página de ruta */}
            <ServiceImportModal
                isOpen={true}
                onClose={() => router.push('/admin/servicios')}
                onSuccess={() => router.push('/admin/servicios')}
            />
        </div>
    );
}
