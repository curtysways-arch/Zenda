const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'dev.db'));

db.all("SELECT count(*) as count FROM Pedido", [], (err, rows) => {
  if (!err) {
    console.log(`TOTAL PEDIDOS RESTANTES EN BD: ${rows[0].count}`);
  }
});
