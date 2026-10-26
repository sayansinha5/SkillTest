import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { fetchMe, getToken } from './api/client'
import AppLayout from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ExamDetailPage from './pages/ExamDetailPage'
import ExamPortalPage from './pages/ExamPortalPage'
import ExamsPage from './pages/ExamsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import GroupsPage from './pages/GroupsPage'
import LoginPage from './pages/LoginPage'
import PaperDetailPage from './pages/PaperDetailPage'
import PapersPage from './pages/PapersPage'
import StudentResultPage from './pages/StudentResultPage'

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
        <Route path="papers" element={<PapersPage />} />
        <Route path="papers/:paperId" element={<PaperDetailPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="exams/:examId" element={<ExamDetailPage />} />
        <Route path="exams/:examId/results/:admitCardId" element={<StudentResultPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/exam/:token" element={<ExamPortalPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
