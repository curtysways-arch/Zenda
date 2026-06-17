const { SignJWT } = require('jose');

async function main() {
  const secret = new TextEncoder().encode('default_otp_secret_key_change_me');
  const token = await new SignJWT({
      telefono: '+593959997521',
      negocioId: 'cmmlfry6q0004l0w54cdbpyx9',
      slug: 'demo-spa'
  })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret);
  
  console.log("TOKEN:", token);
}
main();
