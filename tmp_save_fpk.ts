import prisma from './src/lib/prisma';

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9wxuGn8wBu+9l
bmAd4/eXNZ/cYqSZjElkbscONUHY3Cp1c1Cmf2Y6GzE/n5az74lP8wj3HjzVBZz/
YJ3qwKXGg0Xq4ZeLqoKSQr+3LHZXGEPQmkO7/jxiY9pVZOJflH8/uzL42+hrEYCg
u2v9OJzd3UuBolbibwZXqRCXDIjaubUrk6mU4SqAfPNp6Y8Y/npYenRbtUTFUegU
N9nlmrjl7iBfMrxubWxDJlef5mgM67iO8ClN3/Qw0+CK+FZ3hfbBNkYcg+nqPtxs
VBDpZ5ujwLgmrWYpzujvQKxfGNem1cCvKKc8YxdkQPi5n9cwJ9uASwB8zDqhQw2v
fkh99zb3AgMBAAECggEAAOIUkbbSqztlrNIrrlfuQgzk1pC69V/6w3XkhUNoMAsu
Q2eq+2tiXWjc/M/QUrwNpoqaAxRn8hHZnjKj6YDGBLt9qs8r9mFvxCB9ZevWDSe2
wRTGtexD+a0/SeBzUUCOqwxC+3eCiGUHdTgKE56c1EeAX3US9HDR1byasClFxcbP
acoY+UqRjL/9TaAlfFNWXx8SKOp9qrD+jXUAyLmnc79iop/yMNlsK13K85eHzUZP
bjPbssDITujHQBC/32Z+yO3/YeSUX49kb71SZ/5oO4wg6A0SzT2Qkh+BlKUhhSKD
LhwluoJDif71ivTyV7VLToG9eFgnb1hLuQ+Mwq+CUQKBgQD1hIRNXNi3EMDyazi3
TGaDd+HpGgrXdPvxOjkHxcTL4Sa5zE3EouTqbPuQfO5w/8iiyVJiCgsN9rSkGynM
Zwogi3u9uhIDi4hNwVsgYyivVZbFcr8sVfXi0azy5Pg7puy6vO3vghVk3WoIdfn7
WsFmS7iObC7XduEspb8G7I9tGQKBgQDF3TBLGwpDU5VZcvtzhWXbohzsoaTm3aFM
7NV9lCL/JaZYS+bNKQZkov+0WR8VbmgopXqb8gMDBgKQgJgIrfi+WgDGloQkXTst
MXhlxIOPLSBVmD/EDktVRqPrtfaA6uY9qO55EMMqVb1OV2Ge2ebdc3vNe4bpCraY
njiJy5EY2jwKBgQDNxhNdA8RfKpuMknEmr9H7vi6JwFn12waOV84UxZz7g+mBL8q+
VAiosk7l+s+dxcPTLAjwQpqhSXR9Vobh2jqSrFU53wnaDshe4wANVQ50ZbfIJTQ1
ZJaBVFsv+NhUpsMif9asNsrXjvufu8GY+ae+pRg5xlI8JFb1pLVGiF5tgQKBgBHB
ZIkI1yXthTRurgPSz64i4QeXBc41yzi08/994JoWzdOUlBSK/uje+6U6biClNLGZ
D+SYlg6aZnaDI6F7wxuJxhIMBbWhrCLFErHHLasWeJVVwTsdsULowOLxBDrTWW/l
DelNSMYuxXsXOkpf8Wij6VMqJ5QYAwSzlIHM3EQfAoGAKCuTVZqUnAtAoysNGEqK
GKd6+QVLVAuST89a6O/cYiGQ9GG5BgZ1imfshPJb1XOjR0i/OqHMMcKEYEr0S3cl
Hd/dO7OoMjZ5FHU3agWJXqZkaXEbKy12LkAkqibFL91UnvLoncaRSgEpUMrY1yEQ
oe1ss7l5ALwGm3Tz7zbUyHY=
-----END PRIVATE KEY-----`;

async function main() {
  await prisma.globalConfig.upsert({
    where: { clave: 'FIREBASE_PRIVATE_KEY' },
    update: { valor: privateKey },
    create: { clave: 'FIREBASE_PRIVATE_KEY', valor: privateKey }
  });
  console.log('Llave privada guardada correctamente desde archivo script.');
}

main().catch(console.error);
