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

        // Usar raw query para evitar problemas de caché del cliente Prisma
        const resultadosRaw: any[] = await prisma.$queryRawUnsafe(`
            SELECT r.*, s.nombre as service_nombre, st.name as staff_name, st.avatar as staff_avatar,
                   m.id as staff_media_id, m.url as staff_media_url, m.mimeType as staff_media_mime, m.size as staff_media_size, m.fileKey as staff_media_key, m.provider as staff_media_provider
            FROM Resultado r
            LEFT JOIN Cancha s ON r.serviceId = s.id
            LEFT JOIN Staff st ON r.staffId = st.id
            LEFT JOIN Media m ON st.imageMediaId = m.id
            WHERE r.businessId = '${negocioId}'
            ORDER BY r.createdAt DESC
        `);

        const resultados = resultadosRaw.map(r => ({
            ...r,
            gallery: typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []),
            service: r.serviceId ? { id: r.serviceId, nombre: r.service_nombre } : null,
            staff: r.staffId ? { 
                id: r.staffId, 
                name: r.staff_name, 
                avatar: r.staff_avatar,
                imageMedia: r.staff_media_id ? {
                    id: r.staff_media_id,
                    url: r.staff_media_url,
                    mimeType: r.staff_media_mime,
                    size: r.staff_media_size ? Number(r.staff_media_size) : 0,
                    fileKey: r.staff_media_key,
                    provider: r.staff_media_provider
                } : null
            } : null
        }));

        return NextResponse.json(resultados);
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
        const gallery = JSON.stringify(data.gallery || []);
        const featured = data.featured ? 1 : 0;
        const published = data.published ? 1 : 0;
        const showInLanding = data.showInLanding ? 1 : 0;
        const clientName = data.clientName || '';
        const serviceId = data.serviceId || null;
        const staffId = data.staffId || null;
        const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
        const now = new Date().toISOString();

        await prisma.$executeRawUnsafe(`
            INSERT INTO Resultado (id, businessId, serviceId, staffId, title, description, type, beforeImage, afterImage, gallery, featured, published, showInLanding, clientName, date, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, id, negocioId, serviceId, staffId, title, description, type, beforeImage, afterImage, gallery, featured, published, showInLanding, clientName, date, now, now);

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

        await prisma.$executeRawUnsafe(`
            DELETE FROM Resultado WHERE id = ? AND businessId = ?
        `, id, negocioId);

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

        const title = updates.title;
        const description = updates.description || '';
        const type = updates.type || 'BEFORE_AFTER';
        const beforeImage = updates.beforeImage || null;
        const afterImage = updates.afterImage || null;
        const gallery = JSON.stringify(updates.gallery || []);
        const featured = updates.featured ? 1 : 0;
        const published = updates.published ? 1 : 0;
        const showInLanding = updates.showInLanding ? 1 : 0;
        const clientName = updates.clientName || '';
        const serviceId = updates.serviceId || null;
        const staffId = updates.staffId || null;
        const date = updates.date ? new Date(updates.date).toISOString() : new Date().toISOString();
        const now = new Date().toISOString();

        await prisma.$executeRawUnsafe(`
            UPDATE Resultado SET 
                serviceId = ?, 
                staffId = ?, 
                title = ?, 
                description = ?, 
                type = ?, 
                beforeImage = ?, 
                afterImage = ?, 
                gallery = ?, 
                featured = ?, 
                published = ?, 
                showInLanding = ?, 
                clientName = ?, 
                date = ?, 
                updatedAt = ?
            WHERE id = ? AND businessId = ?
        `, serviceId, staffId, title, description, type, beforeImage, afterImage, gallery, featured, published, showInLanding, clientName, date, now, id, negocioId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating result:', error);
        return NextResponse.json({ error: 'Error al actualizar resultado' }, { status: 500 });
    }
}
