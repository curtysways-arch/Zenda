const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');

async function run() {
    console.log(`🛠️ Restauración Premium en: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) return;
        
        db.serialize(() => {
            // Limpieza total
            db.run(`DELETE FROM "Reserva"`);
            db.run(`DELETE FROM "Cancha"`);
            db.run(`DELETE FROM "Staff"`);
            db.run(`DELETE FROM "Negocio"`);
            db.run(`DELETE FROM "TipoCancha"`);
            db.run(`DELETE FROM "_StaffServices"`);

            // 1. Negocio con branding completo
            db.run(`INSERT INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt", "colorPrimario", "colorSecundario", "colorNeutral", "saludoTitulo", "nombreFallback") 
                    VALUES ('demo-id', 'Spa & Wellness Center', 'demo-spa', 'Admin', '5215500000000', 'Av. Bienestar 456', 'Quito', 45, '08:00', '21:00', CURRENT_TIMESTAMP, '#db2777', '#1e293b', '#fff5f5', 'Hola', 'Radiante')`);

            // 2. Categorías
            db.run(`INSERT INTO "TipoCancha" ("id", "nombre", "negocioId", "updatedAt") VALUES ('cat-masajes', 'Masajes Relajantes', 'demo-id', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "TipoCancha" ("id", "nombre", "negocioId", "updatedAt") VALUES ('cat-faciales', 'Tratamientos Faciales', 'demo-id', CURRENT_TIMESTAMP)`);

            // 3. Servicios Reales
            db.run(`INSERT INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                    VALUES ('serv-1', 'Masaje Descontracturante', 60, 35, 1, 'demo-id', 'cat-masajes', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                    VALUES ('serv-2', 'Limpieza Facial Profunda', 45, 25, 1, 'demo-id', 'cat-faciales', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                    VALUES ('serv-3', 'Masaje con Piedras Volcánicas', 90, 55, 1, 'demo-id', 'cat-masajes', CURRENT_TIMESTAMP)`);

            // 4. Staff con Especialidades
            db.run(`INSERT INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                    VALUES ('staff-ana', 'Ana García', 'Terapeuta Senior', 'demo-id', 1, '{"monday":{"start":"08:00","end":"21:00"},"tuesday":{"start":"08:00","end":"21:00"},"wednesday":{"start":"08:00","end":"21:00"},"thursday":{"start":"08:00","end":"21:00"},"friday":{"start":"08:00","end":"21:00"},"saturday":{"start":"09:00","end":"18:00"}}', CURRENT_TIMESTAMP)`);

            // 5. Vincular Staff con Servicios
            db.run(`INSERT INTO "_StaffServices" ("A", "B") VALUES ('serv-1', 'staff-ana')`);
            db.run(`INSERT INTO "_StaffServices" ("A", "B") VALUES ('serv-2', 'staff-ana')`);
            db.run(`INSERT INTO "_StaffServices" ("A", "B") VALUES ('serv-3', 'staff-ana')`, (err) => {
                console.log("✅ Restauración Premium completada.");
                db.close();
            });
        });
    });
}

run();
