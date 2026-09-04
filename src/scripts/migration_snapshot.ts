import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

export interface ProtectedSubscription {
    id: string;
    negocioId: string;
    planId: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    trial_inicio: string | null;
    trial_fin: string | null;
    isFounder: boolean;
    founderPosition: number | null;
    lockedPrice: number | null;
    customFeatures: any;
}

export interface CommercialSnapshot {
    timestamp: string;
    subscriptions: ProtectedSubscription[];
    globalConfigs: { clave: string; valor: string }[];
    referralCounts: {
        campaigns: number;
        codes: number;
        events: number;
        rewards: number;
    };
}

export async function takeCommercialSnapshot(): Promise<CommercialSnapshot> {
    const rawSubs = await prisma.suscripcion.findMany({
        orderBy: { id: 'asc' }
    });

    const subscriptions: ProtectedSubscription[] = rawSubs.map(s => ({
        id: s.id,
        negocioId: s.negocioId,
        planId: s.planId,
        estado: s.estado,
        fechaInicio: s.fechaInicio.toISOString(),
        fechaFin: s.fechaFin.toISOString(),
        trial_inicio: s.trial_inicio ? s.trial_inicio.toISOString() : null,
        trial_fin: s.trial_fin ? s.trial_fin.toISOString() : null,
        isFounder: Boolean(s.isFounder),
        founderPosition: s.founderPosition ?? null,
        lockedPrice: s.lockedPrice ?? null,
        customFeatures: s.customFeatures ?? null
    }));

    const globalConfigs = await prisma.globalConfig.findMany({
        where: { clave: { in: ['FOUNDER_LOCKED_PRICE', 'FOUNDER_MAX'] } },
        select: { clave: true, valor: true },
        orderBy: { clave: 'asc' }
    });

    const [campaigns, codes, events, rewards] = await Promise.all([
        prisma.referralCampaign.count().catch(() => 0),
        prisma.referralCode.count().catch(() => 0),
        prisma.referralEvent.count().catch(() => 0),
        prisma.referralReward.count().catch(() => 0)
    ]);

    return {
        timestamp: new Date().toISOString(),
        subscriptions,
        globalConfigs,
        referralCounts: { campaigns, codes, events, rewards }
    };
}

async function main() {
    const mode = process.argv[2] || 'pre'; // 'pre', 'post', or 'compare'
    const snapshotDir = path.join(process.cwd(), 'snapshots');
    if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const preFile = path.join(snapshotDir, 'pre_migration_snapshot.json');
    const postFile = path.join(snapshotDir, 'post_migration_snapshot.json');
    const reportFile = path.join(snapshotDir, 'audit_report.json');

    if (mode === 'pre') {
        const snap = await takeCommercialSnapshot();
        fs.writeFileSync(preFile, JSON.stringify(snap, null, 2), 'utf-8');
        console.log(`✅ Pre-migration snapshot saved: ${snap.subscriptions.length} subscriptions captured.`);
    } else if (mode === 'post' || mode === 'compare') {
        if (!fs.existsSync(preFile)) {
            console.error(`❌ Pre-migration snapshot file not found at ${preFile}`);
            process.exit(1);
        }

        const preSnap: CommercialSnapshot = JSON.parse(fs.readFileSync(preFile, 'utf-8'));
        const postSnap = await takeCommercialSnapshot();
        fs.writeFileSync(postFile, JSON.stringify(postSnap, null, 2), 'utf-8');

        // Compare protected fields
        let subscriptionsChanged = 0;
        const subDifferences: any[] = [];

        preSnap.subscriptions.forEach(preSub => {
            const postSub = postSnap.subscriptions.find(s => s.id === preSub.id);
            if (!postSub) {
                subscriptionsChanged++;
                subDifferences.push({ id: preSub.id, error: 'Subscription missing in post-migration' });
                return;
            }

            const diffs: string[] = [];
            if (preSub.negocioId !== postSub.negocioId) diffs.push('negocioId');
            if (preSub.planId !== postSub.planId) diffs.push('planId');
            if (preSub.estado !== postSub.estado) diffs.push('estado');
            if (preSub.fechaInicio !== postSub.fechaInicio) diffs.push('fechaInicio');
            if (preSub.fechaFin !== postSub.fechaFin) diffs.push('fechaFin');
            if (preSub.trial_inicio !== postSub.trial_inicio) diffs.push('trial_inicio');
            if (preSub.trial_fin !== postSub.trial_fin) diffs.push('trial_fin');
            if (preSub.isFounder !== postSub.isFounder) diffs.push('isFounder');
            if (preSub.founderPosition !== postSub.founderPosition) diffs.push('founderPosition');
            if (preSub.lockedPrice !== postSub.lockedPrice) diffs.push('lockedPrice');
            if (JSON.stringify(preSub.customFeatures) !== JSON.stringify(postSub.customFeatures)) diffs.push('customFeatures');

            if (diffs.length > 0) {
                subscriptionsChanged++;
                subDifferences.push({ id: preSub.id, diffs, pre: preSub, post: postSub });
            }
        });

        // Compare global configs
        let globalConfigChanged = 0;
        preSnap.globalConfigs.forEach(preCfg => {
            const postCfg = postSnap.globalConfigs.find(c => c.clave === preCfg.clave);
            if (!postCfg || postCfg.valor !== preCfg.valor) {
                globalConfigChanged++;
            }
        });

        const referralCampaignsChanged = Math.abs(preSnap.referralCounts.campaigns - postSnap.referralCounts.campaigns);
        const referralCodesChanged = Math.abs(preSnap.referralCounts.codes - postSnap.referralCounts.codes);
        const referralEventsChanged = Math.abs(preSnap.referralCounts.events - postSnap.referralCounts.events);
        const referralRewardsChanged = Math.abs(preSnap.referralCounts.rewards - postSnap.referralCounts.rewards);

        const isSafe = (
            subscriptionsChanged === 0 &&
            globalConfigChanged === 0 &&
            referralCampaignsChanged === 0 &&
            referralCodesChanged === 0 &&
            referralEventsChanged === 0 &&
            referralRewardsChanged === 0
        );

        const report = {
            subscriptionsChanged,
            referralCampaignsChanged,
            referralCodesChanged,
            referralEventsChanged,
            referralRewardsChanged,
            globalConfigChanged,
            status: isSafe ? "SAFE" : "BLOCKED",
            differences: subDifferences
        };

        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');
        console.log(JSON.stringify(report, null, 2));

        if (!isSafe) {
            console.error("🛑 MIGRATION FAILED: UNAUTHORIZED COMMERCIAL CHANGES DETECTED. DEPLOY BLOCKED.");
            process.exit(1);
        } else {
            console.log("✅ INTEGRITY AUDIT PASSED: 0 COMMERCIAL CHANGES DETECTED. STATUS: SAFE.");
        }
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error("Snapshot error:", err);
        process.exit(1);
    }).finally(() => prisma.$disconnect());
}
