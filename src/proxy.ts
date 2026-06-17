import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  // Ignorar archivos estáticos, API y rutas de administración internas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Dejar pasar todo temporalmente para debug e inyectar x-current-path
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
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
