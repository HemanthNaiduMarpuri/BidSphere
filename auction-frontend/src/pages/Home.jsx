import { useState, useEffect } from 'react'
import { auctionAPI } from '../services/api'
import AuctionCard from '../components/AuctionCard'
import Navbar from '../components/Navbar'
import { useLocation } from 'react-router-dom'
import { notify } from '../services/notify'

export default function Home() {
  const [auctions, setAuctions] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  const location = useLocation()

  useEffect(() => {
    if (location.state?.toast === 'login') {
      notify.loginSuccess()
    }
  }, [])

  useEffect(() => {
    auctionAPI.list().then(res => {
      setAuctions(res.data)
      setAuctions(
        Array.isArray(res.data)
          ? res.data
          : []
      )
      setFiltered(res.data)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = auctions
    if (search) result = result.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.sector.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter !== 'All') result = result.filter(a => a.status === statusFilter)
    if (typeFilter === 'Public') result = result.filter(a => !a.is_private)
    if (typeFilter === 'Private') result = result.filter(a => a.is_private)
    setFiltered(result)
  }, [search, statusFilter, typeFilter, auctions])

  const liveCount = auctions.filter(a => a.status === 'Live').length

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #0b0b11, #12121a)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      <div style={{
        position: 'absolute',
        top: '-200px',
        right: '-100px',
        width: '500px',
        height: '500px',
        background: 'rgba(240,180,41,0.08)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        zIndex: 0
      }} />

      <Navbar />

      <div
        className="container"
        style={{
          padding: '2rem',
          position: 'relative',
          zIndex: 1
        }}
      >

        <div
          className="fade-in"
          style={{
            padding: '3rem',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            marginBottom: '2.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >

          <div style={{
            position: 'absolute',
            right: '-60px',
            top: '-60px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'rgba(240,180,41,0.12)',
            filter: 'blur(40px)'
          }} />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem'
          }}>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(240,180,41,0.12)',
                color: '#f0b429',
                fontSize: 13,
                marginBottom: 18
              }}>
                <span className="dot-live" />
                Real-Time Bidding Platform
              </div>

              <h1 style={{
                fontSize: '52px',
                lineHeight: 1.1,
                marginBottom: 14,
                maxWidth: '700px'
              }}>
                Premium Live <span style={{ color: '#f0b429' }}>Auction</span> Experience
              </h1>

              <p style={{
                color: 'var(--text2)',
                fontSize: '16px',
                maxWidth: '650px',
                lineHeight: 1.7
              }}>
                Discover exclusive auctions, bid in real-time, and compete
                with collectors around the world in an immersive live marketplace.
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
              alignSelf: 'flex-start'
            }}>

              <div style={statCard}>
                <div style={statValue}>{liveCount}</div>
                <div style={statLabel}>Live Auctions</div>
              </div>

              <div style={statCard}>
                <div style={statValue}>{auctions.length}</div>
                <div style={statLabel}>Total Rooms</div>
              </div>

            </div>

          </div>
        </div>

        <div
          className="fade-in"
          style={{
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '2.5rem',
            padding: '1rem',
            borderRadius: '18px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)'
          }}
        >

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search auctions..."
            style={{
              maxWidth: '320px',
              background: '#181824',
              border: '1px solid #2c2c3d'
            }}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              width: 'auto',
              background: '#181824'
            }}
          >
            <option value="All">All status</option>
            <option value="Live">Live</option>
            <option value='Draft'>Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              width: 'auto',
              background: '#181824'
            }}
          >
            <option value="All">All types</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </select>

        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '28px', marginBottom: 4 }}>
              Explore Auctions
            </h2>

            <p style={{ color: 'var(--text2)' }}>
              Curated live and upcoming bidding rooms
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{
            color: 'var(--text2)',
            textAlign: 'center',
            padding: '5rem'
          }}>
            Loading auctions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '5rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{
              fontSize: '38px',
              marginBottom: 12
            }}>
              No auctions found
            </div>

            <p style={{ color: 'var(--text2)' }}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(a => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

const statCard = {
  minWidth: '140px',
  padding: '18px',
  borderRadius: '18px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)'
}

const statValue = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#f0b429',
  marginBottom: 4
}

const statLabel = {
  fontSize: '13px',
  color: 'var(--text2)'
}