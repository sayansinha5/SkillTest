import { Outlet, useNavigate } from 'react-router-dom'
import { clearToken } from '../api/client'
import Sidebar from './Sidebar'

export default function AppLayout({ teacher }) {
  const navigate = useNavigate()

  function logout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-medium text-ink">{teacher?.name}</span>
          </p>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-ink hover:bg-slate-50"
          >
            Log out
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
