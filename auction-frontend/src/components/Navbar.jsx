import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { notify } from '../services/notify'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    notify.logoutSuccess()
    navigate('/login')
  }

  return (
    <nav style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 2rem',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 700, color: '#fff',
          fontFamily: 'var(--font-display)'
        }}>B</div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>BidSphere</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user ? (
          <>
            {user.is_auctioner ? (
              <Link to="/dashboard">
                <button className="btn-outline btn-sm">Dashboard</button>
              </Link>
            ) : <Link to="/user-dashboard">
                <button className="btn-outline btn-sm">Dashboard</button>
              </Link> }
            <Link to="/wallet">
              <button className="btn-outline btn-sm" style={{ color: 'var(--gold)', borderColor: 'rgba(240,180,41,0.3)' }}>
                ₹{parseFloat(user.wallet_balance || 0).toLocaleString()}
              </button>
            </Link>
            <Link to="/profile">
              <div style={{
                width: 34, height: 34,
                background: 'var(--accent)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer'
              }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
            </Link>
            <button className="btn-outline btn-sm" onClick={() => navigate('/contact')}>Contact</button>
            <button className="btn-outline btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"><button className="btn-outline btn-sm">Login</button></Link>
            <Link to="/register"><button className="btn-primary btn-sm">Register</button></Link>
          </>
        )}
      </div>
    </nav>
  )
}
