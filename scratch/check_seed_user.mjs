import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkAndSeedUser() {
  try {
    await ssh.connect({
      host: '143.198.15.228',
      username: 'root',
      privateKeyPath: 'C:/Users/PC/.ssh/id_rsa'
    });
    console.log('Conectado al VPS.');

    // 1. Ejecutar el seeder via curl local en el VPS para asegurar que se cree el usuario demo
    console.log('>>> Ejecutando seeder en VPS...');
    const seedRes = await ssh.execCommand('curl -s http://localhost:3000/api/demo/seed-restaurant');
    console.log('Resultado Seeder:', seedRes.stdout);

    // 2. Verificar si el usuario demo existe en PostgreSQL
    console.log('>>> Verificando usuario demo en la base de datos...');
    const userCheck = await ssh.execCommand('sudo -u postgres psql -d backend_spadb -c "SELECT id, email, role, \\"negocioId\\" FROM \\"Usuario\\" WHERE email=\'demo.restaurante@citiox.com\';"');
    console.log('Resultado SQL Usuario:', userCheck.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Error SSH:', err);
  }
}

checkAndSeedUser();
