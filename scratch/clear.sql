PRAGMA foreign_keys = OFF;
DELETE FROM "Appointment";
DELETE FROM "Reserva";
DELETE FROM "PagoReserva";
DELETE FROM "PendingReservation";
PRAGMA foreign_keys = ON;
