import { getNegocioBySlug } from '../src/lib/services';

async function debug() {
  console.log("=== DEBUG getNegocioBySlug('complejo-test') ===");
  const negocio = await getNegocioBySlug('complejo-test');
  console.log("negocio.imagenes count:", negocio?.imagenes?.length);
  console.log("negocio.imagenes:", JSON.stringify(negocio?.imagenes, null, 2));
}

debug().catch(console.error).finally(() => process.exit(0));
