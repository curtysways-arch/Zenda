/**
 * @file ImageUrlValidator.ts
 * @module core/catalog/importer
 * @description Validador estricto de URLs de imágenes con protección integral contra SSRF.
 */

import { URL } from 'url';

export class ImageUrlValidator {
    private static BLOCKED_HOSTNAMES = new Set([
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'metadata.google.internal',
        '169.254.169.254'
    ]);

    /**
     * Valida que una URL sea sintácticamente válida, use HTTP/S y no apunte a redes privadas/internas (anti-SSRF).
     */
    public static validateUrl(urlString: string): { valid: boolean; reason?: string } {
        if (!urlString || typeof urlString !== 'string') {
            return { valid: false, reason: 'URL vacía o no válida' };
        }

        const trimmed = urlString.trim();
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            return { valid: false, reason: 'Solo se admiten protocolos http y https' };
        }

        let parsed: URL;
        try {
            parsed = new URL(trimmed);
        } catch (_) {
            return { valid: false, reason: 'Formato de URL no válido' };
        }

        const hostname = parsed.hostname.toLowerCase();

        // 1. Bloqueo de nombres reservados
        if (this.BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
            return { valid: false, reason: 'Acceso a direcciones locales o internas denegado (SSRF Guard)' };
        }

        // 2. Bloqueo de rangos IPv4 privados y loopback
        // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
        const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ipv4Match) {
            const b1 = parseInt(ipv4Match[1], 10);
            const b2 = parseInt(ipv4Match[2], 10);

            if (b1 === 127 || b1 === 10 || b1 === 0) {
                return { valid: false, reason: 'Dirección IP privada o de loopback denegada' };
            }
            if (b1 === 172 && b2 >= 16 && b2 <= 31) {
                return { valid: false, reason: 'Dirección IP privada de subred 172.16/12 denegada' };
            }
            if (b1 === 192 && b2 === 168) {
                return { valid: false, reason: 'Dirección IP privada de subred 192.168/16 denegada' };
            }
            if (b1 === 169 && b2 === 254) {
                return { valid: false, reason: 'Dirección IP de enlace local (link-local) denegada' };
            }
        }

        // 3. Bloqueo de puertos no estándar
        if (parsed.port && parsed.port !== '80' && parsed.port !== '443' && parsed.port !== '') {
            return { valid: false, reason: 'Solo se permiten los puertos estándar 80 y 443 para imágenes' };
        }

        return { valid: true };
    }
}
