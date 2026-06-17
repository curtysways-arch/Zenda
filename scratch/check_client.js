const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
  db.get("SELECT * FROM Cliente WHERE id = 'fa769022-2115-4cce-a928-532a57d7716e'", (err, row) => {
    if (err) console.error(err);
    else console.log("Cliente:", row);
  });
});
db.close();
