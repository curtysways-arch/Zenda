const Database = require('better-sqlite3');
const db = new Database('./dev.db');

console.log('--- SERVICE: serv-masaje-pro ---');
const service = db.prepare("SELECT id, nombre, precio, precioOriginal, precioHora FROM Service WHERE id = 'serv-masaje-pro'").get();
console.log(JSON.stringify(service, null, 2));

console.log('\n--- PROMOTIONS LINKED TO SERVICE ---');
const promos = db.prepare("SELECT p.* FROM Promotion p JOIN PromotionToService pts ON pts.promotionId = p.id WHERE pts.serviceId = 'serv-masaje-pro'").all();
console.log(JSON.stringify(promos, null, 2));

console.log('\n--- ALL PROMOTIONS (raw) ---');
const allPromos = db.prepare('SELECT id, titulo, estado, precioPromo, precioAnterior, fechaInicio, fechaFin, horaInicioValida, horaFinValida FROM Promotion LIMIT 20').all();
console.log(JSON.stringify(allPromos, null, 2));

console.log('\n--- PromotionToService links ---');
const links = db.prepare('SELECT * FROM PromotionToService LIMIT 20').all();
console.log(JSON.stringify(links, null, 2));

db.close();
