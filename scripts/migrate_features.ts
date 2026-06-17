import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DEFAULT_PLAN_CAPABILITIES: any = {
    BEGIN: {
        whatsapp_notifications: false,
        whatsapp_otp: false,
        whatsapp_reminders: false,
        whatsapp_campaigns: false,
        custom_colors: true,
        custom_logo: true,
        custom_phrases: false,
        remove_zenda_branding: false,
        multi_staff: false,
        multi_branch: false,
        analytics: false,
        automation: false,
        tournaments_module: false,
        courses_module: false,
        automatic_discounts: false
    },
    PRO: {
        whatsapp_notifications: true,
        whatsapp_otp: true,
        whatsapp_reminders: true,
        whatsapp_campaigns: false,
        custom_colors: true,
        custom_logo: true,
        custom_phrases: true,
        remove_zenda_branding: false,
        multi_staff: true,
        multi_branch: false,
        analytics: true,
        automation: false,
        tournaments_module: true,
        courses_module: false,
        automatic_discounts: true
    },
    BUSINESS: {
        whatsapp_notifications: true,
        whatsapp_otp: true,
        whatsapp_reminders: true,
        whatsapp_campaigns: true,
        custom_colors: true,
        custom_logo: true,
        custom_phrases: true,
        remove_zenda_branding: true,
        multi_staff: true,
        multi_branch: true,
        analytics: true,
        automation: true,
        tournaments_module: true,
        courses_module: true,
        automatic_discounts: true
    }
};

async function main() {
    console.log("Iniciando migración de features a los planes...");

    const planes = await prisma.plan.findMany();
    
    let count = 0;
    for (const plan of planes) {
        let tier = 'BEGIN';
        const name = plan.name.toUpperCase();
        if (name.includes('BUSINESS') || name.includes('ENTERPRISE')) {
            tier = 'BUSINESS';
        } else if (name.includes('PRO') || name.includes('PLUS') || name.includes('PREMIUM')) {
            tier = 'PRO';
        }

        const defaults = DEFAULT_PLAN_CAPABILITIES[tier];

        // Conservar settings heredados (ej: maxStaff, courses_module) si existían en DB
        const featuresJson = {
            ...defaults,
            tournaments_module: plan.tournaments_enabled || defaults.tournaments_module,
            automatic_discounts: plan.automatic_discounts_enabled || defaults.automatic_discounts,
            courses_module: (plan as any).courses_module || defaults.courses_module,
        };

        await prisma.plan.update({
            where: { id: plan.id },
            data: { features: featuresJson }
        });

        console.log(`Plan "${plan.name}" actualizado a capa ${tier}.`);
        count++;
    }

    console.log(`¡Migración completada! ${count} planes actualizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
