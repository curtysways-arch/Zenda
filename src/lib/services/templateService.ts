import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ─── Catálogo completo de cupones y premios por sector ───────────────────────
export const defaultCatalogBySector: Record<string, {
    coupons: Array<{ codigo: string; tipo: 'PORCENTAJE' | 'FIJO'; valor: number; descripcion: string }>;
    rewards: Array<{ nombre: string; descripcion: string; costoPuntos: number; tipo: 'CUPON' | 'SERVICIO_GRATIS' | 'PRODUCTO' | 'REGALO' | 'PERSONALIZADO'; deliveryType: 'AUTOMATICO' | 'MANUAL'; valor?: string }>;
}> = {
    BARBERIA: {
        coupons: [
            { codigo: 'CORTE20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en tu próximo corte de cabello.' },
            { codigo: 'BARBA15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en delineado y afeitado de barba premium.' },
            { codigo: 'COMBO10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en combo corte + barba.' },
            { codigo: 'PRIMERA_VEZ', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento para nuevos clientes en su primera visita.' },
            { codigo: 'FIEL5K', tipo: 'FIJO', valor: 5, descripcion: '$5 de descuento directo en cualquier servicio.' },
        ],
        rewards: [
            { nombre: 'Corte de Cabello Gratis', descripcion: 'Canjea 400 puntos y obtén un servicio de corte de cabello clásico totalmente gratuito.', costoPuntos: 400, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Afeitado Clásico Gratis', descripcion: 'Canjea 350 puntos por un afeitado con navaja y toalla caliente.', costoPuntos: 350, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Aceite Hidratante para Barba', descripcion: 'Canjea 150 puntos por un aceite hidratante de la barbería.', costoPuntos: 150, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Combo Corte + Barba Gratis', descripcion: 'Canjea 700 puntos por el combo completo de corte y arreglo de barba.', costoPuntos: 700, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $10 en Próximo Servicio', descripcion: 'Canjea 200 puntos y recibe $10 de descuento en tu próxima visita.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
        ]
    },
    SPA: {
        coupons: [
            { codigo: 'RELAX10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en masajes relajantes y terapias faciales.' },
            { codigo: 'SPA_DAY15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en el circuito de spa hídrico completo.' },
            { codigo: 'FACIAL20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en tratamientos faciales anti-edad.' },
            { codigo: 'PRIMERA_SPA', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento en tu primera sesión en el spa.' },
            { codigo: 'SPA_FIJO', tipo: 'FIJO', valor: 10, descripcion: '$10 de descuento en cualquier servicio de spa.' },
        ],
        rewards: [
            { nombre: 'Masaje Facial Express', descripcion: 'Canjea 300 puntos por una sesión express de masaje e hidratación facial.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Sesión de Spa Completa (60 min)', descripcion: 'Canjea 600 puntos por un circuito corporal hídrico completo gratis.', costoPuntos: 600, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Masaje Relajante (30 min)', descripcion: 'Canjea 250 puntos por media hora de masaje relajante de cuerpo completo.', costoPuntos: 250, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Kit de Aromaterapia', descripcion: 'Canjea 180 puntos por un kit de aromaterapia con aceites esenciales.', costoPuntos: 180, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $15 en Próxima Sesión', descripcion: 'Canjea 200 puntos y recibe $15 de descuento en tu próxima sesión.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
        ]
    },
    BELLEZA: {
        coupons: [
            { codigo: 'NAILS15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en servicio completo de uñas esculpidas o gel.' },
            { codigo: 'LOOK20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en diseño de cejas o extensiones de pestañas.' },
            { codigo: 'BRILLO10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en tratamientos capilares y keratina.' },
            { codigo: 'PRIMERA_VISITA', tipo: 'PORCENTAJE', valor: 25, descripcion: '25% de descuento para nuevas clientas en su primera visita.' },
            { codigo: 'BELLEZA_FIJO', tipo: 'FIJO', valor: 8, descripcion: '$8 de descuento directo en cualquier servicio de belleza.' },
        ],
        rewards: [
            { nombre: 'Diseño de Cejas Gratis', descripcion: 'Canjea 250 puntos y obtén un perfilado y diseño de cejas gratuito.', costoPuntos: 250, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Manicura Express Gratis', descripcion: 'Canjea 350 puntos por un servicio express de esmaltado y manicura.', costoPuntos: 350, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Extensiones de Pestañas Gratis', descripcion: 'Canjea 500 puntos por la aplicación de extensiones de pestañas clásicas.', costoPuntos: 500, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Tratamiento Capilar Hidratante', descripcion: 'Canjea 300 puntos por un tratamiento de hidratación profunda para el cabello.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Kit de Cuidado Personal', descripcion: 'Canjea 200 puntos por un kit de productos de cuidado personal de la marca.', costoPuntos: 200, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
        ]
    },
    GIMNASIO: {
        coupons: [
            { codigo: 'PRO_FIT10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en compra de proteínas o suplementos.' },
            { codigo: 'MEMBRESIA15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en renovación de membresía mensual.' },
            { codigo: 'CLASE_GRATIS', tipo: 'PORCENTAJE', valor: 100, descripcion: 'Clase grupal gratuita para probar nuestras actividades.' },
            { codigo: 'AMIGO_FIT', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento al traer a un amigo que se inscriba.' },
            { codigo: 'FIJO_GYM', tipo: 'FIJO', valor: 10, descripcion: '$10 de descuento en cualquier plan de entrenamiento.' },
        ],
        rewards: [
            { nombre: 'Pase Diario para un Amigo', descripcion: 'Canjea 150 puntos por un pase de un día libre para invitar a entrenar a quien quieras.', costoPuntos: 150, tipo: 'REGALO', deliveryType: 'AUTOMATICO' },
            { nombre: 'Shaker Deportivo', descripcion: 'Canjea 200 puntos por un mezclador deportivo en recepción.', costoPuntos: 200, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Sesión de Evaluación Física Gratis', descripcion: 'Canjea 300 puntos por una evaluación física completa con un entrenador.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Mes de Membresía Gratis', descripcion: 'Canjea 1000 puntos y obtén un mes de membresía completamente gratuito.', costoPuntos: 1000, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Pack de Proteína', descripcion: 'Canjea 400 puntos por un pack de proteína en polvo de la tienda del gimnasio.', costoPuntos: 400, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
        ]
    },
    CLINICA: {
        coupons: [
            { codigo: 'CONSULTA10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento en consulta médica o de especialidad.' },
            { codigo: 'EXAMEN15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento en exámenes de laboratorio o imagen.' },
            { codigo: 'PRIMERA_CITA', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en tu primera consulta médica.' },
            { codigo: 'PREVENTION', tipo: 'PORCENTAJE', valor: 12, descripcion: '12% de descuento en chequeos preventivos y medicina general.' },
            { codigo: 'SALUD_FIJO', tipo: 'FIJO', valor: 10, descripcion: '$10 de descuento en cualquier servicio de la clínica.' },
        ],
        rewards: [
            { nombre: 'Consulta de Seguimiento Gratis', descripcion: 'Canjea 400 puntos por una consulta de seguimiento médico sin costo.', costoPuntos: 400, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Examen de Glucosa Gratis', descripcion: 'Canjea 200 puntos por un examen rápido de glucosa en sangre.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Kit de Salud Preventiva', descripcion: 'Canjea 300 puntos por un kit de insumos de salud preventiva.', costoPuntos: 300, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $20 en Próxima Consulta', descripcion: 'Canjea 250 puntos y recibe $20 de descuento en tu próxima visita médica.', costoPuntos: 250, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Limpieza Dental Básica Gratis', descripcion: 'Canjea 500 puntos por una limpieza dental básica en nuestra clínica.', costoPuntos: 500, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
        ]
    },
    GENERAL: {
        coupons: [
            { codigo: 'BIENVENIDA10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento de bienvenida en tu primera compra.' },
            { codigo: 'FIEL15', tipo: 'PORCENTAJE', valor: 15, descripcion: '15% de descuento exclusivo para clientes frecuentes.' },
            { codigo: 'ESPECIAL20', tipo: 'PORCENTAJE', valor: 20, descripcion: '20% de descuento en servicios o productos seleccionados.' },
            { codigo: 'REFERIDO10', tipo: 'PORCENTAJE', valor: 10, descripcion: '10% de descuento por referir a un amigo.' },
            { codigo: 'GENERAL_FIJO', tipo: 'FIJO', valor: 5, descripcion: '$5 de descuento directo en cualquier servicio.' },
        ],
        rewards: [
            { nombre: 'Servicio Express Gratis', descripcion: 'Canjea 300 puntos por un servicio complementario express de tu elección.', costoPuntos: 300, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Descuento $10 en Próxima Visita', descripcion: 'Canjea 200 puntos y recibe $10 de descuento en tu próxima visita.', costoPuntos: 200, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Regalo Sorpresa', descripcion: 'Canjea 250 puntos y llévate un regalo sorpresa de la casa.', costoPuntos: 250, tipo: 'REGALO', deliveryType: 'MANUAL' },
            { nombre: 'Membresía VIP por 1 Mes', descripcion: 'Canjea 500 puntos y disfruta de un mes con beneficios VIP exclusivos.', costoPuntos: 500, tipo: 'PERSONALIZADO', deliveryType: 'MANUAL' },
            { nombre: 'Producto de la Marca Gratis', descripcion: 'Canjea 180 puntos por un producto de nuestra marca como agradecimiento.', costoPuntos: 180, tipo: 'PRODUCTO', deliveryType: 'MANUAL' },
        ]
    }
};

// ─── Función helper: crear cupones y premios del catálogo para un negocio ─────
export async function createDefaultCatalogForBusiness(
    negocioId: string,
    category: string,
    client: any,
    customCoupons?: any[] | null,
    customRewards?: any[] | null
): Promise<void> {
    const couponsList = (customCoupons && customCoupons.length > 0) 
        ? customCoupons 
        : (defaultCatalogBySector[category] || defaultCatalogBySector.GENERAL).coupons;

    const rewardsList = (customRewards && customRewards.length > 0) 
        ? customRewards 
        : (defaultCatalogBySector[category] || defaultCatalogBySector.GENERAL).rewards;

    // Crear cupones master si no existen
    for (const cp of couponsList) {
        const existingCoupon = await client.coupon.findFirst({
            where: { negocioId, codigo: cp.codigo }
        });
        if (!existingCoupon) {
            await client.coupon.create({
                data: {
                    id: uuidv4(),
                    negocioId,
                    codigo: cp.codigo,
                    tipo: cp.tipo,
                    valor: cp.valor,
                    descripcion: cp.descripcion,
                    usosActuales: 0,
                    activa: true
                }
            });
        }
    }

    // Crear premios por puntos (LoyaltyReward) si no existen
    for (const rw of rewardsList) {
        const existingReward = await client.loyaltyReward.findFirst({
            where: { negocioId, nombre: rw.nombre }
        });
        if (!existingReward) {
            await client.loyaltyReward.create({
                data: {
                    id: uuidv4(),
                    negocioId,
                    nombre: rw.nombre,
                    descripcion: rw.descripcion,
                    costoPuntos: rw.costoPuntos,
                    tipo: rw.tipo,
                    deliveryType: rw.deliveryType,
                    activa: true
                }
            });
        }
    }
}

export class TemplateService {
    /**
     * Mapea el tipo de negocio seleccionado en el asistente a una categoría de plantilla.
     */
    static mapSectorToCategory(tipoNegocio: string): string {
        const sector = (tipoNegocio || '').toLowerCase().trim();
        if (sector.includes('barber')) return 'BARBERIA';
        if (sector.includes('spa') || sector.includes('masaje')) return 'SPA';
        if (sector.includes('estét') || sector.includes('belleza') || sector.includes('estet')) return 'BELLEZA';
        if (sector.includes('clínic') || sector.includes('clinic') || sector.includes('salud')) return 'CLINICA';
        if (sector.includes('gimnasio') || sector.includes('gym') || sector.includes('entrena') || sector.includes('fit') || sector.includes('academia')) return 'GIMNASIO';
        return 'GENERAL';
    }

    /**
     * Instala automáticamente la plantilla sugerida/predeterminada para el tipo de negocio de forma transaccional.
     */
    static async installDefaultTemplateForBusiness(negocioId: string, tipoNegocio: string, tx?: Prisma.TransactionClient): Promise<boolean> {
        const client = tx || prisma;
        const category = this.mapSectorToCategory(tipoNegocio);

        console.log(`[TemplateService] Buscando plantilla predeterminada para el sector "${tipoNegocio}" (Categoría mapeada: "${category}")...`);

        // 1. Buscar la plantilla predeterminada para esa categoría o la predeterminada global
        let template = await client.questTemplate.findFirst({
            where: {
                esPredeterminada: true,
                categorias: {
                    path: [],
                    array_contains: category
                }
            } as any,
            include: { Missions: true }
        });

        // 2. Si no hay plantilla específica de la categoría, buscar la primera predeterminada global o featured
        if (!template) {
            template = await client.questTemplate.findFirst({
                where: { esPredeterminada: true },
                include: { Missions: true }
            }) || await client.questTemplate.findFirst({
                where: { featured: true },
                include: { Missions: true }
            }) || await client.questTemplate.findFirst({
                include: { Missions: true }
            });
        }

        if (!template) {
            console.log(`[TemplateService] No se encontró ninguna plantilla en el Marketplace para instalar.`);
            return false;
        }

        console.log(`[TemplateService] Instalando plantilla "${template.nombre}" (v${template.versionSemantica}) en el negocio "${negocioId}"...`);

        // 3. Crear el Snapshot inmutable de la instalación
        const snapshotData = {
            templateId: template.id,
            nombre: template.nombre,
            versionSemantica: template.versionSemantica,
            Missions: template.Missions.map((m) => ({
                id: m.id,
                nombre: m.nombre,
                triggerEvent: m.triggerEvent,
                acciones: m.acciones,
            })),
            timestamp: new Date().toISOString(),
        };

        const snapshotId = uuidv4();
        await client.installedTemplateSnapshot.create({
            data: {
                id: snapshotId,
                negocioId,
                templateId: template.id,
                versionCopy: template.versionSemantica,
                snapshotData,
            },
        });

        // 3.5. Buscar o crear la campaña del negocio para esta plantilla
        let campaign = await client.campaign.findFirst({
            where: {
                negocioId,
                nombre: `Campaña ${template.nombre}`
            }
        });

        if (!campaign) {
            campaign = await client.campaign.create({
                data: {
                    negocioId,
                    nombre: `Campaña ${template.nombre}`,
                    descripcion: template.descripcion,
                    activa: true,
                }
            });
        }

        // 3.8. Crear catálogo completo de cupones y premios por sector (4–5 de cada tipo)
        await createDefaultCatalogForBusiness(
            negocioId,
            category,
            client,
            template.coupons as any[],
            template.rewards as any[]
        );

        // 4. Clonar misiones
        // Primero eliminamos cualquier misión anterior que pertenezca a esta plantilla en el negocio
        await client.quest.deleteMany({
            where: {
                negocioId,
                templateIdOrigen: template.id,
            },
        });

        // Crear las misiones locales copiando de la plantilla
        for (const m of template.Missions) {
            const questId = uuidv4();
            await client.quest.create({
                data: {
                    id: questId,
                    negocioId,
                    campaignId: campaign.id,
                    nombre: m.nombre,
                    descripcion: m.descripcion,
                    imagenUrl: m.imagenUrl || null,
                    icono: m.icono,
                    color: m.color,
                    visible: m.visible,
                    repetible: m.repetible,
                    limiteUsuario: m.limiteUsuario,
                    limiteGlobal: m.limiteGlobal,
                    fechaInicio: m.fechaInicio,
                    fechaFin: m.fechaFin,
                    activa: m.activa,
                    parentQuestId: m.parentQuestId || null,
                    segmentacion: m.segmentacion || null,
                    validacionTipo: m.validacionTipo,
                    difficulty: m.difficulty,
                    xp: m.xp,
                    estimatedMinutes: m.estimatedMinutes,
                    estimatedDays: m.estimatedDays,
                    triggerEvent: m.triggerEvent,
                    servicioId: m.servicioId || null,
                    montoMinimo: m.montoMinimo || null,
                    cantidadMeta: m.cantidadMeta,
                    condicionesExtra: m.condicionesExtra || null,
                    acciones: m.acciones || [],
                    origen: 'PLANTILLA',
                    templateIdOrigen: template.id,
                    templateVersionOrigen: template.versionSemantica,
                    modificadaLocalmente: false,
                } as any,
            });
        }

        // 5. Registrar en InstalledTemplate
        await client.installedTemplate.upsert({
            where: {
                negocioId_templateId: {
                    negocioId,
                    templateId: template.id,
                },
            },
            update: {
                versionInstalada: template.versionSemantica,
                estadoActualizacion: 'UP_TO_DATE',
                reinstalledAt: new Date(),
            },
            create: {
                id: uuidv4(),
                negocioId,
                templateId: template.id,
                versionInstalada: template.versionSemantica,
                estadoActualizacion: 'UP_TO_DATE',
            },
        });

        // 6. Incrementar contador de instalaciones de la plantilla
        await client.questTemplate.update({
            where: { id: template.id },
            data: {
                installCount: {
                    increment: 1,
                },
            },
        });

        console.log(`[TemplateService] Plantilla "${template.nombre}" instalada correctamente con cupones y premios.`);
        return true;
    }
}
