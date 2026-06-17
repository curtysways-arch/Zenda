const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
  db.get("SELECT * FROM Reserva WHERE id = '646fad42-a122-45b8-b296-1181eed68609'", (err, row) => {
    if (err) console.error(err);
    else console.log("Reserva ADMIN:", row);
  });
});
db.close();
