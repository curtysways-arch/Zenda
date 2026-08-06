import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Insertando Symechas Peluquería con PRAGMA foreign_keys = OFF...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:./dev.db' });
    await client.execute("PRAGMA foreign_keys = OFF;");
    
    const checkSymechas = await client.execute("SELECT id FROM Negocio WHERE slug = 'symechas-peluquera'");
    if (checkSymechas.rows.length === 0) {
        console.log("Insertando Symechas Peluquería...");
        await client.execute(\`
            INSERT INTO Negocio (
                id, nombre, slug, businessTypeId, tipoNegocio, statusOverride, precioHora, horarioApertura, horarioCierre,
                pagosActivos, pagoPorcentaje, tieneCafeteria, tieneParking, tieneWifi, tieneVestidores, tieneTienda,
                moduloTorneos, estado, isDemo, mostrarPrecios, appointmentsUsed, billingStatus, createdAt, updatedAt
            ) VALUES (
                'symechas-peluquera-id', 'Symechas Peluquería', 'symechas-peluquera', 'salon-spa-id', 'PELUQUERIA', 'AUTO',
                0, '08:00', '20:00', 0, 0, 0, 0, 0, 0, 0, 0, 'ACTIVO', 0, 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        \`);
        
        await client.execute(\`
            UPDATE Usuario SET negocioId = 'symechas-peluquera-id' WHERE email = 'cinthyasoledaf@gmail.com'
        \`);
    } else {
        console.log("Symechas Peluquería ya existía.");
    }

    await client.execute("PRAGMA foreign_keys = ON;");

    const resFinal = await client.execute("SELECT id, nombre, slug, tipoNegocio FROM Negocio");
    console.log("=== TODOS LOS NEGOCIOS EN PRODUCCIÓN (dev.db) ===");
    console.table(resFinal.rows);
}
run().catch(console.error);
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/ensure_symechas.js\n${jsCode}\nEOF\ncd /opt/Zenda && node ensure_symechas.js`, (err, stream) => {
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
