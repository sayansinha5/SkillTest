import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { StatusBadge } from './ExamsPage'

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="rounded border border-slate-300 px-2 py-1 text-xs text-ink hover:bg-slate-50"
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export default function ExamDetailPage() {
  const { examId } = useParams()
  const [exam, setExam] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await api.get(`/exams/${examId}`)
    setExam(data)
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.detail || 'Could not load exam'))
  }, [examId])

  async function run(path) {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/exams/${examId}/${path}`)
      setExam(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  if (!exam && !error) return <p className="text-sm text-slate-500">Loading…</p>

  const examLink = exam ? `${window.location.origin}/exam/${exam.share_token}` : ''
  const isActive = exam?.status !== 'inactive'

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link to="/exams" className="text-accent hover:underline">
          ← Exams
        </Link>
      </p>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {exam ? (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-ink">{exam.name}</h1>
                <StatusBadge status={exam.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {exam.group_name} · {exam.paper_name} · {Math.round(exam.duration_seconds / 60)} min
                {exam.late_duration_seconds
                  ? ` · late login closes after ${Math.round(exam.late_duration_seconds / 60)} min`
                  : ''}
              </p>
              {exam.ends_at ? (
                <p className="mt-1 text-xs text-slate-500">
                  Ends at {new Date(exam.ends_at).toLocaleString()}
                </p>
              ) : null}
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
              <span className="text-sm font-medium text-ink">Activate exam</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                disabled={busy || isActive || exam.admit_cards.length === 0}
                onClick={() => {
                  if (window.confirm('Activating starts the exam clock for everyone. Continue?')) run('activate')
                }}
                className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed ${
                  isActive ? 'bg-primary' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    isActive ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Student exam link</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-white px-2 py-1 text-sm text-ink">{examLink}</code>
              <CopyButton text={examLink} label="Copy link" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {exam.status === 'inactive'
                ? 'The link stays closed until you activate the exam.'
                : exam.status === 'active'
                  ? 'The link is open until the exam ends.'
                  : 'The exam has ended; the link no longer accepts logins.'}
            </p>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Admit cards</h2>
            {!isActive ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => run('admit-cards')}
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {exam.admit_cards.length ? 'Regenerate missing cards' : 'Generate admit cards'}
              </button>
            ) : null}
          </div>

          {exam.admit_cards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-card p-6 text-center text-sm text-slate-600">
              No admit cards yet. Generate them for the {exam.student_count} student(s) in {exam.group_name}.
            </div>
          ) : (
            <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-left text-sm">
              <thead className="bg-card text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Student</th>
                  <th className="px-4 py-2">Admit card ID</th>
                  <th className="px-4 py-2">Password</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {exam.admit_cards.map((card) => (
                  <tr key={card.id} className="border-t border-slate-200">
                    <td className="px-4 py-2">
                      <p className="font-medium text-ink">{card.student_name}</p>
                      <p className="text-xs text-slate-500">{card.student_email}</p>
                    </td>
                    <td className="px-4 py-2 font-mono">{card.admit_id}</td>
                    <td className="px-4 py-2 font-mono">{card.password}</td>
                    <td className="px-4 py-2 text-right">
                      <CopyButton
                        text={`Exam: ${exam.name}\nLink: ${examLink}\nAdmit card ID: ${card.admit_id}\nPassword: ${card.password}`}
                        label="Copy details"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}
    </div>
  )
}
