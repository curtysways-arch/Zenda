const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.db');

db.serialize(() => {
  db.get("SELECT * FROM Cliente WHERE id = 'cmojew0ei007mtkw5hsxaqg4v'", (err, row) => {
    if (err) console.error(err);
    else console.log("Cliente MISTERIOSO:", row);
  });
});
db.close();
