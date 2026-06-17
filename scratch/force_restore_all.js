const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbs = [
    path.join(__dirname, '../dev.db'),
    path.join(__dirname, '../prisma/dev.db')
];

async function restore(dbPath) {
    return new Promise((resolve) => {
        console.log(`🛠️ Intentando restauración en: ${dbPath}`);
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.log(`❌ Error al abrir: ${err.message}`);
                return resolve();
            }
            
            db.serialize(() => {
                db.run(`INSERT OR IGNORE INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt") 
                        VALUES ('demo-id', 'Demo Spa & Bienestar', 'demo-spa', 'Admin Demo', '5215500000000', 'Calle Ficticia 123', 'CDMX', 50, '08:00', '20:00', CURRENT_TIMESTAMP)`, (err) => {
                    if (err) console.log(`  - Negocio: ${err.message}`);
                    else console.log("  ✅ Negocio OK");
                });

                db.run(`INSERT OR IGNORE INTO "Category" ("id", "nombre", "businessId", "updatedAt") 
                        VALUES ('cat-id', 'Masajes', 'demo-id', CURRENT_TIMESTAMP)`, (err) => {
                    if (err) console.log(`  - Category: ${err.message}`);
                    else console.log("  ✅ Category OK");
                });

                db.run(`INSERT OR IGNORE INTO "Service" ("id", "nombre", "descripcion", "precio", "duracion", "businessId", "categoryId", "updatedAt") 
                        VALUES ('service-id', 'Corte de cabello', 'Corte profesional', 8, 50, 'demo-id', 'cat-id', CURRENT_TIMESTAMP)`, (err) => {
                    if (err) console.log(`  - Service: ${err.message}`);
                    else console.log("  ✅ Service OK");
                });

                db.run(`INSERT OR IGNORE INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                        VALUES ('staff-id', 'Ana García', 'Estilista', 'demo-id', 1, '{"monday":{"start":"08:00","end":"20:00"}}', CURRENT_TIMESTAMP)`, (err) => {
                    if (err) console.log(`  - Staff: ${err.message}`);
                    else console.log("  ✅ Staff OK");
                });

                db.run(`INSERT OR IGNORE INTO "_StaffServices" ("A", "B") 
                        VALUES ('service-id', 'staff-id')`, (err) => {
                    if (err) console.log(`  - Relation: ${err.message}`);
                    else {
                        console.log("  ✅ Relation OK");
                        console.log(`✨ Restauración completada en ${dbPath}`);
                    }
                    db.close();
                    resolve();
                });
            });
        });
    });
}

async function run() {
    for (const db of dbs) {
        await restore(db);
    }
}

run();
