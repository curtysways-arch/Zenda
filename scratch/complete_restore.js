const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db', (err) => {
    const BUSINESS_ID = 'cmmlfry6q0004l0w54cdbpyx9';
    db.serialize(() => {
        // 1. Plan y Suscripción
        db.run(`INSERT OR IGNORE INTO "Plan" ("id", "name", "price", "trial_days", "maxStaff", "maxAppointmentsMonthly") VALUES ('plan-pro', 'Plan Pro', 49.99, 30, 10, 1000)`);
        const fechaFin = new Date();
        fechaFin.setFullYear(fechaFin.getFullYear() + 1);
        db.run(`INSERT OR IGNORE INTO "Suscripcion" ("id", "negocioId", "planId", "estado", "fechaInicio", "fechaFin", "createdAt", "updatedAt") 
                VALUES ('sub-1', '${BUSINESS_ID}', 'plan-pro', 'active', CURRENT_TIMESTAMP, '${fechaFin.toISOString()}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

        // 2. Servicios
        db.run(`INSERT OR IGNORE INTO "TipoCancha" ("id", "nombre", "negocioId", "updatedAt") VALUES ('cat-1', 'Masajes', '${BUSINESS_ID}', CURRENT_TIMESTAMP)`);
        db.run(`INSERT OR IGNORE INTO "Cancha" ("id", "nombre", "duracion", "precio", "estaActivo", "negocioId", "categoryId", "updatedAt") 
                VALUES ('serv-1', 'Masaje Descontracturante', 60, 35, 1, '${BUSINESS_ID}', 'cat-1', CURRENT_TIMESTAMP)`);
        db.run(`INSERT OR IGNORE INTO "Staff" ("id", "name", "role", "businessId", "active", "workingHours", "updatedAt") 
                VALUES ('staff-ana', 'Ana García', 'Terapeuta', '${BUSINESS_ID}', 1, '{"monday":{"start":"08:00","end":"21:00"}}', CURRENT_TIMESTAMP)`);
        db.run(`INSERT OR IGNORE INTO "_StaffServices" ("A", "B") VALUES ('serv-1', 'staff-ana')`, (err) => {
            console.log("✅ Datos adicionales inyectados.");
            db.close();
        });
    });
});
