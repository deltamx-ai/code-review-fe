import { fetchJson } from './api'
import type { ModelList } from '../types/session'

export async function listModels(base: string): Promise<ModelList> {
  return fetchJson<ModelList>(base, '/api/models')
}
