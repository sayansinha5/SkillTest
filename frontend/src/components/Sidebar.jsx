import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  `block rounded px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-primary text-white' : 'text-ink hover:bg-card'
  }`

export default function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <div className="mb-8">
        <p className="text-lg font-bold tracking-tight text-ink">
          Teach<span className="text-primary">Skills</span>
        </p>
        <p className="text-xs text-slate-500">Teacher portal</p>
      </div>
      <nav className="flex flex-col gap-1">
        <NavLink to="/" end className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/groups" className={linkClass}>
          Student Groups
        </NavLink>
        <NavLink to="/papers" className={linkClass}>
          Question Papers
        </NavLink>
        <NavLink to="/exams" className={linkClass}>
          Exams
        </NavLink>
      </nav>
    </aside>
  )
}
