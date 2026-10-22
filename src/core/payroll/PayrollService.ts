import prisma from '@/lib/prisma';

export interface CreateEmployeeInput {
  businessId: string;
  taxId: string;
  fullName: string;
  position: string;
  department?: string;
  phone?: string;
  email?: string;
  baseSalary?: number;
  paymentMethod?: string;
  bankName?: string;
  bankAccount?: string;
}

export interface GeneratePayrollInput {
  businessId: string;
  employeeId: string;
  period: string; // "2026-10"
  extraHours?: number; // valor monetario de horas extras
  bonuses?: number;
  advances?: number;
  otherDeductions?: number;
  approvedById?: string;
  notes?: string;
}

export class PayrollService {
  /**
   * Crear o actualizar un empleado
   */
  public static async upsertEmployee(input: CreateEmployeeInput) {
    const { businessId, taxId, fullName, position } = input;

    return await (prisma as any).employee.upsert({
      where: {
        businessId_taxId: { businessId, taxId }
      },
      update: {
        fullName,
        position,
        department: input.department,
        phone: input.phone,
        email: input.email,
        baseSalary: input.baseSalary || 460.0,
        paymentMethod: input.paymentMethod || 'TRANSFERENCIA',
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        active: true,
        updatedAt: new Date()
      },
      create: {
        businessId,
        taxId,
        fullName,
        position,
        department: input.department,
        phone: input.phone,
        email: input.email,
        baseSalary: input.baseSalary || 460.0,
        paymentMethod: input.paymentMethod || 'TRANSFERENCIA',
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        active: true
      }
    });
  }

  /**
   * Genera el rol de pago (Payroll Slip) con cálculo laboral ecuatoriano
   */
  public static async calculateAndGenerateSlip(input: GeneratePayrollInput) {
    const { businessId, employeeId, period, extraHours = 0, bonuses = 0, advances = 0, otherDeductions = 0, notes } = input;

    const employee = await (prisma as any).employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee || employee.businessId !== businessId) {
      throw new Error('Empleado no encontrado.');
    }

    const baseSalary = employee.baseSalary || 460.0;
    const totalEarnings = baseSalary + extraHours + bonuses;

    // Aporte personal al IESS en Ecuador (9.45% sobre la materia gravada)
    const iessDeduction = Number((totalEarnings * 0.0945).toFixed(2));
    const totalDeductions = iessDeduction + advances + otherDeductions;
    const netSalary = Math.max(0, Number((totalEarnings - totalDeductions).toFixed(2)));

    const slip = await (prisma as any).payrollSlip.create({
      data: {
        businessId,
        employeeId,
        period,
        baseSalary,
        extraHours,
        bonuses,
        advances,
        iessDeduction,
        otherDeductions,
        grossSalary: totalEarnings,
        netSalary,
        status: 'APPROVED',
        approvedById: input.approvedById || null,
        notes: notes || null
      },
      include: {
        employee: true
      }
    });

    return slip;
  }
}
