import prisma from '@/lib/prisma';
import PlantillasManagerClient from '@/components/superadmin/PlantillasManagerClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Catálogo de Plantillas · Citiox Superadmin',
    description: 'Gestiona las plantillas de Landing Pages y Paneles de Administración por tipo de negocio',
};

export default async function PlantillasPage() {
    // 1. Cargar tipos de negocio activos
    const businessTypesRaw = await prisma.businessType.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' }
    });

    // 2. Cargar plantillas de Landing
    const landingTemplatesRaw = await prisma.businessLandingTemplate.findMany({
        include: {
            businessType: {
                select: { id: true, name: true, slug: true, color: true, icon: true }
            }
        },
        orderBy: [
            { isDefault: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'desc' }
        ]
    });

    // 3. Cargar plantillas de Admin
    const adminTemplatesRaw = await prisma.businessAdminTemplate.findMany({
        include: {
            businessType: {
                select: { id: true, name: true, slug: true, color: true, icon: true }
            }
        },
        orderBy: [
            { isDefault: 'desc' },
            { sortOrder: 'asc' },
            { createdAt: 'desc' }
        ]
    });

    // Serializar fechas a strings para SSR seguro en Next.js
    const businessTypes = businessTypesRaw.map(bt => ({
        id: bt.id,
        name: bt.name,
        slug: bt.slug,
        icon: bt.icon,
        color: bt.color
    }));

    const landingTemplates = landingTemplatesRaw.map(lt => ({
        id: lt.id,
        businessTypeId: lt.businessTypeId,
        name: lt.name,
        slug: lt.slug,
        description: lt.description,
        component: lt.component,
        previewImage: lt.previewImage,
        version: lt.version,
        active: lt.active,
        isDefault: lt.isDefault,
        sortOrder: lt.sortOrder,
        businessType: {
            id: lt.businessType.id,
            name: lt.businessType.name,
            slug: lt.businessType.slug,
            color: lt.businessType.color,
            icon: lt.businessType.icon
        }
    }));

    const adminTemplates = adminTemplatesRaw.map(at => ({
        id: at.id,
        businessTypeId: at.businessTypeId,
        name: at.name,
        component: at.component,
        layoutType: at.layoutType,
        previewImage: at.previewImage,
        version: at.version,
        active: at.active,
        isDefault: at.isDefault,
        sortOrder: at.sortOrder,
        businessType: {
            id: at.businessType.id,
            name: at.businessType.name,
            slug: at.businessType.slug,
            color: at.businessType.color,
            icon: at.businessType.icon
        }
    }));

    return (
        <PlantillasManagerClient
            initialBusinessTypes={businessTypes}
            initialLandingTemplates={landingTemplates}
            initialAdminTemplates={adminTemplates}
        />
    );
}
