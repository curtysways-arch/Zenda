import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname } = url;

  // Ignorar archivos estáticos, API y favicons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    (pathname.includes('.') && !pathname.endsWith('.html'))
  ) {
    return NextResponse.next();
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
