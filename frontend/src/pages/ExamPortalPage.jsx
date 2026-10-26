import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const portal = axios.create({ baseURL: '/api/portal' })

export default function ExamPortalPage() {
  const { token } = useParams()
  const [info, setInfo] = useState(null)
  const [linkError, setLinkError] = useState('')
  const [admitId, setAdmitId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState(null)

  useEffect(() => {
    portal
      .get(`/${token}`)
      .then((res) => setInfo(res.data))
      .catch((err) => setLinkError(err.response?.data?.detail || 'This exam link is not valid'))
  }, [token])

  async function login(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await portal.post(`/${token}/login`, { admit_id: admitId, password })
      sessionStorage.setItem(`teachskills_exam_${token}`, data.access_token)
      setSession(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-card to-white px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-1 text-sm font-bold text-ink">
          Teach<span className="text-primary">Skills</span> <span className="font-normal text-slate-500">exam portal</span>
        </p>
        {linkError ? <p className="mt-4 text-sm text-red-600">{linkError}</p> : null}
        {info ? <h1 className="mb-4 text-2xl font-bold text-ink">{info.name}</h1> : null}

        {info && info.status === 'inactive' && !session ? (
          <p className="rounded bg-card p-3 text-sm text-slate-600">
            This exam has not started yet. Please wait for your teacher to open it.
          </p>
        ) : null}

        {info && info.status === 'ended' && !session ? (
          <p className="rounded bg-card p-3 text-sm text-slate-600">This exam has ended.</p>
        ) : null}

        {info && info.status === 'active' && !session ? (
          <form onSubmit={login} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Admit card ID</span>
              <input
                value={admitId}
                onChange={(e) => setAdmitId(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 font-mono outline-none focus:border-accent"
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
              disabled={busy}
              className="rounded bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Checking…' : 'Start exam'}
            </button>
          </form>
        ) : null}

        {session ? (
          <p className="rounded bg-card p-3 text-sm text-ink">
            Welcome, <span className="font-semibold">{session.student_name}</span>. You're logged in to{' '}
            {session.exam_name}.
          </p>
        ) : null}
      </div>
    </div>
  )
}
