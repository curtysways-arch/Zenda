import prisma from '@/lib/prisma';
import {
    isCafeteriaBusiness,
    isDentalBusiness,
    isGymBusiness,
    isLaundryOrShoeCareBusiness,
    isRestaurantBusiness,
    isSportsCourtsBusiness,
    isStoreBusiness,
} from '@/lib/businessTypeHelper';

/**
 * Planes que corresponden a un negocio según su tipo:
 * la familia de planes de su tipo de negocio + los planes vinculados directamente a ese tipo.
 * Si el tipo no tiene familia, se intenta por la vertical del negocio y, al final,
 * por la familia del plan que ya tiene. Solo si nada de eso existe se devuelven todos.
 */
export type PlanesDelNegocio = {
    plans: any[];
    familia: { id: string; name: string } | null;
    tipo: { id: string; name: string } | null;
    origen: 'tipo' | 'vertical' | 'plan-actual' | 'todos';
};

const CODIGOS_POR_VERTICAL: [(n: any) => boolean, string[]][] = [
    [isLaundryOrShoeCareBusiness, ['LAVANDERIA', 'LAVANDERIAS']],
    [(n) => isRestaurantBusiness(n) || isCafeteriaBusiness(n), ['RESTAURANTE', 'RESTAURANTES']],
    [isSportsCourtsBusiness, ['CANCHAS', 'CANCHA']],
    [(n) => isStoreBusiness(n), ['TIENDA', 'TIENDAS']],
    [isDentalBusiness, ['ODONTOLOGIA', 'DENTAL', 'DENTISTAS']],
    [isGymBusiness, ['GIMNASIO', 'GYM']],
];

export async function plansForBusiness(negocioId: string): Promise<PlanesDelNegocio> {
    const negocio = await (prisma.negocio as any).findUnique({
        where: { id: negocioId },
        select: {
            id: true, slug: true, nombre: true, tipoNegocio: true, businessTypeId: true, configuracion: true,
            Suscripcion: { select: { planId: true, Plan: { select: { familyId: true } } } },
        },
    });
    const activos = { activo: true, id: { not: 'founder' } };
    const orden = [{ price: 'asc' }] as any;
    if (!negocio) return { plans: [], familia: null, tipo: null, origen: 'todos' };

    // 1. Tipo de negocio: por id o por el texto de tipoNegocio
    const or: any[] = [];
    if (negocio.businessTypeId) or.push({ id: negocio.businessTypeId });
    const t = String(negocio.tipoNegocio || '').trim();
    if (t) { or.push({ slug: t.toLowerCase() }); or.push({ slug: t.toLowerCase().replace(/_/g, '-') }); or.push({ name: { contains: t } }); }
    const tipo = or.length
        ? await (prisma as any).businessType.findFirst({
            where: { OR: or },
            select: { id: true, name: true, planFamilyId: true, planFamily: { select: { id: true, name: true } }, planLinks: { select: { planId: true } } },
        }).catch(() => null)
        : null;

    let familia: { id: string; name: string } | null = tipo?.planFamily ?? null;
    let origen: PlanesDelNegocio['origen'] = 'tipo';
    const vinculados: string[] = (tipo?.planLinks ?? []).map((l: any) => l.planId);

    // 2. Sin familia en el tipo: por la vertical del negocio
    if (!familia) {
        const codigos = CODIGOS_POR_VERTICAL.find(([es]) => { try { return es(negocio); } catch { return false; } })?.[1];
        if (codigos) {
            familia = await (prisma as any).planFamily.findFirst({ where: { code: { in: codigos } }, select: { id: true, name: true } }).catch(() => null);
            if (familia) origen = 'vertical';
        }
    }
    // 3. Último recurso razonable: la familia del plan que ya tiene
    if (!familia && negocio.Suscripcion?.Plan?.familyId) {
        familia = await (prisma as any).planFamily.findUnique({ where: { id: negocio.Suscripcion.Plan.familyId }, select: { id: true, name: true } }).catch(() => null);
        if (familia) origen = 'plan-actual';
    }

    const filtro: any[] = [];
    if (familia) filtro.push({ familyId: familia.id });
    if (vinculados.length) filtro.push({ id: { in: vinculados } });

    let plans: any[] = filtro.length ? await prisma.plan.findMany({ where: { ...activos, OR: filtro } as any, orderBy: orden }) : [];
    if (!plans.length) {
        plans = await prisma.plan.findMany({ where: activos as any, orderBy: orden });
        origen = 'todos';
    }
    // El plan que ya tiene siempre aparece, aunque no sea de la familia
    const actualId = negocio.Suscripcion?.planId;
    if (actualId && !plans.some((p) => p.id === actualId)) {
        const actual = await prisma.plan.findUnique({ where: { id: actualId } });
        if (actual) plans = [...plans, { ...actual, fueraDeFamilia: true }];
    }
    return { plans, familia, tipo: tipo ? { id: tipo.id, name: tipo.name } : null, origen };
}
