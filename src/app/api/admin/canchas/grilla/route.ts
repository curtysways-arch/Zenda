// src/app/api/admin/canchas/grilla/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CourtBookingService } from '@/modules/sports-courts/services/courtBookingService';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.negocioId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const negocioId = (session.user as any).negocioId;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const resources = await CourtBookingService.getCourts(negocioId);
    const appointments = await CourtBookingService.getCourtAppointments(negocioId, dateStr);

    return NextResponse.json({
      success: true,
      selectedDate: dateStr,
      resources,
      appointments,
    });
  } catch (error: any) {
    console.error('Error fetching court grid data:', error);
    return NextResponse.json({ error: 'Error al cargar la grilla de canchas' }, { status: 500 });
  }
}
