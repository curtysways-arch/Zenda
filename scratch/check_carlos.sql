SELECT id, horaInicio, horaFin, estado FROM Reserva 
WHERE fecha LIKE '2026-04-29%' 
AND clienteId IN (SELECT id FROM Cliente WHERE nombre LIKE '%Carlos%');
