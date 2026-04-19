export type ReviewMode = 'lite' | 'standard' | 'critical'

export type ConversationStatus =
  | 'created'
  | 'running'
  | 'waiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type TurnKind =
  | 'discovery'
  | 'deep_dive'
  | 'business_check'
  | 'final_report'
  | 'manual_followup'

export type TurnStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type ContentFormat = 'text' | 'markdown' | 'json'

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type FindingStatus =
  | 'suspected'
  | 'confirmed'
  | 'dismissed'
  | 'fixed'
  | 'accepted_risk'

export type FindingCategory =
  | 'logic'
  | 'security'
  | 'performance'
  | 'compatibility'
  | 'data'
  | 'testability'
  | 'release'
  | 'maintainability'
  | 'style'
  | 'unknown'

export type ArtifactType =
  | 'diff'
  | 'context_file'
  | 'prompt'
  | 'response'
  | 'report'
  | 'jira'
  | 'test_result'
  | 'snapshot'
  | 'other'

export type CodeLocation = {
  file_path: string
  line_start?: number | null
  line_end?: number | null
  symbol?: string | null
}

export type FindingEvidence = {
  kind: string
  summary: string
  content?: string | null
  artifact_id?: string | null
}

export type ReviewFinding = {
  id: string
  code?: string | null
  session_id: string
  source_turn_id?: string | null
  severity: FindingSeverity
  category: FindingCategory
  status: FindingStatus
  title: string
  description: string
  rationale?: string | null
  suggestion?: string | null
  confidence?: number | null
  owner?: string | null
  location?: CodeLocation | null
  evidence: FindingEvidence[]
  related_files: string[]
  tags: string[]
  last_seen_turn?: number | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
}

export type FindingPatch = {
  status?: FindingStatus
  owner?: string | null
  tags?: string[] | null
}

export type ReviewMessage = {
  id: string
  session_id: string
  turn_id?: string | null
  seq_no: number
  role: MessageRole
  author?: string | null
  content: string
  format: ContentFormat
  created_at: string
}

export type ReviewTurn = {
  id: string
  session_id: string
  turn_no: number
  kind: TurnKind
  status: TurnStatus
  input_summary?: string | null
  instruction?: string | null
  requested_files: string[]
  attached_files: string[]
  focus_finding_ids: string[]
  prompt_text?: string | null
  response_text?: string | null
  parsed_result?: unknown | null
  token_input?: number | null
  token_output?: number | null
  latency_ms?: number | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export type AdmissionSnapshot = {
  ok: boolean
  level: string
  score: number
  confidence: string
  block_reasons: string[]
  missing_required: string[]
}

export type ReviewConversationState = {
  requested_files: string[]
  attached_files: string[]
  findings: ReviewFinding[]
  pending_finding_ids: string[]
  confirmed_finding_ids: string[]
  dismissed_finding_ids: string[]
  release_checks: string[]
  impact_scope: string[]
}

export type ReviewSession = {
  id: string
  title?: string | null
  status: ConversationStatus
  review_mode: ReviewMode
  strategy: string
  repo_root: string
  base_ref?: string | null
  head_ref?: string | null
  provider: string
  model: string
  temperature?: number | null
  current_turn: number
  total_turns: number
  admission?: AdmissionSnapshot | null
  state: ReviewConversationState
  final_summary?: string | null
  final_report?: unknown | null
  last_error?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export type ReviewArtifact = {
  id: string
  session_id: string
  turn_id?: string | null
  artifact_type: ArtifactType
  name: string
  path?: string | null
  content?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  hash?: string | null
  created_at: string
}

export type ReviewSessionDetail = {
  session: ReviewSession
  turns: ReviewTurn[]
  messages: ReviewMessage[]
  findings: ReviewFinding[]
  artifacts: ReviewArtifact[]
}

export type FindingCounts = {
  total: number
  high: number
  medium: number
  low: number
  confirmed: number
  dismissed: number
}

export type SessionSummary = {
  id: string
  title?: string | null
  status: ConversationStatus
  review_mode: ReviewMode
  repo_root: string
  provider: string
  model: string
  current_turn: number
  total_turns: number
  finding_counts: FindingCounts
  admission_ok?: boolean | null
  last_error?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export type SessionListResponse = {
  items: SessionSummary[]
  total: number
  limit: number
  offset: number
}

export type SessionListQuery = {
  repo?: string
  status?: ConversationStatus | ''
  mode?: ReviewMode | ''
  limit?: number
  offset?: number
}

export type CreateSessionPayload = {
  repo_root: string
  review_mode: ReviewMode
  provider?: string | null
  model?: string | null
  base_ref?: string | null
  head_ref?: string | null
  diff_text?: string | null
  prompt_args: CreateSessionPromptArgs
  initial_instruction?: string | null
}

export type CreateSessionPromptArgs = {
  mode: ReviewMode
  stack?: string | null
  goal?: string | null
  why?: string | null
  rules: string[]
  risks: string[]
  expected_normal?: string | null
  expected_error?: string | null
  expected_edge?: string | null
  issue?: string | null
  test_results: string[]
  jira?: string | null
  jira_base_url?: string | null
  jira_provider: 'native' | 'command'
  jira_command?: string | null
  diff_file?: string | null
  context_files: string[]
  files: string[]
  focus: string[]
  baseline_files: string[]
  incident_files?: string[]
  change_type?: string | null
  format: 'text' | 'json'
}

export type AppendTurnPayload = {
  instruction?: string | null
  attached_files?: string[]
  extra_context?: string[]
  focus_finding_ids?: string[]
  finalize?: boolean | null
  model?: string | null
}

export type ModelList = {
  provider: string
  models: string[]
  default_model?: string | null
  source: string
}
