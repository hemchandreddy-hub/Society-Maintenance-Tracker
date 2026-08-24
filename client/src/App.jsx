import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ResidentDashboard from './pages/ResidentDashboard'
import ComplaintForm from './pages/ComplaintForm'
import ComplaintDetail from './pages/ComplaintDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminComplaints from './pages/AdminComplaints'
import AdminComplaintDetail from './pages/AdminComplaintDetail'
import NoticeBoard from './pages/NoticeBoard'

function HomePage() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'admin' ? <AdminDashboard /> : <ResidentDashboard />
}

function ComplaintPage() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'admin' ? <AdminComplaintDetail /> : <ComplaintDetail />
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/complaints/:id" element={<ProtectedRoute><ComplaintPage /></ProtectedRoute>} />
        <Route path="/complaints" element={<ProtectedRoute role="admin"><AdminComplaints /></ProtectedRoute>} />
        <Route path="/new-complaint" element={<ProtectedRoute role="resident"><ComplaintForm /></ProtectedRoute>} />
        <Route path="/notices" element={<ProtectedRoute><NoticeBoard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
