'use client';
/** Ficha de una cita en el celular (/admin/citas/[id]): la misma gestión que en la agenda, a pantalla completa. */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppointmentManager from './AppointmentManager';
import { Cita } from './agendaShared';

export default function AppointmentPageMobile({ reserva, onRefresh }: { reserva: Cita; onRefresh: () => void }) {
  const router = useRouter();
  const [color, setColor] = useState('#0ea5e9');
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [negocio, setNegocio] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    if (c) setColor(c);
    fetch('/api/staff').then((r) => (r.ok ? r.json() : [])).then((d) => setStaff((Array.isArray(d) ? d : []).filter((s: any) => s.active !== false).map((s: any) => ({ id: s.id, name: s.name || s.nombre })))).catch(() => {});
    fetch('/api/appointments/list').then((r) => (r.ok ? r.json() : [])).then((d) => setCitas(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/negocio').then((r) => (r.ok ? r.json() : null)).then(setNegocio).catch(() => {});
  }, []);

  return (
    <>
      <AppointmentManager
        variant="page"
        cita={reserva}
        primaryColor={color}
        allCitas={citas}
        staff={staff}
        horario={{ apertura: negocio?.horarioApertura, cierre: negocio?.horarioCierre }}
        negocioNombre={negocio?.nombre}
        onChanged={(_, __, msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); onRefresh(); }}
        onClose={() => (window.history.length > 1 ? router.back() : router.push('/admin/citas'))}
      />
      {toast && <div role="status" className="fixed inset-x-4 bottom-[150px] z-[210] mx-auto max-w-sm rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">{toast}</div>}
    </>
  );
}
