const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db', (err) => {
    const BUSINESS_ID = 'cmmlfry6q0004l0w54cdbpyx9';
    db.run(`INSERT INTO "Negocio" ("id", "nombre", "slug", "precioHora", "horarioApertura", "horarioCierre", "updatedAt", "estado") 
            VALUES (?, 'Spa Wellness', 'demo-spa', 50, '08:00', '21:00', CURRENT_TIMESTAMP, 'ACTIVO')`, 
            [BUSINESS_ID], (err) => {
                if (err) console.log("❌ Error:", err.message);
                else console.log("✅ Negocio INSERTADO.");
                db.close();
            });
});
