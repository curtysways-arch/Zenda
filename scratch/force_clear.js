const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Probar ambos posibles archivos de base de datos
const dbs = [
    path.join(__dirname, '../dev.db'),
    path.join(__dirname, '../prisma/dev.db')
];

async function clearDb(dbPath) {
    return new Promise((resolve) => {
        console.log(`\n📂 Procesando: ${dbPath}`);
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.log(`❌ No se pudo abrir: ${err.message}`);
                return resolve();
            }
            
            db.serialize(() => {
                db.run("PRAGMA foreign_keys = OFF");
                
                // Intentar borrar de todas las tablas posibles
                const tables = ['Appointment', 'Reserva', 'PagoReserva', 'PendingReservation'];
                tables.forEach(table => {
                    db.run(`DELETE FROM "${table}"`, function(err) {
                        if (err) {
                            if (!err.message.includes('no such table')) {
                                console.log(`⚠️ Error en ${table}: ${err.message}`);
                            }
                        } else {
                            console.log(`✅ ${table} vaciada (${this.changes} filas)`);
                        }
                    });
                });
                
                db.run("PRAGMA foreign_keys = ON", () => {
                    db.close();
                    resolve();
                });
            });
        });
    });
}

async function run() {
    for (const db of dbs) {
        await clearDb(db);
    }
    console.log("\n✨ Limpieza total completada.");
}

run();
