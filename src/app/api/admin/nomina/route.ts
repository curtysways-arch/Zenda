import { NextResponse } from 'next/server';
import { getEffectiveAdminSession } from '@/lib/delegatedAuth';
import prisma from '@/lib/prisma';
import { PayrollService } from '@/core/payroll/PayrollService';

export async function GET() {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    if (!businessId) return NextResponse.json({ error: 'Negocio no especificado' }, { status: 400 });

    const [employees, slips] = await Promise.all([
      (prisma as any).employee.findMany({
        where: { businessId, active: true },
        orderBy: { fullName: 'asc' }
      }),
      (prisma as any).payrollSlip.findMany({
        where: { businessId },
        include: { employee: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return NextResponse.json({ success: true, employees, slips });
  } catch (e: any) {
    console.error('[API_NOMINA_GET]', e);
    return NextResponse.json({ error: e?.message || 'Error al obtener nómina' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getEffectiveAdminSession();
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = (session.user as any).negocioId;
    const body = await req.json();
    const { action } = body;

    if (action === 'CREATE_EMPLOYEE') {
      const { taxId, fullName, position, department, phone, email, baseSalary } = body;
      if (!taxId || !fullName || !position) {
        return NextResponse.json({ error: 'Cédula, nombre y cargo son obligatorios' }, { status: 400 });
      }

      const employee = await PayrollService.upsertEmployee({
        businessId,
        taxId,
        fullName,
        position,
        department,
        phone,
        email,
        baseSalary: Number(baseSalary) || 460.0
      });

      return NextResponse.json({ success: true, employee });
    }

    if (action === 'GENERATE_SLIP') {
      const { employeeId, period, extraHours, bonuses, advances, otherDeductions, notes } = body;
      if (!employeeId || !period) {
        return NextResponse.json({ error: 'Empleado y período son obligatorios' }, { status: 400 });
      }

      const slip = await PayrollService.calculateAndGenerateSlip({
        businessId,
        employeeId,
        period,
        extraHours: Number(extraHours) || 0,
        bonuses: Number(bonuses) || 0,
        advances: Number(advances) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        approvedById: (session.user as any).id,
        notes
      });

      return NextResponse.json({ success: true, slip });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (e: any) {
    console.error('[API_NOMINA_POST]', e);
    return NextResponse.json({ error: e?.message || 'Error al procesar nómina' }, { status: 400 });
  }
}
