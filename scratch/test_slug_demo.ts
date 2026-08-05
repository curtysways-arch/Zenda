import { getNegocioBySlug } from '../src/lib/services';

async function testDemo() {
  console.log("=== PROBANDO getNegocioBySlug('demo-canchas') ===");
  const negocio = await getNegocioBySlug('demo-canchas');

  if (negocio) {
    console.log("✅ Negocio cargado correctamente:", negocio.nombre);
    console.log(" - Slug:", negocio.slug);
    console.log(" - Tipo Negocio:", negocio.tipoNegocio);
    console.log(" - Servicios/Canchas cargadas:", negocio.services?.length || 0);
  } else {
    console.error("❌ No se encontró el negocio demo-canchas");
  }
}

testDemo().catch(console.error).finally(() => process.exit(0));
