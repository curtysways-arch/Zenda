export type TipoIdentificacion = 'CEDULA' | 'RUC' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';

export interface TaxPayerData {
  identificacion: string;
  tipoIdentificacion: TipoIdentificacion;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  estadoContribuyente?: string;
  obligadoContabilidad?: boolean;
  origenDatos?: 'LOCAL' | 'CITIOX_NETWORK' | 'SRI_OFFICIAL' | 'MANUAL';
}

export interface TaxValidationResult {
  isValid: boolean;
  tipoIdentificacion: TipoIdentificacion;
  subtipo?: 'PERSONA_NATURAL' | 'SOCIEDAD_PRIVADA' | 'INSTITUCION_PUBLICA' | 'EXTRANJERO' | 'CONSUMIDOR_FINAL';
  error?: string;
  provinciaCodigo?: string;
}

export interface TaxLookupResult {
  found: boolean;
  source: 'LOCAL' | 'CITIOX_NETWORK' | 'SRI_OFFICIAL' | 'NONE';
  taxPayer?: TaxPayerData;
  validation: TaxValidationResult;
  message?: string;
}

export interface TaxIdentificationProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  lookup(identificacion: string, tipo?: TipoIdentificacion): Promise<TaxPayerData | null>;
}
