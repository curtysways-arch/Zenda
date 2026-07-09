export interface GeneratedTheme {
    primaryColor: string;
    primaryLight: string;
    primaryDark: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    surfaceSecondary: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    textOnPrimary: string;
    textOnSurface: string;
    textOnSurfaceSecondary: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    shadowColor: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
    const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
    return "#" + [clamp(r), clamp(g), clamp(b)].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
}

/**
 * Genera de forma matemática todos los colores del tema adaptativo basándose
 * en el color principal y la configuración opcional provista por el admin.
 */
export function generateTheme(
    rawPrimary: string,
    rawSecondary?: string,
    rawBg?: string
): GeneratedTheme {
    const primary = rawPrimary.startsWith('#') ? rawPrimary : `#${rawPrimary}`;
    const rgb = hexToRgb(primary) || { r: 226, g: 29, b: 110 };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    // 1. Primary Light (+20% luminosidad)
    const lightL = Math.min(0.95, hsl.l + 0.20);
    const primaryLightRgb = hslToRgb(hsl.h, hsl.s, lightL);
    const primaryLight = rgbToHex(primaryLightRgb.r, primaryLightRgb.g, primaryLightRgb.b);

    // 2. Primary Dark (-20% luminosidad)
    const darkL = Math.max(0.05, hsl.l - 0.20);
    const primaryDarkRgb = hslToRgb(hsl.h, hsl.s, darkL);
    const primaryDark = rgbToHex(primaryDarkRgb.r, primaryDarkRgb.g, primaryDarkRgb.b);

    // 3. Secondary Color
    let secondary = rawSecondary;
    if (!secondary) {
        const secL = Math.max(0.12, hsl.l - 0.30);
        const secRgb = hslToRgb(hsl.h, Math.max(0.15, hsl.s - 0.25), secL);
        secondary = rgbToHex(secRgb.r, secRgb.g, secRgb.b);
    } else if (!secondary.startsWith('#')) {
        secondary = `#${secondary}`;
    }

    // 4. Accent Color (tono vibrante con 30 grados de rotación de matiz)
    const accentH = (hsl.h + 0.083) % 1.0;
    const accentRgb = hslToRgb(accentH, Math.max(0.8, hsl.s), Math.max(0.45, Math.min(0.65, hsl.l)));
    const accentColor = rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b);

    // 5. Surface (muy claro, 3-5% del primario)
    const surfRgb = hslToRgb(hsl.h, Math.min(0.2, hsl.s), 0.98);
    const surfaceColor = rgbToHex(surfRgb.r, surfRgb.g, surfRgb.b);

    // 6. Surface Secondary (8% del primario)
    const surfSecRgb = hslToRgb(hsl.h, Math.min(0.25, hsl.s), 0.94);
    const surfaceSecondary = rgbToHex(surfSecRgb.r, surfSecRgb.g, surfSecRgb.b);

    // 7. Border (10% más oscuro que Surface Secondary)
    const borderRgb = hslToRgb(hsl.h, Math.min(0.2, hsl.s), 0.88);
    const borderColor = rgbToHex(borderRgb.r, borderRgb.g, borderRgb.b);

    // 8. Shadow (color principal con 10% opacidad)
    const shadowColor = `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, 0.08)`;

    // 9. Background
    let backgroundColor = rawBg;
    if (!backgroundColor) {
        if (hsl.l < 0.5) {
            const bgRgb = hslToRgb(hsl.h, 0.06, 0.985);
            backgroundColor = rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b);
        } else {
            const bgRgb = hslToRgb(hsl.h, 0.10, 0.98);
            backgroundColor = rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b);
        }
    } else if (!backgroundColor.startsWith('#')) {
        backgroundColor = `#${backgroundColor}`;
    }

    // 10. Text Primary y Text Secondary con contraste garantizado (WCAG AA)
    const bgRgbHex = hexToRgb(backgroundColor) || { r: 255, g: 255, b: 255 };
    const bgLuma = (0.2126 * bgRgbHex.r + 0.7152 * bgRgbHex.g + 0.0722 * bgRgbHex.b) / 255;
    
    const textPrimary = bgLuma < 0.5 ? '#ffffff' : '#0f172a';
    const textSecondary = bgLuma < 0.5 ? '#cbd5e1' : '#475569';
    const textDisabled = bgLuma < 0.5 ? '#64748b' : '#94a3b8';

    // Contraste para texto sobre superficie (tarjetas) — siempre basado en luminosidad de surface
    const surfRgbHex = hexToRgb(surfaceColor) || { r: 255, g: 255, b: 255 };
    const surfLuma = (0.2126 * surfRgbHex.r + 0.7152 * surfRgbHex.g + 0.0722 * surfRgbHex.b) / 255;
    const textOnSurface = surfLuma < 0.5 ? '#ffffff' : '#0f172a';
    const textOnSurfaceSecondary = surfLuma < 0.5 ? '#cbd5e1' : '#475569';

    // Contraste para texto sobre el color primario
    const primaryLuma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    const textOnPrimary = primaryLuma < 0.5 ? '#ffffff' : '#0f172a';

    // 11. Estados fijos del sistema
    const successColor = '#10b981';
    const warningColor = '#f59e0b';
    const errorColor = '#ef4444';

    return {
        primaryColor: primary,
        primaryLight,
        primaryDark,
        secondaryColor: secondary,
        accentColor,
        backgroundColor,
        surfaceColor,
        surfaceSecondary,
        borderColor,
        textPrimary,
        textSecondary,
        textDisabled,
        textOnPrimary,
        textOnSurface,
        textOnSurfaceSecondary,
        successColor,
        warningColor,
        errorColor,
        shadowColor
    };
}
