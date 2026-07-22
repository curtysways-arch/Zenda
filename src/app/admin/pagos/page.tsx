import React from 'react';
import AdminPaymentsPanel from '@/components/admin/AdminPaymentsPanel';

export const metadata = {
    title: 'Verificación de Pagos - Admin Citiox',
    description: 'Gestión y verificación de transferencias y comprobantes de pago'
};

export default function AdminPagosPage() {
    return (
        <div className="p-6">
            <AdminPaymentsPanel />
        </div>
    );
}
