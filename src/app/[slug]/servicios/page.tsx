import { getNegocioBySlug } from '@/lib/services';
import { cn } from '@/lib/utils';
import { getServicePrimaryImage } from '@/lib/serviceImageHelper';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Search, Star, Clock, ChevronRight, ChevronLeft, Heart, SlidersHorizontal, Droplet, Sparkles } from 'lucide-react';
import NextAppointmentBanner from '@/components/public/NextAppointmentBanner';
import ServicesListClient from './ServicesListClient';

export const dynamic = 'force-dynamic';

export default async function PublicServicesPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const query = typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q.toLowerCase() : '';
    const selectedCategory = typeof resolvedSearchParams?.category === 'string' ? resolvedSearchParams.category : 'Todos';
    const negocio = await getNegocioBySlug(slug);

    if (!negocio) {
        notFound();
    }

    const services = negocio.services || [];

    let nextAppointment: any = null;

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("customer_token")?.value;
        if (token) {
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "default_otp_secret_key_change_me");
            const verification = await jwtVerify(token, secret);
            const payload = verification.payload;
            if (payload.slug === slug) {
                const now = new Date();
                const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
                const telefono = payload.telefono as string;

                const localTelefono = telefono.replace(/^\+(\d{1,4})/, ''); 
                const digitsOnly = telefono.replace(/\D/g, ''); 
                const localNoZero = localTelefono.replace(/^0+/, '');

                const upcoming = await prisma.appointment.findMany({
                    where: {
                        negocioId: payload.negocioId as string,
                        cliente: {
                            OR: [
                                { telefono: telefono },
                                { telefono: localTelefono },
                                { telefono: digitsOnly },
                                { telefono: { endsWith: localNoZero } }
                            ]
                        },
                        fecha: { gte: todayUTC },
                        estado: { in: ['pending', 'confirmed'] }
                    },
                    orderBy: [
                        { fecha: 'asc' },
                        { horaInicio: 'asc' }
                    ],
                    take: 1,
                    include: { 
                        service: { select: { nombre: true } },
                        staff: { select: { name: true, avatar: true } },
                    }
                });

                if (upcoming.length > 0) {
                    const nowTime = new Date();
                    const validUpcoming = upcoming.filter((app: any) => {
                        const dateStr = app.fecha instanceof Date ? app.fecha.toISOString().split('T')[0] : String(app.fecha).split('T')[0];
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const [h, m] = app.horaFin ? app.horaFin.split(':').map(Number) : (app.horaInicio || '23:59').split(':').map(Number);
                        const endTime = new Date(year, month - 1, day, h, m, 0);
                        return endTime.getTime() > nowTime.getTime() - (30 * 60 * 1000);
                    });

                    if (validUpcoming.length > 0) {
                        nextAppointment = validUpcoming[0];
                    }
                }
            }
        }
    } catch (e) {}

    // Helper para categorizar servicios según su nombre
    const getServiceCategory = (nombre: string) => {
        const lower = nombre.toLowerCase();
        if (lower.includes('facial') || lower.includes('limpieza') || lower.includes('cutis') || lower.includes('exfoliación facial')) {
            return 'Faciales';
        }
        if (lower.includes('masaje') || lower.includes('relax') || lower.includes('piedras') || lower.includes('descontracturante')) {
            return 'Masajes';
        }
        if (lower.includes('corporal') || lower.includes('exfoliación corporal') || lower.includes('reductor') || lower.includes('manicura') || lower.includes('gel') || lower.includes('pedicura') || lower.includes('barba')) {
            return 'Corporales';
        }
        if (lower.includes('paquete') || lower.includes('combo') || lower.includes('pack') || lower.includes('duo') || lower.includes('promoción')) {
            return 'Paquetes';
        }
        return 'Corporales'; // fallback
    };

    // Helper para obtener beneficio según el nombre del servicio
    const getServiceBenefit = (nombre: string) => {
        const lower = nombre.toLowerCase();
        if (lower.includes('hidratación') || lower.includes('gel')) {
            return 'Ideal para piel seca y deshidratada';
        }
        if (lower.includes('facial') || lower.includes('limpieza') || lower.includes('cutis')) {
            return 'Piel más limpia, fresca y luminosa';
        }
        if (lower.includes('masaje') || lower.includes('relax') || lower.includes('piedras')) {
            return 'Reduce el estrés y mejora la circulación';
        }
        if (lower.includes('exfoliación') || lower.includes('corporal')) {
            return 'Estimula la renovación celular de la piel';
        }
        if (lower.includes('barba') || lower.includes('corte')) {
            return 'Corte y perfilado con acabado premium';
        }
        if (lower.includes('manicura') || lower.includes('uñas') || lower.includes('pedicura')) {
            return 'Cuidado e hidratación profunda para tus manos';
        }
        return 'Tratamiento diseñado para tu bienestar integral';
    };

    const getCategoryIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('facial')) return '💆‍♀️';
        if (lower.includes('masaje')) return '💆‍♂️';
        if (lower.includes('corporal')) return '✨';
        if (lower.includes('paquete')) return '🎁';
        return '🌸';
    };

    const filteredServices = services;

    const primaryColor = (negocio as any).colorPrimario || '#e21d6e';
    const secondaryColor = (negocio as any).colorSecundario || '#0f172a';
    const neutralColor = (negocio as any).colorNeutral || '#fff8f6';

    const rawTextColor = (negocio as any).colorTexto;
    const textColor = rawTextColor
        ? rawTextColor
        : (() => {
            const hex = neutralColor.replace('#', '');
            if (hex.length !== 6) return '#1e293b';
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return luma < 140 ? '#f8fafc' : '#1e293b';
        })();

    const uniqueCategories = ['Todos', 'Faciales', 'Masajes', 'Corporales', 'Paquetes'];

    return (
        <main className="min-h-screen font-sans pb-32 md:pb-12 relative overflow-x-hidden" style={{ backgroundColor: neutralColor }}>
            <ServicesListClient 
                services={services}
                slug={slug}
                primaryColor={primaryColor}
                textColor={textColor}
                neutralColor={neutralColor}
                nextAppointment={nextAppointment}
            />
        </main>
    );
}
