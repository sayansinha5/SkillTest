import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const STATUS_STYLES = {
  inactive: 'bg-slate-100 text-slate-600',
  active: 'bg-primary/15 text-primary',
  ended: 'bg-accent/10 text-accent',
  completed: 'bg-amber-100 text-amber-700',
  published: 'bg-primary text-white',
}

function toSeconds(value, unit) {
  const n = Number(value)
  return unit === 'minutes' ? Math.round(n * 60) : Math.round(n)
}

export function StatusBadge({ status }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLES[status] || ''}`}>
      {status}
    </span>
  )
}

export default function ExamsPage() {
  const [exams, setExams] = useState([])
  const [groups, setGroups] = useState([])
  const [papers, setPapers] = useState([])
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    group_id: '',
    paper_id: '',
    duration: 30,
    durationUnit: 'minutes',
    late: '',
    lateUnit: 'minutes',
  })

  async function load() {
    const [e, g, p] = await Promise.all([api.get('/exams'), api.get('/groups'), api.get('/papers')])
    setExams(e.data)
    setGroups(g.data)
    setPapers(p.data.filter((paper) => paper.status === 'ready'))
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.detail || 'Could not load exams'))
  }, [])

  async function createExam(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/exams', {
        name: form.name,
        group_id: Number(form.group_id),
        paper_id: Number(form.paper_id),
        duration_seconds: toSeconds(form.duration, form.durationUnit),
        late_duration_seconds: form.late === '' ? null : toSeconds(form.late, form.lateUnit),
      })
      setShowModal(false)
      setForm({ ...form, name: '', late: '' })
      await load()
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not create exam')
    } finally {
      setSaving(false)
    }
  }

  const unitSelect = (key) => (
    <select
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      className="rounded border border-slate-300 px-2 py-2 text-sm"
    >
      <option value="minutes">minutes</option>
      <option value="seconds">seconds</option>
    </select>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Exams</h1>
          <p className="text-sm text-slate-600">Combine a student group and a question paper into a timed exam.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('')
            setShowModal(true)
          }}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          New Exam
        </button>
      </div>

      {error && !showModal ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {exams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-card p-8 text-center text-sm text-slate-600">
          No exams yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {exams.map((exam) => (
            <li key={exam.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link to={`/exams/${exam.id}`} className="font-medium text-accent hover:underline">
                  {exam.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {exam.group_name} · {exam.paper_name} · {Math.round(exam.duration_seconds / 60)} min
                </p>
              </div>
              <StatusBadge status={exam.status} />
            </li>
          ))}
        </ul>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createExam} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold text-ink">New Exam</h2>
            {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
            <div className="flex flex-col gap-3 text-sm">
              <label>
                <span className="mb-1 block font-medium">Exam name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label>
                <span className="mb-1 block font-medium">Student group</span>
                <select
                  value={form.group_id}
                  onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.student_count} students)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-medium">Question paper</span>
                <select
                  value={form.paper_id}
                  onChange={(e) => setForm({ ...form, paper_id: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  required
                >
                  <option value="">Select a paper</option>
                  {papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.total_marks} marks)
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1 block font-medium">Duration</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    required
                  />
                  {unitSelect('durationUnit')}
                </div>
              </div>
              <div>
                <span className="mb-1 block font-medium">Late login window (optional)</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={form.late}
                    placeholder="No limit"
                    onChange={(e) => setForm({ ...form, late: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                  {unitSelect('lateUnit')}
                </div>
                <p className="mt-1 text-xs text-slate-500">Students can't log in this long after the exam starts.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
