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

// Allow product images served from Supabase Storage (host derived from whichever URL variable is set).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
let supabaseHost = null
try { supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null } catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Product image upload goes through a Server Action (max 2 MB file enforced in the action; default body limit is 1 MB).
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
  images: {
    unoptimized: true,
    remotePatterns: supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : [],
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
