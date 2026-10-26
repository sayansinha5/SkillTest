import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('teacher@example.com')
  const [password, setPassword] = useState('teachskills123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-card to-white px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink">
          Teach<span className="text-primary">Skills</span>
        </h1>
        <p className="mb-6 text-sm text-slate-600">Teacher portal login</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-accent"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-accent"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-primary px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          Demo: teacher@example.com / teachskills123
        </p>
      </div>
    </div>
  )
}
