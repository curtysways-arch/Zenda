const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Cargar .env manualmente si existe
try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                let val = match[2].trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1);
                } else if (val.startsWith("'") && val.endsWith("'")) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        });
    }
} catch (e) {
    console.error('Error al cargar .env:', e);
}

function createPrismaClient() {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
        const { Pool } = require('pg');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new Pool({ connectionString: dbUrl });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    } else {
        const { createClient } = require('@libsql/client');
        const { PrismaLibSql } = require('@prisma/adapter-libsql');
        
        let resolvedUrl = dbUrl;
        if (!dbUrl.startsWith('file://')) {
            const rawPath = dbUrl.replace(/^file:(\.\/)?/, '');
            const isAbsolute = rawPath.startsWith('/') || rawPath.startsWith('\\') || /^[a-zA-Z]:/.test(rawPath);
            const absPath = isAbsolute ? rawPath : `${process.cwd()}/${rawPath}`;
            const normalized = absPath.split(/[/\\]/).join('/');
            const prefix = normalized.match(/^[a-zA-Z]:/) ? '/' : '';
            resolvedUrl = `file://${prefix}${normalized}`;
        }
        
        const client = createClient({ url: resolvedUrl });
        const adapter = new PrismaLibSql(client);
        return new PrismaClient({ adapter });
    }
}

const prisma = null;

// Replicar featureService.canUseFeature localmente para verificar la lógica exacta
function parseJson(raw) {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); }
        catch { return {}; }
    }
    return raw;
}

function resolvePlanTier(name) {
    const n = (name || '').toUpperCase();
    if (n.includes('BUSINESS') || n.includes('EMPRESARIAL') || n.includes('ILIMITADO')) return 'BUSINESS';
    if (n.includes('PRO')) return 'PRO';
    return 'BEGIN';
}

const DEFAULT_PLAN_CAPABILITIES = {
    BEGIN: { whatsapp_notifications: false, whatsapp_otp: false, whatsapp_reminders: false },
    PRO: { whatsapp_notifications: true, whatsapp_otp: true, whatsapp_reminders: true },
    BUSINESS: { whatsapp_notifications: true, whatsapp_otp: true, whatsapp_reminders: true }
};

function hasFeature(plan, feature) {
    if (!plan) return false;
    const featuresJson = parseJson(plan.features);
    if (typeof featuresJson[feature] === 'boolean') {
        return featuresJson[feature];
    }
    const tier = resolvePlanTier(plan.name || '');
    const defaults = DEFAULT_PLAN_CAPABILITIES[tier];
    return defaults[feature] ?? false;
}

async function canUseFeature(business, feature) {
    if (!business?.Suscripcion?.Plan) return false;
    const estado = (business.Suscripcion.estado || '').toLowerCase();
    if (estado === 'expired') {
        if (feature.startsWith('whatsapp')) return false;
    }

    const customFeatures = parseJson(business.Suscripcion.customFeatures);
    if (typeof customFeatures[feature] === 'boolean') {
        return customFeatures[feature];
    }

    if (estado === 'trial') {
        const planName = (business.Suscripcion.Plan.name || '').toUpperCase();
        if (planName.includes('PRO') || planName.includes('BUSINESS')) {
            const trialFeatures = ['whatsapp_notifications', 'whatsapp_otp', 'whatsapp_reminders'];
            if (trialFeatures.includes(feature)) {
                return true;
            }
        }
    }

    return hasFeature(business.Suscripcion.Plan, feature);
}

async function runTest() {
    try {
        console.log('🧪 Iniciando test de lógica de features y toggles...');

        // 1. Simulación de un plan con toggles en false
        const mockPlan = {
            name: 'Plan Pro Test',
            features: {
                whatsapp_notifications: false,
                whatsapp_otp: false,
                whatsapp_reminders: false
            }
        };

        // 2. Simulación de negocio en estado 'activa' (producción normal)
        const mockBusinessActive = {
            Suscripcion: {
                estado: 'activa',
                customFeatures: null,
                Plan: mockPlan
            }
        };

        // 3. Simulación de negocio en estado 'trial' (periodo de prueba)
        const mockBusinessTrial = {
            Suscripcion: {
                estado: 'trial',
                customFeatures: null,
                Plan: mockPlan
            }
        };

        console.log('\n--- CASO 1: Suscripción ACTIVA (Toggles desactivados en Plan Pro Test) ---');
        const activeNotif = await canUseFeature(mockBusinessActive, 'whatsapp_notifications');
        const activeOtp = await canUseFeature(mockBusinessActive, 'whatsapp_otp');
        const activeReminders = await canUseFeature(mockBusinessActive, 'whatsapp_reminders');
        console.log(`whatsapp_notifications (esperado: false) -> ${activeNotif}`);
        console.log(`whatsapp_otp (esperado: false) -> ${activeOtp}`);
        console.log(`whatsapp_reminders (esperado: false) -> ${activeReminders}`);

        console.log('\n--- CASO 2: Suscripción en TRIAL (Toggles desactivados en Plan Pro Test) ---');
        const trialNotif = await canUseFeature(mockBusinessTrial, 'whatsapp_notifications');
        const trialOtp = await canUseFeature(mockBusinessTrial, 'whatsapp_otp');
        const trialReminders = await canUseFeature(mockBusinessTrial, 'whatsapp_reminders');
        console.log(`whatsapp_notifications (esperado: true por beneficio trial) -> ${trialNotif}`);
        console.log(`whatsapp_otp (esperado: true por beneficio trial) -> ${trialOtp}`);
        console.log(`whatsapp_reminders (esperado: true por beneficio trial) -> ${trialReminders}`);

    } catch (e) {
        console.error(e);
    } finally {
        if (prisma) await prisma.$disconnect();
    }
}

runTest();
