import path from 'path';
import { config } from 'dotenv';

config(); // carga variables de entorno

/**
 * Ruta base donde se almacenarán los archivos cuando el provider sea 'local'.
 * Valor por defecto: /storage/uploads (relativo al directorio del proyecto).
 */
export const STORAGE_PATH = process.env.STORAGE_PATH
  ? path.resolve(process.env.STORAGE_PATH)
  : path.resolve(process.cwd(), 'storage', 'uploads');

/**
 * Provider de storage a usar. Puede ser 'local', 's3', 'r2', etc.
 * Por ahora sólo está implementado 'local'.
 */
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
