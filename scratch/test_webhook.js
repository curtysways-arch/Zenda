const http = require('http');

const testWebhook = (text, phone = "593987654321") => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      from: phone,
      text: text,
      message_id: `test_msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      raw_jid: `${phone}@s.whatsapp.net`,
      bot_number: "593999999999",
      is_from_me: false
    });

    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/webhooks/whatsapp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: JSON.parse(body)
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
};

async function run() {
  console.log("Enviando mensaje de prueba 'ayuda'...");
  try {
    const res = await testWebhook("ayuda");
    console.log("Status Code:", res.statusCode);
    console.log("Respuesta del webhook:", JSON.stringify(res.body, null, 2));
  } catch (err) {
    console.error("Error llamando al webhook:", err.message);
  }
}

run();
