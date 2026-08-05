import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PlansPage from './pages/PlansPage'
import ProfilePage from './pages/ProfilePage'
import HistoryPage from './pages/HistoryPage'
import AdminPage from './pages/AdminPage'
import NotificationsPage from './pages/NotificationsPage'
import LegalPage from './pages/LegalPage'

function ReferralRedirect() {
  const { code = '' } = useParams()
  return <Navigate to={`/login?ref=${encodeURIComponent(code)}`} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/r/:code" element={<ReferralRedirect />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
