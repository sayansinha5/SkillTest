import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { fetchMe, getToken } from './api/client'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import GroupDetailPage from './pages/GroupDetailPage'
import GroupsPage from './pages/GroupsPage'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'

function ProtectedRoutes() {
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    fetchMe()
      .then(setTeacher)
      .catch(() => setTeacher(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading…
      </div>
    )
  }

  if (!teacher) {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      <Route element={<AppLayout teacher={teacher} />}>
        <Route index element={<DashboardPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:groupId" element={<GroupDetailPage />} />
        <Route path="papers" element={<PlaceholderPage title="Question Papers" />} />
        <Route path="exams" element={<PlaceholderPage title="Exams" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
