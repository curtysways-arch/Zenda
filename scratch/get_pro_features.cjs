const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
    console.log('--- FEATURES DE PLAN PRO ---');
    db.all("SELECT id, name, features FROM Plan WHERE id='plan_pro';", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log(JSON.stringify(rows, null, 2));
        }
    });
});

db.close();
