const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');
db.get("SELECT id, slug FROM Negocio WHERE id = 'cmmlfry6q0004l0w54cdbpyx9'", (err, row) => {
    console.log("Resultado ID:", row);
    db.close();
});
