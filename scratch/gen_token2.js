const { SignJWT } = require('jose');

async function main() {
  const secret = new TextEncoder().encode('9a48f95c87e3f890c29f273398c2578e');
  const token = await new SignJWT({
      telefono: '+593959997521',
      negocioId: 'cmmlfry6q0004l0w54cdbpyx9',
      slug: 'demo-spa'
  })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret);
  
  console.log("TOKEN2:", token);
}
main();
