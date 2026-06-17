const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');
db.get("SELECT * FROM Negocio WHERE slug = 'demo-spa'", (err, row) => {
    if (row) {
        console.log("✅ Negocio encontrado:", row.nombre, row.slug);
    } else {
        console.log("❌ Negocio NO encontrado");
    }
    db.close();
});
