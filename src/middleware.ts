import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block the deleted engagement page — redirect to start
  if (pathname.startsWith('/participant/engagement')) {
    return NextResponse.redirect(new URL('/participant/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/participant/engagement/:path*'],
};
