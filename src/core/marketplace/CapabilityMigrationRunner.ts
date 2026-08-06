/**
 * @file CapabilityMigrationRunner.ts
 * @module core/marketplace
 * @description Ejecutor desacoplado de migraciones versionadas por capacidad para Citiox Enterprise vNext.
 * @responsibility Invocar el método migrate(fromVersion, toVersion) de cada capacidad de forma segura y auditar los resultados de la migración.
 * @dependencies Capability contract, RuntimeLogger
 * @status Stable (Core Marketplace - v1.0)
 */

import { Capability } from '../contracts/Capability';
import { RuntimeLogger } from '../observability/RuntimeLogger';

export interface MigrationResult {
  capabilityId: string;
  fromVersion: string;
  toVersion: string;
  success: boolean;
  timestamp: string;
  error?: string;
}

export class CapabilityMigrationRunner {
  private logger = RuntimeLogger.getInstance();

  public async runMigration(
    capability: Capability,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResult> {
    const capId = capability.metadata.id;
    this.logger.info(`[CapabilityMigrationRunner] Ejecutando migración para capacidad ${capId}: v${fromVersion} -> v${toVersion}`);

    try {
      await capability.migrate(fromVersion, toVersion);
      const result: MigrationResult = {
        capabilityId: capId,
        fromVersion,
        toVersion,
        success: true,
        timestamp: new Date().toISOString()
      };
      this.logger.info(`[CapabilityMigrationRunner] Migración de ${capId} completada exitosamente`);
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      this.logger.error(`[CapabilityMigrationRunner] Error migrando capacidad ${capId}`, err);
      return {
        capabilityId: capId,
        fromVersion,
        toVersion,
        success: false,
        timestamp: new Date().toISOString(),
        error: errorMsg
      };
    }
  }
}
