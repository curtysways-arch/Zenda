'use client';

import { useEffect, useState } from 'react';
import DriverTeamManager from '@/components/admin/drivers/DriverTeamManager';
import { isLaundryOrShoeCareBusiness } from '@/lib/businessTypeHelper';

/** Repartidores: el equipo del negocio. Las lavanderías siguen sus entregas desde Órdenes. */
export default function RepartidoresPage() {
    const [deliveriesHref, setDeliveriesHref] = useState('/admin/logistica');
    useEffect(() => {
        fetch('/api/negocio')
            .then((r) => (r.ok ? r.json() : null))
            .then((n) => { if (n && isLaundryOrShoeCareBusiness(n)) setDeliveriesHref('/admin/ordenes-servicio?vista=repartidores'); })
            .catch(() => {});
    }, []);
    return <DriverTeamManager deliveriesHref={deliveriesHref} />;
}
