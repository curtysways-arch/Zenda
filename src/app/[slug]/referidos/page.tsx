'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MisRecompensasPageRedirect() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();

    useEffect(() => {
        if (slug) {
            router.replace(`/${slug}/misiones`);
        }
    }, [slug, router]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-pink-600" size={32} />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                    Redireccionando a Premios & Misiones...
                </p>
            </div>
        </div>
    );
}
