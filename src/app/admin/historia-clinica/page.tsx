import { redirect } from 'next/navigation';

/**
 * La historia clínica vive dentro de la ficha de cada paciente
 * (Pacientes → paciente → Historia clínica). Esta ruta se conserva para
 * enlaces antiguos y redirige a la lista de pacientes.
 */
export default function HistoriaClinicaPage() {
  redirect('/admin/pacientes');
}
