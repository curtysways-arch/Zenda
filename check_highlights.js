const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/PC/Desktop/Video MetalOS/Spa/dev.db');

db.all("SELECT id, image FROM HighlightItem LIMIT 5", (err, rows) => {
  if (err) console.error(err);
  else console.log('HighlightItem:', rows);
  db.close();
});
