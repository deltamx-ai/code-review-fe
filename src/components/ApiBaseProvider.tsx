import { useState, type ReactNode } from 'react'
import { DEFAULT_API_BASE } from '../lib/api'
import { ApiBaseContext } from '../lib/apiBase'

export default function ApiBaseProvider({ children }: { children: ReactNode }) {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE)
  return <ApiBaseContext.Provider value={{ apiBase, setApiBase }}>{children}</ApiBaseContext.Provider>
}
