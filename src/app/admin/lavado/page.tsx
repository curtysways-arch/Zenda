import { redirect } from 'next/navigation';

/** Ruta antigua (los WhatsApp de órdenes nuevas enlazan aquí): ahora todo está en Órdenes. */
export default function AdminLavadoPage() {
  redirect('/admin/ordenes-servicio');
}
