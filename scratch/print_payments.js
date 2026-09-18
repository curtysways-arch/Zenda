const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const paymentModels = ['Payment', 'PaymentMethod', 'PaymentProvider', 'PaymentAccount', 'PaymentHistory', 'OrderPayment', 'PagoReserva'];
paymentModels.forEach(modelName => {
  const regex = new RegExp(`model\\s+${modelName}\\s+{[^}]+}`, 'g');
  const match = schema.match(regex);
  if (match) {
    console.log(`=== MODEL ${modelName} ===`);
    console.log(match[0]);
  }
});
