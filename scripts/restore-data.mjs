/**
 * Script de restauración de datos esenciales
 * Uso: node scripts/restore-data.mjs
 */
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = createClient({ url: process.env.DATABASE_URL });

function cuid() {
    return 'c' + randomBytes(8).toString('hex') + Date.now().toString(36);
}

async function main() {
    console.log('\n🌱 Restaurando datos esenciales...\n');

    // ─── 1. SUPER ADMIN ───────────────────────────────────────────
    const hashedPwd = await bcrypt.hash('superadmin123', 10);
    const superAdminId = cuid();
    await client.execute({
        sql: `INSERT OR IGNORE INTO Usuario (id, nombre, email, password, role, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [superAdminId, 'Super Admin', 'superadmin@cancha.com', hashedPwd, 'SUPER_ADMIN']
    });
    const saRow = await client.execute({ sql: `SELECT id FROM Usuario WHERE email = 'superadmin@cancha.com'`, args: [] });
    console.log('✅ Super Admin creado: superadmin@cancha.com / superadmin123');

    // ─── 2. PLAN PRO (con courses_module = 1) ─────────────────────
    const planId = cuid();
    await client.execute({
        sql: `INSERT OR IGNORE INTO Plan (id, name, description, price, trial_days, max_fields,
              max_reservations_per_month, tournaments_enabled, automatic_discounts_enabled,
              courses_module, max_locations, activo, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [planId, 'Plan Pro', 'Plan completo con todos los módulos', 59.99, 365, 10, 1000, 1, 1, 1, 5, 1]
    });
    const planRow = await client.execute({ sql: `SELECT id FROM Plan WHERE name = 'Plan Pro'`, args: [] });
    const foundPlanId = planRow.rows[0].id;
    console.log('✅ Plan Pro creado (courses_module activado)');

    // ─── 3. NEGOCIO DEMO ──────────────────────────────────────────
    const negocioId = cuid();
    await client.execute({
        sql: `INSERT OR IGNORE INTO Negocio (id, nombre, slug, whatsapp, direccion, horarioApertura, horarioCierre, precioHora, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [negocioId, 'Cancha Demo', 'demo', '0000000000', 'Ciudad Demo', '08:00', '22:00', 20]
    });
    const negRow = await client.execute({ sql: `SELECT id FROM Negocio WHERE slug = 'demo'`, args: [] });
    const foundNegId = negRow.rows[0].id;
    console.log(`✅ Negocio "Cancha Demo" creado (slug: demo)`);

    // ─── 4. ADMIN DEL NEGOCIO ─────────────────────────────────────
    const adminId = cuid();
    const adminPwd = await bcrypt.hash('admin123', 10);
    await client.execute({
        sql: `INSERT OR IGNORE INTO Usuario (id, nombre, email, password, role, negocioId, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [adminId, 'Admin Demo', 'admin@demo.com', adminPwd, 'ADMIN', foundNegId]
    });
    console.log('✅ Admin creado: admin@demo.com / admin123');

    // ─── 5. SUSCRIPCIÓN ACTIVA ────────────────────────────────────
    const suscId = cuid();
    await client.execute({
        sql: `INSERT OR IGNORE INTO Suscripcion (id, negocioId, planId, estado, fechaInicio, fechaFin, renovacion_automatica, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+1 year'), ?, datetime('now'), datetime('now'))`,
        args: [suscId, foundNegId, foundPlanId, 'active', 1]
    });
    console.log('✅ Suscripción activa por 1 año');

    // ─── 6. CANCHA ────────────────────────────────────────────────
    const canchaId = cuid();
    await client.execute({
        sql: `INSERT OR IGNORE INTO Cancha (id, nombre, tipo, precioHora, estaActiva, negocioId, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [canchaId, 'Cancha Principal', 'Fútbol', 20, 1, foundNegId]
    });
    const canchaRow = await client.execute({ sql: `SELECT id FROM Cancha WHERE negocioId = ? LIMIT 1`, args: [foundNegId] });
    const foundCanchaId = canchaRow.rows[0].id;
    console.log('✅ Cancha Principal creada');

    // ─── 7. CURSO DEMO ────────────────────────────────────────────
    const courseId = cuid();
    await client.execute({
        sql: `INSERT OR IGNORE INTO Course (id, name, description, price, payment_type, capacity, status, businessId, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [courseId, 'Escuela de Verano', 'Aprende fútbol con los mejores entrenadores de la región', 35, 'mensual', 20, 'active', foundNegId]
    });
    const courseRow = await client.execute({ sql: `SELECT id FROM Course WHERE businessId = ? LIMIT 1`, args: [foundNegId] });
    const foundCourseId = courseRow.rows[0].id;
    console.log('✅ Curso "Escuela de Verano" creado');

    // ─── 8. HORARIOS DEL CURSO ────────────────────────────────────
    await client.execute({
        sql: `INSERT OR IGNORE INTO CourseSchedule (id, day_of_week, start_time, end_time, courtId, courseId)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [cuid(), 1, '16:00', '18:00', foundCanchaId, foundCourseId]
    });
    await client.execute({
        sql: `INSERT OR IGNORE INTO CourseSchedule (id, day_of_week, start_time, end_time, courtId, courseId)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [cuid(), 3, '16:00', '18:00', foundCanchaId, foundCourseId]
    });
    console.log('✅ Horarios: Lunes y Miércoles 16:00–18:00');

    console.log('\n══════════════════════════════════════════════════\n');
    console.log('  SUPER ADMIN:   superadmin@cancha.com');
    console.log('  Contraseña:    superadmin123');
    console.log('  ─────────────────────────────────────────────────');
    console.log('  ADMIN NEGOCIO: admin@demo.com');
    console.log('  Contraseña:    admin123');
    console.log('  ─────────────────────────────────────────────────');
    console.log('  Negocio slug:  demo');
    console.log('  Página pública: http://localhost:3000/demo');
    console.log('  Panel admin:    http://localhost:3000/admin');
    console.log('\n══════════════════════════════════════════════════\n');

    await client.close();
}

main().catch(e => { console.error('❌ Error:', e.message, e.stack); process.exit(1); });
