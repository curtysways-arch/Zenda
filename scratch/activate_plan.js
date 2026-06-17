const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../dev.db');

async function run() {
    console.log(`🛠️ Activando Plan y Suscripción en: ${dbPath}`);
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) return;
        
        db.serialize(() => {
            // 1. Insertar Plan Pro
            db.run(`INSERT OR IGNORE INTO "Plan" ("id", "name", "price", "trial_days", "maxStaff", "maxAppointmentsMonthly") 
                    VALUES ('plan-pro', 'Plan Premium Spa', 49.99, 30, 10, 1000)`);

            // 2. Insertar Suscripción Activa para el negocio
            const fechaFin = new Date();
            fechaFin.setFullYear(fechaFin.getFullYear() + 1); // 1 año de vigencia
            const fechaFinStr = fechaFin.toISOString();

            db.run(`INSERT OR IGNORE INTO "Suscripcion" ("id", "negocioId", "planId", "estado", "fechaInicio", "fechaFin", "createdAt", "updatedAt") 
                    VALUES ('sub-demo', 'demo-id', 'plan-pro', 'active', CURRENT_TIMESTAMP, '${fechaFinStr}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, (err) => {
                if (err) console.log("❌ Error:", err.message);
                console.log("✅ Plan y Suscripción ACTIVADOS.");
                db.close();
            });
        });
    });
}

run();
