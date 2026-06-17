const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const hasher = require('bcryptjs');

const dbPath = path.join(__dirname, '../dev.db');

async function run() {
    console.log(`🛠️ Restauración SINCRO (DEBUG) en: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) return;
        
        db.serialize(async () => {
            const BUSINESS_ID = 'cmmlfry6q0004l0w54cdbpyx9';
            const SLUG = 'demo-spa';

            // Limpieza TOTAL
            db.run(`DELETE FROM "Reserva"`);
            db.run(`DELETE FROM "Cancha"`);
            db.run(`DELETE FROM "Staff"`);
            db.run(`DELETE FROM "Negocio"`);
            db.run(`DELETE FROM "TipoCancha"`);
            db.run(`DELETE FROM "Suscripcion"`);
            db.run(`DELETE FROM "Plan"`);
            db.run(`DELETE FROM "Usuario"`);
            db.run(`DELETE FROM "_StaffServices"`);

            // 1. Negocio con manejo de error
            db.run(`INSERT INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt", "colorPrimario", "estado") 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`, 
                    [BUSINESS_ID, 'Spa Wellness', SLUG, 'Admin', '5215500000000', 'Calle Spa', 'Quito', 50, '08:00', '21:00', '#db2777', 'ACTIVO'], 
                    (err) => {
                        if (err) console.log("❌ Error Negocio:", err.message);
                        else console.log("✅ Negocio OK");
                    });

            // 2. Plan y Suscripción
            db.run(`INSERT INTO "Plan" ("id", "name", "price", "trial_days", "maxStaff", "maxAppointmentsMonthly") VALUES ('plan-pro', 'Plan Pro', 49.99, 30, 10, 1000)`);
            const fechaFin = new Date();
            fechaFin.setFullYear(fechaFin.getFullYear() + 1);
            db.run(`INSERT INTO "Suscripcion" ("id", "negocioId", "planId", "estado", "fechaInicio", "fechaFin", "createdAt", "updatedAt") 
                    VALUES ('sub-1', '${BUSINESS_ID}', 'plan-pro', 'active', CURRENT_TIMESTAMP, '${fechaFin.toISOString()}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

            // 3. Usuarios
            const pwd = await hasher.hash('admin123', 10);
            db.run(`INSERT INTO "Usuario" ("id", "nombre", "email", "password", "role", "negocioId", "createdAt", "updatedAt") 
                    VALUES ('user-demo', 'Admin Demo', 'demo@canchasaas.com', '${pwd}', 'ADMIN', '${BUSINESS_ID}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

            // 4. Servicios
            db.run(`INSERT INTO "TipoCancha" ("id", "nombre", "negocioId", "updatedAt") VALUES ('cat-1', 'Masajes', '${BUSINESS_ID}', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                    VALUES ('serv-1', 'Masaje Descontracturante', 60, 35, 1, '${BUSINESS_ID}', 'cat-1', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                    VALUES ('staff-ana', 'Ana García', 'Terapeuta', '${BUSINESS_ID}', 1, '{"monday":{"start":"08:00","end":"21:00"}}', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "_StaffServices" ("A", "B") VALUES ('serv-1', 'staff-ana')`, () => {
                console.log("🚀 Sync completed.");
                db.close();
            });
        });
    });
}

run();
