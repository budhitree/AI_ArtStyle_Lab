import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { useSupabaseAdmin, isSupabaseConfigured } from './supabase'

interface StoredAsset {
  url: string
  path: string
}

function sanitizeExtension(filename?: string, fallback = '.jpg') {
  const ext = extname(filename || '')
  return ext || fallback
}

export const storeBinaryAsset = async (
  bucket: string,
  buffer: Buffer,
  filename?: string,
  contentType = 'image/jpeg'
): Promise<StoredAsset> => {
  const id = crypto.randomUUID()
  const filePath = `${id}${sanitizeExtension(filename)}`

  if (isSupabaseConfigured()) {
    const supabase = useSupabaseAdmin()
    const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
      upsert: true,
      contentType
    })

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return {
      path: filePath,
      url: data.publicUrl
    }
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(join(uploadsDir, filePath), buffer)

  return {
    path: filePath,
    url: `/uploads/${filePath}`
  }
}
