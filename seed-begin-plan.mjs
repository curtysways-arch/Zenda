import { Client } from "ssh2";

const VPS = "157.173.203.174";
const USER = "root";
const PASS = "Elmassuelto005624";
const REMOTE_BASE = "/opt/Zenda";

const conn = new Client();
conn.on("ready", () => {
  console.log("\n Conectado al VPS. Creando Plan Begin en la base de datos...\n");
  
  const nodeScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const { v4: uuidv4 } = require('uuid');

    async function main() {
      const existing = await prisma.plan.findFirst({
        where: {
          OR: [
            { name: { contains: 'Begin', mode: 'insensitive' } },
            { name: { contains: 'Inicial', mode: 'insensitive' } },
            { id: 'plan_begin' }
          ]
        }
      });

      if (existing) {
        console.log('El Plan Begin ya existe:', existing.id, existing.name);
        return;
      }

      const newPlan = await prisma.plan.create({
        data: {
          id: uuidv4(),
          name: 'Plan Begin',
          description: 'Plan inicial ideal para profesionales independientes. Incluye hasta 40 citas mensuales y 1 especialista.',
          price: 0,
          trial_days: 0,
          max_fields: 5,
          maxStaff: 1,
          max_reservations_per_month: 40,
          maxAppointmentsMonthly: 40,
          max_locations: 1,
          tournaments_enabled: false,
          automatic_discounts_enabled: false,
          courses_module: false,
          communications_module: false,
          is_recommended: false,
          activo: true,
          updated_at: new Date(),
          features: {
            custom_colors: true,
            custom_logo: true,
            loyalty_module: false,
            whatsapp_notifications: false,
            whatsapp_otp: false,
            whatsapp_reminders: false,
            whatsapp_campaigns: false
          }
        }
      });

      console.log('Plan Begin creado exitosamente:', newPlan.id, newPlan.name);
    }

    main()
      .catch(e => { console.error('Error:', e); process.exit(1); })
      .finally(() => prisma.$disconnect());
  `;

  const command = `cd ${REMOTE_BASE} && node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

  conn.exec(command, (err, stream) => {
    if (err) { console.error("Error al ejecutar:", err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d));
    stream.stderr.on("data", (d) => process.stderr.write(d));
    stream.on("close", (code) => {
      console.log(`\nProceso finalizado con codigo ${code}`);
      conn.end();
    });
  });
}).connect({ host: VPS, port: 22, username: USER, password: PASS });
