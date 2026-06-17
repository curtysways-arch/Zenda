const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbs = [
    path.join(__dirname, '../dev.db'),
    path.join(__dirname, '../prisma/dev.db')
];

async function restore(dbPath) {
    return new Promise((resolve) => {
        console.log(`🛠️ Restaurando en: ${dbPath}`);
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) return resolve();
            
            db.serialize(() => {
                // Negocio
                db.run(`INSERT OR IGNORE INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt") 
                        VALUES ('demo-id', 'Demo Spa & Bienestar', 'demo-spa', 'Admin Demo', '5215500000000', 'Calle Ficticia 123', 'CDMX', 50, '08:00', '20:00', CURRENT_TIMESTAMP)`);

                // Staff
                db.run(`INSERT OR IGNORE INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                        VALUES ('staff-id', 'Ana García', 'Estilista', 'demo-id', 1, '{"monday":{"start":"08:00","end":"20:00"}}', CURRENT_TIMESTAMP)`);

                // Cancha (Service)
                db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "descripcion", "precio", "duracion", "businessId", "categoryId", "updatedAt") 
                        VALUES ('service-id', 'Corte de cabello', 'Corte profesional', 8, 50, 'demo-id', 'cat-id', CURRENT_TIMESTAMP)`, (err) => {
                    // Si falla por columna faltante, intentamos sin descripcion
                    if (err) {
                        db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "precio", "duracion", "businessId", "categoryId", "updatedAt") 
                                VALUES ('service-id', 'Corte de cabello', 8, 50, 'demo-id', 'cat-id', CURRENT_TIMESTAMP)`);
                    }
                });

                db.run(`INSERT OR IGNORE INTO "_StaffServices" ("A", "B") 
                        VALUES ('service-id', 'staff-id')`, () => {
                    console.log(`✅ OK: ${dbPath}`);
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
