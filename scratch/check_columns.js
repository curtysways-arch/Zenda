const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../dev.db');

const db = new sqlite3.Database(dbPath, () => {
    db.all("PRAGMA table_info(Cancha)", (err, rows) => {
        console.log("Columnas de Cancha:");
        console.log(rows.map(r => r.name).join(', '));
        
        db.all("PRAGMA table_info(Reserva)", (err, rows) => {
            console.log("Columnas de Reserva:");
            console.log(rows.map(r => r.name).join(', '));
            db.close();
        });
    });
});
