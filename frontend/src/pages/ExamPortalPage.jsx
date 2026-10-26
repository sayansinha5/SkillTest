import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

const portal = axios.create({ baseURL: '/api/portal' })

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function Shell({ children, wide = false }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-card to-white px-4 py-8">
      <div
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-md'} rounded-lg border border-slate-200 bg-white p-8 shadow-sm`}
      >
        <p className="mb-1 text-sm font-bold text-ink">
          Teach<span className="text-primary">Skills</span>{' '}
          <span className="font-normal text-slate-500">exam portal</span>
        </p>
        {children}
      </div>
    </div>
  )
}

export default function ExamPortalPage() {
  const { token } = useParams()
  const storageKey = `teachskills_exam_${token}`

  const [phase, setPhase] = useState('loading')
  const [info, setInfo] = useState(null)
  const [message, setMessage] = useState('')
  const [admitId, setAdmitId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [remainingMs, setRemainingMs] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const clockOffset = useRef(0)
  const submitted = useRef(false)

  const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem(storageKey)}` })

  const loadSession = useCallback(async () => {
    const { data } = await portal.get('/session/exam', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem(storageKey)}` },
    })
    clockOffset.current = Date.parse(data.server_now) - Date.now()
    setSession(data)
    setAnswers(data.answers)
    return data
  }, [storageKey])

  useEffect(() => {
    async function init() {
      try {
        const { data } = await portal.get(`/${token}`)
        setInfo(data)
      } catch (err) {
        setMessage(err.response?.data?.detail || 'This exam link is not valid')
        setPhase('closed')
        return
      }
      if (sessionStorage.getItem(storageKey)) {
        try {
          await loadSession()
          setPhase('taking')
          return
        } catch {
          sessionStorage.removeItem(storageKey)
        }
      }
      setPhase('login')
    }
    init()
  }, [token, storageKey, loadSession])

  const submit = useCallback(
    async (reason) => {
      if (submitted.current) return
      submitted.current = true
      setBusy(true)
      try {
        await portal.post('/session/submit', null, { headers: authHeaders() })
      } catch {
        // Already submitted or past the grace window — the saved answers stand either way.
      }
      sessionStorage.removeItem(storageKey)
      setConfirmOpen(false)
      setMessage(reason)
      setPhase('thanks')
      setBusy(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageKey],
  )

  useEffect(() => {
    if (phase !== 'taking' && phase !== 'instructions') return
    if (!session?.ends_at) return
    const end = Date.parse(session.ends_at)
    const tick = () => {
      const left = end - (Date.now() + clockOffset.current)
      setRemainingMs(left)
      if (left <= 0 && phase === 'taking') submit('Time is up. Your answers were submitted automatically.')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, session, submit])

  async function login(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await portal.post(`/${token}/login`, { admit_id: admitId, password })
      sessionStorage.setItem(storageKey, data.access_token)
      await loadSession()
      setPhase('instructions')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function choose(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
    try {
      await portal.put(`/session/answers/${questionId}`, { selected_option: option }, { headers: authHeaders() })
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save your answer')
    }
  }

  async function demoFill() {
    setBusy(true)
    try {
      await portal.post('/session/demo-fill', null, { headers: authHeaders() })
      await loadSession()
      setConfirmOpen(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Demo fill failed')
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      </Shell>
    )
  }

  if (phase === 'closed') {
    return (
      <Shell>
        <p className="mt-4 text-sm text-red-600">{message}</p>
      </Shell>
    )
  }

  if (phase === 'thanks') {
    return (
      <Shell>
        <h1 className="mb-2 mt-4 text-2xl font-bold text-ink">Thank you!</h1>
        <p className="text-sm text-slate-600">{message}</p>
        <p className="mt-4 rounded bg-card p-3 text-sm text-ink">
          Your exam has been submitted successfully. You can close this window.
        </p>
      </Shell>
    )
  }

  if (phase === 'login') {
    return (
      <Shell>
        <h1 className="mb-4 text-2xl font-bold text-ink">{info?.name}</h1>
        {info?.status === 'inactive' ? (
          <p className="rounded bg-card p-3 text-sm text-slate-600">
            This exam has not started yet. Please wait for your teacher to open it.
          </p>
        ) : info?.status === 'ended' ? (
          <p className="rounded bg-card p-3 text-sm text-slate-600">This exam has ended.</p>
        ) : (
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
              {busy ? 'Checking…' : 'Log in'}
            </button>
          </form>
        )}
      </Shell>
    )
  }

  if (phase === 'instructions' && session) {
    return (
      <Shell>
        <h1 className="mb-1 text-2xl font-bold text-ink">{session.exam_name}</h1>
        <p className="mb-4 text-sm text-slate-600">Welcome, {session.student_name}.</p>
        <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-ink">
          <li>
            {session.questions.length} multiple-choice questions, {session.total_marks} marks in total.
          </li>
          <li>Choose one option per question. You can change or clear an answer any time.</li>
          <li>Use Previous / Next or the question map to move between questions.</li>
          <li>The timer is already running. When it reaches zero your answers are submitted automatically.</li>
          <li>Once you submit, you cannot log in to this exam again.</li>
        </ul>
        {remainingMs !== null ? (
          <p className="mb-4 text-sm text-slate-600">
            Time remaining: <span className="font-mono font-semibold text-ink">{formatRemaining(remainingMs)}</span>
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setPhase('taking')}
          className="w-full rounded bg-primary px-4 py-2.5 font-semibold text-white"
        >
          Begin exam
        </button>
      </Shell>
    )
  }

  if (!session) return null

  const questions = session.questions
  const question = questions[current]
  const attempted = questions.filter((q) => answers[q.id]).length
  const lowTime = remainingMs !== null && remainingMs < 60_000

  return (
    <Shell wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-ink">{session.exam_name}</h1>
          <p className="text-xs text-slate-500">{session.student_name}</p>
        </div>
        <div className={`rounded px-3 py-1.5 font-mono text-lg font-semibold ${lowTime ? 'bg-red-50 text-red-600' : 'bg-card text-ink'}`}>
          {remainingMs !== null ? formatRemaining(remainingMs) : '--:--'}
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 md:grid-cols-[1fr_200px]">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Question {current + 1} of {questions.length} · {question.marks} marks
          </p>
          <p className="mb-4 text-lg font-medium text-ink">{question.stem}</p>
          <div className="flex flex-col gap-2">
            {Object.entries(question.options).map(([key, text]) => {
              const selected = answers[question.id] === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => choose(question.id, key)}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    selected ? 'border-primary bg-primary/10 text-ink' : 'border-slate-200 hover:bg-card'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {key}
                  </span>
                  <span>{text}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((i) => i - 1)}
              className="rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={current === questions.length - 1}
              onClick={() => setCurrent((i) => i + 1)}
              className="rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              disabled={!answers[question.id]}
              onClick={() => choose(question.id, null)}
              className="rounded px-4 py-2 text-sm text-accent hover:underline disabled:opacity-40"
            >
              Clear answer
            </button>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Question map</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={`h-8 rounded text-xs font-semibold ${
                  answers[q.id] ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                } ${i === current ? 'ring-2 ring-accent ring-offset-1' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {attempted} of {questions.length} answered
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-4 w-full rounded bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            Submit exam
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={demoFill}
            className="mt-2 w-full rounded border border-dashed border-slate-400 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            Demo: auto-fill answers
          </button>
        </aside>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-3 text-lg font-bold text-ink">End the exam?</h2>
            <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Attempted</dt>
              <dd className="font-semibold text-primary">{attempted}</dd>
              <dt className="text-slate-500">Not attempted</dt>
              <dd className="font-semibold text-ink">{questions.length - attempted}</dd>
              <dt className="text-slate-500">Total questions</dt>
              <dd className="font-semibold text-ink">{questions.length}</dd>
            </dl>
            <p className="mb-4 text-xs text-slate-500">After submitting you cannot log back in to this exam.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                Back to exam
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submit('You ended the exam. Your answers were submitted.')}
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  )
}
