import { requireProfile } from '../../utils/auth'
import { createImageThumbnail } from '../../utils/image'
import { createArtworkEntry } from '../../utils/repository'
import { storeBinaryAsset } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const viewer = await requireProfile(event)
  const parts = await readMultipartFormData(event)
  const image = parts?.find((part) => part.name === 'image')
  const thumbnail = parts?.find((part) => part.name === 'thumbnail')
  const maxUploadBytes = 12 * 1024 * 1024
  const maxThumbnailBytes = 2 * 1024 * 1024

  if (!image?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Image is required.' })
  }
  if (image.data.length > maxUploadBytes) {
    throw createError({ statusCode: 413, statusMessage: 'Image must be smaller than 12MB.' })
  }
  if (image.type && !image.type.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Only image uploads are allowed.' })
  }
  if (thumbnail?.data && thumbnail.data.length > maxThumbnailBytes) {
    throw createError({ statusCode: 413, statusMessage: 'Thumbnail must be smaller than 2MB.' })
  }
  if (thumbnail?.type && !thumbnail.type.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Only image thumbnails are allowed.' })
  }

  const title = parts?.find((part) => part.name === 'title')?.data?.toString() || 'Untitled artwork'
  const description = parts?.find((part) => part.name === 'description')?.data?.toString() || ''
  const prompt = parts?.find((part) => part.name === 'prompt')?.data?.toString() || ''
  const visibility = (parts?.find((part) => part.name === 'visibility')?.data?.toString() || 'public') as 'public' | 'private'

  const imageBuffer = Buffer.from(image.data)
  const stored = await storeBinaryAsset('artworks', imageBuffer, image.filename, image.type)
  const generatedThumbnail = thumbnail?.data
    ? null
    : await createImageThumbnail(imageBuffer, image.filename)
  const storedThumbnail = thumbnail?.data
    ? await storeBinaryAsset('artworks', Buffer.from(thumbnail.data), thumbnail.filename || 'thumbnail.webp', thumbnail.type || 'image/webp')
    : generatedThumbnail
      ? await storeBinaryAsset('artworks', generatedThumbnail.buffer, generatedThumbnail.filename, generatedThumbnail.contentType)
      : null

  return await createArtworkEntry({
    title,
    description,
    prompt,
    image_url: stored.url,
    thumbnail_url: storedThumbnail?.url || stored.url,
    source_type: 'upload',
    visibility
  }, viewer)
})
