export interface GeneratedTheme {
    primaryColor: string;
    primaryLight: string;
    primaryDark: string; // Mantiene compatibilidad con clases antiguas
    primaryHover: string;
    primaryBg: string;
    secondaryColor: string;
    secondaryHover: string;
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
    infoColor: string;
    shadowColor: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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

    // 1. Primary Hover (-10% luminosidad)
    const hoverL = Math.max(0.05, hsl.l - 0.10);
    const primaryHoverRgb = hslToRgb(hsl.h, hsl.s, hoverL);
    const primaryHover = rgbToHex(primaryHoverRgb.r, primaryHoverRgb.g, primaryHoverRgb.b);

    // 2. Primary Light (luminosidad alta al 90%)
    const lightL = 0.93;
    const primaryLightRgb = hslToRgb(hsl.h, Math.min(0.3, hsl.s), lightL);
    const primaryLight = rgbToHex(primaryLightRgb.r, primaryLightRgb.g, primaryLightRgb.b);

    // 3. Primary Dark (-20% luminosidad para compatibilidad)
    const darkL = Math.max(0.05, hsl.l - 0.20);
    const primaryDarkRgb = hslToRgb(hsl.h, hsl.s, darkL);
    const primaryDark = rgbToHex(primaryDarkRgb.r, primaryDarkRgb.g, primaryDarkRgb.b);

    // 4. Primary Background (8% de opacidad)
    const primaryBg = `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, 0.08)`;

    // 5. Secondary Color
    let secondary = rawSecondary;
    if (!secondary) {
        const secL = Math.max(0.12, hsl.l - 0.25);
        const secRgb = hslToRgb(hsl.h, Math.max(0.15, hsl.s - 0.25), secL);
        secondary = rgbToHex(secRgb.r, secRgb.g, secRgb.b);
    } else if (!secondary.startsWith('#')) {
        secondary = `#${secondary}`;
    }

    const secRgbHex = hexToRgb(secondary) || { r: 15, g: 23, b: 42 };
    const secHsl = rgbToHsl(secRgbHex.r, secRgbHex.g, secRgbHex.b);

    // 6. Secondary Hover (-10% luminosidad del secundario)
    const secHoverL = Math.max(0.05, secHsl.l - 0.10);
    const secHoverRgb = hslToRgb(secHsl.h, secHsl.s, secHoverL);
    const secondaryHover = rgbToHex(secHoverRgb.r, secHoverRgb.g, secHoverRgb.b);

    // 7. Accent (Mezcla de matiz primario y secundario)
    const accentH = ((hsl.h + secHsl.h) / 2) % 1.0;
    const accentS = Math.max(0.6, (hsl.s + secHsl.s) / 2);
    const accentL = Math.max(0.45, Math.min(0.65, (hsl.l + secHsl.l) / 2));
    const accentRgb = hslToRgb(accentH, accentS, accentL);
    const accentColor = rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b);

    // 8. Surface (muy claro, basado en primario)
    const surfRgb = hslToRgb(hsl.h, Math.min(0.1, hsl.s), 0.985);
    const surfaceColor = rgbToHex(surfRgb.r, surfRgb.g, surfRgb.b);

    // 9. Surface Secondary (8% del primario)
    const surfSecRgb = hslToRgb(hsl.h, Math.min(0.15, hsl.s), 0.95);
    const surfaceSecondary = rgbToHex(surfSecRgb.r, surfSecRgb.g, surfSecRgb.b);

    // 10. Border (mezcla desaturada de primario y gris claro)
    const borderRgb = hslToRgb(hsl.h, Math.min(0.08, hsl.s), 0.89);
    const borderColor = rgbToHex(borderRgb.r, borderRgb.g, borderRgb.b);

    // 11. Shadow
    const shadowColor = `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, 0.08)`;

    // 12. Background
    let backgroundColor = rawBg;
    if (!backgroundColor) {
        const bgRgb = hslToRgb(hsl.h, 0.05, 0.98);
        backgroundColor = rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b);
    } else if (!backgroundColor.startsWith('#')) {
        backgroundColor = `#${backgroundColor}`;
    }

    // 13. Text Contraste
    const bgRgbHex = hexToRgb(backgroundColor) || { r: 255, g: 255, b: 255 };
    const bgLuma = (0.2126 * bgRgbHex.r + 0.7152 * bgRgbHex.g + 0.0722 * bgRgbHex.b) / 255;
    
    const textPrimary = bgLuma < 0.5 ? '#ffffff' : '#0f172a';
    const textSecondary = bgLuma < 0.5 ? '#cbd5e1' : '#475569';
    const textDisabled = bgLuma < 0.5 ? '#64748b' : '#94a3b8';

    const surfRgbHex = hexToRgb(surfaceColor) || { r: 255, g: 255, b: 255 };
    const surfLuma = (0.2126 * surfRgbHex.r + 0.7152 * surfRgbHex.g + 0.0722 * surfRgbHex.b) / 255;
    const textOnSurface = surfLuma < 0.5 ? '#ffffff' : '#0f172a';
    const textOnSurfaceSecondary = surfLuma < 0.5 ? '#cbd5e1' : '#475569';

    const primaryLuma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    const textOnPrimary = primaryLuma < 0.5 ? '#ffffff' : '#0f172a';

    // 14. Estados fijos
    const successColor = '#10b981';
    const warningColor = '#f59e0b';
    const errorColor = '#ef4444';
    const infoColor = '#3b82f6';

    return {
        primaryColor: primary,
        primaryLight,
        primaryDark,
        primaryHover,
        primaryBg,
        secondaryColor: secondary,
        secondaryHover,
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
        infoColor,
        shadowColor
    };
}
