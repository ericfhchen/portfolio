import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const blogDomain = process.env.SITE_BLOG_DOMAIN?.replace(/^https?:\/\//, '').trim() || 'blog.ericlchen.com';
  
  // Check if the request is coming from the blog subdomain
  if (hostname === blogDomain) {
    const url = request.nextUrl.clone();
    
    // If accessing root, rewrite to /blog
    if (url.pathname === '/') {
      url.pathname = '/blog';
      return NextResponse.rewrite(url);
    }
    
    // If not already under /blog, rewrite to /blog/:path
    if (!url.pathname.startsWith('/blog')) {
      url.pathname = `/blog${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
