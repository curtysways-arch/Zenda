const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');

async function run() {
    console.log(`🛠️ Restaurando Negocio (Nombres REALES de Tablas) en: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.log(`❌ Error: ${err.message}`);
            process.exit(1);
        }
        
        db.serialize(() => {
            // 1. Limpiar cualquier residuo de las tablas principales
            db.run(`DELETE FROM "Reserva"`);
            db.run(`DELETE FROM "Cancha"`);
            db.run(`DELETE FROM "Staff"`);
            db.run(`DELETE FROM "Negocio"`);
            db.run(`DELETE FROM "TipoCancha"`);

            // 2. Insertar Negocio
            db.run(`INSERT INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt") 
                    VALUES ('demo-id', 'Demo Spa & Bienestar', 'demo-spa', 'Admin Demo', '5215500000000', 'Calle Ficticia 123', 'CDMX', 50, '08:00', '20:00', CURRENT_TIMESTAMP)`);

            // 3. Insertar TipoCancha (Category)
            db.run(`INSERT INTO "TipoCancha" ("id", "nombre", "businessId", "updatedAt") 
                    VALUES ('cat-id', 'Masajes', 'demo-id', CURRENT_TIMESTAMP)`);

            // 4. Insertar Cancha (Service)
            // Nota: He visto que las columnas son: id, nombre, duracion, precio, estaActivo, negocioId, categoryId, updatedAt
            db.run(`INSERT INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                    VALUES ('service-id', 'Corte de cabello', 50, 8, 1, 'demo-id', 'cat-id', CURRENT_TIMESTAMP)`);

            // 5. Insertar Staff
            db.run(`INSERT INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                    VALUES ('staff-id', 'Ana García', 'Estilista', 'demo-id', 1, '{"monday":{"start":"08:00","end":"20:00"}}', CURRENT_TIMESTAMP)`);

            // 6. Relación Staff-Cancha
            db.run(`INSERT INTO "_StaffServices" ("A", "B") 
                    VALUES ('service-id', 'staff-id')`, (err) => {
                if (err) console.log("⚠️ Error en relación:", err.message);
                console.log("✅ Restauración REAL completada con éxito.");
                db.close();
            });
        });
    });
}

run();
