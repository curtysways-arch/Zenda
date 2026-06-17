import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        await prisma.plan.upsert({
            where: { id: 'plan_begin' },
            update: {
                name: 'BEGIN',
                price: 0,
                maxStaff: 1,
                max_locations: 1,
                maxAppointmentsMonthly: 50,
                features: JSON.stringify(['basic_booking', 'zenda_branding'])
            },
            create: {
                id: 'plan_begin',
                name: 'BEGIN',
                price: 0,
                maxStaff: 1,
                max_locations: 1,
                maxAppointmentsMonthly: 50,
                features: JSON.stringify(['basic_booking', 'zenda_branding'])
            }
        });

        await prisma.plan.upsert({
            where: { id: 'plan_pro' },
            update: {
                name: 'PRO',
                price: 19,
                maxStaff: 5,
                max_locations: 1,
                maxAppointmentsMonthly: 500,
                features: JSON.stringify(['whatsapp_notifications', 'custom_branding', 'courses_module', 'whatsapp_otp'])
            },
            create: {
                id: 'plan_pro',
                name: 'PRO',
                price: 19,
                maxStaff: 5,
                max_locations: 1,
                maxAppointmentsMonthly: 500,
                features: JSON.stringify(['whatsapp_notifications', 'custom_branding', 'courses_module', 'whatsapp_otp'])
            }
        });

        await prisma.plan.upsert({
            where: { id: 'plan_business' },
            update: {
                name: 'BUSINESS',
                price: 39,
                maxStaff: 999999,
                max_locations: 5,
                maxAppointmentsMonthly: 999999,
                features: JSON.stringify(['whatsapp_notifications', 'custom_branding', 'courses_module', 'advanced_analytics', 'white_label', 'whatsapp_otp', 'multi_staff'])
            },
            create: {
                id: 'plan_business',
                name: 'BUSINESS',
                price: 39,
                maxStaff: 999999,
                max_locations: 5,
                maxAppointmentsMonthly: 999999,
                features: JSON.stringify(['whatsapp_notifications', 'custom_branding', 'courses_module', 'advanced_analytics', 'white_label', 'whatsapp_otp', 'multi_staff'])
            }
        });

        return NextResponse.json({ success: true, message: 'Planes actualizados' });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
