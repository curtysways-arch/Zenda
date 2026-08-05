import { BusinessProvisioningService } from '../src/core/services/BusinessProvisioningService';
import { MODULE_REGISTRY } from '../src/core/modules/registry';
import { TEMPLATE_REGISTRY } from '../src/core/templates/templatesRegistry';

console.log("=== VERIFICACIÓN DE REGISTROS CORE ===");
console.log("Módulos Oficiales Registrados:", Object.keys(MODULE_REGISTRY));
console.log("Templates Oficiales Registrados:", Object.keys(TEMPLATE_REGISTRY));

console.log("\nDetalles del Template Pádel Club:");
console.log(TEMPLATE_REGISTRY.PADEL_CLUB_STANDARD);

console.log("\nPrueba de registros exitosa!");
