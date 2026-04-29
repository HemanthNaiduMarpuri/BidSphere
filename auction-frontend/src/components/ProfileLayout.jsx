import { NavLink } from "react-router-dom"
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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)'
    }}>

      {/* Sidebar */}
      <div style={{
        width: 260,
        padding: '1.5rem 1rem',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
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
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '2rem 3rem'
      }}>
        {children}
      </div>

    </div>
  )
}