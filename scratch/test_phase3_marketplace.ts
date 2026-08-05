import { TEMPLATE_REGISTRY } from '../src/core/templates/templatesRegistry';
import { getModuleManifest } from '../src/core/modules/registry';

console.log("=== VERIFICACIÓN FASE 3: MARKETPLACE DE TEMPLATES ===");

const templates = Object.values(TEMPLATE_REGISTRY);
console.log(`Total Plantillas Disponibles en Marketplace: ${templates.length}\n`);

templates.forEach((tpl, idx) => {
  const moduleInfo = getModuleManifest(tpl.module);
  console.log(`Template ${idx + 1}: ${tpl.name} [v${tpl.templateVersion}]`);
  console.log(`  - Módulo Asociado: ${moduleInfo.name} (${tpl.module})`);
  console.log(`  - Perfil: ${tpl.profile}`);
  console.log(`  - Capabilities Activas:`, Object.keys(tpl.capabilities).join(', '));
  console.log(`  - Recursos Iniciales:`, tpl.initialResources.map(r => r.name).join(', '));
  console.log('--------------------------------------------------');
});

console.log("\n✅ MARKETPLACE DE TEMPLATES 1-CLICK LISTO PARA PRUEBAS");
