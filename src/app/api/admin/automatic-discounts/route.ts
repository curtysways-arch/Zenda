import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { planLimitValidator } from '@/lib/services/planLimitValidator';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;
        const { searchParams } = new URL(req.url);
        const serviceId = searchParams.get('serviceId');

        const p = prisma as any;

        // Verificar si el plan permite esta función
        const planStatus = await planLimitValidator.canAccessAutomaticDiscounts(negocioId);

        if (serviceId) {
            const serviceIdVal = serviceId === 'null' || serviceId === '' ? null : serviceId;
            const discount = await p.automaticDiscount.findFirst({
                where: {
                    businessId: negocioId,
                    serviceId: serviceIdVal
                }
            });
            return NextResponse.json({
                discount: discount || {
                    enabled: false,
                    discountPercentage: 0,
                    daysOfWeek: "",
                    startTime: "00:00",
                    endTime: "23:59",
                    hoursBefore: 0,
                    serviceId: serviceIdVal
                },
                planEnabled: planStatus.allowed,
                planMessage: planStatus.message
            });
        }

        const discounts = await p.automaticDiscount.findMany({
            where: { businessId: negocioId }
        });

        return NextResponse.json({
            discounts,
            planEnabled: planStatus.allowed,
            planMessage: planStatus.message
        });
    } catch (error: any) {
        console.error('Error fetching automatic discounts:', error);
        return NextResponse.json({ error: 'Error al obtener descuentos automáticos: ' + error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        // Validar límite del plan
        const validation = await planLimitValidator.canAccessAutomaticDiscounts(negocioId);
        if (!validation.allowed) {
            return NextResponse.json({ error: validation.message }, { status: 403 });
        }

        const body = await req.json();

        const { serviceId, enabled, discountPercentage, daysOfWeek, startTime, endTime, hoursBefore } = body;
        const serviceIdVal = serviceId === 'null' || serviceId === '' ? null : serviceId;

        const p = prisma as any;

        // Búsqueda manual para evitar problemas con findUnique y null en SQLite/Prisma
        const existing = await p.automaticDiscount.findFirst({
            where: {
                businessId: negocioId,
                serviceId: serviceIdVal
            }
        });

        const data = {
            enabled: Boolean(enabled),
            discountPercentage: Number(discountPercentage),
            daysOfWeek: daysOfWeek || "",
            startTime: startTime || "00:00",
            endTime: endTime || "23:59",
            hoursBefore: Number(hoursBefore),
            updatedAt: new Date()
        };

        let result;
        if (existing) {
            result = await p.automaticDiscount.update({
                where: { id: existing.id },
                data
            });
        } else {
            result = await p.automaticDiscount.create({
                data: {
                    id: uuidv4(),
                    ...data,
                    businessId: negocioId,
                    serviceId: serviceIdVal
                }
            });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error saving automatic discount:', error);
        return NextResponse.json({ error: 'Error al guardar descuento automático: ' + error.message }, { status: 500 });
    }
}
