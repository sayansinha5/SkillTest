import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'

function ReportList({ title, items, tone }) {
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

export default function StudentResultPage() {
  const { examId, admitCardId } = useParams()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get(`/exams/${examId}/results/${admitCardId}`)
      .then(({ data }) => setResult(data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load this result'))
  }, [examId, admitCardId])

  async function autocheck() {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/exams/${examId}/results/${admitCardId}/autocheck`)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Autocheck failed')
    } finally {
      setBusy(false)
    }
  }

  const report = result?.report

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link to={`/exams/${examId}`} className="text-accent hover:underline">
          ← Back to exam
        </Link>
      </p>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {!result ? (
        error ? null : <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink">{result.student_name}</h1>
              <p className="text-sm text-slate-600">
                {result.exam_name} · {result.student_email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {report ? (
                <div className="rounded-lg bg-card px-4 py-2 text-right">
                  <p className="text-xs uppercase text-slate-500">Score</p>
                  <p className="text-2xl font-bold text-ink">
                    {result.score}
                    <span className="text-base text-slate-500">/{result.max_score}</span>
                  </p>
                </div>
              ) : null}
              {result.status === 'submitted' && !result.locked ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={autocheck}
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? 'Checking…' : report ? 'Re-run autocheck' : 'Autocheck'}
                </button>
              ) : null}
            </div>
          </div>

          {result.status !== 'submitted' ? (
            <p className="rounded bg-card p-4 text-sm text-slate-600">
              {result.status === 'absent'
                ? 'This student did not log in before the exam ended and is marked absent.'
                : result.status === 'in_progress'
                  ? 'This student is still taking the exam.'
                  : 'This student has not logged in yet.'}
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              <section className="rounded-lg border border-slate-200 p-5">
                <h2 className="mb-3 text-base font-bold text-ink">AI report card</h2>
                {report ? (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-ink">{report.summary}</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      <ReportList title="Strengths" items={report.strengths} tone="text-primary" />
                      <ReportList title="Gaps" items={report.gaps} tone="text-red-600" />
                      <ReportList title="Next steps" items={report.next_steps} tone="text-ink" />
                    </div>
                    <p className="text-xs text-slate-400">Checked {new Date(result.checked_at).toLocaleString()}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Not checked yet. Click Autocheck to score this paper and write the report.</p>
                )}
              </section>

              <section className="rounded-lg border border-slate-200 p-5">
                <h2 className="mb-3 text-base font-bold text-ink">By chapter</h2>
                <ul className="grid gap-2 text-sm md:grid-cols-2">
                  {result.chapters.map((c) => (
                    <li key={c.chapter} className="flex justify-between rounded bg-card px-3 py-2">
                      <span className="text-ink">{c.chapter}</span>
                      <span className="text-slate-600">
                        {c.correct}/{c.correct + c.wrong + c.unanswered} correct
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-base font-bold text-ink">Answers</h2>
                <ol className="flex flex-col gap-3">
                  {result.questions.map((q, i) => (
                    <li key={q.question_id} className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-ink">
                          Q{i + 1}. {q.stem}
                        </p>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                            q.is_correct
                              ? 'bg-primary/15 text-primary'
                              : q.selected_option
                                ? 'bg-red-50 text-red-600'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {q.is_correct ? `+${q.marks}` : q.selected_option ? 'Wrong' : 'Unanswered'}
                        </span>
                      </div>
                      <ul className="grid gap-1 text-sm md:grid-cols-2">
                        {Object.entries(q.options).map(([key, text]) => (
                          <li
                            key={key}
                            className={`rounded px-2 py-1 ${
                              key === q.correct_option
                                ? 'bg-primary/10 font-medium text-ink'
                                : key === q.selected_option
                                  ? 'bg-red-50 text-red-700'
                                  : 'text-slate-600'
                            }`}
                          >
                            {key}. {text}
                            {key === q.correct_option ? ' ✓' : ''}
                            {key === q.selected_option && key !== q.correct_option ? ' (chosen)' : ''}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-slate-400">{q.chapter}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
