# AUDITORÍA TÉCNICA CANÓNICA: IMPORTADOR MASIVO DE CATÁLOGO CITIOX

**Fecha:** 2026-09-11  
**Responsable:** Antigravity AI Engine  
**Objetivo:** Diagnóstico exhaustivo y diseño canónico del Importador Universal de Catálogo (Google Sheets, Excel, CSV, ZIP, URLs y Google Drive) para Citiox, garantizando cero duplicación de arquitectura, respeto estricto del multi-tenancy, límites de plan y reutilización de modelos existentes.

---

## 1. Modelos Existentes en Prisma Schema

Se auditó el archivo `prisma/schema.prisma` en su totalidad. Se identificaron los siguientes modelos canónicos universales:

### 1.1. `Producto`
* **Tabla/Modelo:** `Producto`
* **Campos clave:**
  * `id` (UUID, PK)
  * `nombre` (String, obligatorio)
  * `descripcion` (String?, opcional)
  * `precio` (Float, obligatorio)
  * `imagenUrl` (String?, imagen principal)
  * `activo` (Boolean, default: true)
  * `stock` (Int?, stock global)
  * `sku` (String?, referencia o código de barras)
  * `tieneVariantes` (Boolean, default: false)
  * `orden` (Int, default: 0)
  * `llevaEmpaque` (Boolean, default: true)
  * `precioEmpaque` (Float, default: 0.25)
  * `extraInfo` (Json?: almacena `imagenes` secundarias/galería, `dimensiones`, `fichaTecnica`, `caracteristicas`, `fotosDetalle`, `resenasConfig`)
  * `negocioId` (String, FK a `Negocio`)
  * `categoriaId` (String?, FK a `CategoriaProducto`)
* **Relaciones:** `negocio`, `categoria`, `variantes`, `branchProducts`, `branchInventories`, `items` (PedidoItem).
* **Restricción de Unicidad:** La unicidad de `sku` se valida lógicamente a nivel de tenant: `negocioId + sku`.

### 1.2. `ProductoVariante`
* **Tabla/Modelo:** `ProductoVariante`
* **Campos clave:**
  * `id` (UUID, PK)
  * `productoId` (String, FK a `Producto`)
  * `sku` (String?, código SKU específico de la combinación o variante)
  * `nombre` (String, ej. "Rojo / Talla M")
  * `atributos` (Json?, ej. `{ "color": "Rojo", "talla": "M" }`)
  * `precio` (Float?, sobreescritura del precio base si es mayor que 0)
  * `precioAnterior` (Float?, precio de comparación/oferta)
  * `stock` (Int, default: 0)
  * `imagenUrl` (String?, imagen específica de la variante)
  * `activo` (Boolean, default: true)

### 1.3. `CategoriaProducto`
* **Tabla/Modelo:** `CategoriaProducto`
* **Campos clave:**
  * `id` (UUID, PK)
  * `nombre` (String, obligatorio)
  * `activo` (Boolean, default: true)
  * `orden` (Int, default: 0)
  * `negocioId` (String, FK a `Negocio`)

### 1.4. Multi-Sucursal (`Branch`, `BranchProduct`, `BranchInventory`)
* **`Branch`**: `id`, `businessId`, `name`, `slug`, `code`, `active`, `isMain`.
* **`BranchProduct`**: `id`, `branchId`, `productId`, `businessId`, `enabled`, `price`. `@@unique([branchId, productId])`.
* **`BranchInventory`**: `id`, `branchId`, `productId`, `varianteId?`, `businessId`, `stock`, `minStock`, `maxStock`. `@@unique([branchId, productId, varianteId])`.
* **Regla Canónica**: El producto se crea/actualiza a nivel de `businessId` (Negocio). Si el importador incluye asignación de stock por sucursal, se actualiza `BranchInventory` para esa sucursal verificando la pertenencia al mismo `businessId`.

### 1.5. Modelos de Multimedia (`Media`, `Imagen`)
* **`Media`**: Modelo canónico para gestión de assets con provider local/S3/R2 (`businessId`, `url`, `fileKey`, `provider`, `mimeType`, `size`, `width`, `height`, `category`).
* **`Imagen`**: Modelo legacy secundario para galerías de servicios.
* **Storage Canónico**: Se utiliza el `StorageService` (`src/lib/storage/storageService.ts`) que guarda físicamente en disco bajo `STORAGE_PATH/{businessId}/{category}` y genera registros en `Media`.

---

## 2. APIs y Rutas Existentes

### 2.1. Gestión de Productos
* `GET /api/admin/productos`: Lista productos del negocio actual autenticado (`negocioId`), incluyendo categorías y variantes.
* `POST /api/admin/productos`: Crea producto, valida unicidad de SKU (`checkBusinessSkuUniqueness`), valida límites de plan (`EntitlementsService.checkLimit(negocioId, 'products')`) y crea variantes iniciales si se suministran.
* `PUT /api/admin/productos`: Actualiza producto existente, valida pertenencia al `negocioId` y sincroniza variantes y extraInfo.
* `DELETE /api/admin/productos?id=...`: Elimina producto validando pertenencia al `negocioId`.

### 2.2. Gestión de Categorías
* `GET /api/admin/categorias`: Lista categorías del negocio.
* `POST /api/admin/categorias`: Crea categoría con `negocioId`.

### 2.3. Almacenamiento y Carga de Archivos
* `POST /api/admin/upload`: Endpoint multipart/form-data que usa `storageService.handleUpload(buffer, businessId, category)`.
* `src/lib/storage/storageService.ts`:
  * Detecta tipo MIME real vía `file-type`.
  * Optimiza y genera miniaturas mediante `sharp`.
  * Guarda en `STORAGE_PATH/{businessId}/{category}/{filename}`.
  * Registra en la tabla `Media`.
  * Devuelve `{ id, url, thumbUrl, mediumUrl }`.

---

## 3. Seguridad, Autenticación y Multi-Tenancy

1. **Sesión Canónica**: Se obtiene mediante `getServerSession(authOptions)`.
2. **Tenant Derivado**: El `businessId` / `negocioId` **NUNCA** se confía del body o query del cliente. Se extrae estrictamente de:
   ```ts
   const negocioId = (session.user as any).negocioId;
   ```
   con resolución fallback a `Usuario.negocioId` por email si no estuviese en el JWT de sesión.
3. **Roles y Permisos**: Roles admitidos en el módulo de catálogo: `ADMIN`, `ADMIN_NEGOCIO`, `SUPERADMIN`, `OWNER`.
4. **Protección SSRF (Server-Side Request Forgery)** para descarga de imágenes por URL:
   * Debe validarse que el protocolo sea exclusivamente `http:` o `https:`.
   * Bloqueo estricto de IPs privadas/loopback: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`, `localhost`.
   * Límite de timeout (máx 10 segundos) y tamaño máximo de archivo (máx 15MB por imagen).
   * Validación del buffer descargado con `file-type` (solo `image/jpeg`, `image/png`, `image/webp`, `image/gif`).
5. **Protección ZIP Slip**: Al descomprimir ZIPs de imágenes, normalizar rutas relativas y asegurar que `path.resolve(destDir, entryPath).startsWith(destDir)`.
6. **Protección contra Fórmulas Maliciosas (CSV Injection)**: Al generar plantillas o exportaciones, sanitizar celdas que inicien con `=`, `+`, `-`, `@`.

---

## 4. Capabilities y Límites de Plan (`PlanLimit` / `EntitlementsService`)

* **Capability**: `capabilities.catalog` y `capabilities.products`.
* **Límite Canónico de Plan**:
  ```ts
  const limitCheck = await EntitlementsService.checkProductLimit(negocioId);
  // Devuelve: { allowed: boolean, current: number, limit: number, remaining: number, message?: string }
  ```
* **Regla de Ingestión**:
  * Si el plan tiene un límite de 500 productos y el negocio ya tiene 450, solo puede crear 50 productos nuevos. Los productos existentes que solo se actualicen no cuentan contra el incremento de stock/productos nuevos.
  * El importador debe calcular en el **Preview / Dry Run** cuántos productos son **NUEVOS** vs cuántos son **ACTUALIZACIONES** y advertir anticipadamente si la cantidad de productos nuevos excede `remaining`.

---

## 5. Consumo en Carrito, Órdenes y Checkout

* `CartContext` (`src/core/context/CartContext.tsx`) consume `CartProduct` con los campos directos de `Producto` (`id`, `nombre`, `precio`, `imagenUrl`, `categoriaId`, `sku`, `llevaEmpaque`, `precioEmpaque`) y `ProductoVariante` (`varianteId`, `varianteNombre`).
* `PedidoItem` en Prisma almacena `productoId` y `precioUnitario`.
* **Conclusión**: El importador alimenta de manera 100% canónica los modelos `Producto`, `CategoriaProducto` y `ProductoVariante`. Ningún cambio es requerido en el carrito o checkout.

---

## 6. Importadores Existentes

* Se auditó todo el repositorio en busca de importadores masivos previos.
* **Resultado**: **No existe ningún importador masivo de catálogo previo** en el sistema.
* Este nuevo módulo será la **implementación canónica fundacional** para Citiox.

---

## 7. Diseño de la Solución Canónica

### 7.1. Flujo de Ingestión de 8 Pasos
```
1. SELECCIÓN DE ORIGEN (Google Sheets / Excel .xlsx / CSV / ZIP de imágenes)
                    ↓
2. EXTRACCIÓN Y DETECCIÓN DE ESTRUCTURA (Parser de filas y cabeceras)
                    ↓
3. MAPEADOR DE COLUMNAS INTELIGENTE (ColumnMappingService con auto-detección)
                    ↓
4. RESOLUTOR DE IMÁGENES (URLs externas seguras con SSRF-guard / ZIP match por SKU / Drive)
                    ↓
5. DRY RUN & VALIDACIÓN (Sin tocar DB: detecta duplicados, errores por fila, tipos, límites de plan)
                    ↓
6. PREVIEW INTERACTIVO (Resumen de altas, modificaciones, categorías a crear y alertas detalladas)
                    ↓
7. EJECUCIÓN POR LOTES IDEMPOTENTE (Batching de 25-50 filas con transacción por lote)
                    ↓
8. REPORTE DE RESULTADOS & AUDITORÍA (Métricas finales, errores específicos y acceso al catálogo)
```

### 7.2. Identidad del Producto y Modos de Actualización
* **Identificador único de producto:** `businessId + sku` (o `businessId + nombre` si no se provee SKU).
* **Modo de conflicto:**
  * Actualizar datos del producto existente o conservarlos.
  * Stock: Reemplazar, incrementar o mantener.
  * Imágenes: Reemplazar o conservar existentes si no vienen nuevas.
  * Categorías: Auto-crear dentro del `businessId` si no existen.

### 7.3. Modelo Mínimo para Historial de Importaciones
Para mantener trazabilidad, idempotencia y auditoría sin alterar modelos centrales:
```prisma
model CatalogImport {
  id              String    @id @default(uuid())
  businessId      String
  userId          String?
  sourceType      String    // GOOGLE_SHEETS, EXCEL, CSV, ZIP
  sourceFileName  String?
  status          String    @default("PENDING") // PENDING, VALIDATING, READY, PROCESSING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED, CANCELLED
  totalRows       Int       @default(0)
  processedRows   Int       @default(0)
  createdCount    Int       @default(0)
  updatedCount    Int       @default(0)
  errorCount      Int       @default(0)
  skippedCount    Int       @default(0)
  errorSummary    Json?
  mappingConfig   Json?
  options         Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  negocio         Negocio   @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId])
  @@index([businessId, status])
}
```

---

## 8. Archivos a Modificar / Crear

1. **Nuevo Modelo en Prisma:** `prisma/schema.prisma` (`model CatalogImport`).
2. **Servicios del Núcleo de Importación:**
   * `src/core/catalog/importer/types.ts`: Interfaces canónicas de fila normalizada, mapping, preview y batch results.
   * `src/core/catalog/importer/ColumnMappingService.ts`: Mapeo heurístico automático de encabezados a campos de Citiox.
   * `src/core/catalog/importer/DataParserService.ts`: Parseo unificado de CSV, XLSX y Google Sheets (formato CSV export).
   * `src/core/catalog/importer/ImageUrlValidator.ts`: Protección SSRF, chequeo de protocolos, rangos de IP privadas y tamaños.
   * `src/core/catalog/importer/ImageResolverService.ts`: Descarga, validación MIME con `file-type`, optimización y guardado vía `StorageService`.
   * `src/core/catalog/importer/CatalogImportValidator.ts`: Dry run sin tocar BD, conteo de nuevos vs actualizados, chequeo de límites de plan.
   * `src/core/catalog/importer/CatalogImportExecutor.ts`: Ejecución por lotes idempotente con transacciones Prisma seguras.
3. **Endpoints API:**
   * `POST /api/admin/catalog/import/parse`: Recibe archivo/Sheets URL y devuelve encabezados y filas detectadas.
   * `POST /api/admin/catalog/import/validate`: Ejecuta Dry Run y devuelve preview con validaciones y alertas.
   * `POST /api/admin/catalog/import/execute`: Ejecuta la importación por lotes de forma transaccional.
   * `GET /api/admin/catalog/import/template`: Genera y descarga `Citiox_Catalogo_Template.xlsx` con hoja de instrucciones.
   * `GET /api/admin/catalog/import/history`: Historial de importaciones del negocio.
4. **Vistas de Administración:**
   * `src/app/admin/catalogo/importar/page.tsx`: Asistente visual (Wizard) completo con selector de origen, mapeador visual, preview de filas, barra de progreso y resumen.
   * `src/app/admin/catalogo/importaciones/page.tsx`: Pantalla de historial de importaciones.
   * `src/app/admin/productos/page.tsx`: Agregar botón de acceso directo "Importar Catálogo".
   * `src/components/admin/AdminSidebar.tsx`: Agregar ítem "Importar Catálogo" en la sección `CATÁLOGO`.
