export const DEFAULT_API_BASE = ''

export type ApiErrorKind = 'network' | 'admission' | 'quota' | 'unauthenticated' | 'bad_request' | 'unknown'

export class ApiClientError extends Error {
  kind: ApiErrorKind
  rawMessage: string
  status?: number

  constructor(kind: ApiErrorKind, message: string, rawMessage: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.kind = kind
    this.rawMessage = rawMessage
    this.status = status
  }
}

function normalizeErrorMessage(rawMessage: string, status?: number): { kind: ApiErrorKind; message: string } {
  const raw = rawMessage || ''
  const lower = raw.toLowerCase()

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('fetch resource')
  ) {
    return {
      kind: 'network',
      message: '网络连接失败，没连上后端接口。先确认后端已经启动，并检查 API 地址是否写对。',
    }
  }

  if (
    lower.includes('402') ||
    lower.includes('no quota') ||
    lower.includes('insufficient quota') ||
    lower.includes('quota exceeded') ||
    lower.includes('quota exhausted')
  ) {
    return {
      kind: 'quota',
      message: '认证已经成功了，但当前 Copilot 额度不够，暂时没法继续调用 review。',
    }
  }

  if (
    lower.includes('not authenticated') ||
    lower.includes('not logged in') ||
    lower.includes('run `code-review auth login` first') ||
    lower.includes('run code-review auth login first')
  ) {
    return {
      kind: 'unauthenticated',
      message: '还没有完成认证。先在本机执行 code-review auth login，再回来重试。',
    }
  }

  if (
    lower.includes('standard 模式缺少必需上下文') ||
    lower.includes('critical 模式缺少必需上下文') ||
    lower.includes('至少需要 2 项 p1 上下文') ||
    lower.includes('至少需要一类 p2 增强信息') ||
    lower.includes('block_reasons')
  ) {
    return {
      kind: 'admission',
      message: `准入检查没通过：${raw}`,
    }
  }

  if (
    lower.includes('missing field') ||
    lower.includes('failed to deserialize') ||
    status === 400
  ) {
    return {
      kind: 'bad_request',
      message: `请求参数不完整或格式不对：${raw}`,
    }
  }

  return {
    kind: 'unknown',
    message: raw || '请求失败，请稍后再试。',
  }
}

export async function fetchJson<T>(baseUrl: string, path: string, body?: unknown): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'NetworkError'
    const normalized = normalizeErrorMessage(raw)
    throw new ApiClientError(normalized.kind, normalized.message, raw)
  }

  const text = await response.text()
  let data: unknown = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text || null
  }

  if (!response.ok) {
    const raw = typeof data === 'object' && data && 'error' in data
      ? String((data as { error?: unknown }).error ?? '')
      : (typeof data === 'string' ? data : `HTTP ${response.status}`)
    const normalized = normalizeErrorMessage(raw, response.status)
    throw new ApiClientError(normalized.kind, normalized.message, raw, response.status)
  }

  return data as T
}
