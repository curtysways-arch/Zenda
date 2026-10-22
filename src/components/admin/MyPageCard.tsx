import Link from 'next/link';
import { ExternalLink, Palette, Image as ImageIcon, Globe } from 'lucide-react';

/**
 * Tarjeta "Mi página" del inicio del panel: muestra el diseño activo de la
 * página pública y lleva directo a verla o a cambiar su diseño.
 */
export default function MyPageCard({
    slug,
    designName,
    primaryColor,
    compact = false,
}: {
    slug: string;
    designName: string;
    primaryColor: string;
    compact?: boolean;
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
                <div className="size-10 rounded-xl text-white flex items-center justify-center shrink-0" style={{ backgroundColor: primaryColor }}>
                    <Globe size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">Mi página</p>
                    <p className="text-xs text-slate-500 truncate">citiox.com/{slug}</p>
                    <p className="text-xs text-slate-600 mt-1.5">
                        Diseño actual: <span className="font-semibold text-slate-900">{designName}</span>
                    </p>
                </div>
            </div>
            <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} border-t border-slate-100 divide-x divide-slate-100`}>
                <a
                    href={`/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <ExternalLink size={14} /> Ver
                </a>
                <Link href="/admin/diseno" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold hover:bg-slate-50" style={{ color: primaryColor }}>
                    <Palette size={14} /> Diseño
                </Link>
                {!compact && (
                    <Link href="/admin/hero-destacados" className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <ImageIcon size={14} /> Portada
                    </Link>
                )}
            </div>
        </section>
    );
}
