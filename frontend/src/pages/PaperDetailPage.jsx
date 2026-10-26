import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'

export default function PaperDetailPage() {
  const { paperId } = useParams()
  const [paper, setPaper] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/papers/${paperId}`)
      .then((res) => setPaper(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load paper'))
  }, [paperId])

  if (!paper && !error) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link to="/papers" className="text-accent hover:underline">
          ← Question Papers
        </Link>
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {paper ? (
        <>
          <h1 className="mb-1 text-2xl font-bold text-ink">{paper.name}</h1>
          <p className="mb-6 text-sm text-slate-600">
            {paper.total_marks} marks · status: {paper.status} · {paper.questions.length} questions
          </p>
          <ul className="space-y-3">
            {paper.questions.map((q, i) => (
              <li key={q.id} className="rounded-lg border border-slate-200 bg-card p-4 text-sm">
                <p className="font-medium text-ink">
                  {i + 1}. {q.stem}
                </p>
                <ul className="mt-2 grid gap-1 text-slate-600 sm:grid-cols-2">
                  {Object.entries(q.options || {}).map(([k, v]) => (
                    <li key={k}>
                      <span className={k === q.correct_option ? 'font-semibold text-primary' : ''}>
                        {k}. {v}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
