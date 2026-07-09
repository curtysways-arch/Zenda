/**
 * Seed del Sistema de Roles y Permisos Enterprise (SaaS)
 * Ejecutar: npx tsx prisma/seed-admin.ts
 * 
 * Crea:
 *   - Los permisos base organizados por módulos y acciones
 *   - El rol de "Propietario" con todos los permisos habilitados
 *   - Los equipos base del SaaS
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Prisma 7 requiere un driver adapter explícito
const pool = new Pool({ connectionString: process.env['DATABASE_URL']! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


// ─── Definición de Permisos por Módulo ───────────────────────────────────────

const PERMISSIONS = [
    // Dashboard
    { modulo: 'Dashboard', accion: 'Ver', codigo: 'DASHBOARD_VER', nombre: 'Ver Dashboard', critico: false },

    // Negocios
    { modulo: 'Negocios', accion: 'Ver', codigo: 'NEGOCIOS_VER', nombre: 'Ver Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Crear', codigo: 'NEGOCIOS_CREAR', nombre: 'Crear Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Editar', codigo: 'NEGOCIOS_EDITAR', nombre: 'Editar Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Suspender', codigo: 'NEGOCIOS_SUSPENDER', nombre: 'Suspender Negocios', critico: true },
    { modulo: 'Negocios', accion: 'Eliminar', codigo: 'NEGOCIOS_ELIMINAR', nombre: 'Eliminar Negocios', critico: true },
    { modulo: 'Negocios', accion: 'Exportar', codigo: 'NEGOCIOS_EXPORTAR', nombre: 'Exportar datos de Negocios', critico: false },
    { modulo: 'Negocios', accion: 'Impersonar', codigo: 'NEGOCIOS_IMPERSONAR', nombre: 'Impersonar como dueño del negocio', critico: true },

    // Planes
    { modulo: 'Planes', accion: 'Ver', codigo: 'PLANES_VER', nombre: 'Ver Planes', critico: false },
    { modulo: 'Planes', accion: 'Crear', codigo: 'PLANES_CREAR', nombre: 'Crear Planes', critico: false },
    { modulo: 'Planes', accion: 'Editar', codigo: 'PLANES_EDITAR', nombre: 'Editar Planes', critico: false },
    { modulo: 'Planes', accion: 'Eliminar', codigo: 'PLANES_ELIMINAR', nombre: 'Eliminar Planes', critico: true },
    { modulo: 'Planes', accion: 'Cambiar Precios', codigo: 'PLANES_PRECIOS', nombre: 'Cambiar Precios de Planes', critico: true },

    // Facturación
    { modulo: 'Facturación', accion: 'Ver', codigo: 'PAGOS_VER', nombre: 'Ver Pagos', critico: false },
    { modulo: 'Facturación', accion: 'Aprobar', codigo: 'PAGOS_APROBAR', nombre: 'Aprobar Comprobantes de Pago', critico: true },
    { modulo: 'Facturación', accion: 'Reembolsar', codigo: 'PAGOS_REEMBOLSAR', nombre: 'Realizar Reembolsos', critico: true },

    // Suscripciones
    { modulo: 'Suscripciones', accion: 'Ver', codigo: 'SUSCRIPCIONES_VER', nombre: 'Ver Suscripciones', critico: false },
    { modulo: 'Suscripciones', accion: 'Gestionar', codigo: 'SUSCRIPCIONES_GESTIONAR', nombre: 'Gestionar Suscripciones', critico: true },

    // Comunicaciones
    { modulo: 'Comunicaciones', accion: 'Ver', codigo: 'COMUNICACIONES_VER', nombre: 'Ver Campañas', critico: false },
    { modulo: 'Comunicaciones', accion: 'Crear', codigo: 'COMUNICACIONES_CREAR', nombre: 'Crear Campañas', critico: false },
    { modulo: 'Comunicaciones', accion: 'Enviar', codigo: 'COMUNICACIONES_ENVIAR', nombre: 'Enviar Campañas Globales', critico: true },
    { modulo: 'Comunicaciones', accion: 'WhatsApp', codigo: 'WHATSAPP_CONFIG', nombre: 'Configurar WhatsApp API', critico: true },
    { modulo: 'Comunicaciones', accion: 'Notificaciones', codigo: 'NOTIFICACIONES_ENVIAR', nombre: 'Enviar Push Notifications', critico: false },

    // Analytics
    { modulo: 'Analytics', accion: 'Ver', codigo: 'ANALYTICS_VER', nombre: 'Ver Métricas y Reportes', critico: false },
    { modulo: 'Analytics', accion: 'Exportar', codigo: 'ANALYTICS_EXPORTAR', nombre: 'Exportar Reportes', critico: false },

    // Referidos
    { modulo: 'Referidos', accion: 'Ver', codigo: 'REFERIDOS_VER', nombre: 'Ver Programa de Referidos', critico: false },
    { modulo: 'Referidos', accion: 'Gestionar', codigo: 'REFERIDOS_GESTIONAR', nombre: 'Gestionar Referidos', critico: false },

    // Solicitudes
    { modulo: 'Solicitudes', accion: 'Ver', codigo: 'SOLICITUDES_VER', nombre: 'Ver Solicitudes de Planes', critico: false },
    { modulo: 'Solicitudes', accion: 'Gestionar', codigo: 'SOLICITUDES_GESTIONAR', nombre: 'Aprobar/Rechazar Solicitudes', critico: true },

    // Sistema
    { modulo: 'Sistema', accion: 'Logs', codigo: 'SISTEMA_LOGS', nombre: 'Ver Auditoría y Logs del Sistema', critico: false },
    { modulo: 'Sistema', accion: 'Config', codigo: 'SISTEMA_CONFIG', nombre: 'Modificar Configuración del SaaS', critico: true },
    { modulo: 'Sistema', accion: 'VPS', codigo: 'SISTEMA_VPS', nombre: 'Acceso VPS y Backups', critico: true },

    // Equipo
    { modulo: 'Equipo', accion: 'Ver', codigo: 'EQUIPO_VER', nombre: 'Ver Usuarios del Equipo', critico: false },
    { modulo: 'Equipo', accion: 'Crear', codigo: 'EQUIPO_CREAR', nombre: 'Crear Usuarios del Equipo', critico: true },
    { modulo: 'Equipo', accion: 'Editar', codigo: 'EQUIPO_EDITAR', nombre: 'Editar Usuarios del Equipo', critico: true },
    { modulo: 'Equipo', accion: 'Eliminar', codigo: 'EQUIPO_ELIMINAR', nombre: 'Eliminar Usuarios del Equipo', critico: true },
    { modulo: 'Equipo', accion: 'Roles', codigo: 'EQUIPO_ROLES', nombre: 'Gestionar Roles y Permisos', critico: true },
    { modulo: 'Equipo', accion: 'Impersonar', codigo: 'EQUIPO_IMPERSONAR', nombre: 'Impersonar miembros del equipo', critico: true },
];

// ─── Definición de Equipos Base ──────────────────────────────────────────────

const TEAMS = [
    { nombre: 'Equipo Comercial', descripcion: 'Vendedores y ejecutivos de cuenta', color: '#10b981' },
    { nombre: 'Equipo Soporte', descripcion: 'Soporte técnico y atención al cliente', color: '#6366f1' },
    { nombre: 'Equipo Marketing', descripcion: 'Campañas, comunicaciones y crecimiento', color: '#f59e0b' },
    { nombre: 'Equipo Finanzas', descripcion: 'Facturación, pagos y reportes financieros', color: '#3b82f6' },
    { nombre: 'Equipo Desarrollo', descripcion: 'Ingeniería, sistemas y VPS', color: '#8b5cf6' },
];

// ─── Definición de Roles Base ─────────────────────────────────────────────────

const ROLES = [
    {
        nombre: 'Propietario',
        descripcion: 'Acceso total al sistema. No puede ser eliminado.',
        color: '#ec4899',
        icono: 'Crown',
        jerarquia: 1,
        allPermissions: true,
    },
    {
        nombre: 'Director',
        descripcion: 'Acceso amplio a la mayoría de módulos del SaaS.',
        color: '#8b5cf6',
        icono: 'Shield',
        jerarquia: 10,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'NEGOCIOS_VER', 'NEGOCIOS_CREAR', 'NEGOCIOS_EDITAR',
            'PLANES_VER', 'PAGOS_VER', 'SUSCRIPCIONES_VER', 'ANALYTICS_VER',
            'ANALYTICS_EXPORTAR', 'REFERIDOS_VER', 'SOLICITUDES_VER',
            'SOLICITUDES_GESTIONAR', 'COMUNICACIONES_VER', 'EQUIPO_VER',
        ],
    },
    {
        nombre: 'Ventas',
        descripcion: 'Gestión de negocios y prospección de clientes.',
        color: '#10b981',
        icono: 'TrendingUp',
        jerarquia: 50,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'NEGOCIOS_VER', 'NEGOCIOS_CREAR', 'NEGOCIOS_EDITAR',
            'PLANES_VER', 'SUSCRIPCIONES_VER', 'SOLICITUDES_VER',
        ],
    },
    {
        nombre: 'Soporte',
        descripcion: 'Atención al cliente y resolución de tickets.',
        color: '#6366f1',
        icono: 'Headphones',
        jerarquia: 60,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'NEGOCIOS_VER', 'NEGOCIOS_EDITAR',
            'PAGOS_VER', 'SUSCRIPCIONES_VER',
        ],
    },
    {
        nombre: 'Marketing',
        descripcion: 'Campañas, notificaciones y crecimiento de usuarios.',
        color: '#f59e0b',
        icono: 'Megaphone',
        jerarquia: 70,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'COMUNICACIONES_VER', 'COMUNICACIONES_CREAR',
            'COMUNICACIONES_ENVIAR', 'NOTIFICACIONES_ENVIAR', 'ANALYTICS_VER',
            'REFERIDOS_VER', 'REFERIDOS_GESTIONAR',
        ],
    },
    {
        nombre: 'Finanzas',
        descripcion: 'Revisión y aprobación de pagos y suscripciones.',
        color: '#3b82f6',
        icono: 'DollarSign',
        jerarquia: 80,
        allPermissions: false,
        permissions: [
            'DASHBOARD_VER', 'PAGOS_VER', 'PAGOS_APROBAR', 'SUSCRIPCIONES_VER',
            'ANALYTICS_VER', 'ANALYTICS_EXPORTAR',
        ],
    },
    {
        nombre: 'Operador',
        descripcion: 'Acceso básico de lectura al panel.',
        color: '#64748b',
        icono: 'User',
        jerarquia: 999,
        allPermissions: false,
        permissions: ['DASHBOARD_VER', 'NEGOCIOS_VER'],
    },
];

async function main() {
    console.log('🚀 Iniciando seed del sistema de Roles y Permisos...\n');

    // 1. Crear Permisos
    console.log('📋 Creando permisos...');
    for (const perm of PERMISSIONS) {
        await prisma.adminPermission.upsert({
            where: { codigo: perm.codigo },
            update: {
                modulo: perm.modulo,
                accion: perm.accion,
                nombre: perm.nombre,
                critico: perm.critico,
            },
            create: {
                modulo: perm.modulo,
                accion: perm.accion,
                codigo: perm.codigo,
                nombre: perm.nombre,
                critico: perm.critico,
            },
        });
    }
    console.log(`   ✓ ${PERMISSIONS.length} permisos creados/actualizados\n`);

    // 2. Crear Equipos
    console.log('👥 Creando equipos...');
    for (const team of TEAMS) {
        await prisma.adminTeam.upsert({
            where: { nombre: team.nombre },
            update: { descripcion: team.descripcion, color: team.color },
            create: team,
        });
    }
    console.log(`   ✓ ${TEAMS.length} equipos creados/actualizados\n`);

    // 3. Crear Roles
    console.log('🔐 Creando roles...');
    const allPermissions = await prisma.adminPermission.findMany();

    for (const rolDef of ROLES) {
        const { allPermissions: grantAll, permissions: permCodes, ...rolData } = rolDef as any;

        const rol = await prisma.adminRole.upsert({
            where: { nombre: rolDef.nombre },
            update: { descripcion: rolDef.descripcion, color: rolDef.color, icono: rolDef.icono, jerarquia: rolDef.jerarquia },
            create: rolData,
        });

        // Asignar permisos al rol
        const targetPerms = grantAll
            ? allPermissions
            : allPermissions.filter(p => permCodes?.includes(p.codigo));

        for (const perm of targetPerms) {
            await prisma.adminRolePermission.upsert({
                where: { rolId_permisoId: { rolId: rol.id, permisoId: perm.id } },
                update: {},
                create: { rolId: rol.id, permisoId: perm.id },
            });
        }

        console.log(`   ✓ Rol "${rol.nombre}" con ${targetPerms.length} permisos`);
    }

    // 4. Crear usuario propietario por defecto (si no existe)
    console.log('\n👤 Verificando usuario propietario...');
    const propietarioRol = await prisma.adminRole.findUnique({ where: { nombre: 'Propietario' } });

    if (propietarioRol) {
        const existing = await prisma.adminUser.findUnique({ where: { email: 'superadmin@cancha.com' } });
        if (!existing) {
            const hashedPass = await bcrypt.hash('superadmin123', 10);
            await prisma.adminUser.create({
                data: {
                    nombre: 'Super',
                    apellido: 'Admin',
                    email: 'superadmin@cancha.com',
                    password: hashedPass,
                    activo: true,
                    estado: 'ACTIVO',
                    scope: 'GLOBAL',
                    rolId: propietarioRol.id,
                },
            });
            console.log('   ✓ Usuario propietario creado: superadmin@cancha.com');
        } else {
            console.log('   ✓ Usuario propietario ya existe');
        }
    }

    console.log('\n✅ Seed completado con éxito!');
}

main()
    .catch(e => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

