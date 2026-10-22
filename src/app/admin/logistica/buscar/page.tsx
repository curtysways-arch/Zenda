import { redirect } from 'next/navigation';

// La búsqueda de repartidores ahora vive en "Repartidores" (Recomendados por Citiox).
export default function BuscarRepartidoresPage() {
    redirect('/admin/repartidores');
}
