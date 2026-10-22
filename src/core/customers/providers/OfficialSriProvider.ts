import { TaxIdentificationProvider, TaxPayerData, TipoIdentificacion } from '../TaxPayerTypes';

/**
 * Adaptador oficial para consultas al Servicio de Rentas Internas (SRI).
 * 
 * POLÍTICA ESTRICTA DE INTEGRACIÓN:
 * - NO implementa web scraping bajo ninguna circunstancia.
 * - Conecta únicamente a través de APIs oficiales REST/SOAP del SRI o brokers
 *   de facturación electrónica homologados mediante variables de entorno.
 * - Si no hay un endpoint oficial configurado, se degrada elegantemente retornando null,
 *   permitiendo que el POS continúe operando con la base de datos propia de Citiox.
 */
export class OfficialSriProvider implements TaxIdentificationProvider {
  public readonly name = 'SRI_OFFICIAL';

  private readonly apiUrl: string | null;
  private readonly apiKey: string | null;
  private readonly timeoutMs: number;

  constructor() {
    this.apiUrl = process.env.SRI_OFFICIAL_API_URL || null;
    this.apiKey = process.env.SRI_OFFICIAL_API_KEY || null;
    this.timeoutMs = parseInt(process.env.SRI_API_TIMEOUT_MS || '3500', 10);
  }

  public get isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiUrl.trim().length > 0);
  }

  public async lookup(identificacion: string, tipo?: TipoIdentificacion): Promise<TaxPayerData | null> {
    if (!this.isConfigured || !this.apiUrl) {
      // Sin servicio oficial configurado; se delega a BD propia o ingreso manual.
      return null;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const url = new URL(this.apiUrl);
      url.searchParams.set('identificacion', identificacion);
      if (tipo) url.searchParams.set('tipo', tipo);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Citiox-CustomerEngine/1.0'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 404) return null;
        console.warn(`[OfficialSriProvider] Respuesta no exitosa (${res.status}) al consultar ${identificacion}`);
        return null;
      }

      const data = await res.json();
      if (!data || !data.razonSocial) return null;

      return {
        identificacion: data.identificacion || identificacion,
        tipoIdentificacion: (data.tipoIdentificacion as TipoIdentificacion) || tipo || 'RUC',
        razonSocial: data.razonSocial,
        nombreComercial: data.nombreComercial || data.razonSocial,
        direccion: data.direccion || '',
        email: data.email || '',
        telefono: data.telefono || '',
        estadoContribuyente: data.estado || 'ACTIVO',
        obligadoContabilidad: Boolean(data.obligadoContabilidad),
        origenDatos: 'SRI_OFFICIAL'
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[OfficialSriProvider] Timeout superado (${this.timeoutMs}ms) consultando ${identificacion}`);
      } else {
        console.error(`[OfficialSriProvider] Error al consultar API oficial SRI:`, err.message);
      }
      return null;
    }
  }
}
