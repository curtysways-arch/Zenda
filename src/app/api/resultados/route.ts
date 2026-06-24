import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const negocioId = (session.user as any).negocioId;

        const resultados = await prisma.resultado.findMany({
            where: {
                businessId: negocioId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                Service: {
                    select: {
                        id: true,
                        nombre: true
                    }
                },
                Staff: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        imageMedia: {
                            select: {
                                id: true,
                                url: true,
                                mimeType: true,
                                size: true,
                                fileKey: true,
                                provider: true
                            }
                        }
                    }
                }
            }
        });

        const mapped = resultados.map(r => ({
            ...r,
            gallery: typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []),
            service: r.Service ? { id: r.Service.id, nombre: r.Service.nombre } : null,
            staff: r.Staff ? { 
                id: r.Staff.id, 
                name: r.Staff.name, 
                avatar: r.Staff.avatar,
                imageMedia: r.Staff.imageMedia
            } : null
        }));

        return NextResponse.json(mapped);
    } catch (error) {
        console.error('Error fetching results:', error);
        return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const negocioId = (session.user as any).negocioId;
        const data = await req.json();

        const id = Math.random().toString(36).substring(2, 15);
        const title = data.title;
        const description = data.description || '';
        const type = data.type || 'BEFORE_AFTER';
        const beforeImage = data.beforeImage || null;
        const afterImage = data.afterImage || null;
        const gallery = data.gallery || [];
        const featured = !!data.featured;
        const published = !!data.published;
        const showInLanding = !!data.showInLanding;
        const clientName = data.clientName || '';
        const serviceId = data.serviceId || null;
        const staffId = data.staffId || null;
        const date = data.date ? new Date(data.date) : new Date();

        await prisma.resultado.create({
            data: {
                id,
                businessId: negocioId,
                serviceId,
                staffId,
                title,
                description,
                type,
                beforeImage,
                afterImage,
                gallery,
                featured,
                published,
                showInLanding,
                clientName,
                date,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error creating result:', error);
        return NextResponse.json({ error: 'Error al crear resultado' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        const negocioId = (session.user as any).negocioId;

        await prisma.resultado.deleteMany({
            where: {
                id,
                businessId: negocioId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting result:', error);
        return NextResponse.json({ error: 'Error al eliminar resultado' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // PROTECCIÓN MODO DEMO
        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const negocioId = (session.user as any).negocioId;
        const data = await req.json();
        const { id, ...updates } = data;

        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        const date = updates.date ? new Date(updates.date) : undefined;

        await prisma.resultado.updateMany({
            where: {
                id,
                businessId: negocioId
            },
            data: {
                serviceId: updates.serviceId || null,
                staffId: updates.staffId || null,
                title: updates.title,
                description: updates.description || '',
                type: updates.type || 'BEFORE_AFTER',
                beforeImage: updates.beforeImage || null,
                afterImage: updates.afterImage || null,
                gallery: updates.gallery || [],
                featured: !!updates.featured,
                published: !!updates.published,
                showInLanding: !!updates.showInLanding,
                clientName: updates.clientName || '',
                date,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating result:', error);
        return NextResponse.json({ error: 'Error al actualizar resultado' }, { status: 500 });
    }
}

