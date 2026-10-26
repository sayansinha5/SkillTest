import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function GroupsPage() {
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setError('')
    try {
      const { data } = await api.get('/groups')
      setGroups(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createGroup(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/groups', { name })
      setName('')
      setShowModal(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create group')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Student Groups</h1>
          <p className="text-sm text-slate-600">Create groups and add students for exams.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          New Group
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-card p-8 text-center">
          <p className="mb-4 text-sm text-slate-600">No student groups yet.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            New Group
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center justify-between px-4 py-3 hover:bg-card">
              <div>
                <Link to={`/groups/${g.id}`} className="font-medium text-accent hover:underline">
                  {g.name}
                </Link>
                <p className="text-xs text-slate-500">{g.student_count} student(s)</p>
              </div>
              <Link to={`/groups/${g.id}`} className="text-sm text-accent">
                Open →
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={createGroup}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="mb-4 text-lg font-bold text-ink">New Group</h2>
            <label className="mb-4 flex flex-col gap-1 text-sm">
              <span className="font-medium">Group name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-accent"
                required
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-2">
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
