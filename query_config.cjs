const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

db.serialize(() => {
  db.all("SELECT * FROM GlobalConfig WHERE clave = 'NUMERO_WHATSAPP_ADMIN'", (err, rows) => {
    if (err) {
      console.error(err.message);
    }
    console.log(rows);
  });
});

db.close();
