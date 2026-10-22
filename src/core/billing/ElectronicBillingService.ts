import prisma from '@/lib/prisma';
import { EcuadorTaxValidator } from '../customers/EcuadorTaxValidator';

export interface GenerateInvoiceInput {
  businessId: string;
  orderId?: string;
  cliente: {
    identificacion: string;
    tipoIdentificacion?: string;
    razonSocial: string;
    direccion?: string;
    email?: string;
    telefono?: string;
  };
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  formaPago?: string;
  propina?: number;
}

export class ElectronicBillingService {
  /**
   * Calcula el Dígito Verificador Módulo 11 oficial del SRI Ecuador
   * Factores ponderados: 2, 3, 4, 5, 6, 7 de derecha a izquierda
   */
  public static calculateModulo11(digits48: string): number {
    const weights = [2, 3, 4, 5, 6, 7];
    let sum = 0;
    let weightIndex = 0;

    for (let i = digits48.length - 1; i >= 0; i--) {
      const digit = parseInt(digits48.charAt(i), 10);
      sum += digit * weights[weightIndex];
      weightIndex = (weightIndex + 1) % weights.length;
    }

    const mod = sum % 11;
    let checkDigit = 11 - mod;

    if (checkDigit === 11) checkDigit = 0;
    if (checkDigit === 10) checkDigit = 1;

    return checkDigit;
  }

  /**
   * Genera la Clave de Acceso de 49 dígitos oficial SRI
   */
  public static generateClaveAcceso(params: {
    fecha: Date;
    tipoComprobante: string; // "01" Factura, "04" Nota de Crédito
    ruc: string;
    ambiente: number; // 1 Pruebas, 2 Producción
    establecimiento: string; // ej "001"
    puntoEmision: string; // ej "001"
    secuencial: number; // ej 1 -> "000000001"
    codigoNumerico?: string; // 8 dígitos
    tipoEmision?: number; // 1 Normal
  }): string {
    const { fecha, tipoComprobante, ruc, ambiente, establecimiento, puntoEmision, secuencial } = params;

    const day = String(fecha.getDate()).padStart(2, '0');
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const year = String(fecha.getFullYear());
    const fechaStr = `${day}${month}${year}`;

    const cleanRuc = ruc.trim().padStart(13, '0').slice(0, 13);
    const est = establecimiento.trim().padStart(3, '0').slice(0, 3);
    const pto = puntoEmision.trim().padStart(3, '0').slice(0, 3);
    const secStr = String(secuencial).padStart(9, '0').slice(0, 9);
    const codNum = (params.codigoNumerico || String(Math.floor(10000000 + Math.random() * 90000000))).slice(0, 8);
    const tipoEmision = params.tipoEmision || 1;

    // 48 dígitos iniciales
    const raw48 = `${fechaStr}${tipoComprobante}${cleanRuc}${ambiente}${est}${pto}${secStr}${codNum}${tipoEmision}`;

    const digitoVerificador = this.calculateModulo11(raw48);
    return `${raw48}${digitoVerificador}`;
  }

  /**
   * Verifica la validez de una Clave de Acceso de 49 dígitos con su dígito verificador Módulo 11
   */
  public static verifyClaveAcceso(clave: string): boolean {
    if (!clave || clave.length !== 49 || !/^\d+$/.test(clave)) return false;
    const raw48 = clave.substring(0, 48);
    const expectedDigit = this.calculateModulo11(raw48);
    const actualDigit = parseInt(clave.charAt(48), 10);
    return expectedDigit === actualDigit;
  }

  /**
   * Emite una factura electrónica y crea el registro con clave de acceso inmutable
   */
  public static async issueInvoice(input: GenerateInvoiceInput) {
    const { businessId, cliente, items, orderId, formaPago = '01' } = input;

    // Validar identificación con validador SRI de Ecuador
    const taxValidation = EcuadorTaxValidator.validate(cliente.identificacion, cliente.tipoIdentificacion as any);
    if (!taxValidation.isValid) {
      throw new Error(`Identificación tributaria inválida: ${taxValidation.error}`);
    }

    // Obtener o inicializar configuración fiscal del negocio
    let config = await (prisma as any).taxConfiguration.findUnique({
      where: { businessId }
    });

    if (!config) {
      const biz = await (prisma as any).negocio.findUnique({ where: { id: businessId } });
      config = await (prisma as any).taxConfiguration.create({
        data: {
          businessId,
          ruc: '1790011223001',
          razonSocial: biz?.nombre || 'Negocio Citiox',
          dirMatriz: biz?.direccion || 'Ecuador',
          ambiente: 1, // Entorno de Pruebas SRI por defecto
          tipoEmision: 1,
          secuencialFactura: 1,
          regimenRimpe: true
        }
      });
    }

    const currentSecuencial = config.secuencialFactura;
    const now = new Date();

    const claveAcceso = this.generateClaveAcceso({
      fecha: now,
      tipoComprobante: '01',
      ruc: config.ruc,
      ambiente: config.ambiente,
      establecimiento: config.codEstablecimiento,
      puntoEmision: config.codPuntoEmision,
      secuencial: currentSecuencial
    });

    const secFormatted = `${config.codEstablecimiento}-${config.codPuntoEmision}-${String(currentSecuencial).padStart(9, '0')}`;

    // Totales
    const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
    const iva15 = subtotal * 0.15; // 15% IVA vigente en Ecuador
    const total = subtotal + iva15 + (input.propina || 0);

    // Mapeo tipo identificación SRI (04: RUC, 05: Cédula, 06: Pasaporte, 07: Consumidor Final)
    let tipoIdentSri = '05';
    if (taxValidation.tipoIdentificacion === 'RUC') tipoIdentSri = '04';
    else if (taxValidation.tipoIdentificacion === 'CONSUMIDOR_FINAL') tipoIdentSri = '07';
    else if (taxValidation.tipoIdentificacion === 'PASAPORTE') tipoIdentSri = '06';

    const invoice = await (prisma as any).electronicInvoice.create({
      data: {
        businessId,
        orderId: orderId || null,
        tipoComprobante: '01',
        secuencial: secFormatted,
        claveAcceso,
        fechaEmision: now,
        tipoIdentificacion: tipoIdentSri,
        identificacion: cliente.identificacion,
        razonSocialCliente: cliente.razonSocial,
        direccionCliente: cliente.direccion || null,
        emailCliente: cliente.email || null,
        subtotal,
        subtotalSinImp: subtotal,
        descuento: 0,
        iva15,
        propina: input.propina || 0,
        importeTotal: total,
        formaPago,
        estadoSRI: config.ambiente === 1 ? 'AUTORIZADO' : 'PENDIENTE', // En pruebas se simula autorización idempotente inmediata
        numeroAutorizacion: claveAcceso,
        fechaAutorizacion: now
      }
    });

    // Incrementar secuencial fiscal
    await (prisma as any).taxConfiguration.update({
      where: { id: config.id },
      data: { secuencialFactura: currentSecuencial + 1 }
    });

    return invoice;
  }
}
