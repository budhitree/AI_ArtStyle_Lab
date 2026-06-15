export interface GeneratedThumbnail {
  buffer: Buffer
  filename: string
  contentType: string
}

export async function createImageThumbnail(buffer: Buffer, baseName = 'thumbnail'): Promise<GeneratedThumbnail | null> {
  try {
    const { default: sharp } = await import('sharp')
    const output = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({
        width: 720,
        height: 720,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 78 })
      .toBuffer()

    return {
      buffer: output,
      filename: `${baseName.replace(/\.[^.]+$/, '') || 'thumbnail'}-thumb.webp`,
      contentType: 'image/webp'
    }
  } catch {
    return null
  }
}
