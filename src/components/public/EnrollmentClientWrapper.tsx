'use client';

import { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import EnrollmentModal from './EnrollmentModal';

interface EnrollmentClientWrapperProps {
    course: any;
    businessSlug: string;
    isFull: boolean;
    primaryColor?: string;
}

export default function EnrollmentClientWrapper({ course, businessSlug, isFull, primaryColor = '#1dc95c' }: EnrollmentClientWrapperProps) {
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsIdModalOpen(true)}
                disabled={isFull}
                className="w-full text-white p-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor, boxShadow: `0 20px 25px -5px ${primaryColor}33` }}
            >
                {isFull ? 'Cupos Agotados' : 'Separar Mi Cupo Ahora'}
                <ArrowRight size={18} />
            </button>

            {isIdModalOpen && (
                <EnrollmentModal
                    isOpen={isIdModalOpen}
                    onClose={() => setIsIdModalOpen(false)}
                    course={course}
                    businessSlug={businessSlug}
                    primaryColor={primaryColor}
                />
            )}
        </div>
    );
}
