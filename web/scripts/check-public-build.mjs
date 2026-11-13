import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

// Phase 3: the app is no longer a static export (no `out/`). This scans the CLIENT-facing build output
// (.next/static) for server-only secrets and flag-shaped artifacts. Run after `pnpm build`.
const buildDirectory = join(process.cwd(), '.next', 'static')
const forbiddenReference = /(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_OWNER_USER_ID|SECURITY_IP_HASH_SALT|"role"\s*:\s*"service_role"|LETSTESTIT_FLAG_[A-Z0-9]{12,}|FLAG\{[A-Za-z0-9_-]{8,}\})/
const textExtensions = new Set(['.html', '.js', '.json', '.txt', '.css', '.map'])

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      await visit(absolutePath)
      continue
    }
    if (!textExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase())) continue
    const content = await readFile(absolutePath, 'utf8')
    if (forbiddenReference.test(content)) {
      throw new Error(`Server-only secret name or flag-shaped value found in client bundle: ${relative(process.cwd(), absolutePath)}`)
    }
  }
}

try {
  await visit(buildDirectory)
  console.log('Public build check passed: no server-only secret names or flag-shaped artifacts in .next/static.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
