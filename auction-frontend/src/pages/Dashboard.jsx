import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auctionAPI } from '../services/api'
import Navbar from '../components/Navbar'
import { notify } from '../services/notify'

export default function Dashboard() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeLeftMap, setTimeLeftMap] = useState({})
  const navigate = useNavigate()

  const canStartAuction = (startTime) => {
    if (!startTime) return false

    const now = new Date()
    const start = new Date(startTime)

    return now >= start
  }

  const getTimeLeft = (startTime) => {
    const diff = new Date(startTime) - new Date()
    if (diff <= 0) return null

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    return `${minutes}m ${seconds}s`
  }

  useEffect(() => {
    auctionAPI.list().then(res => setAuctions(res.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeftMap(prev => {
        const updated = {}

        auctions.forEach(a => {
          if (a.start_time) {
            const diff = Math.floor(
              (new Date(a.start_time) - new Date()) / 1000
            )
            updated[a.id] = diff > 0 ? diff : 0
          }
        })

        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [auctions])

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const statusColor = { live: 'badge-live', scheduled: 'badge-scheduled', closed: 'badge-closed', draft: 'badge-closed' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ padding: '2rem' }}>
        <button
  onClick={() => navigate('/')}
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
    e.currentTarget.style.background = 'rgba(20, 114, 237, 0.12)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
  }}
>
  ← Back
</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }} className="fade-in">
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>Dashboard</h1>
            <p style={{ color: 'var(--text2)' }}>Manage your auction rooms</p>
          </div>
          <Link to="/dashboard/create">
            <button className="btn-primary btn-lg">+ New auction</button>
          </Link>
        </div>

        <div className="grid-4" style={{ marginBottom: '2rem' }} >
          {[
            { label: 'Total auctions', value: auctions.length },
            { label: 'Live now', value: auctions.filter(a => a.status === 'Live').length },
            { label: 'Scheduled', value: auctions.filter(a => a.status === 'Scheduled').length },
            { label: 'Closed', value: auctions.filter(a => a.status === 'Closed').length },
          ].map(s => (
            <div className="stat-card fade-in" key={s.label}>
              <div className="label">{s.label}</div>
              <div className="value">{s.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text2)' }}>Loading...</p>
        ) : auctions.length === 0 ? (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '24px', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>No auctions yet</div>
            <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>Create your first auction to get started</p>
            <Link to="/dashboard/create">
              <button className="btn-primary">Create auction</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auctions.map(a => (
              <div key={a.id} className="card fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 500 }}>{a.auction_title}</span>
                      <span className={`badge ${statusColor[a.status] || 'badge-closed'}`}>
                        {a.status === 'Live' && <span className="dot-live" />}
                        {a.status}
                      </span>
                      <span className={`badge ${a.is_private ? 'badge-private' : 'badge-public'}`}>
                        {a.is_private ? 'Private' : 'Public'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
                      {a.sector} · Base ₹{parseFloat(a.reserve_price).toLocaleString()} · {new Date(a.start_time).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {a.status !== 'Draft' ?
                  <Link to={`/dashboard/room/${a.id}`}>
                    <button className="btn-outline btn-sm">Manage</button>
                  </Link>
                  : '' }
                  {a.status === 'Scheduled' && (
                    <button
                      className="btn-primary btn-sm"
                      disabled={timeLeftMap[a.id] > 0}
                      onClick={async () => {
                        if (timeLeftMap[a.id] > 0) {
                          notify.warn('Too early to start')
                          return
                        }

                        await auctionAPI.start(a.id)

                        setAuctions(prev =>
                          prev.map(x =>
                            x.id === a.id ? { ...x, status: 'Live' } : x
                          )
                        )

                        notify.success('Auction started')
                      }}
                    >
                      {timeLeftMap[a.id] > 0
                        ? `Starts in ${formatTime(timeLeftMap[a.id])}`
                        : 'Start'}
                    </button>
                  )}
                  {a.status === 'Draft' && (
                    <button className="btn-primary btn-sm" onClick={async () => {
                      await auctionAPI.schedule(a.id)
                      setAuctions(prev => prev.map(x => x.id === a.id ? { ...x, status: 'Scheduled' } : x))
                    }}>Schedule</button>
                  )}
                  {a.status === 'Live' && (
                    <button className="btn-danger btn-sm" onClick={async () => {
                      await auctionAPI.close(a.id)
                      setAuctions(prev => prev.map(x => x.id === a.id ? { ...x, status: 'Closed' } : x))
                    }}>Close</button>
                  )}
                  {a.status !== 'Live' && (
                    <button className="btn-danger btn-sm" onClick={async () => {
                      await auctionAPI.delete(a.id)
                      setAuctions(prev => prev.filter(item => item.id !== a.id));
                    }}>Delete</button>
                  )}
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
