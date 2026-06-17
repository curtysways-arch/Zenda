const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
    console.log('--- MOSTRANDO PLANES EN SQLITE ---');
    db.all("SELECT id, name, price, trial_days, active, activo FROM Plan;", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log(JSON.stringify(rows, null, 2));
        }
    });
});

db.close();
