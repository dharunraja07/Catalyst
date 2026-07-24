import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LandingPage from './pages/LandingPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AssessmentPage from './pages/AssessmentPage.jsx'
import RoadmapPage from './pages/RoadmapPage.jsx'
import QuestionsPage from './pages/QuestionsPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import CareerPage from './pages/CareerPage.jsx'
import StudyGroupPage from './pages/StudyGroupPage.jsx'
import TeacherDashboardPage from './pages/TeacherDashboardPage.jsx'
import AppLayout from './components/AppLayout.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/assessment" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />
            <Route path="/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
            <Route path="/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/career" element={<ProtectedRoute><CareerPage /></ProtectedRoute>} />
            <Route path="/study-group" element={<ProtectedRoute><StudyGroupPage /></ProtectedRoute>} />
            <Route path="/teacher" element={<ProtectedRoute><TeacherDashboardPage /></ProtectedRoute>} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
