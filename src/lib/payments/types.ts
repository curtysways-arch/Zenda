/**
 * Definiciones de Tipos y Contratos para el Módulo de Pagos Desacoplado
 * Clean Architecture & SOLID
 */

export type PaymentStatus =
    | 'PENDIENTE'
    | 'COMPROBANTE_ENVIADO'
    | 'EN_REVISION'
    | 'CONFIRMADO'
    | 'RECHAZADO'
    | 'EXPIRADO'
    | 'REEMBOLSADO';

export type OrderStatus =
    | 'BORRADOR'
    | 'PENDIENTE_PAGO'
    | 'PAGO_EN_REVISION'
    | 'PAGO_CONFIRMADO'
    | 'EN_PREPARACION'
    | 'LISTO'
    | 'EN_RUTA'
    | 'ENTREGADO'
    | 'CANCELADO';

export type PaymentProviderCode = 'BANK_TRANSFER' | 'PAYMENT_GATEWAY' | 'CASH';

export interface BankAccountConfig {
    banco: string;
    titular: string;
    numeroCuenta: string;
    tipoCuenta: 'Ahorros' | 'Corriente' | string;
    identificacion?: string;
    qrImageUrl?: string;
    instructions?: string;
}

export interface PaymentMethodDTO {
    id: string;
    negocioId: string;
    providerId: string;
    providerCode: PaymentProviderCode;
    providerName: string;
    enabled: boolean;
    customName?: string;
    bankConfig?: BankAccountConfig;
    instructions?: string;
}

export interface UploadEvidenceDTO {
    paymentId: string;
    fileUrl: string;
    fileType: 'IMAGE' | 'PDF';
    mimeType: string;
    fileSize: number;
    uploadedBy?: string;
}

export interface ChangePaymentStatusDTO {
    paymentId: string;
    newStatus: PaymentStatus;
    observacion?: string;
    motivoRechazo?: string;
    responsableId?: string;
    responsableNombre?: string;
}

/**
 * Strategy Pattern Interface para Proveedores de Pago Futuros
 */
export interface PaymentProviderStrategy {
    code: PaymentProviderCode;
    name: string;
    processPayment?(params: { paymentId: string; amount: number; payload: any }): Promise<{ success: boolean; transactionId?: string; error?: string }>;
    validateEvidence?(evidence: UploadEvidenceDTO): Promise<boolean>;
}
