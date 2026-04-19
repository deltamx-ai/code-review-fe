import { NavLink, Outlet } from 'react-router-dom'
import { useApiBase } from '../lib/apiBase'

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-700 ${props.className || ''}`}
    />
  )
}

export default function Layout() {
  const { apiBase, setApiBase } = useApiBase()
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white shadow-xl">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">code-review frontend</p>
              <h1 className="mt-1 text-2xl font-semibold">HTTP API Control Panel</h1>
            </div>
            <nav className="flex gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`
                }
              >
                单轮 Review
              </NavLink>
              <NavLink
                to="/sessions"
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`
                }
              >
                多轮会话
              </NavLink>
            </nav>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr]">
            <span className="self-center text-xs uppercase tracking-[0.2em] text-slate-400">API Base</span>
            <TextInput
              value={apiBase}
              placeholder="留空则走同源 /api（Vite 代理到 127.0.0.1:3000）"
              onChange={(e) => setApiBase(e.target.value)}
            />
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
