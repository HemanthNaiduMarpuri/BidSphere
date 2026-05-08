import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
export default function ProfileLayout({ children }) {
  const linkStyle = (isActive) => ({
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    textDecoration: 'none',
    color: isActive ? '#000' : 'var(--text2)',
    background: isActive ? 'var(--gold)' : 'transparent',
    fontWeight: isActive ? 600 : 400,
    display: 'block',
    marginBottom: 6
  })
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)'
    }}>

      <div style={{
        width: 260,
        padding: '1.5rem 1rem',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: '1.2rem',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.03)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: '0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(240,180,41,0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
          }}
        >
          ← Back
        </button>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
          Account
        </div>

        <NavLink to="/profile" end style={({ isActive }) => linkStyle(isActive)}>
          Profile
        </NavLink>

        <NavLink to="/profile/transactions" style={({ isActive }) => linkStyle(isActive)}>
          Transactions
        </NavLink>

        <NavLink to="/profile/security" style={({ isActive }) => linkStyle(isActive)}>
          Security
        </NavLink>
        {user?.is_superuser && (
          <NavLink to="/profile/admin-contact" style={({ isActive }) => linkStyle(isActive)}>
            Admin Contact
          </NavLink>)}
      </div>

      <div style={{
        flex: 1,
        padding: '2rem 3rem'
      }}>
        {children}
      </div>

    </div>
  )
}