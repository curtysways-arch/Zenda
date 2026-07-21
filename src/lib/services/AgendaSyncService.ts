/**
 * AgendaSyncService
 * 
 * Servicio desacoplado que gestiona la sincronización incremental de citas
 * mediante polling (o en el futuro mediante WebSockets/SSE).
 */
export class AgendaSyncService {
    private intervalId: NodeJS.Timeout | null = null;
    private lastSyncTimestamp: string | null = null;
    private isSyncing: boolean = false;
    private onUpdateCallback: ((changes: any[]) => void) | null = null;

    /**
     * Inicia el ciclo de sincronización incremental.
     * @param onUpdate Callback invocado cuando se detectan citas nuevas o modificadas.
     */
    public connect(onUpdate: (changes: any[]) => void): void {
        this.disconnect();
        this.onUpdateCallback = onUpdate;
        
        // Guardar el instante inicial de conexión
        this.lastSyncTimestamp = new Date().toISOString();

        // Arrancar el ciclo de consulta (polling incremental) cada 8 segundos
        this.intervalId = setInterval(() => {
            this.sync();
        }, 8000);
    }

    /**
     * Detiene el ciclo de sincronización.
     */
    public disconnect(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.onUpdateCallback = null;
        this.lastSyncTimestamp = null;
        this.isSyncing = false;
    }

    /**
     * Realiza una sincronización manual o programada consultando las actualizaciones al backend.
     */
    public async sync(): Promise<void> {
        if (this.isSyncing || !this.lastSyncTimestamp || !this.onUpdateCallback) return;

        this.isSyncing = true;
        try {
            const since = this.lastSyncTimestamp;
            // Registrar el tiempo antes de hacer la petición para evitar perder actualizaciones que ocurran durante el fetch
            const currentFetchTime = new Date().toISOString();

            const response = await fetch(`/api/appointments/updates?since=${encodeURIComponent(since)}`);
            if (response.ok) {
                const updates = await response.json();
                if (Array.isArray(updates) && updates.length > 0) {
                    // Actualizar el timestamp al instante de esta petición exitosa
                    this.lastSyncTimestamp = currentFetchTime;
                    // Propagar los cambios detectados
                    this.onUpdateCallback(updates);
                } else {
                    // Si no hubo cambios, igual avanzamos el timestamp para evitar consultar un rango redundante
                    this.lastSyncTimestamp = currentFetchTime;
                }
            }
        } catch (error) {
            console.error('[REALTIME] Error en sincronización incremental:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Restablece o adelanta manualmente el timestamp de la sincronización.
     */
    public updateLastSyncTimestamp(isoString: string): void {
        this.lastSyncTimestamp = isoString;
    }

    /**
     * Lógica pura para fusionar el array de citas actual con las novedades.
     * Complejidad O(n) utilizando mapas de búsqueda.
     * 
     * @param current Citas actuales en el estado local.
     * @param updates Citas modificadas o nuevas recibidas desde la sincronización.
     * @returns Un objeto con el array fusionado, y listas diferenciadas de elementos nuevos y actualizados.
     */
    public static applyChanges(
        current: any[],
        updates: any[]
    ): { merged: any[]; newAppointments: any[]; updatedAppointments: any[] } {
        const updatedMap = new Map<string, any>();
        updates.forEach(u => updatedMap.set(u.id, u));

        const newAppointments: any[] = [];
        const updatedAppointments: any[] = [];

        // 1. Actualizar las existentes que cambiaron de estado o contenido
        const merged = current.map(item => {
            if (updatedMap.has(item.id)) {
                const updatedItem = updatedMap.get(item.id);
                updatedAppointments.push(updatedItem);
                updatedMap.delete(item.id); // Lo removemos para identificar cuáles son nuevos
                return updatedItem;
            }
            return item;
        });

        // 2. Las que sobren en updatedMap son reservas totalmente nuevas
        updatedMap.forEach(newItem => {
            newAppointments.push(newItem);
            // Las agregamos al inicio de la lista
            merged.unshift(newItem);
        });

        return { merged, newAppointments, updatedAppointments };
    }
}
