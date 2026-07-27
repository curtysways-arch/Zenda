export type ModuleType = 'pinchos' | 'reservas';

export interface ModuleInfo {
    id: ModuleType;
    name: string;
    description: string;
}

const MODULE_MAPPINGS: Record<string, ModuleType> = {
    pinchos: 'pinchos',
    'pincho-listo': 'pinchos',
    spa: 'reservas',
    dentista: 'reservas',
    barberia: 'reservas',
    gimnasio: 'reservas'
};

export class ModuleResolver {
    public static resolve(slug: string): ModuleType {
        const normalized = (slug || '').toLowerCase().trim();
        return MODULE_MAPPINGS[normalized] || 'reservas';
    }

    public static isPinchosModule(slug: string): boolean {
        return this.resolve(slug) === 'pinchos';
    }

    public static getModuleInfo(slug: string): ModuleInfo {
        const mod = this.resolve(slug);
        if (mod === 'pinchos') {
            return {
                id: 'pinchos',
                name: 'PinchoListo',
                description: 'Sistema de pedidos y delivery de pinchos'
            };
        }
        return {
            id: 'reservas',
            name: 'Citiox Reservas',
            description: 'Sistema de citas y reservas de servicios'
        };
    }
}
