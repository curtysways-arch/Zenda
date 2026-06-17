const path = require('path');
const { createClient } = require('@libsql/client');
const dbPath = path.resolve(process.cwd(), 'dev.db');
const urlPath = dbPath.replace(/\\/g, '/');
const url = urlPath.startsWith('/') ? ('file://' + urlPath) : ('file:///' + urlPath);
const client = createClient({ url });

async function main() {
    // All services to see what's there
    const s = await client.execute({ sql: 'SELECT id, nombre, precio FROM Cancha LIMIT 20', args: [] });
    console.log('ALL SERVICES:');
    s.rows.forEach(r => console.log(' ', JSON.stringify({ id: r[0], nombre: r[1], precio: r[2] })));

    const p = await client.execute({ sql: 'SELECT id, titulo, estado, precioPromo, precioAnterior, horaInicioValida, horaFinValida, fechaInicio, fechaFin FROM Promotion', args: [] });
    console.log('\nALL PROMOTIONS:');
    p.rows.forEach(r => console.log(' ', JSON.stringify({ id: r[0], titulo: r[1], estado: r[2], precioPromo: r[3], precioAnterior: r[4], horaInicio: r[5], horaFin: r[6], fechaInicio: r[7], fechaFin: r[8] })));

    const l = await client.execute({ sql: 'SELECT * FROM _PromotionToService', args: [] });
    console.log('\nPROMO LINKS:');
    l.rows.forEach(r => console.log(' ', JSON.stringify(r)));

    client.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
