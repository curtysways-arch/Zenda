import { TipoIdentificacion, TaxValidationResult } from './TaxPayerTypes';

/**
 * Validador Oficial de Documentos Tributarios de Ecuador (SRI).
 * Implementa validaciones matemáticas nativas sin dependencias externas:
 * - Cédula de Identidad (Módulo 10)
 * - RUC Persona Natural (Cédula válida + establecimiento)
 * - RUC Sociedades Privadas / Extranjeros (Módulo 11 en décimo dígito)
 * - RUC Instituciones Públicas (Módulo 11 en noveno dígito)
 * - Consumidor Final (9999999999999)
 * - Pasaporte
 */
export class EcuadorTaxValidator {
  private static readonly PROVINCIAS_VALIDAS = new Set([
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '30'
  ]);

  /**
   * Detecta automáticamente el tipo probable de identificación según longitud y formato.
   */
  public static detectType(value: string): TipoIdentificacion {
    const clean = (value || '').trim().toUpperCase();
    if (clean === '9999999999999') return 'CONSUMIDOR_FINAL';
    if (/^\d{10}$/.test(clean)) return 'CEDULA';
    if (/^\d{13}$/.test(clean)) return 'RUC';
    return 'PASAPORTE';
  }

  /**
   * Valida cualquier identificación tributaria ecuatoriana o pasaporte.
   */
  public static validate(rawIdentificacion: string, tipo?: TipoIdentificacion): TaxValidationResult {
    const clean = (rawIdentificacion || '').trim().toUpperCase();
    const effectiveType = tipo || this.detectType(clean);

    if (!clean) {
      return {
        isValid: false,
        tipoIdentificacion: effectiveType,
        error: 'El número de identificación no puede estar vacío'
      };
    }

    if (effectiveType === 'CONSUMIDOR_FINAL' || clean === '9999999999999') {
      return {
        isValid: clean === '9999999999999',
        tipoIdentificacion: 'CONSUMIDOR_FINAL',
        subtipo: 'CONSUMIDOR_FINAL',
        error: clean === '9999999999999' ? undefined : 'El Consumidor Final debe ser 9999999999999'
      };
    }

    if (effectiveType === 'PASAPORTE') {
      return this.validatePasaporte(clean);
    }

    if (effectiveType === 'CEDULA') {
      return this.validateCedula(clean);
    }

    if (effectiveType === 'RUC') {
      return this.validateRuc(clean);
    }

    return {
      isValid: false,
      tipoIdentificacion: effectiveType,
      error: 'Tipo de identificación desconocido'
    };
  }

  /**
   * Validación matemática de Cédula Ecuatoriana (10 dígitos, Módulo 10).
   */
  public static validateCedula(cedula: string): TaxValidationResult {
    if (!/^\d{10}$/.test(cedula)) {
      return {
        isValid: false,
        tipoIdentificacion: 'CEDULA',
        error: 'La cédula debe contener exactamente 10 dígitos numéricos'
      };
    }

    const prov = cedula.substring(0, 2);
    if (!this.PROVINCIAS_VALIDAS.has(prov)) {
      return {
        isValid: false,
        tipoIdentificacion: 'CEDULA',
        error: `El código de provincia (${prov}) no es válido en Ecuador`,
        provinciaCodigo: prov
      };
    }

    const tercerDigito = parseInt(cedula.charAt(2), 10);
    if (tercerDigito < 0 || tercerDigito > 5) {
      return {
        isValid: false,
        tipoIdentificacion: 'CEDULA',
        error: 'El tercer dígito de una cédula debe ser entre 0 y 5'
      };
    }

    const digitoVerificador = parseInt(cedula.charAt(9), 10);
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
      if (valor >= 10) {
        valor -= 9;
      }
      suma += valor;
    }

    const residuo = suma % 10;
    const digitoEsperado = residuo === 0 ? 0 : 10 - residuo;

    if (digitoEsperado !== digitoVerificador) {
      return {
        isValid: false,
        tipoIdentificacion: 'CEDULA',
        error: 'Dígito verificador de la cédula no coincide con el algoritmo Módulo 10',
        provinciaCodigo: prov
      };
    }

    return {
      isValid: true,
      tipoIdentificacion: 'CEDULA',
      subtipo: 'PERSONA_NATURAL',
      provinciaCodigo: prov
    };
  }

  /**
   * Validación completa de RUC ecuatoriano (13 dígitos).
   * Identifica y valida si es Persona Natural, Sociedad Privada o Institución Pública.
   */
  public static validateRuc(ruc: string): TaxValidationResult {
    if (!/^\d{13}$/.test(ruc)) {
      return {
        isValid: false,
        tipoIdentificacion: 'RUC',
        error: 'El RUC debe contener exactamente 13 dígitos numéricos'
      };
    }

    const prov = ruc.substring(0, 2);
    if (!this.PROVINCIAS_VALIDAS.has(prov)) {
      return {
        isValid: false,
        tipoIdentificacion: 'RUC',
        error: `El código de provincia (${prov}) no es válido en Ecuador`,
        provinciaCodigo: prov
      };
    }

    const tercerDigito = parseInt(ruc.charAt(2), 10);

    // 1. RUC Persona Natural (tercer dígito entre 0 y 5)
    if (tercerDigito >= 0 && tercerDigito <= 5) {
      const establecimiento = ruc.substring(10, 13);
      if (parseInt(establecimiento, 10) <= 0) {
        return {
          isValid: false,
          tipoIdentificacion: 'RUC',
          subtipo: 'PERSONA_NATURAL',
          error: 'El código de establecimiento del RUC debe ser mayor a 000 (ej. 001)'
        };
      }

      const cedulaBase = ruc.substring(0, 10);
      const valCedula = this.validateCedula(cedulaBase);
      if (!valCedula.isValid) {
        return {
          isValid: false,
          tipoIdentificacion: 'RUC',
          subtipo: 'PERSONA_NATURAL',
          error: `RUC Persona Natural inválido: ${valCedula.error}`
        };
      }

      return {
        isValid: true,
        tipoIdentificacion: 'RUC',
        subtipo: 'PERSONA_NATURAL',
        provinciaCodigo: prov
      };
    }

    // 2. RUC Sociedad Privada o Extranjero sin Cédula (tercer dígito 9)
    if (tercerDigito === 9) {
      const establecimiento = ruc.substring(10, 13);
      if (parseInt(establecimiento, 10) <= 0) {
        return {
          isValid: false,
          tipoIdentificacion: 'RUC',
          subtipo: 'SOCIEDAD_PRIVADA',
          error: 'El código de establecimiento del RUC de sociedad debe ser mayor a 000 (ej. 001)'
        };
      }

      const digitoVerificador = parseInt(ruc.charAt(9), 10);
      const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
      let suma = 0;
      for (let i = 0; i < 9; i++) {
        suma += parseInt(ruc.charAt(i), 10) * coeficientes[i];
      }

      const residuo = suma % 11;
      let digitoEsperado = residuo === 0 ? 0 : 11 - residuo;
      if (digitoEsperado === 11) digitoEsperado = 0;

      if (digitoEsperado !== digitoVerificador) {
        return {
          isValid: false,
          tipoIdentificacion: 'RUC',
          subtipo: 'SOCIEDAD_PRIVADA',
          error: 'Dígito verificador de RUC Sociedad Privada no coincide con Módulo 11',
          provinciaCodigo: prov
        };
      }

      return {
        isValid: true,
        tipoIdentificacion: 'RUC',
        subtipo: 'SOCIEDAD_PRIVADA',
        provinciaCodigo: prov
      };
    }

    // 3. RUC Institución Pública (tercer dígito 6)
    if (tercerDigito === 6) {
      const establecimiento = ruc.substring(9, 13);
      if (parseInt(establecimiento, 10) <= 0) {
        return {
          isValid: false,
          tipoIdentificacion: 'RUC',
          subtipo: 'INSTITUCION_PUBLICA',
          error: 'El código de establecimiento de institución pública debe ser mayor a 0000 (ej. 0001)'
        };
      }

      // En RUC público el 9no dígito es el verificador
      const digitoVerificador = parseInt(ruc.charAt(8), 10);
      const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
      let suma = 0;
      for (let i = 0; i < 8; i++) {
        suma += parseInt(ruc.charAt(i), 10) * coeficientes[i];
      }

      const residuo = suma % 11;
      let digitoEsperado = residuo === 0 ? 0 : 11 - residuo;
      if (digitoEsperado === 11) digitoEsperado = 0;

      if (digitoEsperado !== digitoVerificador) {
        return {
          isValid: false,
          tipoIdentificacion: 'RUC',
          subtipo: 'INSTITUCION_PUBLICA',
          error: 'Dígito verificador de RUC Institución Pública no coincide con Módulo 11',
          provinciaCodigo: prov
        };
      }

      return {
        isValid: true,
        tipoIdentificacion: 'RUC',
        subtipo: 'INSTITUCION_PUBLICA',
        provinciaCodigo: prov
      };
    }

    return {
      isValid: false,
      tipoIdentificacion: 'RUC',
      error: 'El tercer dígito del RUC no corresponde a Persona Natural (0-5), Sociedad (9) ni Pública (6)'
    };
  }

  /**
   * Validación de Pasaporte (alfanumérico, longitud 3-20).
   */
  public static validatePasaporte(pasaporte: string): TaxValidationResult {
    if (!/^[A-Z0-9]{3,20}$/.test(pasaporte)) {
      return {
        isValid: false,
        tipoIdentificacion: 'PASAPORTE',
        error: 'El pasaporte debe ser alfanumérico entre 3 y 20 caracteres'
      };
    }

    // No permitir secuencias de solo ceros
    if (/^0+$/.test(pasaporte)) {
      return {
        isValid: false,
        tipoIdentificacion: 'PASAPORTE',
        error: 'El pasaporte no puede ser una secuencia de ceros'
      };
    }

    return {
      isValid: true,
      tipoIdentificacion: 'PASAPORTE',
      subtipo: 'EXTRANJERO'
    };
  }
}
