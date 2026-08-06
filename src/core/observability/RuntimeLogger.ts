/**
 * @file RuntimeLogger.ts
 * @module core/observability
 * @description Logger estructurado de observabilidad para Citiox Enterprise Core.
 * @responsibility Proveer registro de eventos, trazabilidad con Correlation/Trace ID y auditoría del Runtime.
 * @dependencies Ninguna
 * @status Stable (Core Foundation - v1.0)
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  traceId?: string;
  businessId?: string;
  tenantId?: string;
  context?: Record<string, unknown>;
}

export class RuntimeLogger {
  private static instance: RuntimeLogger;
  private correlationId: string = 'sys-init';
  private traceId: string = 'tr-init';

  private constructor() {}

  public static getInstance(): RuntimeLogger {
    if (!RuntimeLogger.instance) {
      RuntimeLogger.instance = new RuntimeLogger();
    }
    return RuntimeLogger.instance;
  }

  public setContextIds(correlationId?: string, traceId?: string) {
    if (correlationId) this.correlationId = correlationId;
    if (traceId) this.traceId = traceId;
  }

  private format(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      traceId: this.traceId,
      context
    };
  }

  public info(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('INFO', message, context);
    console.log(`[INFO] [${entry.timestamp}] [corr:${entry.correlationId}] ${message}`, context || '');
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('WARN', message, context);
    console.warn(`[WARN] [${entry.timestamp}] [corr:${entry.correlationId}] ${message}`, context || '');
  }

  public error(message: string, error?: any, context?: Record<string, unknown>): void {
    const entry = this.format('ERROR', message, { ...context, error: error?.message || error });
    console.error(`[ERROR] [${entry.timestamp}] [corr:${entry.correlationId}] ${message}`, error, context || '');
  }

  public audit(message: string, context?: Record<string, unknown>): void {
    const entry = this.format('AUDIT', message, context);
    console.log(`[AUDIT] [${entry.timestamp}] [corr:${entry.correlationId}] ${message}`, context || '');
  }
}
