const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'dev.db'));

db.serialize(() => {
  db.all('SELECT id, nombre, slug FROM Negocio', [], (err, negocios) => {
    console.log('=== TODOS LOS NEGOCIOS EN BD ===');
    console.log(negocios);

    db.all('SELECT id, negocioId, numeroPedido, codigo, nombreCliente, estado, total FROM Pedido', [], (err, pedidos) => {
      console.log('=== TODOS LOS PEDIDOS EN BD ===');
      console.log(pedidos);
    });
  });
});
