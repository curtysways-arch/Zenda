const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');
db.get("SELECT * FROM Negocio WHERE slug = 'demo-spa'", (err, row) => {
    console.log("Resultado demo-spa:", row);
    db.close();
});
