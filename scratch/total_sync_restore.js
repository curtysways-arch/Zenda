const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const hasher = require('bcryptjs');

const dbPath = path.join(__dirname, '../dev.db');

async function run() {
    console.log(`🛠️ Restauración ULTIMA (Matching IDs) en: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) return;
        
        db.serialize(async () => {
            const BUSINESS_ID = 'cmmlfry6q0004l0w54cdbpyx9';
            const SLUG = 'demo-spa';

            // Limpieza
            db.run(`DELETE FROM "Reserva"`);
            db.run(`DELETE FROM "Cancha"`);
            db.run(`DELETE FROM "Staff"`);
            db.run(`DELETE FROM "Negocio"`);
            db.run(`DELETE FROM "TipoCancha"`);
            db.run(`DELETE FROM "Suscripcion"`);
            db.run(`DELETE FROM "Plan"`);
            db.run(`DELETE FROM "Usuario"`);
            db.run(`DELETE FROM "_StaffServices"`);

            // 1. Negocio con el ID exacto que espera el JWT del usuario
            db.run(`INSERT INTO "Negocio" ("id", "nombre", "slug", "propietario", "whatsapp", "direccion", "ciudad", "precioHora", "horarioApertura", "horarioCierre", "updatedAt", "colorPrimario", "estado") 
                    VALUES ('${BUSINESS_ID}', 'Spa & Wellness Center', '${SLUG}', 'Admin', '5215500000000', 'Av. Bienestar 456', 'Quito', 45, '08:00', '21:00', CURRENT_TIMESTAMP, '#db2777', 'ACTIVO')`);

            // 2. Plan y Suscripción
            db.run(`INSERT INTO "Plan" ("id", "name", "price", "trial_days", "maxStaff", "maxAppointmentsMonthly") VALUES ('plan-pro', 'Plan Pro', 49.99, 30, 10, 1000)`);
            const fechaFin = new Date();
            fechaFin.setFullYear(fechaFin.getFullYear() + 1);
            db.run(`INSERT INTO "Suscripcion" ("id", "negocioId", "planId", "estado", "fechaInicio", "fechaFin", "createdAt", "updatedAt") 
                    VALUES ('sub-1', '${BUSINESS_ID}', 'plan-pro', 'active', CURRENT_TIMESTAMP, '${fechaFin.toISOString()}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

            // 3. Usuarios (para que puedan loguearse si cierran sesión)
            const pwd = await hasher.hash('admin123', 10);
            db.run(`INSERT INTO "Usuario" ("id", "nombre", "email", "password", "role", "negocioId", "createdAt", "updatedAt") 
                    VALUES ('user-demo', 'Admin Demo', 'demo@canchasaas.com', '${pwd}', 'ADMIN', '${BUSINESS_ID}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Usuario" ("id", "nombre", "email", "password", "role", "negocioId", "createdAt", "updatedAt") 
                    VALUES ('user-curty', 'Fernando', 'curtysways@gmail.com', '${pwd}', 'USER', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

            // 4. Servicios y Staff
            db.run(`INSERT INTO "TipoCancha" ("id", "nombre", "negocioId", "updatedAt") VALUES ('cat-1', 'Masajes', '${BUSINESS_ID}', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                    VALUES ('serv-1', 'Masaje Descontracturante', 60, 35, 1, '${BUSINESS_ID}', 'cat-1', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                    VALUES ('staff-ana', 'Ana García', 'Terapeuta', '${BUSINESS_ID}', 1, '{"monday":{"start":"08:00","end":"21:00"}}', CURRENT_TIMESTAMP)`);
            db.run(`INSERT INTO "_StaffServices" ("A", "B") VALUES ('serv-1', 'staff-ana')`, () => {
                console.log("✅ Restauración TOTAL completada con IDs síncronos.");
                db.close();
            });
        });
    });
}

run();
