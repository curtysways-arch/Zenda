// dotenv setup
import "dotenv/config";
import prisma from './src/lib/prisma';

async function main() {
  console.log('🔄 Iniciando actualización y creación de planes...');

  // 1. Plan BEGIN (Gratuito)
  console.log('Creating/Updating Plan BEGIN...');
  const beginFeatures = {
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
    automation: false
  };

  await prisma.plan.upsert({
    where: { id: 'plan_begin' },
    update: {
      name: 'BEGIN',
      description: 'Plan inicial gratuito para comenzar a digitalizar tu spa.',
      price: 0,
      trial_days: 0,
      max_fields: 5,
      maxStaff: 1,
      max_reservations_per_month: 40,
      maxAppointmentsMonthly: 40,
      max_locations: 1,
      tournaments_enabled: false,
      automatic_discounts_enabled: false,
      courses_module: false,
      is_recommended: false,
      isFree: true,
      activo: true,
      updated_at: new Date(),
      features: beginFeatures
    },
    create: {
      id: 'plan_begin',
      name: 'BEGIN',
      description: 'Plan inicial gratuito para comenzar a digitalizar tu spa.',
      price: 0,
      trial_days: 0,
      max_fields: 5,
      maxStaff: 1,
      max_reservations_per_month: 40,
      maxAppointmentsMonthly: 40,
      max_locations: 1,
      tournaments_enabled: false,
      automatic_discounts_enabled: false,
      courses_module: false,
      is_recommended: false,
      isFree: true,
      activo: true,
      updated_at: new Date(),
      features: beginFeatures
    }
  });

  // 2. Plan PRO
  console.log('Creating/Updating Plan PRO...');
  const proFeatures = {
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
    automation: false
  };

  await prisma.plan.upsert({
    where: { id: 'plan_pro' },
    update: {
      name: 'PRO',
      description: 'El plan perfecto para spas en crecimiento con notificaciones automáticas y agenda multi-profesional.',
      price: 19.99,
      trial_days: 14,
      max_fields: 15,
      maxStaff: 5,
      max_reservations_per_month: 500,
      maxAppointmentsMonthly: 500,
      max_locations: 2,
      tournaments_enabled: true,
      automatic_discounts_enabled: true,
      courses_module: false,
      is_recommended: true,
      isFree: false,
      activo: true,
      updated_at: new Date(),
      features: proFeatures
    },
    create: {
      id: 'plan_pro',
      name: 'PRO',
      description: 'El plan perfecto para spas en crecimiento con notificaciones automáticas y agenda multi-profesional.',
      price: 19.99,
      trial_days: 14,
      max_fields: 15,
      maxStaff: 5,
      max_reservations_per_month: 500,
      maxAppointmentsMonthly: 500,
      max_locations: 2,
      tournaments_enabled: true,
      automatic_discounts_enabled: true,
      courses_module: false,
      is_recommended: true,
      isFree: false,
      activo: true,
      updated_at: new Date(),
      features: proFeatures
    }
  });

  // 3. Plan BUSINESS
  console.log('Creating/Updating Plan BUSINESS...');
  const businessFeatures = {
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
    automation: true
  };

  await prisma.plan.upsert({
    where: { id: 'plan_business' },
    update: {
      name: 'BUSINESS',
      description: 'Control total sin límites, ideal para franquicias, centros grandes y múltiples sucursales.',
      price: 39.99,
      trial_days: 14,
      max_fields: 999,
      maxStaff: 999,
      max_reservations_per_month: 99999,
      maxAppointmentsMonthly: 99999,
      max_locations: 10,
      tournaments_enabled: true,
      automatic_discounts_enabled: true,
      courses_module: true,
      is_recommended: false,
      isFree: false,
      activo: true,
      updated_at: new Date(),
      features: businessFeatures
    },
    create: {
      id: 'plan_business',
      name: 'BUSINESS',
      description: 'Control total sin límites, ideal para franquicias, centros grandes y múltiples sucursales.',
      price: 39.99,
      trial_days: 14,
      max_fields: 999,
      maxStaff: 999,
      max_reservations_per_month: 99999,
      maxAppointmentsMonthly: 99999,
      max_locations: 10,
      tournaments_enabled: true,
      automatic_discounts_enabled: true,
      courses_module: true,
      is_recommended: false,
      isFree: false,
      activo: true,
      updated_at: new Date(),
      features: businessFeatures
    }
  });

  console.log('🚀 ¡Planes creados y actualizados con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error actualizando planes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
