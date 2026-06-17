import prisma from './src/lib/prisma';

const serviceAccount = {
  "type": "service_account",
  "project_id": "canchas-saas",
  "private_key_id": "0f098baf06c1c8adc7c346ce93e24a5639c4e9a2",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9wxuGn8wBu+9l\nbmAd4/eXNZ/cYqSZjElkbscONUHY3Cp1c1Cmf2Y6GzE/n5az74lP8wj3HjzVBZz/\nYJ3qwKXGg0Xq4ZeLqoKSQr+3LHZXGEPQmkO7/jxiY9pVZOJflH8/uzL42+hrEYCg\nu2v9OJzd3UuBolbibwZXqRCXDIjaubUrk6mU4SqAfPNp6Y8Y/npYenRbtUTFUegU\nN9nlmrjl7iBfMrxubWxDJlef5mgM67iO8ClN3/Qw0+CK+FZ3hfbBNkYcg+nqPtxs\nVBDpZ5ujwLgmrWYpzujvQKxfGNem1cCvKKc8YxdkQPi5n9cwJ9uASwB8zDqhQw2v\nfkh99zb3AgMBAAECggEAAOIUkbbSqztlrNIrrlfuQgzk1pC69V/6w3XkhUNoMAsu\nQ2eq+2tiXWjc/M/QUrwNpoqaAxRn8hHZnjKj6YDGBLt9qs8r9mFvxCB9ZevWDSe2\nwRTGtexD+a0/SeBzUUCOqwxC+3eCiGUHdTgKE56c1EeAX3US9HDR1byasClFxcbP\nacoY+UqRjL/9TaAlfFNWXx8SKOp9qrD+jXUAyLmnc79iop/yMNlsK13K85eHzUZP\nbjPbssDITujHQBC/32Z+yO3/YeSUX49kb71SZ/5oO4wg6A0SzT2Qkh+BlKUhhSKD\nLhwluoJDif71ivTyV7VLToG9eFgnb1hLuQ+Mwq+CUQKBgQD1hIRNXNi3EMDyazi3\nTGaDd+HpGgrXdPvxOjkHxcTL4Sa5zE3EouTqbPuQfO5w/8iiyVJiCgsN9rSkGynM\nZwogi3u9uhIDi4hNwVsgYyivVZbFcr8sVfXi0azy5Pg7puy6vO3vghVk3WoIdfn7\nWsFmS7iObC7XduEspb8G7I9tGQKBgQDF3TBLGwpDU5VZcvtzhWXbohzsoaTm3aFM\n7NV9lCL/JaZYS+bNKQZkov+0WR8VbmgopXqb8gMDBgKQgJgIrfi+WgDGloQkXTst\nMXhlxIOPLSBVmD/EDktVRqPrtfaA6uY9qO55EMMqVb1OV2Ge2ebdc3vNe4bpCraY\njiJy5EY2jwKBgQDNxhNdA8RfKpuMknEmr9H7vi6JwFn12waOV84UxZz7g+mBL8q+\nVAiosk7l+s+dxcPTLAjwQpqhSXR9Vobh2jqSrFU53wnaDshe4wANVQ50ZbfIJTQ1\nZJaBVFsv+NhUpsMif9asNsrXjvufu8GY+ae+pRg5xlI8JFb1pLVGiF5tgQKBgBHB\nZIkI1yXthTRurgPSz64i4QeXBc41yzi08/994JoWzdOUlBSK/uje+6U6biClNLGZ\nD+SYlg6aZnaDI6F7wxuJxhIMBbWhrCLFErHHLasWeJVVwTsdsULowOLxBDrTWW/l\nDelNSMYuxXsXOkpf8Wij6VMqJ5QYAwSzlIHM3EQfAoGAKCuTVZqUnAtAoysNGEqK\nGKd6+QVLVAuST89a6O/cYiGQ9GG5BgZ1imfshPJb1XOjR0i/OqHMMcKEYEr0S3cl\nHd/dO7OoMjZ5FHU3agWJXqZkaXEbKy12LkAkqibFL91UnvLoncaRSgEpUMrY1yEQ\noe1ss7l5ALwGm3Tz7zbUyHY=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@canchas-saas.iam.gserviceaccount.com"
};

async function main() {
  await prisma.globalConfig.upsert({
    where: { clave: 'FIREBASE_PRIVATE_KEY' },
    update: { valor: serviceAccount.private_key },
    create: { clave: 'FIREBASE_PRIVATE_KEY', valor: serviceAccount.private_key }
  });
  console.log('Llave privada limpia guardada correctamente.');
}

main().catch(console.error);
