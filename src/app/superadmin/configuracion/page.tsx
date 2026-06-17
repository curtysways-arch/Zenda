import prisma from "@/lib/prisma";
import ConfigClient from "./ConfigClient";

export default async function SuperAdminConfigPage() {
    const configs = await prisma.globalConfig.findMany();

    // Serializar para Client Component
    const serializedConfigs = JSON.parse(JSON.stringify(configs));

    return (
        <div className="space-y-8 uppercase-first">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración Global</h2>
                <p className="text-slate-500 mt-1">Administra los parámetros compartidos de la plataforma.</p>
            </div>

            <ConfigClient initialConfigs={serializedConfigs} />
        </div>
    );
}
