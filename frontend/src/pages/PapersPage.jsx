import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const STEPS = ['details', 'pdf', 'chapters', 'weights', 'done']

export default function PapersPage() {
  const [papers, setPapers] = useState([])
  const [error, setError] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [totalMarks, setTotalMarks] = useState(50)
  const [paperId, setPaperId] = useState(null)
  const [file, setFile] = useState(null)
  const [chapters, setChapters] = useState([])
  const [selected, setSelected] = useState([])
  const [weights, setWeights] = useState({})
  const [questionCount, setQuestionCount] = useState(5)
  const [busy, setBusy] = useState(false)
  const [generated, setGenerated] = useState(null)

  async function load() {
    const { data } = await api.get('/papers')
    setPapers(data)
  }

  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.detail || 'Could not load papers'))
  }, [])

  function resetWizard() {
    setStep('details')
    setName('')
    setTotalMarks(50)
    setPaperId(null)
    setFile(null)
    setChapters([])
    setSelected([])
    setWeights({})
    setQuestionCount(5)
    setGenerated(null)
    setError('')
  }

  async function createDetails(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/papers', { name, total_marks: Number(totalMarks) })
      setPaperId(data.id)
      setStep('pdf')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create paper')
    } finally {
      setBusy(false)
    }
  }

  async function uploadPdf(e) {
    e.preventDefault()
    if (!file || !paperId) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post(`/papers/${paperId}/extract-chapters`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setChapters(data.chapters)
      const defaults = data.chapters.slice(0, 3).map((c) => c.key)
      setSelected(defaults.length ? defaults : data.chapters.slice(0, 1).map((c) => c.key))
      setStep('chapters')
    } catch (err) {
      setError(err.response?.data?.detail || 'PDF extract failed')
    } finally {
      setBusy(false)
    }
  }

  function continueToWeights() {
    if (selected.length === 0) {
      setError('Select at least one chapter')
      return
    }
    const equal = Math.round((100 / selected.length) * 100) / 100
    const next = {}
    selected.forEach((k, i) => {
      next[k] = i === selected.length - 1 ? 100 - equal * (selected.length - 1) : equal
    })
    setWeights(next)
    setError('')
    setStep('weights')
  }

  const weightTotal = useMemo(
    () => selected.reduce((sum, k) => sum + Number(weights[k] || 0), 0),
    [selected, weights],
  )

  async function generate(e) {
    e.preventDefault()
    if (Math.abs(weightTotal - 100) > 0.5) {
      setError('Weights must total 100%')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/papers/${paperId}/generate`, {
        chapter_keys: selected,
        weights,
        question_count: Number(questionCount),
      })
      setGenerated(data)
      setStep('done')
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  function toggleChapter(key) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Question Papers</h1>
          <p className="text-sm text-slate-600">Create MCQ papers from a book PDF.</p>
        </div>
        <button
          type="button"
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            resetWizard()
            setWizardOpen(true)
          }}
        >
          New Question Paper
        </button>
      </div>

      {error && !wizardOpen ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {papers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-card p-8 text-center text-sm text-slate-600">
          No question papers yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {papers.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-ink">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.total_marks} marks · {p.status}
                </p>
              </div>
              <Link to={`/papers/${p.id}`} className="text-sm text-accent">
                Open →
              </Link>
            </li>
          ))}
        </ul>
      )}

      {wizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">New Question Paper</h2>
              <button type="button" className="text-sm text-slate-500" onClick={() => setWizardOpen(false)}>
                Close
              </button>
            </div>
            <p className="mb-4 text-xs uppercase tracking-wide text-slate-500">
              Step: {step} ({STEPS.indexOf(step) + 1}/{STEPS.length})
            </p>
            {error ? <p className="mb-3 text-sm text-red-600">{String(error)}</p> : null}

            {step === 'details' ? (
              <form onSubmit={createDetails} className="flex flex-col gap-3">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Paper name</span>
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Total marks</span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {busy ? 'Saving…' : 'Continue'}
                </button>
              </form>
            ) : null}

            {step === 'pdf' ? (
              <form onSubmit={uploadPdf} className="flex flex-col gap-3">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Book PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !file}
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {busy ? 'Extracting chapters…' : 'Upload & extract chapters'}
                </button>
              </form>
            ) : null}

            {step === 'chapters' ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-600">Select chapters (default: first 3).</p>
                {chapters.map((c) => (
                  <label key={c.key} className="flex items-start gap-2 rounded border border-slate-200 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.key)}
                      onChange={() => toggleChapter(c.key)}
                    />
                    <span>
                      <span className="font-medium text-ink">{c.title}</span>
                      {c.summary ? <span className="mt-1 block text-xs text-slate-500">{c.summary}</span> : null}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={continueToWeights}
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Continue
                </button>
              </div>
            ) : null}

            {step === 'weights' ? (
              <form onSubmit={generate} className="flex flex-col gap-3">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Question count (default 5)</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                  />
                </label>
                {selected.map((key) => {
                  const ch = chapters.find((c) => c.key === key)
                  return (
                    <label key={key} className="text-sm">
                      <span className="mb-1 block font-medium">{ch?.title || key} weight %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        value={weights[key] ?? 0}
                        onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
                      />
                    </label>
                  )
                })}
                <p className={`text-xs ${Math.abs(weightTotal - 100) < 0.5 ? 'text-primary' : 'text-red-600'}`}>
                  Total weight: {weightTotal}%
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {busy ? 'Generating MCQs…' : 'Generate question paper'}
                </button>
              </form>
            ) : null}

            {step === 'done' && generated ? (
              <div className="space-y-3 text-sm">
                <p className="font-medium text-primary">Paper ready — {generated.questions.length} questions.</p>
                <ul className="max-h-96 space-y-2 overflow-y-auto">
                  {generated.questions.map((q, i) => (
                    <li key={q.id} className="rounded border border-slate-200 p-3">
                      <p className="font-medium text-ink">
                        {i + 1}. {q.stem}{' '}
                        <span className="text-xs font-normal text-slate-500">({q.marks} marks)</span>
                      </p>
                      <ul className="mt-2 space-y-1 text-slate-600">
                        {Object.entries(q.options || {}).map(([key, text]) => (
                          <li
                            key={key}
                            className={
                              key === q.correct_option
                                ? 'rounded bg-card px-2 py-1 font-semibold text-primary'
                                : 'px-2 py-1'
                            }
                          >
                            {key}. {text}
                            {key === q.correct_option ? ' ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => setWizardOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
