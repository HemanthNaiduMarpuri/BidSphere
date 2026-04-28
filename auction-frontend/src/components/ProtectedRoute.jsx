import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, auctioneersOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text2)', fontFamily: 'var(--font-display)', fontSize: '20px' }}>Loading...</div>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (auctioneersOnly && !user.is_auctioner) return <Navigate to="/home" replace />

  return children
}
