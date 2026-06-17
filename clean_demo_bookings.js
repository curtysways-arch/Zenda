const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
    // Primero contamos para estar seguros
    db.get("SELECT COUNT(*) as count FROM Reserva WHERE fecha LIKE '2026-04-28%'", (err, row) => {
        if (err) {
            console.error('Error al contar:', err.message);
            return;
        }
        console.log(`Encontradas ${row.count} reservas para el 28 de abril.`);
        
        if (row.count > 0) {
            db.run("DELETE FROM Reserva WHERE fecha LIKE '2026-04-28%'", function(err) {
                if (err) {
                    console.error('Error al eliminar:', err.message);
                } else {
                    console.log(`Eliminadas satisfactoriamente ${this.changes} reservas.`);
                }
            });
        } else {
            console.log('No hay nada que eliminar.');
        }
    });
});

db.close();
