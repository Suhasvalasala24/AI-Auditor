import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

// 1. The main logic function
export function middleware(request: NextRequest) {
    // For now, we just pass through. 
    // We will add Cookie-based redirection here later if needed.
    return NextResponse.next();
}

// 2. The required default export (fixes your specific error)
export default middleware;

// 3. The Config to tell Next.js which routes to run this on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login (allow people to see the login page!)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
    ],
};