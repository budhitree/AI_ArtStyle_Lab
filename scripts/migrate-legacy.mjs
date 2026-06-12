import Database from 'better-sqlite3'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const candidates = [
  resolve('server/data/artstyle.db'),
  resolve('legacy/vite-express-demo/server/data/artstyle.db'),
  resolve('legacy/vite-express-demo/data-source/data/artstyle.db')
]

const args = new Set(process.argv.slice(2))
const writeRemote = args.has('--write')
const outDir = resolve('migration-output')
const sourcePath = candidates.find((item) => existsSync(item))

if (!sourcePath) {
  throw new Error('No legacy SQLite database found. Checked server/data/artstyle.db, legacy/vite-express-demo/server/data/artstyle.db and legacy/vite-express-demo/data-source/data/artstyle.db')
}

const db = new Database(sourcePath, { readonly: true })

const users = db.prepare('select * from users').all()
const artworks = db.prepare('select * from artworks').all()
const exhibitions = db.prepare('select * from exhibitions').all()
const exhibitionArtworks = db.prepare('select * from exhibition_artworks').all()

const report = {
  sourcePath,
  users: users.length,
  artworks: artworks.length,
  exhibitions: exhibitions.length,
  exhibitionArtworks: exhibitionArtworks.length,
  generatedAt: new Date().toISOString()
}

const payload = {
  report,
  users,
  artworks,
  exhibitions,
  exhibitionArtworks
}

await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'legacy-export.json'), JSON.stringify(payload, null, 2))

const assetManifest = artworks.map((item) => {
  const image = item.image || ''
  const localPath = image.startsWith('/uploads/')
    ? resolve('legacy/vite-express-demo/public', image.replace(/^\//, ''))
    : image.startsWith('/images/')
      ? resolve('public', image.replace(/^\//, ''))
      : null

  return {
    artworkId: item.id,
    image,
    localPath,
    exists: localPath ? existsSync(localPath) : false
  }
})

await writeFile(join(outDir, 'asset-manifest.json'), JSON.stringify(assetManifest, null, 2))

if (!writeRemote) {
  console.log(`Legacy export written to ${outDir}`)
  console.log('Run with --write after configuring Supabase env vars if you want a best-effort remote import.')
  process.exit(0)
}

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'artworks'

if (!supabaseUrl || !serviceRole) {
  throw new Error('NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --write mode.')
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const userMap = new Map()

for (const user of users) {
  const email = String(user.id).includes('@')
    ? String(user.id)
    : `legacy-${user.id}@artstyle-lab.local`

  const created = await supabase.auth.admin.createUser({
    email,
    password: 'LegacyTemp!123',
    email_confirm: true,
    user_metadata: {
      name: user.name,
      role: user.userType || 'student'
    }
  })

  if (created.error) {
    throw new Error(`Failed to create auth user for legacy id ${user.id}: ${created.error.message}`)
  }

  userMap.set(user.id, created.data.user.id)
}

await supabase.from('profiles').upsert(users.map((user) => ({
  id: userMap.get(user.id),
  email: String(user.id).includes('@') ? String(user.id) : `legacy-${user.id}@artstyle-lab.local`,
  name: user.name,
  role: user.userType || 'student',
  created_at: user.joined || new Date().toISOString()
})))

const uploadedArtworkRows = []

for (const artwork of artworks) {
  let imageUrl = artwork.image

  if (typeof imageUrl === 'string' && imageUrl.startsWith('/uploads/')) {
    const localPath = resolve('legacy/vite-express-demo/public', imageUrl.replace(/^\//, ''))
    if (existsSync(localPath)) {
      const file = await readFile(localPath)
      const storagePath = `legacy/${artwork.id}-${localPath.split(/[/\\]/).pop()}`
      const uploaded = await supabase.storage.from(storageBucket).upload(storagePath, file, {
        upsert: true,
        contentType: 'image/jpeg'
      })
      if (!uploaded.error) {
        imageUrl = supabase.storage.from(storageBucket).getPublicUrl(storagePath).data.publicUrl
      }
    }
  }

  uploadedArtworkRows.push({
    id: artwork.id,
    title: artwork.title,
    description: artwork.desc || '',
    prompt: artwork.prompt || '',
    image_url: imageUrl,
    thumbnail_url: imageUrl,
    owner_id: userMap.get(artwork.artistId) || userMap.get(artwork.artist) || [...userMap.values()][0],
    source_type: artwork.isAIGenerated ? 'ai' : 'upload',
    visibility: artwork.inShowcase === 0 ? 'private' : 'public',
    created_at: artwork.uploadedAt || new Date().toISOString(),
    updated_at: artwork.uploadedAt || new Date().toISOString()
  })
}

await supabase.from('artworks').upsert(uploadedArtworkRows)

const exhibitionRows = exhibitions.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description || '',
  cover_image_url: item.coverImage || '/images/hero.png',
  status: item.status === 'active' ? 'published' : 'draft',
  curator_id: userMap.get(item.curatorId) || [...userMap.values()][0],
  created_at: item.createdAt || new Date().toISOString(),
  updated_at: item.updatedAt || new Date().toISOString()
}))

await supabase.from('exhibitions').upsert(exhibitionRows)

await supabase.from('exhibition_artworks').upsert(
  exhibitionArtworks.map((item) => ({
    exhibition_id: item.exhibitionId,
    artwork_id: item.artworkId,
    created_at: item.addedAt || new Date().toISOString()
  }))
)

await writeFile(join(outDir, 'migration-report.json'), JSON.stringify({
  ...report,
  remoteWrite: true,
  createdUsers: userMap.size
}, null, 2))

console.log('Legacy data imported to Supabase.')
