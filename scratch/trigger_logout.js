const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/logout',
  method: 'POST',
  headers: {
    'Content-Length': 0
  }
};

console.log("Enviando petición POST a http://127.0.0.1:3001/logout para limpiar sesión corrupta...");
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", body);
  });
});

req.on('error', (e) => {
  console.error("Error al desconectar el bot:", e.message);
});

req.end();
