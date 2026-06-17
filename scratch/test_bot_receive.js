const http = require('http');

const data = JSON.stringify({
  from: "593987654321",
  text: "ayuda"
});

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/test-receive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log("Enviando petición POST a http://127.0.0.1:3001/test-receive...");
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", body);
  });
});

req.on('error', (e) => {
  console.error("Error conectando con el bot:", e.message);
});

req.write(data);
req.end();
