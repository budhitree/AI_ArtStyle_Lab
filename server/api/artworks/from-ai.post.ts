import { requireProfile } from '../../utils/auth'
import { createImageThumbnail } from '../../utils/image'
import { createArtworkEntry } from '../../utils/repository'
import { storeBinaryAsset } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const body = await readBody<{
    title: string
    description?: string
    prompt?: string
    visibility?: 'public' | 'private'
    imageUrl: string
  }>(event)

  if (!body.imageUrl) {
    throw createError({ statusCode: 400, statusMessage: 'imageUrl is required.' })
  }

  let imageUrl = body.imageUrl
  let thumbnailUrl = body.imageUrl
  if (!imageUrl.startsWith('/images/') && !imageUrl.startsWith('/uploads/')) {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to download generated image.' })
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const stored = await storeBinaryAsset('artworks', buffer, 'ai-generated.jpg', response.headers.get('content-type') || 'image/jpeg')
    const thumbnail = await createImageThumbnail(buffer, 'ai-generated.jpg')
    const storedThumbnail = thumbnail
      ? await storeBinaryAsset('artworks', thumbnail.buffer, thumbnail.filename, thumbnail.contentType)
      : null
    imageUrl = stored.url
    thumbnailUrl = storedThumbnail?.url || stored.url
  }

  return await createArtworkEntry({
    title: body.title || 'AI 作品',
    description: body.description || '由 AI 创作工作台生成并保存到作品库。',
    prompt: body.prompt || '',
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    source_type: 'ai',
    visibility: body.visibility || 'public'
  }, viewer)
})
