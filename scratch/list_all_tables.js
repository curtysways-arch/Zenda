const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbs = [
    path.join(__dirname, '../dev.db'),
    path.join(__dirname, '../prisma/dev.db')
];

async function listTables(dbPath) {
    return new Promise((resolve) => {
        console.log(`\n📂 Tablas en: ${dbPath}`);
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.log(`❌ Error: ${err.message}`);
                return resolve();
            }
            
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) {
                    console.log(`❌ Error al listar: ${err.message}`);
                } else {
                    console.log(rows.map(r => r.name).join(', '));
                }
                db.close();
                resolve();
            });
        });
    });
}

async function run() {
    for (const db of dbs) {
        await listTables(db);
    }
}

run();
