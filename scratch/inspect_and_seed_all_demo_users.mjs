import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";

const conn = new Client();
conn.on("ready", () => {
  console.log("Conectado al VPS. Sincronizando usuarios y contraseñas de todos los demos...");
  
  const jsCode = `
const { createClient } = require('@libsql/client');

async function run() {
    const client = createClient({ url: 'file:./dev.db' });
    await client.execute("PRAGMA foreign_keys = OFF;");

    const passHash = '$2b$10$KE/cLR3itUgUL4YY6W/RKuSh6gVJkCDO6pwwLHxJQ6v7ed7hPrPDi'; // admin123

    const demoUsers = [
        { id: 'user-demospa-id', nombre: 'Admin Aura Spa', email: 'demospa@gmail.com', negocioId: 'cmmlfry6q0004l0w54cdbpyx9', rol: 'ADMIN' },
        { id: 'user-cinthya-id', nombre: 'Cinthya Coello', email: 'cinthyasoledaf@gmail.com', negocioId: 'symechas-peluquera-id', rol: 'ADMIN' },
        { id: 'user-barberco-id', nombre: 'Admin Barber & Co', email: 'contacto@barberco.demo', negocioId: 'barber-co-alias-id', rol: 'ADMIN' },
        { id: 'user-bellanails-id', nombre: 'Admin Bella Nails', email: 'citas@bellanails.demo', negocioId: 'bella-nails-alias-id', rol: 'ADMIN' },
        { id: 'user-dentalchip-id', nombre: 'Admin Dental Chip', email: 'sonrisas@dentalchip.demo', negocioId: 'dental-chip-alias-id', rol: 'ADMIN' },
        { id: 'user-canchas-id', nombre: 'Admin Canchas El Dorado', email: 'canchas@citiox.com', negocioId: 'demo-canchas-id-100', rol: 'ADMIN' },
        { id: 'user-lavado-id', nombre: 'Admin Sneaker Wash', email: 'lavado@citiox.com', negocioId: 'sneaker-wash-id', rol: 'ADMIN' },
        { id: 'user-pinchos-id', nombre: 'Admin Pinchos Zenda', email: 'pinchos@citiox.com', negocioId: 'pinchos-test-id', rol: 'ADMIN' }
    ];

    for (const u of demoUsers) {
        const check = await client.execute({
            sql: "SELECT id FROM Usuario WHERE email = ?",
            args: [u.email]
        });
        if (check.rows.length === 0) {
            console.log("Creando usuario demo:", u.email);
            await client.execute({
                sql: \`INSERT INTO Usuario (
                    id, nombre, email, password, rol, status, provider, authType, negocioId, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, 'verified', 'credentials', 'manual', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\`,
                args: [u.id, u.nombre, u.email, passHash, u.rol, u.negocioId]
            });
        } else {
            console.log("Actualizando contraseña/negocioId de usuario demo:", u.email);
            await client.execute({
                sql: "UPDATE Usuario SET password = ?, negocioId = ?, status = 'verified' WHERE email = ?",
                args: [passHash, u.negocioId, u.email]
            });
        }
    }

    await client.execute("PRAGMA foreign_keys = ON;");

    const resUsers = await client.execute("SELECT id, nombre, email, rol, negocioId FROM Usuario");
    console.log("=== USUARIOS Y DEMOS DISPONIBLES EN PRODUCCIÓN ===");
    console.table(resUsers.rows);
}
run().catch(console.error);
  `;

  conn.exec(`cat << 'EOF' > /opt/Zenda/seed_demo_users.js\n${jsCode}\nEOF\ncd /opt/Zenda && node seed_demo_users.js`, (err, stream) => {
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
