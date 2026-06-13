import type { AiGeneratePayload, AiResult } from '~/shared/types'

function buildPrompt(payload: AiGeneratePayload) {
  return [payload.subject, payload.background, payload.style, payload.details]
    .filter(Boolean)
    .join('，')
}

function mapRatioToSize(ratio: AiGeneratePayload['ratio']) {
  switch (ratio) {
    case '16:9':
      return '2560x1440'
    case '9:16':
      return '1440x2560'
    default:
      return '2048x2048'
  }
}

export const generateAiImages = async (payload: AiGeneratePayload): Promise<AiResult[]> => {
  const prompt = buildPrompt(payload)
  const config = useRuntimeConfig()

  if (!config.volcApiKey || !config.volcSeedreamEndpoint) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AI 图像生成服务尚未配置，请联系管理员。'
    })
  }

  const response = await fetch(config.volcApiBase, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.volcApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.volcSeedreamEndpoint,
      prompt,
      size: mapRatioToSize(payload.ratio),
      response_format: 'url',
      watermark: false
    })
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: await response.text()
    })
  }

  const data = await response.json()
  const images = Array.isArray(data.data) ? data.data : []

  return images
    .filter((item: { url?: string }) => Boolean(item.url))
    .map((item: { url: string }, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      url: item.url,
      prompt
    }))
}
