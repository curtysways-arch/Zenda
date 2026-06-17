import prisma from './src/lib/prisma';

async function main() {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    console.log("=== MENSAJES REALES EN LOS ÚLTIMOS 5 MIN ===");
    const msgs = await (prisma as any).processedMessage.findMany({
        where: { created_at: { gte: fiveMinsAgo } },
        orderBy: { created_at: 'desc' }
    });
    
    const realMsgs = msgs.filter((m: any) => !m.message_id.startsWith('test_'));
    
    if (realMsgs.length === 0) {
        console.log("⚠️  NINGÚN mensaje real recibido. El bot no está procesando mensajes entrantes de WhatsApp.");
    } else {
        console.log("✅ Mensajes reales recibidos:");
        console.log(JSON.stringify(realMsgs, null, 2));
    }

    const botLogs = await (prisma as any).botLog.findMany({
        where: { timestamp: { gte: fiveMinsAgo } },
        orderBy: { timestamp: 'desc' }
    });
    const realLogs = botLogs.filter((l: any) => !['test_real_admin', 'test_admin_msg', 'test_msg_id'].some((p: string) => l.phone?.startsWith(p)));
    if (realLogs.length > 0) {
        console.log("\n✅ BotLogs reales:");
        console.log(JSON.stringify(realLogs, null, 2));
    }
}

main().catch(console.error).finally(() => process.exit(0));
