import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../lib/api'
import { useApiBase } from '../lib/apiBase'
import { deleteSession, listSessions } from '../lib/sessions'
import type {
  ConversationStatus,
  ReviewMode,
  SessionListResponse,
  SessionSummary,
} from '../types/session'
import NewSessionDialog from '../components/NewSessionDialog'

const STATUS_COLORS: Record<ConversationStatus, string> = {
  created: 'bg-slate-100 text-slate-700',
  running: 'bg-sky-100 text-sky-700',
  waiting_input: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
}

const MODE_COLORS: Record<ReviewMode, string> = {
  lite: 'bg-slate-100 text-slate-700',
  standard: 'bg-indigo-100 text-indigo-700',
  critical: 'bg-rose-100 text-rose-700',
}

function StatusChip({ status }: { status: ConversationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  )
}

function ModeBadge({ mode }: { mode: ReviewMode }) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${MODE_COLORS[mode]}`}>
      {mode}
    </span>
  )
}

function formatRelativeTime(ts: string): string {
  const n = Number(ts)
  if (!Number.isFinite(n)) return ts
  const diff = Math.max(0, Date.now() / 1000 - n)
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export default function SessionsPage() {
  const { apiBase } = useApiBase()
  const [searchParams, setSearchParams] = useSearchParams()

  const repo = searchParams.get('repo') || ''
  const status = (searchParams.get('status') || '') as ConversationStatus | ''
  const mode = (searchParams.get('mode') || '') as ReviewMode | ''
  const limit = Number(searchParams.get('limit') || 20)
  const offset = Number(searchParams.get('offset') || 0)

  const [data, setData] = useState<SessionListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listSessions(apiBase, {
        repo: repo || undefined,
        status: status || undefined,
        mode: mode || undefined,
        limit,
        offset,
      })
      setData(result)
    } catch (err) {
      setData(null)
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [apiBase, repo, status, mode, limit, offset])

  useEffect(() => {
    void load()
  }, [load])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'offset') next.delete('offset')
    setSearchParams(next, { replace: true })
  }

  const confirmDelete = (id: string) => setConfirmId(id)
  const cancelDelete = () => setConfirmId(null)
  const doDelete = async (id: string) => {
    setDeleting(id)
    setError(null)
    try {
      await deleteSession(apiBase, id)
      setConfirmId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(null)
    }
  }

  const items: SessionSummary[] = data?.items || []
  const total = data?.total ?? 0
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  const pageInfo = useMemo(() => {
    if (!data) return ''
    const start = total === 0 ? 0 : offset + 1
    const end = Math.min(offset + limit, total)
    return `${start}-${end} / ${total}`
  }, [data, offset, limit, total])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">会话列表</h2>
          <p className="mt-1 text-sm text-slate-500">
            每次创建的多轮会话都会保存在本地，按 updated_at 倒序展示。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            刷新
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            新建会话
          </button>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={repo}
            onChange={(e) => updateParam('repo', e.target.value)}
            placeholder="按 repo 路径过滤（子串匹配）"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => updateParam('status', e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">所有状态</option>
            <option value="created">created</option>
            <option value="running">running</option>
            <option value="waiting_input">waiting_input</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <select
            value={mode}
            onChange={(e) => updateParam('mode', e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">所有模式</option>
            <option value="lite">lite</option>
            <option value="standard">standard</option>
            <option value="critical">critical</option>
          </select>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">加载中...</div>
        ) : error ? (
          <div className="px-5 py-6 text-sm text-red-700">加载失败：{error}</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-slate-500">还没有任何多轮会话。</p>
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              新建一个
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">会话</th>
                  <th className="px-4 py-3">模式</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">轮次</th>
                  <th className="px-4 py-3">Findings</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/sessions/${encodeURIComponent(s.id)}`} className="font-medium text-slate-900 hover:underline">
                        {s.title || s.id}
                      </Link>
                      <div className="text-xs text-slate-400">{s.repo_root}</div>
                    </td>
                    <td className="px-4 py-3"><ModeBadge mode={s.review_mode} /></td>
                    <td className="px-4 py-3"><StatusChip status={s.status} /></td>
                    <td className="px-4 py-3 text-slate-700">{s.current_turn}/{s.total_turns}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 text-xs">
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">H:{s.finding_counts.high}</span>
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">M:{s.finding_counts.medium}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">L:{s.finding_counts.low}</span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">✓{s.finding_counts.confirmed}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.model}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatRelativeTime(s.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {confirmId === s.id ? (
                        <span className="inline-flex gap-2">
                          <button
                            onClick={() => void doDelete(s.id)}
                            disabled={deleting === s.id}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                          >
                            {deleting === s.id ? '...' : '确认删除'}
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                          >
                            取消
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => confirmDelete(s.id)}
                          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && items.length > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
            <span>{pageInfo}</span>
            <div className="flex gap-2">
              <button
                onClick={() => updateParam('offset', String(Math.max(0, offset - limit)))}
                disabled={!hasPrev}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                上一页
              </button>
              <button
                onClick={() => updateParam('offset', String(offset + limit))}
                disabled={!hasNext}
                className="rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <NewSessionDialog open={dialogOpen} onClose={() => {
        setDialogOpen(false)
        void load()
      }} />
    </div>
  )
}
