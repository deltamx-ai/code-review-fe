import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiClientError } from '../lib/api'
import { useApiBase } from '../lib/apiBase'
import { listModels } from '../lib/models'
import { createSession } from '../lib/sessions'
import type {
  CreateSessionPayload,
  CreateSessionPromptArgs,
  ModelList,
  ReviewMode,
} from '../types/session'

type Props = {
  open: boolean
  onClose: () => void
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
}

function makePromptArgs(mode: ReviewMode): CreateSessionPromptArgs {
  return {
    mode,
    stack: null,
    goal: null,
    why: null,
    rules: [],
    risks: [],
    expected_normal: null,
    expected_error: null,
    expected_edge: null,
    issue: null,
    test_results: [],
    jira: null,
    jira_base_url: null,
    jira_provider: 'native',
    jira_command: null,
    diff_file: null,
    context_files: [],
    files: [],
    focus: [],
    baseline_files: [],
    incident_files: [],
    change_type: null,
    format: 'json',
  }
}

export default function NewSessionDialog({ open, onClose }: Props) {
  const { apiBase } = useApiBase()
  const navigate = useNavigate()

  const [repoRoot, setRepoRoot] = useState('')
  const [reviewMode, setReviewMode] = useState<ReviewMode>('standard')
  const [provider, setProvider] = useState('')
  const [modelList, setModelList] = useState<ModelList | null>(null)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [model, setModel] = useState('')
  const [modelFallback, setModelFallback] = useState(false)
  const [baseRef, setBaseRef] = useState('')
  const [headRef, setHeadRef] = useState('')
  const [diffText, setDiffText] = useState('')
  const [goal, setGoal] = useState('')
  const [rulesText, setRulesText] = useState('')
  const [filesText, setFilesText] = useState('')
  const [initialInstruction, setInitialInstruction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setModelsLoading(true)
    setModelsError(null)
    listModels(apiBase)
      .then((list) => {
        if (cancelled) return
        setModelList(list)
        const next = list.default_model || list.models[0] || ''
        setModel((current) => current || next)
        setModelFallback(false)
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : '模型列表加载失败'
        setModelsError(msg)
        setModelFallback(true)
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiBase, open])

  const canSubmit = useMemo(
    () => repoRoot.trim().length > 0 && model.trim().length > 0 && !submitting,
    [repoRoot, model, submitting],
  )

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const promptArgs = makePromptArgs(reviewMode)
    promptArgs.goal = goal.trim() || null
    promptArgs.rules = splitLines(rulesText)
    promptArgs.files = splitLines(filesText)
    const payload: CreateSessionPayload = {
      repo_root: repoRoot.trim(),
      review_mode: reviewMode,
      provider: provider.trim() || null,
      model: model.trim() || null,
      base_ref: baseRef.trim() || null,
      head_ref: headRef.trim() || null,
      diff_text: diffText.trim() || null,
      prompt_args: promptArgs,
      initial_instruction: initialInstruction.trim() || null,
    }
    try {
      const detail = await createSession(apiBase, payload)
      onClose()
      navigate(`/sessions/${encodeURIComponent(detail.session.id)}`)
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : '创建失败'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">新建多轮会话</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
          >
            关闭
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          只填最少字段也能创建；完成后会跳转到会话详情页。
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Repo Root *</label>
            <input
              value={repoRoot}
              onChange={(e) => setRepoRoot(e.target.value)}
              placeholder="/home/alice/my-repo"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Review Mode</label>
            <select
              value={reviewMode}
              onChange={(e) => setReviewMode(e.target.value as ReviewMode)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="lite">lite</option>
              <option value="standard">standard</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Provider（可选）</label>
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="默认 copilot-cli"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="mb-1 block text-sm font-medium text-slate-700">Model *</label>
              {modelsLoading ? <span className="text-xs text-slate-400">加载模型列表中...</span> : null}
              {modelList?.default_model ? (
                <span className="text-xs text-slate-400">默认：{modelList.default_model}</span>
              ) : null}
            </div>
            {modelFallback || !modelList || modelList.models.length === 0 ? (
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="输入 model 名称"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            ) : (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {modelList.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {m === modelList.default_model ? '（default）' : ''}
                  </option>
                ))}
              </select>
            )}
            {modelsError ? (
              <p className="mt-1 text-xs text-amber-600">模型列表获取失败：{modelsError}（已降级为手动输入）</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Base Ref</label>
            <input
              value={baseRef}
              onChange={(e) => setBaseRef(e.target.value)}
              placeholder="origin/main"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Head Ref</label>
            <input
              value={headRef}
              onChange={(e) => setHeadRef(e.target.value)}
              placeholder="HEAD"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Diff 文本（可选）</label>
            <textarea
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder="可粘贴 git diff 输出；不填则只依赖 prompt_args.files + Jira 等上下文"
              className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Goal</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="本次改动要达成的目标"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rules（每行一条）</label>
            <textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Files（每行一条）</label>
            <textarea
              value={filesText}
              onChange={(e) => setFilesText(e.target.value)}
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">初始指令（可选）</label>
            <textarea
              value={initialInstruction}
              onChange={(e) => setInitialInstruction(e.target.value)}
              placeholder="例如：请重点检查幂等"
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        {submitError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? '创建中...' : '创建会话'}
          </button>
        </div>
      </form>
    </div>
  )
}
