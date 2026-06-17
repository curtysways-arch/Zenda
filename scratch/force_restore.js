const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');

async function run() {
    console.log(`🛠️ Restaurando Negocio en: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.log(`❌ Error: ${err.message}`);
            process.exit(1);
        }
        
        db.serialize(() => {
            // Re-crear negocio demo-spa
            db.run(`INSERT OR IGNORE INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt") 
                    VALUES ('demo-id', 'Demo Spa & Bienestar', 'demo-spa', 'Admin Demo', '5215500000000', 'Calle Ficticia 123', 'CDMX', 50, '08:00', '20:00', CURRENT_TIMESTAMP)`);

            db.run(`INSERT OR IGNORE INTO "Category" ("id", "nombre", "businessId", "updatedAt") 
                    VALUES ('cat-id', 'Masajes', 'demo-id', CURRENT_TIMESTAMP)`);

            db.run(`INSERT OR IGNORE INTO "Service" ("id", "nombre", "descripcion", "precio", "duracion", "businessId", "categoryId", "updatedAt") 
                    VALUES ('service-id', 'Corte de cabello', 'Corte profesional', 8, 50, 'demo-id', 'cat-id', CURRENT_TIMESTAMP)`);

            db.run(`INSERT OR IGNORE INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                    VALUES ('staff-id', 'Ana García', 'Estilista', 'demo-id', 1, '{"monday":{"start":"08:00","end":"20:00"}}', CURRENT_TIMESTAMP)`);

            db.run(`INSERT OR IGNORE INTO "_StaffServices" ("A", "B") 
                    VALUES ('service-id', 'staff-id')`, (err) => {
                if (err) console.log("⚠️ Error en relación:", err.message);
                console.log("✅ Restauración completada.");
                db.close();
            });
        });
    });
}

run();
