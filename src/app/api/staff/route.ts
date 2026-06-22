import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    let negocioId = searchParams.get('businessId') || searchParams.get('negocioId');

    if (!negocioId) {
        const session = await getServerSession(authOptions);
        negocioId = (session?.user as any)?.negocioId;
    }

    if (!negocioId) {
        return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    try {
        const rawStaff = await prisma.staff.findMany({
            where: { businessId: negocioId },
            include: {
                Service: true,
                imageMedia: true,
                Usuario: {
                    select: {
                        email: true
                    }
                }
            },
            orderBy: { name: 'asc' },
        });

        const staff = rawStaff.map(s => ({
            ...s,
            services: s.Service || [],
            usuario: s.Usuario || null
        }));

        return NextResponse.json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        return NextResponse.json({ error: 'Error fetching staff' }, { status: 500 });
    }
}

import { planLimitValidator } from '@/lib/services/planLimitValidator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, role, avatar, services, workingHours, businessId, email, password, imageMediaId } = body;

        const demoCheck = await checkDemoRestriction(businessId);
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        // VALIDAR LÍMITES DEL PLAN
        const planValidation = await planLimitValidator.canCreateStaff(businessId);
        if (!planValidation.allowed) {
            return NextResponse.json({ 
                error: planValidation.message,
                code: 'PLAN_LIMIT_REACHED' 
            }, { status: 403 });
        }

        // Manejar creación de usuario si se proporciona email
        let usuarioId = undefined;
        if (email) {
            const existingUser = await prisma.usuario.findUnique({ where: { email } });
            if (existingUser) {
                return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(password || '123456', 10);
            const newUser = await prisma.usuario.create({
                data: {
                    id: crypto.randomUUID(),
                    email,
                    password: hashedPassword,
                    nombre: name,
                    role: 'STAFF',
                    negocioId: businessId,
                    updatedAt: new Date()
                }
            });
            usuarioId = newUser.id;
        }

        const rawStaff = await prisma.staff.create({
            data: {
                id: crypto.randomUUID(),
                name,
                role,
                avatar,
                imageMediaId: imageMediaId || null,
                workingHours: workingHours || {},
                businessId,
                usuarioId,
                updatedAt: new Date(),
                Service: {
                    connect: services.map((id: string) => ({ id }))
                }
            },
            include: {
                Service: true,
                imageMedia: true
            }
        });

        const staff = {
            ...rawStaff,
            services: rawStaff.Service || []
        };

        return NextResponse.json(staff);
    } catch (error) {
        console.error('Error creating staff:', error);
        return NextResponse.json({ error: 'Error creating staff' }, { status: 500 });
    }
}
