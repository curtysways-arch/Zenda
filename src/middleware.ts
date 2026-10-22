import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { requiredTeamPermission, tokenHasPermission, isPlatformOwner, firstAllowedPage } from '@/lib/admin/teamAccessMap';

// Rutas de /api/superadmin que también usan los dueños de negocio (requieren sesión, no rol de superadmin).
const SUPERADMIN_API_FOR_ANY_SESSION = ['/api/superadmin/upload'];

// Rutas de prueba/diagnóstico: solo existen en desarrollo. En producción responden 404.
const DEV_ONLY_ROUTES = [
  '/api/debug',
  '/api/debug_prisma',
  '/api/debug-reserva',
  '/api/diagnostic',
  '/api/test-session',
  '/api/test_attendance',
  '/api/seed-plans',
  '/api/seed-results',
  '/api/admin/setup-demo-creds',
  '/api/admin/clean-test-orders',
  '/api/superadmin/plantillas/seed',
];

function isDevOnly(pathname: string) {
  if (DEV_ONLY_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  // Diagnósticos sueltos por negocio: /api/[slug]/diag/... y /api/public/[slug]/diag-...
  return /^\/api\/(public\/)?[^/]+\/diag(-|\/|$)/.test(pathname);
}

async function readToken(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  // Detrás de un proxy (nginx) el protocolo puede no coincidir con el nombre de la cookie,
  // así que probamos la cookie segura y la normal.
  return (
    (await getToken({ req, secret, secureCookie: true }).catch(() => null)) ||
    (await getToken({ req, secret, secureCookie: false }).catch(() => null))
  );
}

/** Dueño de la plataforma o usuario activo del equipo Citiox. */
function isTeamToken(token: any) {
  if (!token) return false;
  return isPlatformOwner(token) || token.isAdminUser === true;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  // Ignorar archivos estáticos y favicons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    (pathname.includes('.') && !pathname.endsWith('.html'))
  ) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV === 'production' && isDevOnly(pathname)) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  // ── Protección del panel de superadmin (por rol del equipo Citiox) ──
  const isSuperadminPage = pathname === '/superadmin' || pathname.startsWith('/superadmin/');
  const isSuperadminApi = pathname.startsWith('/api/superadmin/') || pathname === '/api/superadmin';

  if (isSuperadminPage || isSuperadminApi) {
    const token: any = await readToken(req);
    const anySessionAllowed = SUPERADMIN_API_FOR_ANY_SESSION.some((p) => pathname === p || pathname.startsWith(p + '/'));

    if (anySessionAllowed ? !token : !isTeamToken(token)) {
      if (isSuperadminApi) {
        return NextResponse.json({ error: 'No autorizado' }, { status: token ? 403 : 401 });
      }
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!anySessionAllowed) {
      const perm = requiredTeamPermission(pathname, req.method);
      if (perm !== null && !tokenHasPermission(token, perm)) {
        if (isSuperadminApi) {
          return NextResponse.json(
            { error: 'Tu rol no tiene permiso para esta acción.', permiso: perm },
            { status: 403 }
          );
        }
        const fallback = firstAllowedPage(token);
        if (fallback && fallback !== pathname) return NextResponse.redirect(new URL(fallback, req.url));
        return NextResponse.json({ error: 'Tu rol no tiene acceso a esta sección.' }, { status: 403 });
      }
    }
  }

  // Inyectar x-current-path en los headers para que los Server Components puedan leer la ruta
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-current-path', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
