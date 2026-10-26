import { useEffect, useState } from 'react'
import { fetchDashboardCounts } from '../api/client'

const cards = [
  { key: 'students', label: 'Students', hint: 'Unique emails' },
  { key: 'student_groups', label: 'Student groups', hint: 'Groups you created' },
  { key: 'question_papers', label: 'Question papers', hint: 'Papers from PDFs' },
  { key: 'exams', label: 'Exams', hint: 'Scheduled or active' },
]

export default function DashboardPage() {
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchDashboardCounts()
      .then((data) => {
        if (!cancelled) setCounts(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail || 'Could not load counts')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">
        Dashboard
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        Overview of your TeachSkills workspace.
      </p>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="rounded-lg border border-slate-200 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {counts ? counts[card.key] : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Use the sidebar to manage Student Groups, Question Papers, and Exams.
      </p>
    </div>
  )
}
