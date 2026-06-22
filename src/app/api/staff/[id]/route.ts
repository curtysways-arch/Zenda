import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkDemoRestriction } from '@/lib/demo-protection';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, role, avatar, services, workingHours, active, imageMediaId } = body;

        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        const rawStaff = await prisma.staff.update({
            where: { id },
            data: {
                name,
                role,
                avatar,
                imageMediaId: imageMediaId !== undefined ? imageMediaId : undefined,
                workingHours: workingHours || {},
                updatedAt: new Date(),
                Service: {
                    set: services.map((id: string) => ({ id }))
                }
            },
            include: {
                Service: true,
                imageMedia: true
            }
        });

        return NextResponse.json({
            ...rawStaff,
            services: rawStaff.Service || []
        });
    } catch (error) {
        console.error('Error updating staff:', error);
        return NextResponse.json({ error: 'Error updating staff' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const demoCheck = await checkDemoRestriction();
        if (demoCheck.restricted) {
            return demoCheck.response;
        }

        await prisma.staff.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting staff:', error);
        return NextResponse.json({ error: 'Error deleting staff' }, { status: 500 });
    }
}
