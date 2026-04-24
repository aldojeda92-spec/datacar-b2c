import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'fs'
import * as path from 'path'

// Cargar .env.local manualmente
const envPath = path.join(process.cwd(), '.env.local')
if (dotenv.existsSync(envPath)) {
  const content = dotenv.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
