import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const STUDENT_STATUS = {
  submitted: 'bg-primary/15 text-primary',
  in_progress: 'bg-accent/10 text-accent',
  not_started: 'bg-slate-100 text-slate-600',
  absent: 'bg-red-50 text-red-600',
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  )
}

function ReportList({ title, items, tone = 'text-ink' }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className={`list-disc space-y-1 pl-5 text-sm ${tone}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function PerformanceBar({ correct, wrong, unanswered }) {
  const total = correct + wrong + unanswered
  if (!total) return <span className="text-xs text-slate-400">No answers yet</span>
  const pct = (n) => `${(n / total) * 100}%`
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="bg-primary" style={{ width: pct(correct) }} />
      <div className="bg-red-400" style={{ width: pct(wrong) }} />
      <div className="bg-slate-300" style={{ width: pct(unanswered) }} />
    </div>
  )
}

export default function ExamResults({ examId, onStatusChange }) {
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    api
      .get(`/exams/${examId}/results`)
      .then(({ data }) => setResults(data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load results'))
  }, [examId])

  async function run(path, label, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(label)
    setError('')
    try {
      const { data } = await api.post(`/exams/${examId}/${path}`)
      setResults(data)
      onStatusChange?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Action failed')
    } finally {
      setBusy('')
    }
  }

  if (!results) return error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500">Loading results…</p>

  const locked = Boolean(results.completed_at)
  const report = results.class_report

  return (
    <div className="flex flex-col gap-6">
      {!results.finalized ? (
        <p className="rounded bg-card p-3 text-sm text-slate-600">
          The exam is still running. Students who submit early can be autochecked now; absentees and Bulk
          autocheck become available once the exam ends.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={Boolean(busy) || locked || !results.finalized}
          onClick={() => run('results/autocheck-all', 'bulk')}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === 'bulk' ? 'Checking all papers…' : 'Bulk autocheck'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || locked || !results.finalized}
          onClick={() => run('complete', 'complete', 'Mark results complete? Autocheck will be locked afterwards.')}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {locked ? 'Marked complete' : 'Mark complete'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !locked || Boolean(results.published_at)}
          onClick={() => run('publish', 'publish', 'Publish these results?')}
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {results.published_at ? 'Published' : 'Publish'}
        </button>
        {results.published_at ? (
          <span className="text-xs text-slate-500">
            Published {new Date(results.published_at).toLocaleString()}
          </span>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Students" value={results.total_students} />
        <Stat label="Submitted" value={results.submitted} />
        <Stat label="Absent" value={results.absent} />
        <Stat label="Checked" value={`${results.checked}/${results.submitted}`} />
        <Stat
          label="Average"
          value={results.average_score === null ? '—' : `${results.average_score}/${results.max_score}`}
        />
      </div>

      <section className="rounded-lg border border-slate-200 p-5">
        <h3 className="mb-3 text-base font-bold text-ink">Class report</h3>
        {report ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">{report.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <ReportList title="Strong areas" items={report.strong_areas} tone="text-primary" />
              <ReportList title="Weak areas" items={report.weak_areas} tone="text-red-600" />
            </div>
            {report.students_needing_attention?.length ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Students needing attention
                </p>
                <ul className="space-y-1 text-sm">
                  {report.students_needing_attention.map((s) => (
                    <li key={s.name}>
                      <span className="font-semibold text-ink">{s.name}</span>{' '}
                      <span className="text-slate-600">— {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ReportList title="Teaching suggestions" items={report.teaching_suggestions} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Run Bulk autocheck after the exam ends to generate the AI class report.</p>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-5">
          <h3 className="mb-3 text-base font-bold text-ink">Chapter performance</h3>
          {results.chapters.length ? (
            <ul className="flex flex-col gap-3">
              {results.chapters.map((c) => (
                <li key={c.chapter}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{c.chapter}</span>
                    <span className="text-slate-500">
                      {c.correct}/{c.correct + c.wrong + c.unanswered} correct
                    </span>
                  </div>
                  <PerformanceBar {...c} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No submitted papers yet.</p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 p-5">
          <h3 className="mb-3 text-base font-bold text-ink">Question performance</h3>
          <ol className="flex flex-col gap-3">
            {results.questions.map((q, i) => (
              <li key={q.question_id}>
                <p className="mb-1 text-sm text-ink">
                  <span className="font-semibold">Q{i + 1}.</span> {q.stem}
                </p>
                <PerformanceBar {...q} />
                <p className="mt-1 text-xs text-slate-500">
                  {q.correct} right · {q.wrong} wrong · {q.unanswered} unanswered · answer {q.correct_option}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-bold text-ink">Students</h3>
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-left text-sm">
          <thead className="bg-card text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {results.students.map((s) => (
              <tr key={s.admit_card_id} className="border-t border-slate-200">
                <td className="px-4 py-2">
                  <Link to={`/exams/${examId}/results/${s.admit_card_id}`} className="font-medium text-accent hover:underline">
                    {s.student_name}
                  </Link>
                  <p className="text-xs text-slate-500">{s.student_email}</p>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STUDENT_STATUS[s.status] || ''}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono">{s.checked ? `${s.score}/${s.max_score}` : '—'}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-500">
                  {s.checked ? 'Report ready' : s.status === 'submitted' ? 'Not checked' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
