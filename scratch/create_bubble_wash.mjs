import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const DB_URL = "postgresql://zenda_user:CitioxProd2024!@127.0.0.1:5432/zenda_db?schema=public";

const conn = new Client();
conn.on("ready", async () => {
  console.log("Conectado al VPS. Creando el negocio Bubble Wash en la base de datos...\n");

  function exec(cmd, label) {
    return new Promise((resolve, reject) => {
      if (label) console.log(`\n>>> ${label}`);
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = "";
        stream.on("data", (d) => { out += d; process.stdout.write(d); });
        stream.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
        stream.on("close", (code) => resolve({ out, code }));
      });
    });
  }

  try {
    const seedScript = `
import prisma from '../src/lib/prisma';

async function main() {
  const slug = 'lavado';
  
  const existing = await prisma.negocio.findUnique({ where: { slug } });
  
  const data = {
    nombre: 'Bubble Wash',
    propietario: 'Bubble Wash UIO',
    slug: slug,
    whatsapp: '0984114108',
    direccion: 'Carlos Mantilla Oe-4-99, San José de Morán (Frente al retén de policía y junto al Koko Rico)',
    ciudad: 'Quito',
    tipoNegocio: 'SHOE_CARE',
    colorPrimario: '#7c3aed',
    colorSecundario: '#4c1d95',
    colorTexto: '#ffffff',
    heroTitulo: 'Bubble Wash - Lavandería Inteligente',
    heroSubtitulo: 'Cambiamos nuestra imagen, tus zapatos como nuevos, siempre.',
    facebookUrl: 'https://www.facebook.com/p/Bubble-Wash-UIO-61577105515158/',
    emailContacto: 'contacto@bubblewash.ec',
    precioHora: 0,
    horarioApertura: '09:00',
    horarioCierre: '19:00',
    estado: 'ACTIVO',
    billingStatus: 'active',
    updatedAt: new Date(),
    configuracion: {
      tipoNegocio: 'SHOE_CARE',
      loyalty_module: true,
      custom_colors: true,
      custom_logo: true,
      delivery: true
    }
  };

  let negocio;
  if (existing) {
    negocio = await prisma.negocio.update({
      where: { slug },
      data
    });
    console.log('✅ Negocio Bubble Wash actualizado en DB:', negocio.id);
  } else {
    negocio = await prisma.negocio.create({
      data: {
        id: 'sneaker-wash-id',
        ...data,
        createdAt: new Date()
      }
    });
    console.log('✅ Negocio Bubble Wash creado en DB:', negocio.id);
  }

  // Crear servicios predeterminados si no existen
  const serviceCount = await prisma.service.count({ where: { negocioId: negocio.id } });
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          negocioId: negocio.id,
          nombre: 'Lavado Express',
          precio: 8.0,
          duracion: 30,
          estaActivo: true,
          updatedAt: new Date()
        },
        {
          id: crypto.randomUUID(),
          negocioId: negocio.id,
          nombre: 'Lavado Premium Completo',
          precio: 15.0,
          duracion: 60,
          estaActivo: true,
          updatedAt: new Date()
        },
        {
          id: crypto.randomUUID(),
          negocioId: negocio.id,
          nombre: 'Restauración y Customización',
          precio: 35.0,
          duracion: 120,
          estaActivo: true,
          updatedAt: new Date()
        }
      ]
    });
    console.log('✅ Servicios de lavado creados para Bubble Wash.');
  }

  // Asegurarnos que existe un usuario admin para Bubble Wash
  const adminEmail = 'admin@bubblewash.ec';
  const existingAdmin = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await import('bcryptjs').then(b => b.hash('Bubblewash2026!', 10));
    const adminUser = await prisma.usuario.create({
      data: {
        id: crypto.randomUUID(),
        nombre: 'Admin Bubble Wash',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN_NEGOCIO',
        status: 'verified',
        updatedAt: new Date()
      }
    });
    
    await prisma.adminUserNegocio.create({
      data: {
        id: crypto.randomUUID(),
        usuarioId: adminUser.id,
        negocioId: negocio.id,
        roleId: 'ADMIN_NEGOCIO'
      }
    });
    console.log('✅ Usuario admin creado para Bubble Wash:', adminEmail);
  }
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
`;

    // Escribir el script temporal en /opt/Zenda/scratch y ejecutarlo
    await exec(`cat << 'EOF' > /opt/Zenda/scratch/create_bw.ts\n${seedScript}\nEOF`, "Creando script temporal en VPS");
    await exec(`cd /opt/Zenda && DATABASE_URL="${DB_URL}" npx tsx /opt/Zenda/scratch/create_bw.ts 2>&1`, "Ejecutando script de creación de Bubble Wash");

  } catch (err) {
    console.error("Error al crear el negocio:", err);
  } finally {
    conn.end();
  }
});

conn.connect({ host: VPS, port: 22, username: USER, password: PASS });
