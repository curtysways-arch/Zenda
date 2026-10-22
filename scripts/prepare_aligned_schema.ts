import fs from 'fs';
import path from 'path';

async function main() {
  console.log('================================================================================');
  console.log('   CITIOX - FASE A: PREPARAR ESQUEMA ALINEADO (prisma/schema.aligned.prisma)');
  console.log('================================================================================\n');

  const srcSchemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  const targetSchemaPath = path.resolve(process.cwd(), 'prisma/schema.aligned.prisma');

  let content = fs.readFileSync(srcSchemaPath, 'utf8');

  // 1. Cambiar generator a clientAligned con output aislado
  content = content.replace(
    /generator\s+client\s+\{\s+provider\s*=\s*"prisma-client-js"\s+\}/,
    `generator clientAligned {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/client-aligned"
}`
  );

  // 2. Modelo Producto: actualizar stock y agregar campos Fase 2
  content = content.replace(
    /model\s+Producto\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      // Reemplazar stock Int?
      modified = modified.replace(/stock\s+Int\?(\s*\/\/[^\n]*)?/, 'stock             Decimal?          @default(0.0000)');
      
      // Agregar columnas de Fase 2 si no están presentes
      if (!modified.includes('costoPromedio')) {
        const insertion = `
  costoPromedio           Decimal?
  costStatus              String?           @default("UNKNOWN")
  costSource              String?
  unidadMedidaBase        String?
  uomStatus               String?           @default("PENDING_REVIEW")
  densidadGPerMl          Decimal?
  negativeStockAdjustment Decimal?          @default(0.0)
`;
        modified = modified.replace(/costoUnitario\s+Float[^\n]*/, (m: string) => `${m}${insertion}`);
      }
      return `model Producto {${modified}}`;
    }
  );

  // 3. Modelo BranchInventory: stock, minStock, maxStock a Decimal
  content = content.replace(
    /model\s+BranchInventory\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      modified = modified.replace(/stock\s+Int\s+@default\(0\)/, 'stock      Decimal  @default(0.0000)');
      modified = modified.replace(/minStock\s+Int\s+@default\(0\)/, 'minStock   Decimal  @default(0.0000)');
      modified = modified.replace(/maxStock\s+Int\?/, 'maxStock   Decimal?');
      return `model BranchInventory {${modified}}`;
    }
  );

  // 4. Modelo WarehouseStock: quantity, minStock, maxStock a Decimal
  content = content.replace(
    /model\s+WarehouseStock\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      modified = modified.replace(/quantity\s+Float\s+@default\(0\)/, 'quantity    Decimal  @default(0.0000)');
      modified = modified.replace(/minStock\s+Float\s+@default\(0\)/, 'minStock    Decimal  @default(0.0000)');
      modified = modified.replace(/maxStock\s+Float\?/, 'maxStock    Decimal?');
      return `model WarehouseStock {${modified}}`;
    }
  );

  // 5. Modelo InventoryMovement: quantity, unitCost, totalCost, etc.
  content = content.replace(
    /model\s+InventoryMovement\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      modified = modified.replace(/quantity\s+Int/, 'quantity      Decimal');
      modified = modified.replace(/unitCost\s+Float\?/, 'unitCost      Decimal?');
      if (!modified.includes('totalCost')) {
        const insertion = `
  totalCost     Decimal?
  costStatus    String?   @default("UNKNOWN")
  costSource    String?
`;
        modified = modified.replace(/unitCost[^\n]*/, (m: string) => `${m}${insertion}`);
      }
      return `model InventoryMovement {${modified}}`;
    }
  );

  // 6. Modelo PedidoItem: cantidad y precioUnitario a Decimal
  content = content.replace(
    /model\s+PedidoItem\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      modified = modified.replace(/cantidad\s+Int/, 'cantidad       Decimal');
      modified = modified.replace(/precioUnitario\s+Float/, 'precioUnitario Decimal');
      return `model PedidoItem {${modified}}`;
    }
  );

  // 7. Modelo ProductionOrder y ProductionOrderItem
  content = content.replace(
    /model\s+ProductionOrder\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      modified = modified.replace(/targetQuantity\s+Float/, 'targetQuantity    Decimal');
      modified = modified.replace(/actualQuantity\s+Float\?/, 'actualQuantity    Decimal?');
      modified = modified.replace(/wasteQuantity\s+Float\?\s+@default\(0\)/, 'wasteQuantity     Decimal?  @default(0.0000)');
      modified = modified.replace(/estimatedCost\s+Float\s+@default\(0\)/, 'estimatedCost     Decimal   @default(0.00)');
      modified = modified.replace(/actualCost\s+Float\?/, 'actualCost        Decimal?');
      modified = modified.replace(/unitCostReal\s+Float\?/, 'unitCostReal      Decimal?');
      return `model ProductionOrder {${modified}}`;
    }
  );

  content = content.replace(
    /model\s+ProductionOrderItem\s+\{([^}]+)\}/,
    (match, inner) => {
      let modified = inner;
      modified = modified.replace(/plannedQuantity\s+Float/, 'plannedQuantity   Decimal');
      modified = modified.replace(/actualQuantity\s+Float/, 'actualQuantity    Decimal');
      modified = modified.replace(/unitCost\s+Float\s+@default\(0\)/, 'unitCost          Decimal   @default(0.000000)');
      modified = modified.replace(/totalCost\s+Float\s+@default\(0\)/, 'totalCost         Decimal   @default(0.00)');
      return `model ProductionOrderItem {${modified}}`;
    }
  );

  fs.writeFileSync(targetSchemaPath, content, 'utf8');
  console.log(`✅ prisma/schema.aligned.prisma generado con éxito.`);
  console.log(`   Ruta: ${targetSchemaPath}`);
}

main().catch(console.error);
