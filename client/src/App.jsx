import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LandingPage from './pages/LandingPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AssessmentPage from './pages/AssessmentPage.jsx'
import RoadmapPage from './pages/RoadmapPage.jsx'
import QuestionsPage from './pages/QuestionsPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import CareerPage from './pages/CareerPage.jsx'
import StudyGroupPage from './pages/StudyGroupPage.jsx'
import TeacherDashboardPage from './pages/TeacherDashboardPage.jsx'
import ClassroomPage from './pages/ClassroomPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import NavBar from './components/NavBar.jsx'
import GlobalAIChat from './components/GlobalAIChat.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#f4f6fc] text-ink-900">
          <NavBar />
          <main className="pb-24 lg:pb-10">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/assessment" element={<ProtectedRoute><AssessmentPage /></ProtectedRoute>} />
              <Route path="/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
              <Route path="/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
              <Route path="/career" element={<ProtectedRoute><CareerPage /></ProtectedRoute>} />
              <Route path="/study-group" element={<ProtectedRoute><StudyGroupPage /></ProtectedRoute>} />
              <Route path="/teacher" element={<ProtectedRoute><TeacherDashboardPage /></ProtectedRoute>} />
              <Route path="/classroom" element={<ProtectedRoute><ClassroomPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <GlobalAIChat />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
