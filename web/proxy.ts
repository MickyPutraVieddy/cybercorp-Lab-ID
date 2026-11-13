import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Session refresh + coarse route gate. This is defense in depth only: every page, action and API still
// re-verifies the user and role server-side. Storefront routes are intentionally NOT matched (they stay static).
// Store pages (home, catalog, products, bag, checkout, order pages) and account pages need a signed-in user.
// Info pages (about, help, contact, privacy, terms, careers) and the intro page (/) stay public.
const PROTECTED = /^\/(dashboard|admin|settings|home|catalog|products|cart|checkout|order-confirmation|order-tracking)(\/|$)/

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const path = request.nextUrl.pathname
  let response = NextResponse.next({ request })

  const redirectToLogin = () => {
    const target = request.nextUrl.clone()
    target.pathname = '/'
    target.search = `?mode=login&next=${encodeURIComponent(path + request.nextUrl.search)}`
    return NextResponse.redirect(target)
  }

  if (!url || !anonKey) return PROTECTED.test(path) ? redirectToLogin() : response

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
        }
      },
    },
  })

  // getUser() validates the JWT with the Auth server and refreshes the session cookies when needed.
  const { data } = await supabase.auth.getUser()

  if (!data.user && PROTECTED.test(path)) {
    const redirect = redirectToLogin()
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*', '/admin/:path*', '/settings/:path*',
    '/home', '/catalog/:path*', '/products/:path*', '/cart', '/checkout', '/order-confirmation', '/order-tracking',
    '/login', '/register', '/forgot-password', '/reset-password', '/api/:path*',
  ],
}
