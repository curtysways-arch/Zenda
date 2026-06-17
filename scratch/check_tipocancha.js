const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db', () => {
    db.all("PRAGMA table_info(TipoCancha)", (err, rows) => {
        console.log("Columnas de TipoCancha:");
        console.log(rows.map(r => r.name).join(', '));
        db.close();
    });
});
