function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
    return "#" + [clamp(r), clamp(g), clamp(b)].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

/**
 * Analiza estadísticamente el buffer binario de cualquier imagen (PNG, JPEG, WebP)
 * buscando clústeres cromáticos de alta saturación para determinar el color predominante.
 * Excluye tonos neutros como blanco, negro y grises.
 */
export async function getLogoDominantColor(url: string): Promise<string> {
    if (!url || !url.startsWith('http')) {
        return '#e21d6e'; // Default brand color
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return '#e21d6e';
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const colorCounts: { [key: string]: number } = {};
        
        // Muestrear bytes buscando tripletas RGB cromáticas
        // Saltamos de 7 en 7 bytes para escanear rápido e independientemente del formato de cabecera
        for (let i = 0; i < buffer.length - 3; i += 7) {
            const r = buffer[i];
            const g = buffer[i + 1];
            const b = buffer[i + 2];
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max - min; // Diferencia cromática (saturación)
            
            // Excluir blanco puro, negro puro, grises y colores muy oscuros/claros
            if (sat > 35 && max > 45 && min < 215) {
                // Agrupar en cubos de color de 16 valores para estabilizar la frecuencia
                const kr = Math.round(r / 16) * 16;
                const kg = Math.round(g / 16) * 16;
                const kb = Math.round(b / 16) * 16;
                const hex = rgbToHex(kr, kg, kb);
                
                colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }
        }
        
        let dominantColor = '#e21d6e';
        let maxCount = 0;
        
        for (const hex in colorCounts) {
            if (colorCounts[hex] > maxCount) {
                maxCount = colorCounts[hex];
                dominantColor = hex;
            }
        }
        
        return dominantColor;
    } catch (e) {
        console.error("Error al extraer el color predominante del logo:", e);
        return '#e21d6e';
    }
}
