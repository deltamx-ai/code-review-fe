import { fetchJson } from './api'
import type {
  AppendTurnPayload,
  CreateSessionPayload,
  FindingPatch,
  ReviewFinding,
  ReviewSessionDetail,
  SessionListQuery,
  SessionListResponse,
} from '../types/session'

function buildQuery(query?: SessionListQuery): string {
  if (!query) return ''
  const parts: string[] = []
  if (query.repo) parts.push(`repo=${encodeURIComponent(query.repo)}`)
  if (query.status) parts.push(`status=${encodeURIComponent(query.status)}`)
  if (query.mode) parts.push(`mode=${encodeURIComponent(query.mode)}`)
  if (typeof query.limit === 'number') parts.push(`limit=${query.limit}`)
  if (typeof query.offset === 'number') parts.push(`offset=${query.offset}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export async function listSessions(base: string, query?: SessionListQuery): Promise<SessionListResponse> {
  return fetchJson<SessionListResponse>(base, `/api/review-sessions${buildQuery(query)}`)
}

export async function getSession(base: string, id: string): Promise<ReviewSessionDetail> {
  return fetchJson<ReviewSessionDetail>(base, `/api/review-sessions/${encodeURIComponent(id)}`)
}

export async function createSession(base: string, payload: CreateSessionPayload): Promise<ReviewSessionDetail> {
  return fetchJson<ReviewSessionDetail>(base, '/api/review-sessions', payload)
}

export async function appendTurn(
  base: string,
  id: string,
  payload: AppendTurnPayload,
): Promise<ReviewSessionDetail> {
  return fetchJson<ReviewSessionDetail>(
    base,
    `/api/review-sessions/${encodeURIComponent(id)}/turns`,
    payload,
  )
}

export async function deleteSession(base: string, id: string): Promise<void> {
  const response = await fetch(`${base}/api/review-sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!response.ok && response.status !== 204) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `删除失败，HTTP ${response.status}`)
  }
}

export async function updateFinding(
  base: string,
  sessionId: string,
  findingId: string,
  patch: FindingPatch,
): Promise<ReviewFinding> {
  const response = await fetch(
    `${base}/api/review-sessions/${encodeURIComponent(sessionId)}/findings/${encodeURIComponent(findingId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  )
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    const raw =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error ?? '')
        : typeof data === 'string'
          ? data
          : `HTTP ${response.status}`
    throw new Error(raw || `更新失败，HTTP ${response.status}`)
  }
  return data as ReviewFinding
}
