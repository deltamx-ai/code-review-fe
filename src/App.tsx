import { useMemo, useState } from 'react'

type PromptArgs = {
  mode: 'lite' | 'standard' | 'critical'
  stack?: string
  goal?: string
  why?: string
  rules: string[]
  risks: string[]
  expected_normal?: string
  expected_error?: string
  expected_edge?: string
  issue?: string
  test_results: string[]
  jira?: string
  jira_base_url?: string
  jira_provider: string
  jira_command?: string
  diff_file?: string | null
  context_files: string[]
  files: string[]
  focus: string[]
  baseline_files: string[]
  change_type?: string
  format: 'text' | 'json'
}

type ReviewArgs = {
  model?: string
  prompt?: string | null
  prompt_args: PromptArgs
}

type DeepReviewArgs = {
  git: string
  repo: string
  model?: string
  prompt: PromptArgs
  include_context: boolean
  context_budget_bytes: number
  context_file_max_bytes: number
}

type RunArgs = {
  git: string
  repo: string
  prompt: PromptArgs
  include_context: boolean
  context_budget_bytes: number
  context_file_max_bytes: number
}

const API_BASE = 'http://127.0.0.1:3000'

const defaultPromptArgs = (): PromptArgs => ({
  mode: 'standard',
  stack: 'Rust + Axum + PostgreSQL',
  goal: '修复重复下单',
  why: '线上偶发重复提交',
  rules: ['一个订单只能支付一次', '幂等键必须生效'],
  risks: ['并发', '事务一致性'],
  expected_normal: '首次提交成功',
  expected_error: '重复提交返回冲突',
  expected_edge: '网络重试不应双写',
  issue: '支付接口在网络重试下出现重复创建订单',
  test_results: ['订单单测通过'],
  jira: '',
  jira_base_url: '',
  jira_provider: 'native',
  jira_command: '',
  diff_file: null,
  context_files: [],
  files: ['src/order/service.rs'],
  focus: [],
  baseline_files: [],
  change_type: 'server',
  format: 'json',
})

function splitLines(value: string) {
  return value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
}

async function fetchJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`)
  }
  return data as T
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {desc ? <p className="mt-1 text-sm text-slate-500">{desc}</p> : null}
      </div>
      {children}
    </section>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-slate-700">{children}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${props.className || ''}`} />
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${props.className || ''}`} />
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${props.className || ''}`} />
}

function ResultPanel({ title, data, loading, error }: { title: string; data: unknown; loading: boolean; error: string | null }) {
  const pretty = useMemo(() => {
    if (data == null) return ''
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  }, [data])

  return (
    <SectionCard title={title} desc="这里显示接口返回的 JSON / 文本结果。">
      {loading ? <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">加载中...</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {!loading && !error && !pretty ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">还没有结果，先提交一个请求吧。</div>
      ) : null}
      {pretty ? (
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{pretty}</pre>
      ) : null}
    </SectionCard>
  )
}

export default function App() {
  const [health, setHealth] = useState<unknown>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)

  const [promptArgs, setPromptArgs] = useState<PromptArgs>(defaultPromptArgs())
  const [promptLines, setPromptLines] = useState({
    rules: defaultPromptArgs().rules.join('\n'),
    risks: defaultPromptArgs().risks.join('\n'),
    test_results: defaultPromptArgs().test_results.join('\n'),
    files: defaultPromptArgs().files.join('\n'),
    focus: '',
    context_files: '',
    baseline_files: '',
  })

  const [promptResult, setPromptResult] = useState<unknown>(null)
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)

  const [reviewModel, setReviewModel] = useState('gpt-5.4')
  const [reviewResult, setReviewResult] = useState<unknown>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const [deepArgs, setDeepArgs] = useState<DeepReviewArgs>({
    git: 'HEAD~1..HEAD',
    repo: '/home/delta/workspace/ai/code-review',
    model: 'gpt-5.4',
    prompt: { ...defaultPromptArgs(), mode: 'critical', focus: ['支付安全', '事务一致性'] },
    include_context: true,
    context_budget_bytes: 48000,
    context_file_max_bytes: 12000,
  })
  const [deepResult, setDeepResult] = useState<unknown>(null)
  const [deepLoading, setDeepLoading] = useState(false)
  const [deepError, setDeepError] = useState<string | null>(null)

  const [runArgs, setRunArgs] = useState<RunArgs>({
    git: 'HEAD~1..HEAD',
    repo: '/home/delta/workspace/ai/code-review',
    prompt: defaultPromptArgs(),
    include_context: true,
    context_budget_bytes: 48000,
    context_file_max_bytes: 12000,
  })
  const [runResult, setRunResult] = useState<unknown>(null)
  const [runLoading, setRunLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const syncPromptArgs = (patch: Partial<PromptArgs>) => {
    const next = { ...promptArgs, ...patch }
    setPromptArgs(next)
    setRunArgs((prev) => ({ ...prev, prompt: next }))
    setDeepArgs((prev) => ({ ...prev, prompt: { ...prev.prompt, ...patch } }))
  }

  const buildPromptArgsFromLines = (base: PromptArgs): PromptArgs => ({
    ...base,
    rules: splitLines(promptLines.rules),
    risks: splitLines(promptLines.risks),
    test_results: splitLines(promptLines.test_results),
    files: splitLines(promptLines.files),
    focus: splitLines(promptLines.focus),
    context_files: splitLines(promptLines.context_files),
    baseline_files: splitLines(promptLines.baseline_files),
  })

  const checkHealth = async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const data = await fetchJson('/api/health')
      setHealth(data)
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : '请求失败')
    } finally {
      setHealthLoading(false)
    }
  }

  const createPrompt = async () => {
    setPromptLoading(true)
    setPromptError(null)
    try {
      const body = buildPromptArgsFromLines(promptArgs)
      const data = await fetchJson('/api/prompt', body)
      setPromptResult(data)
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : '请求失败')
    } finally {
      setPromptLoading(false)
    }
  }

  const runReview = async () => {
    setReviewLoading(true)
    setReviewError(null)
    try {
      const body: ReviewArgs = {
        model: reviewModel,
        prompt_args: buildPromptArgsFromLines(promptArgs),
      }
      const data = await fetchJson('/api/review', body)
      setReviewResult(data)
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : '请求失败')
    } finally {
      setReviewLoading(false)
    }
  }

  const runDeepReview = async () => {
    setDeepLoading(true)
    setDeepError(null)
    try {
      const body: DeepReviewArgs = {
        ...deepArgs,
        prompt: buildPromptArgsFromLines({ ...deepArgs.prompt, mode: 'critical' }),
      }
      const data = await fetchJson('/api/deep-review', body)
      setDeepResult(data)
    } catch (error) {
      setDeepError(error instanceof Error ? error.message : '请求失败')
    } finally {
      setDeepLoading(false)
    }
  }

  const runPromptFromGit = async () => {
    setRunLoading(true)
    setRunError(null)
    try {
      const body: RunArgs = {
        ...runArgs,
        prompt: buildPromptArgsFromLines(runArgs.prompt),
      }
      const data = await fetchJson('/api/run', body)
      setRunResult(data)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : '请求失败')
    } finally {
      setRunLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">code-review frontend</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">HTTP API Control Panel</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            基于 React + TypeScript + Tailwind + Vite 的本地前端，用来调用 code-review HTTP API。
            适合开发、联调和查看结构化 review 结果。
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <SectionCard title="服务状态" desc={`默认 API Base：${API_BASE}`}>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={checkHealth} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">检查健康状态</button>
                <span className="text-sm text-slate-500">启动后端：cargo run -- serve</span>
              </div>
              <div className="mt-4">
                <ResultPanel title="健康检查结果" data={health} loading={healthLoading} error={healthError} />
              </div>
            </SectionCard>

            <SectionCard title="通用 Prompt 参数" desc="下面这些字段会被 Prompt / Review / Deep Review 共用。">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Mode</FieldLabel>
                  <Select value={promptArgs.mode} onChange={(e) => syncPromptArgs({ mode: e.target.value as PromptArgs['mode'] })}>
                    <option value="lite">lite</option>
                    <option value="standard">standard</option>
                    <option value="critical">critical</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Change Type</FieldLabel>
                  <Select value={promptArgs.change_type || ''} onChange={(e) => syncPromptArgs({ change_type: e.target.value || undefined })}>
                    <option value="">(none)</option>
                    <option value="server">server</option>
                    <option value="db">db</option>
                    <option value="frontend">frontend</option>
                    <option value="infra">infra</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Stack</FieldLabel>
                  <TextInput value={promptArgs.stack || ''} onChange={(e) => syncPromptArgs({ stack: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Goal</FieldLabel>
                  <TextInput value={promptArgs.goal || ''} onChange={(e) => syncPromptArgs({ goal: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Why</FieldLabel>
                  <TextInput value={promptArgs.why || ''} onChange={(e) => syncPromptArgs({ why: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Issue</FieldLabel>
                  <TextInput value={promptArgs.issue || ''} onChange={(e) => syncPromptArgs({ issue: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Expected Normal</FieldLabel>
                  <TextInput value={promptArgs.expected_normal || ''} onChange={(e) => syncPromptArgs({ expected_normal: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Expected Error</FieldLabel>
                  <TextInput value={promptArgs.expected_error || ''} onChange={(e) => syncPromptArgs({ expected_error: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Expected Edge</FieldLabel>
                  <TextInput value={promptArgs.expected_edge || ''} onChange={(e) => syncPromptArgs({ expected_edge: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Rules（每行一条）</FieldLabel>
                  <TextArea value={promptLines.rules} onChange={(e) => setPromptLines((prev) => ({ ...prev, rules: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Risks（每行一条）</FieldLabel>
                  <TextArea value={promptLines.risks} onChange={(e) => setPromptLines((prev) => ({ ...prev, risks: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Test Results（每行一条）</FieldLabel>
                  <TextArea value={promptLines.test_results} onChange={(e) => setPromptLines((prev) => ({ ...prev, test_results: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Files（每行一条）</FieldLabel>
                  <TextArea value={promptLines.files} onChange={(e) => setPromptLines((prev) => ({ ...prev, files: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Focus（每行一条）</FieldLabel>
                  <TextArea value={promptLines.focus} onChange={(e) => setPromptLines((prev) => ({ ...prev, focus: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Context Files（每行一条）</FieldLabel>
                  <TextArea value={promptLines.context_files} onChange={(e) => setPromptLines((prev) => ({ ...prev, context_files: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Baseline Files（每行一条）</FieldLabel>
                  <TextArea value={promptLines.baseline_files} onChange={(e) => setPromptLines((prev) => ({ ...prev, baseline_files: e.target.value }))} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Prompt 生成" desc="调用 /api/prompt，直接查看后端生成的 prompt。">
              <div className="flex gap-3">
                <button onClick={createPrompt} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">生成 Prompt</button>
              </div>
              <div className="mt-4">
                <ResultPanel title="Prompt Result" data={promptResult} loading={promptLoading} error={promptError} />
              </div>
            </SectionCard>

            <SectionCard title="Run（从 git diff 生成 prompt）" desc="调用 /api/run，适合先看自动拼装的 prompt 质量。">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Git Range</FieldLabel>
                  <TextInput value={runArgs.git} onChange={(e) => setRunArgs((prev) => ({ ...prev, git: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Repo</FieldLabel>
                  <TextInput value={runArgs.repo} onChange={(e) => setRunArgs((prev) => ({ ...prev, repo: e.target.value }))} />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={runPromptFromGit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">执行 Run</button>
              </div>
              <div className="mt-4">
                <ResultPanel title="Run Result" data={runResult} loading={runLoading} error={runError} />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Review" desc="调用 /api/review，执行单轮结构化 review。">
              <div>
                <FieldLabel>Model</FieldLabel>
                <TextInput value={reviewModel} onChange={(e) => setReviewModel(e.target.value)} />
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={runReview} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500">执行 Review</button>
              </div>
              <div className="mt-4">
                <ResultPanel title="Review Result" data={reviewResult} loading={reviewLoading} error={reviewError} />
              </div>
            </SectionCard>

            <SectionCard title="Deep Review" desc="调用 /api/deep-review，执行两阶段深度审查。">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Git Range</FieldLabel>
                  <TextInput value={deepArgs.git} onChange={(e) => setDeepArgs((prev) => ({ ...prev, git: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Repo</FieldLabel>
                  <TextInput value={deepArgs.repo} onChange={(e) => setDeepArgs((prev) => ({ ...prev, repo: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Model</FieldLabel>
                  <TextInput value={deepArgs.model || ''} onChange={(e) => setDeepArgs((prev) => ({ ...prev, model: e.target.value }))} />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={runDeepReview} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500">执行 Deep Review</button>
              </div>
              <div className="mt-4">
                <ResultPanel title="Deep Review Result" data={deepResult} loading={deepLoading} error={deepError} />
              </div>
            </SectionCard>

            <SectionCard title="使用提示" desc="一些本地联调注意事项。">
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                <li>1. 先启动后端：<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">cargo run -- serve</code></li>
                <li>2. 如果要执行 review / deep-review，记得先做本机 <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">code-review auth login</code></li>
                <li>3. Review / Deep Review 是同步接口，调用可能较慢。</li>
                <li>4. 默认 API 地址写死为 <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">http://127.0.0.1:3000</code>，后面可以再做环境变量配置。</li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  )
}
