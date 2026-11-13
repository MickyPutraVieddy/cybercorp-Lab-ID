// Phase 3: `output: 'export'` was removed so server-side auth, route handlers and proxy.ts can run (Vercel).
// Headers previously in public/_headers (Cloudflare format) now live here so they apply on Vercel.
const baseHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// The storefront may be embedded (kept as before); account, admin and API surfaces must not be framed or cached.
const sensitivePrefixes = ['dashboard', 'admin', 'settings', 'login', 'register', 'forgot-password', 'reset-password', 'auth', 'api']
const sensitiveHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Cache-Control', value: 'no-store' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: '/:path*', headers: baseHeaders },
      // The intro page (/) hosts the login/register forms, so it must not be framed or cached either.
      { source: '/', headers: sensitiveHeaders },
      ...sensitivePrefixes.flatMap((prefix) => [
        { source: `/${prefix}`, headers: sensitiveHeaders },
        { source: `/${prefix}/:path*`, headers: sensitiveHeaders },
      ]),
    ]
  },
}

export default nextConfig
