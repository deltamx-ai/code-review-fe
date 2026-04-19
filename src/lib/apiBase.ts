import { createContext, useContext } from 'react'

export type ApiBaseContextValue = {
  apiBase: string
  setApiBase: (value: string) => void
}

export const ApiBaseContext = createContext<ApiBaseContextValue | null>(null)

export function useApiBase(): ApiBaseContextValue {
  const ctx = useContext(ApiBaseContext)
  if (!ctx) throw new Error('useApiBase must be used within ApiBaseProvider')
  return ctx
}
