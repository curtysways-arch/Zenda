import { prisma } from '../../lib/prisma';
import {
  TipoIdentificacion,
  TaxPayerData,
  TaxValidationResult,
  TaxLookupResult
} from './TaxPayerTypes';
import { EcuadorTaxValidator } from './EcuadorTaxValidator';
import { OfficialSriProvider } from './providers/OfficialSriProvider';

export class CustomerEngine {
  private static sriProvider = new OfficialSriProvider();

  /**
   * Valida sintácticamente una identificación ecuatoriana (Cédula, RUC, Pasaporte, Consumidor Final).
   */
  public static validateTaxId(
    identificacion: string,
    tipo?: TipoIdentificacion
  ): TaxValidationResult {
    return EcuadorTaxValidator.validate(identificacion, tipo);
  }

  /**
   * Búsqueda jerárquica de cliente por identificación tributaria:
   * 1. Consumidor Final (retorno inmediato)
   * 2. Nivel 1: Base de datos local del negocio
   * 3. Nivel 2: Ecosistema Citiox compartido (clientes con RUC/Cédula en otros negocios)
   * 4. Nivel 3: Proveedor oficial SRI (si está configurado, sin scraping)
   */
  public static async lookupCustomerTax(
    negocioId: string,
    rawIdentificacion: string,
    tipo?: TipoIdentificacion
  ): Promise<TaxLookupResult> {
    const cleanId = (rawIdentificacion || '').trim().toUpperCase();

    // 0. Validación de formato
    const validation = EcuadorTaxValidator.validate(cleanId, tipo);

    // Caso Consumidor Final
    if (validation.isValid && validation.tipoIdentificacion === 'CONSUMIDOR_FINAL') {
      return {
        found: true,
        source: 'LOCAL',
        taxPayer: {
          identificacion: '9999999999999',
          tipoIdentificacion: 'CONSUMIDOR_FINAL',
          razonSocial: 'CONSUMIDOR FINAL',
          direccion: 'S/N',
          email: 'consumidorfinal@citiox.com',
          telefono: '9999999999',
          origenDatos: 'LOCAL'
        },
        validation,
        message: 'Consumidor Final seleccionado'
      };
    }

    if (!cleanId) {
      return {
        found: false,
        source: 'NONE',
        validation: {
          isValid: false,
          tipoIdentificacion: tipo || 'CEDULA',
          error: 'Identificación vacía'
        },
        message: 'Ingrese una identificación'
      };
    }

    // 1. NIVEL 1: Base de datos local del negocio actual
    try {
      const localCustomer = await prisma.cliente.findFirst({
        where: {
          negocioId,
          identificacion: cleanId
        }
      });

      if (localCustomer) {
        return {
          found: true,
          source: 'LOCAL',
          taxPayer: {
            identificacion: localCustomer.identificacion || cleanId,
            tipoIdentificacion: (localCustomer.tipoIdentificacion as TipoIdentificacion) || validation.tipoIdentificacion,
            razonSocial: localCustomer.razonSocial || localCustomer.nombre,
            direccion: localCustomer.direccionFacturacion || '',
            email: localCustomer.emailFacturacion || localCustomer.email || '',
            telefono: localCustomer.telefonoFacturacion || localCustomer.telefono || '',
            origenDatos: 'LOCAL'
          },
          validation,
          message: 'Cliente encontrado en la base de datos local'
        };
      }
    } catch (err: any) {
      console.error('[CustomerEngine] Error buscando cliente local:', err.message);
    }

    // 2. NIVEL 2: Ecosistema Citiox Compartido (si ya compró en otro negocio de la plataforma)
    try {
      const sharedCustomer = await prisma.cliente.findFirst({
        where: {
          identificacion: cleanId,
          razonSocial: { not: null }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      if (sharedCustomer && sharedCustomer.razonSocial) {
        return {
          found: true,
          source: 'CITIOX_NETWORK',
          taxPayer: {
            identificacion: sharedCustomer.identificacion || cleanId,
            tipoIdentificacion: (sharedCustomer.tipoIdentificacion as TipoIdentificacion) || validation.tipoIdentificacion,
            razonSocial: sharedCustomer.razonSocial,
            direccion: sharedCustomer.direccionFacturacion || '',
            email: sharedCustomer.emailFacturacion || sharedCustomer.email || '',
            telefono: sharedCustomer.telefonoFacturacion || sharedCustomer.telefono || '',
            origenDatos: 'CITIOX_NETWORK'
          },
          validation,
          message: 'Datos sugeridos desde la red Citiox'
        };
      }
    } catch (err: any) {
      console.error('[CustomerEngine] Error buscando en red Citiox:', err.message);
    }

    // 3. NIVEL 3: Capa oficial SRI (si está configurada mediante endpoint oficial)
    if (this.sriProvider.isConfigured) {
      try {
        const sriData = await this.sriProvider.lookup(cleanId, validation.tipoIdentificacion);
        if (sriData) {
          return {
            found: true,
            source: 'SRI_OFFICIAL',
            taxPayer: sriData,
            validation,
            message: 'Datos obtenidos de servicio oficial SRI'
          };
        }
      } catch (err: any) {
        console.error('[CustomerEngine] Error en consulta oficial SRI:', err.message);
      }
    }

    // 4. No encontrado (pero si la cédula/RUC es matemáticamente válida, se indica que puede ingresar datos)
    return {
      found: false,
      source: 'NONE',
      validation,
      message: validation.isValid
        ? 'Identificación válida. Ingrese los datos fiscales para registrar al cliente.'
        : (validation.error || 'Identificación no registrada')
    };
  }

  /**
   * Registra o actualiza los datos tributarios del cliente para el negocio.
   * Maneja restricciones de unicidad de teléfono y vinculación segura.
   */
  public static async upsertCustomerTaxData(
    negocioId: string,
    data: {
      identificacion: string;
      tipoIdentificacion?: TipoIdentificacion;
      razonSocial: string;
      telefono?: string;
      email?: string;
      direccion?: string;
    }
  ) {
    const cleanId = (data.identificacion || '').trim().toUpperCase();
    if (!cleanId) {
      throw new Error('La identificación tributaria es obligatoria');
    }

    const tipo: TipoIdentificacion = data.tipoIdentificacion || EcuadorTaxValidator.detectType(cleanId);
    const cleanPhone = (data.telefono || '').trim();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanRazon = (data.razonSocial || '').trim();
    const cleanDir = (data.direccion || '').trim();

    // 1. Buscar si ya existe por identificación dentro del negocio
    let existing = await prisma.cliente.findFirst({
      where: {
        negocioId,
        identificacion: cleanId
      }
    });

    // 2. Si no se encontró por identificación pero se tiene teléfono, buscar por teléfono
    if (!existing && cleanPhone) {
      existing = await prisma.cliente.findUnique({
        where: {
          telefono_negocioId: {
            telefono: cleanPhone,
            negocioId
          }
        }
      });
    }

    if (existing) {
      return await prisma.cliente.update({
        where: { id: existing.id },
        data: {
          identificacion: cleanId,
          tipoIdentificacion: tipo,
          razonSocial: cleanRazon || existing.razonSocial || existing.nombre,
          nombre: cleanRazon || existing.nombre,
          direccionFacturacion: cleanDir || existing.direccionFacturacion,
          emailFacturacion: cleanEmail || existing.emailFacturacion,
          telefonoFacturacion: cleanPhone || existing.telefonoFacturacion,
          email: existing.email || cleanEmail || null,
          updatedAt: new Date()
        }
      });
    }

    // 3. Crear nuevo cliente
    const fallbackPhone = cleanPhone || (cleanId === '9999999999999' ? `CF-${Date.now()}` : `ST-${Date.now()}`);
    return await prisma.cliente.create({
      data: {
        id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nombre: cleanRazon || 'Cliente Fiscal',
        telefono: fallbackPhone,
        email: cleanEmail || null,
        negocioId,
        identificacion: cleanId,
        tipoIdentificacion: tipo,
        razonSocial: cleanRazon || null,
        direccionFacturacion: cleanDir || null,
        emailFacturacion: cleanEmail || null,
        telefonoFacturacion: cleanPhone || null,
        updatedAt: new Date()
      }
    });
  }
}
