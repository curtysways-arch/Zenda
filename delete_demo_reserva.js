const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Ver todas las reservas actuales
const all = db.prepare("SELECT id, fecha, horaInicio, estado, clienteId FROM Reserva").all();
console.log('Todas las reservas:');
all.forEach(r => console.log(r));

// Eliminar las del 28 de abril (demo)
const del = db.prepare("DELETE FROM Reserva WHERE substr(fecha, 1, 10) = '2026-04-28'").run();
console.log('\nEliminadas:', del.changes);

// Ver lo que queda
const remaining = db.prepare("SELECT id, fecha, horaInicio, estado FROM Reserva").all();
console.log('\nReservas restantes:');
remaining.forEach(r => console.log(r));

db.close();
