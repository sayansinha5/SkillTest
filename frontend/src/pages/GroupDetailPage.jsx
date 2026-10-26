import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'

export default function GroupDetailPage() {
  const { groupId } = useParams()
  const [group, setGroup] = useState(null)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setError('')
    try {
      const { data } = await api.get(`/groups/${groupId}`)
      setGroup(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load group')
    }
  }

  useEffect(() => {
    load()
  }, [groupId])

  async function addStudent(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/groups/${groupId}/students`, form)
      setForm({ first_name: '', last_name: '', email: '' })
      setShowModal(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add student')
    } finally {
      setSaving(false)
    }
  }

  if (!group && !error) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link to="/groups" className="text-accent hover:underline">
          ← Student Groups
        </Link>
      </p>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{group?.name || 'Group'}</h1>
          <p className="text-sm text-slate-600">Students in this group</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Add Student
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {group && group.students.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-card p-8 text-center">
          <p className="mb-4 text-sm text-slate-600">No students in this group yet.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Add Student
          </button>
        </div>
      ) : null}

      {group && group.students.length > 0 ? (
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-left text-sm">
          <thead className="bg-card text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {group.students.map((s) => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="px-4 py-2 font-medium text-ink">
                  {s.first_name} {s.last_name}
                </td>
                <td className="px-4 py-2 text-slate-600">{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={addStudent} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold text-ink">Add Student</h2>
            <div className="mb-3 flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium">First name</span>
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-accent"
                  required
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                <span className="font-medium">Last name</span>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-accent"
                  required
                />
              </label>
            </div>
            <label className="mb-4 flex flex-col gap-1 text-sm">
              <span className="font-medium">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-accent"
                required
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
