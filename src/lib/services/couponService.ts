import prisma from "@/lib/prisma";

/**
 * Servicio para gestionar la lógica del ciclo de vida de los cupones de cliente (ClientCoupon)
 * en relación a sus reservas asociadas.
 */
export const clientCouponService = {
    /**
     * Sincroniza el estado del ClientCoupon cuando el estado de una cita cambia.
     * @param appointmentId ID de la cita/reserva.
     * @param appointmentStatus Nuevo estado de la cita.
     */
    async syncCouponWithAppointmentStatus(appointmentId: string, appointmentStatus: string) {
        try {
            const statusClean = appointmentStatus?.toLowerCase();

            // Buscar si hay algún ClientCoupon asociado a esta cita
            const clientCoupon = await prisma.clientCoupon.findFirst({
                where: { appointmentId }
            });

            if (!clientCoupon) return; // No hay cupón asociado a esta cita

            if (statusClean === "cancelled" || statusClean === "cancelada" || statusClean === "cancelado") {
                // Si la reserva se cancela, devolvemos el cupón a DISPONIBLE para que no pierda el beneficio
                await prisma.clientCoupon.update({
                    where: { id: clientCoupon.id },
                    data: {
                        estado: "DISPONIBLE",
                        appointmentId: null,
                        fechaUso: null
                    }
                });
                console.log(`🎟️ Cupón de cliente ${clientCoupon.codigo} devuelto a DISPONIBLE por cancelación de cita ${appointmentId}`);
            } else if (statusClean === "confirmed" || statusClean === "confirmada" || statusClean === "confirmado") {
                // Si la reserva es confirmada, el cupón se marca definitivamente como USADO
                await prisma.clientCoupon.update({
                    where: { id: clientCoupon.id },
                    data: {
                        estado: "USADO",
                        fechaUso: new Date()
                    }
                });
                console.log(`🎟️ Cupón de cliente ${clientCoupon.codigo} marcado como USADO por confirmación de cita ${appointmentId}`);
            }
        } catch (error) {
            console.error("Error al sincronizar cupón con estado de cita:", error);
        }
    }
};
