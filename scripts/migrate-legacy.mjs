import Database from 'better-sqlite3'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const LEGACY_NAMESPACE = '6f330e7f-6f10-4d92-a7b9-6ce4c6e1c889'
const DEFAULT_PASSWORD_PREFIX = 'LegacyTemp!'
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const candidates = [
  resolve('server/data/artstyle.db'),
  resolve('legacy/vite-express-demo/server/data/artstyle.db'),
  resolve('legacy/vite-express-demo/data-source/data/artstyle.db')
]

const args = new Set(process.argv.slice(2))
const writeRemote = args.has('--write')
const skipImages = args.has('--skip-images')
const outDir = resolve('migration-output')
const sourcePath = candidates.find((item) => existsSync(item))

function uuidFromLegacy(kind, id) {
  const hash = createHash('sha1')
    .update(`${LEGACY_NAMESPACE}:${kind}:${String(id)}`)
    .digest()

  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function contentTypeFromPath(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.svg') return 'image/svg+xml'
  return 'image/jpeg'
}

function extensionForContentType(contentType) {
  if (contentType === 'image/png') return '.png'
  if (contentType === 'image/gif') return '.gif'
  if (contentType === 'image/webp') return '.webp'
  return '.jpg'
}

function normalizeRole(role) {
  return role === 'teacher' || role === 'admin' ? role : 'student'
}

function normalizeVisibility(value) {
  return value === 0 || value === false ? 'private' : 'public'
}

function normalizeSourceType(value) {
  return value === 1 || value === true ? 'ai' : 'upload'
}

function toIsoDate(value) {
  const parsed = value ? new Date(value) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function legacyEmail(user) {
  const id = String(user.id)
  if (id.includes('@')) {
    return id
  }

  const safeId = id.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
  return `legacy-${safeId}@artstyle-lab.local`
}

function passwordForUser(user) {
  const password = typeof user.password === 'string' ? user.password : ''
  if (password.length >= 6) {
    return password
  }

  return `${DEFAULT_PASSWORD_PREFIX}${String(user.id).slice(0, 24)}!`
}

function localAssetPath(image) {
  if (typeof image !== 'string') {
    return null
  }

  if (image.startsWith('/uploads/')) {
    return resolve('legacy/vite-express-demo/public', image.replace(/^\//, ''))
  }

  if (image.startsWith('/images/')) {
    return resolve('public', image.replace(/^\//, ''))
  }

  return null
}

async function prepareOriginal(buffer, filePath) {
  const sourceType = contentTypeFromPath(filePath)
  if (IMAGE_MIME_TYPES.has(sourceType)) {
    return {
      buffer,
      contentType: sourceType,
      extension: extensionForContentType(sourceType)
    }
  }

  const converted = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer()

  return {
    buffer: converted,
    contentType: 'image/jpeg',
    extension: '.jpg'
  }
}

async function createThumbnail(buffer) {
  try {
    return await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer()
  } catch {
    return null
  }
}

async function upsertInBatches(supabase, table, rows, options = {}) {
  const batchSize = options.batchSize || 100
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)
    const { error } = await supabase.from(table).upsert(batch, options.upsert || {})
    if (error) {
      throw new Error(`Failed to upsert ${table}: ${error.message}`)
    }
  }
}

async function listExistingAuthUsers(supabase) {
  const byEmail = new Map()
  const byId = new Map()
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }

    for (const user of data.users || []) {
      if (user.email) {
        byEmail.set(user.email.toLowerCase(), user)
      }
      byId.set(user.id, user)
    }

    if (!data.users || data.users.length < 1000) {
      break
    }
    page += 1
  }

  return { byEmail, byId }
}

async function ensureAuthUsers(supabase, users) {
  const existing = await listExistingAuthUsers(supabase)
  const userMap = new Map()
  let created = 0
  let reused = 0
  let updated = 0

  for (const user of users) {
    const deterministicId = uuidFromLegacy('user', user.id)
    const email = legacyEmail(user)
    const existingUser = existing.byId.get(deterministicId) || existing.byEmail.get(email.toLowerCase())

    if (existingUser) {
      userMap.set(String(user.id), existingUser.id)
      reused += 1
      const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        email,
        password: passwordForUser(user),
        email_confirm: true,
        user_metadata: {
          name: user.name,
          legacy_id: String(user.id)
        },
        app_metadata: {
          legacy_role: normalizeRole(user.userType)
        }
      })
      if (error) {
        throw new Error(`Failed to update auth user ${user.id}: ${error.message}`)
      }
      updated += 1
      continue
    }

    const { data, error } = await supabase.auth.admin.createUser({
      id: deterministicId,
      email,
      password: passwordForUser(user),
      email_confirm: true,
      user_metadata: {
        name: user.name,
        legacy_id: String(user.id)
      },
      app_metadata: {
        legacy_role: normalizeRole(user.userType)
      }
    })

    if (error) {
      throw new Error(`Failed to create auth user ${user.id}: ${error.message}`)
    }

    userMap.set(String(user.id), data.user.id)
    existing.byEmail.set(email.toLowerCase(), data.user)
    existing.byId.set(data.user.id, data.user)
    created += 1
  }

  return { userMap, created, reused, updated }
}

async function uploadAsset(supabase, bucket, localPath, storagePath) {
  const file = await readFile(localPath)
  const original = await prepareOriginal(file, localPath)

  const uploaded = await supabase.storage.from(bucket).upload(storagePath, original.buffer, {
    upsert: true,
    contentType: original.contentType,
    cacheControl: '31536000'
  })

  if (uploaded.error) {
    throw new Error(`Failed to upload ${localPath}: ${uploaded.error.message}`)
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl
  return { publicUrl, originalBuffer: original.buffer }
}

if (!sourcePath) {
  throw new Error('No legacy SQLite database found. Checked server/data/artstyle.db, legacy/vite-express-demo/server/data/artstyle.db and legacy/vite-express-demo/data-source/data/artstyle.db')
}

const db = new Database(sourcePath, { readonly: true })
const users = db.prepare('select * from users').all()
const artworks = db.prepare('select * from artworks').all()
const exhibitions = db.prepare('select * from exhibitions').all()
const exhibitionArtworks = db.prepare('select * from exhibition_artworks').all()
db.close()

const assetManifest = artworks.map((item) => {
  const localPath = localAssetPath(item.image)
  return {
    artworkId: item.id,
    image: item.image || '',
    localPath,
    exists: localPath ? existsSync(localPath) : false
  }
})

const report = {
  sourcePath,
  users: users.length,
  artworks: artworks.length,
  exhibitions: exhibitions.length,
  exhibitionArtworks: exhibitionArtworks.length,
  assets: assetManifest.length,
  existingAssets: assetManifest.filter((item) => item.exists).length,
  missingAssets: assetManifest.filter((item) => !item.exists).length,
  generatedAt: new Date().toISOString()
}

await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'legacy-export.json'), JSON.stringify({
  report,
  users: users.map(({ password, ...user }) => ({
    ...user,
    password_present: Boolean(password)
  })),
  artworks,
  exhibitions,
  exhibitionArtworks
}, null, 2))
await writeFile(join(outDir, 'asset-manifest.json'), JSON.stringify(assetManifest, null, 2))

if (!writeRemote) {
  console.log(`Legacy export written to ${outDir}`)
  console.log('Run with --write after configuring Supabase env vars to import users, records, and images.')
  process.exit(0)
}

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'artworks'
const exhibitionBucket = process.env.SUPABASE_EXHIBITION_BUCKET || 'exhibitions'

if (!supabaseUrl || !serviceRole) {
  throw new Error('NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --write mode.')
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false }
})

console.log(`Legacy source: ${sourcePath}`)
console.log(`Importing ${users.length} users, ${artworks.length} artworks, ${exhibitions.length} exhibitions.`)

const authResult = await ensureAuthUsers(supabase, users)
const firstUserId = authResult.userMap.values().next().value
if (!firstUserId) {
  throw new Error('No legacy users were available to own imported records.')
}

await upsertInBatches(supabase, 'profiles', users.map((user) => ({
  id: authResult.userMap.get(String(user.id)),
  email: legacyEmail(user),
  name: user.name || String(user.id),
  role: normalizeRole(user.userType),
  avatar_url: user.avatar || null,
  created_at: toIsoDate(user.joined)
})), { upsert: { onConflict: 'id' } })

const imageUrlByLegacyPath = new Map()
const uploadedArtworkRows = []
let uploadedImages = 0
let uploadedThumbnails = 0
let missingImages = 0

for (const [index, artwork] of artworks.entries()) {
  const artworkId = uuidFromLegacy('artwork', artwork.id)
  let imageUrl = artwork.image || '/images/hero.png'
  let thumbnailUrl = imageUrl
  const localPath = localAssetPath(artwork.image)

  if (!skipImages && localPath && existsSync(localPath)) {
    const originalType = contentTypeFromPath(localPath)
    const originalExt = IMAGE_MIME_TYPES.has(originalType) ? extensionForContentType(originalType) : '.jpg'
    const originalStoragePath = `legacy/artworks/${artworkId}${originalExt}`
    const uploaded = await uploadAsset(supabase, storageBucket, localPath, originalStoragePath)

    imageUrl = uploaded.publicUrl
    thumbnailUrl = imageUrl
    imageUrlByLegacyPath.set(artwork.image, imageUrl)
    uploadedImages += 1

    const thumbnail = await createThumbnail(uploaded.originalBuffer)
    if (thumbnail) {
      const thumbPath = `legacy/artworks/thumbnails/${artworkId}.webp`
      const uploadedThumb = await supabase.storage.from(storageBucket).upload(thumbPath, thumbnail, {
        upsert: true,
        contentType: 'image/webp',
        cacheControl: '31536000'
      })
      if (uploadedThumb.error) {
        throw new Error(`Failed to upload thumbnail for ${artwork.id}: ${uploadedThumb.error.message}`)
      }
      thumbnailUrl = supabase.storage.from(storageBucket).getPublicUrl(thumbPath).data.publicUrl
      uploadedThumbnails += 1
    }
  } else if (localPath) {
    missingImages += 1
  }

  const ownerId = authResult.userMap.get(String(artwork.artistId)) || authResult.userMap.get(String(artwork.artist)) || firstUserId
  const createdAt = toIsoDate(artwork.uploadedAt)

  uploadedArtworkRows.push({
    id: artworkId,
    title: artwork.title || 'Untitled artwork',
    description: artwork.desc || '',
    prompt: artwork.prompt || null,
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    owner_id: ownerId,
    source_type: normalizeSourceType(artwork.isAIGenerated),
    visibility: normalizeVisibility(artwork.inShowcase),
    created_at: createdAt,
    updated_at: createdAt
  })

  if ((index + 1) % 10 === 0 || index + 1 === artworks.length) {
    console.log(`Prepared artworks ${index + 1}/${artworks.length}`)
  }
}

await upsertInBatches(supabase, 'artworks', uploadedArtworkRows, { upsert: { onConflict: 'id' } })

const exhibitionRows = []
let uploadedExhibitionCovers = 0

for (const exhibition of exhibitions) {
  const exhibitionId = uuidFromLegacy('exhibition', exhibition.id)
  let coverImageUrl = imageUrlByLegacyPath.get(exhibition.coverImage) || exhibition.coverImage || null
  const coverPath = localAssetPath(exhibition.coverImage)

  if (!skipImages && !imageUrlByLegacyPath.has(exhibition.coverImage) && coverPath && existsSync(coverPath)) {
    const originalType = contentTypeFromPath(coverPath)
    const originalExt = IMAGE_MIME_TYPES.has(originalType) ? extensionForContentType(originalType) : '.jpg'
    const coverStoragePath = `legacy/exhibitions/${exhibitionId}${originalExt}`
    const uploaded = await uploadAsset(supabase, exhibitionBucket, coverPath, coverStoragePath)
    coverImageUrl = uploaded.publicUrl
    uploadedExhibitionCovers += 1
  }

  exhibitionRows.push({
    id: exhibitionId,
    title: exhibition.title || 'Untitled exhibition',
    description: exhibition.description || '',
    cover_image_url: coverImageUrl,
    status: exhibition.status === 'active' ? 'published' : 'draft',
    curator_id: authResult.userMap.get(String(exhibition.curatorId)) || firstUserId,
    created_at: toIsoDate(exhibition.createdAt),
    updated_at: toIsoDate(exhibition.updatedAt || exhibition.createdAt)
  })
}

await upsertInBatches(supabase, 'exhibitions', exhibitionRows, { upsert: { onConflict: 'id' } })

const legacyArtworkIds = new Set(uploadedArtworkRows.map((item) => item.id))
const legacyExhibitionIds = new Set(exhibitionRows.map((item) => item.id))
const junctionRows = exhibitionArtworks
  .map((item) => ({
    exhibition_id: uuidFromLegacy('exhibition', item.exhibitionId),
    artwork_id: uuidFromLegacy('artwork', item.artworkId),
    created_at: toIsoDate(item.addedAt)
  }))
  .filter((item) => legacyExhibitionIds.has(item.exhibition_id) && legacyArtworkIds.has(item.artwork_id))

if (junctionRows.length) {
  await upsertInBatches(supabase, 'exhibition_artworks', junctionRows, {
    upsert: { onConflict: 'exhibition_id,artwork_id' }
  })
}

const migrationReport = {
  ...report,
  remoteWrite: true,
  skippedImages: skipImages,
  authUsersCreated: authResult.created,
  authUsersReused: authResult.reused,
  authUsersUpdated: authResult.updated,
  profilesUpserted: users.length,
  artworksUpserted: uploadedArtworkRows.length,
  exhibitionsUpserted: exhibitionRows.length,
  exhibitionArtworksUpserted: junctionRows.length,
  uploadedImages,
  uploadedThumbnails,
  uploadedExhibitionCovers,
  missingImages,
  completedAt: new Date().toISOString(),
  runId: randomUUID()
}

await writeFile(join(outDir, 'migration-report.json'), JSON.stringify(migrationReport, null, 2))
console.log(JSON.stringify(migrationReport, null, 2))
