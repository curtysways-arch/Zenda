const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
  db.get("SELECT * FROM Reserva WHERE id = '7801d783-c1bf-4595-9dad-cc0ce11d2fb6'", (err, row) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("Reserva:", row);
  });
});
db.close();
