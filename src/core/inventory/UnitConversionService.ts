import { Prisma } from '@prisma/client';
import {
  toDecimal,
  roundQty,
  mulDecimal,
  divDecimal,
  DecimalInput
} from '../../lib/math/money';

export type UnitFamily = 'MASS' | 'VOLUME' | 'COUNT' | 'UNKNOWN';

export interface UnitDefinition {
  code: string;
  family: UnitFamily;
  factorToBase: Prisma.Decimal; // Factor que multiplica esta unidad para dar la unidad canónica de su familia (KG para MASS, L para VOLUME, UND para COUNT)
  name: string;
}

export interface ProductUomContext {
  productId: string;
  productName: string;
  unidadMedidaBase?: string | null;
  uomStatus?: 'CONFIRMED' | 'PENDING_REVIEW' | string | null;
  densidadGPerMl?: DecimalInput; // g/ml o kg/L
}

export interface PresentationFactor {
  name: string;
  unit: string;
  factorBase: DecimalInput; // Multiplicador para llevar a la unidad base del producto
}

export class UnitConversionService {
  /**
   * Catálogo de unidades estándar y sus factores hacia la unidad canónica universal de su familia:
   * - Familia MASS: Base canónica universal = KG
   * - Familia VOLUME: Base canónica universal = L
   * - Familia COUNT: Base canónica universal = UND
   */
  private static readonly STANDARD_UNITS: Record<string, UnitDefinition> = {
    // ── Masa (Base universal: KG)
    KG: { code: 'KG', family: 'MASS', factorToBase: new Prisma.Decimal('1.0'), name: 'Kilogramo' },
    KILO: { code: 'KG', family: 'MASS', factorToBase: new Prisma.Decimal('1.0'), name: 'Kilogramo' },
    G: { code: 'G', family: 'MASS', factorToBase: new Prisma.Decimal('0.001'), name: 'Gramo' },
    GR: { code: 'G', family: 'MASS', factorToBase: new Prisma.Decimal('0.001'), name: 'Gramo' },
    GRAMOS: { code: 'G', family: 'MASS', factorToBase: new Prisma.Decimal('0.001'), name: 'Gramos' },
    MG: { code: 'MG', family: 'MASS', factorToBase: new Prisma.Decimal('0.000001'), name: 'Miligramo' },
    LB: { code: 'LB', family: 'MASS', factorToBase: new Prisma.Decimal('0.45359237'), name: 'Libra' },
    LIBRA: { code: 'LB', family: 'MASS', factorToBase: new Prisma.Decimal('0.45359237'), name: 'Libra' },
    OZ: { code: 'OZ', family: 'MASS', factorToBase: new Prisma.Decimal('0.02834952'), name: 'Onza' },

    // ── Volumen (Base universal: L)
    L: { code: 'L', family: 'VOLUME', factorToBase: new Prisma.Decimal('1.0'), name: 'Litro' },
    LT: { code: 'L', family: 'VOLUME', factorToBase: new Prisma.Decimal('1.0'), name: 'Litro' },
    LITRO: { code: 'L', family: 'VOLUME', factorToBase: new Prisma.Decimal('1.0'), name: 'Litro' },
    LITROS: { code: 'L', family: 'VOLUME', factorToBase: new Prisma.Decimal('1.0'), name: 'Litros' },
    ML: { code: 'ML', family: 'VOLUME', factorToBase: new Prisma.Decimal('0.001'), name: 'Mililitro' },
    CC: { code: 'ML', family: 'VOLUME', factorToBase: new Prisma.Decimal('0.001'), name: 'Centímetro Cúbico' },
    GAL: { code: 'GAL', family: 'VOLUME', factorToBase: new Prisma.Decimal('3.78541178'), name: 'Galón' },
    GALON: { code: 'GAL', family: 'VOLUME', factorToBase: new Prisma.Decimal('3.78541178'), name: 'Galón' },
    FLOZ: { code: 'FLOZ', family: 'VOLUME', factorToBase: new Prisma.Decimal('0.02957353'), name: 'Onza Fluida' },

    // ── Unidades / Conteo (Base universal: UND)
    UND: { code: 'UND', family: 'COUNT', factorToBase: new Prisma.Decimal('1.0'), name: 'Unidad' },
    UNIDAD: { code: 'UND', family: 'COUNT', factorToBase: new Prisma.Decimal('1.0'), name: 'Unidad' },
    U: { code: 'UND', family: 'COUNT', factorToBase: new Prisma.Decimal('1.0'), name: 'Unidad' },
    PZA: { code: 'UND', family: 'COUNT', factorToBase: new Prisma.Decimal('1.0'), name: 'Pieza' },
    DOCENA: { code: 'DOCENA', family: 'COUNT', factorToBase: new Prisma.Decimal('12.0'), name: 'Docena' },
    CIENTO: { code: 'CIENTO', family: 'COUNT', factorToBase: new Prisma.Decimal('100.0'), name: 'Ciento' }
  };

  /**
   * Normaliza la cadena de texto de la unidad (mayúsculas, sin espacios).
   */
  public static normalizeUnitCode(unit: string): string {
    if (!unit) return '';
    return unit.trim().toUpperCase();
  }

  /**
   * Obtiene la definición de una unidad estándar.
   */
  public static getUnitDefinition(unit: string): UnitDefinition | null {
    const code = this.normalizeUnitCode(unit);
    return this.STANDARD_UNITS[code] || null;
  }

  /**
   * Convierte directamente entre unidades de la misma familia física o con densidad si cruza masa/volumen.
   */
  public static convertQuantity(
    quantity: DecimalInput,
    fromUnit: string,
    toUnit: string,
    densityGPerMl?: DecimalInput
  ): Prisma.Decimal {
    const fromCode = this.normalizeUnitCode(fromUnit);
    const toCode = this.normalizeUnitCode(toUnit);

    const q = toDecimal(quantity);
    if (fromCode === toCode) {
      return roundQty(q);
    }

    const fromDef = this.getUnitDefinition(fromCode);
    const toDef = this.getUnitDefinition(toCode);

    if (!fromDef) {
      throw new Error(`Unidad origen desconocida o no soportada: "${fromUnit}".`);
    }
    if (!toDef) {
      throw new Error(`Unidad destino desconocida o no soportada: "${toUnit}".`);
    }

    // 1. Misma familia (Masa ↔ Masa, Volumen ↔ Volumen, Conteo ↔ Conteo)
    if (fromDef.family === toDef.family) {
      // Llevar origen a base universal: q * fromFactor
      const inUniversal = mulDecimal(q, fromDef.factorToBase);
      // Llevar base universal a destino: inUniversal / toFactor
      const result = divDecimal(inUniversal, toDef.factorToBase);
      return roundQty(result);
    }

    // 2. Cruce Masa ↔ Volumen (Requiere densidad explícita)
    const isMassToVolume = fromDef.family === 'MASS' && toDef.family === 'VOLUME';
    const isVolumeToMass = fromDef.family === 'VOLUME' && toDef.family === 'MASS';

    if (isMassToVolume || isVolumeToMass) {
      if (!densityGPerMl) {
        throw new Error(
          `Conversión dimensional bloqueada: no es posible convertir entre ${fromDef.name} y ${toDef.name} sin una densidad (g/ml) configurada explícitamente.`
        );
      }

      const density = toDecimal(densityGPerMl);
      if (density.isZero() || density.isNegative()) {
        throw new Error(`La densidad debe ser un número positivo mayor a cero (recibido: ${density.toString()}).`);
      }

      // Densidad en g/ml equivale exactamente a kg/L (1 g/ml = 1000 kg / 1000 L = 1 kg/L)
      if (isMassToVolume) {
        // Masa en KG universal
        const massInKg = mulDecimal(q, fromDef.factorToBase);
        // Volumen en L universal = masa (kg) / densidad (kg/L)
        const volInL = divDecimal(massInKg, density);
        // Llevar L universal a la unidad destino
        const result = divDecimal(volInL, toDef.factorToBase);
        return roundQty(result);
      } else {
        // Volumen en L universal
        const volInL = mulDecimal(q, fromDef.factorToBase);
        // Masa en KG universal = volumen (L) * densidad (kg/L)
        const massInKg = mulDecimal(volInL, density);
        // Llevar KG universal a la unidad destino
        const result = divDecimal(massInKg, toDef.factorToBase);
        return roundQty(result);
      }
    }

    // 3. Familias incompatibles (ej: Masa con Conteo)
    throw new Error(
      `Conversión incompatible: no es posible convertir entre la familia ${fromDef.family} (${fromUnit}) y ${toDef.family} (${toUnit}).`
    );
  }

  /**
   * Convierte una cantidad de compra, receta o venta a la unidad canónica de almacenamiento del producto.
   * Valida estrictamente el estado PENDING_REVIEW del producto.
   */
  public static convertToProductBase(
    quantity: DecimalInput,
    inputUnit: string,
    context: ProductUomContext,
    presentationFactor?: PresentationFactor | null
  ): Prisma.Decimal {
    const { productId, productName, unidadMedidaBase, uomStatus, densidadGPerMl } = context;

    if (!unidadMedidaBase) {
      throw new Error(
        `El producto "${productName}" (ID: ${productId}) no tiene configurada su unidad canónica base.`
      );
    }

    const normInputUnit = this.normalizeUnitCode(inputUnit);
    const normBaseUnit = this.normalizeUnitCode(unidadMedidaBase);

    // Si coincide exactamente la unidad
    if (normInputUnit === normBaseUnit && !presentationFactor) {
      return roundQty(quantity);
    }

    // Validación de PENDING_REVIEW:
    // Si la unidad está pendiente de confirmación, se bloquean conversiones complejas
    if (uomStatus && uomStatus !== 'CONFIRMED') {
      throw new Error(
        `El producto "${productName}" tiene su unidad de medida en estado "${uomStatus}". Debe confirmar su UOM canónica antes de registrar compras fraccionadas o consumos en recetas.`
      );
    }

    // 1. Si viene con factor de presentación explícito (ej: Saco de 25 kg)
    if (presentationFactor && presentationFactor.factorBase) {
      const q = toDecimal(quantity);
      const factor = toDecimal(presentationFactor.factorBase);
      const converted = mulDecimal(q, factor);
      return roundQty(converted);
    }

    // 2. Si son unidades estándar, convertir automáticamente a la unidad base del producto
    return this.convertQuantity(quantity, inputUnit, unidadMedidaBase, densidadGPerMl);
  }
}
