import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Sincronizando todos los slugs de negocios...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:./dev.db' });
    await client.execute("PRAGMA foreign_keys = OFF;");

    const slugMap = [
        { id: 'barber-co-alias-id', nombre: 'Barber & Co', slug: 'barber-co', tipo: 'RESERVA', blueprint: 'salon-spa-id' },
        { id: 'bella-nails-alias-id', nombre: 'Bella Nails Studio', slug: 'bella-nails', tipo: 'RESERVA', blueprint: 'salon-spa-id' },
        { id: 'dental-chip-alias-id', nombre: 'Dental Chip Clínica', slug: 'dental-chip', tipo: 'RESERVA', blueprint: 'salon-spa-id' },
        { id: 'vortex-fitness-alias-id', nombre: 'Vortex Fitness Club', slug: 'vortex-fitness', tipo: 'SPORTS_COURTS', blueprint: 'sports-center-id' },
        { id: 'symechas-alias-id', nombre: 'Symechas Peluquería', slug: 'symechas', tipo: 'RESERVA', blueprint: 'salon-spa-id' },
        { id: 'pincho-listo-alias-id', nombre: 'Pinchos y Asados Zenda', slug: 'pincho-listo', tipo: 'PRODUCTOS', blueprint: 'general-services-id' }
    ];

    for (const item of slugMap) {
        const check = await client.execute({
            sql: "SELECT id FROM Negocio WHERE slug = ?",
            args: [item.slug]
        });
        if (check.rows.length === 0) {
            console.log("Creando alias/negocio para slug:", item.slug);
            await client.execute({
                sql: \`INSERT INTO Negocio (
                    id, nombre, slug, businessTypeId, tipoNegocio, statusOverride, precioHora, horarioApertura, horarioCierre,
                    pagosActivos, pagoPorcentaje, tieneCafeteria, tieneParking, tieneWifi, tieneVestidores, tieneTienda,
                    moduloTorneos, estado, isDemo, mostrarPrecios, appointmentsUsed, billingStatus, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, 'AUTO', 0, '08:00', '20:00', 0, 0, 0, 0, 0, 0, 0, 0, 'ACTIVO', 1, 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\`,
                args: [item.id, item.nombre, item.slug, item.blueprint, item.tipo]
            });
        }
    }

    await client.execute("PRAGMA foreign_keys = ON;");

    const allNegs = await client.execute("SELECT id, nombre, slug FROM Negocio");
    console.log("=== TODOS LOS NEGOCIOS Y ALIAS ACTIVOS EN PRODUCCION ===");
    console.table(allNegs.rows);
}
run().catch(console.error);
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/sync_slugs.js\n${jsCode}\nEOF\ncd /opt/Zenda && node sync_slugs.js`, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    let out = "";
    stream.on("data", (data) => { out += data; });
    stream.stderr.on("data", (data) => { out += data; });
    stream.on("close", () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
