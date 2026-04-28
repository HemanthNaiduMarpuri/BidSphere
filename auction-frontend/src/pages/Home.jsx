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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ padding: '2rem' }}>

        <div style={{ marginBottom: '2.5rem' }} className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '36px' }}>Live Auctions</h1>
            {liveCount > 0 && (
              <span className="badge badge-live">
                <span className="dot-live" />
                {liveCount} live now
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text2)' }}>Discover and join auctions across all sectors</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap' }} className="fade-in">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search auctions..."
            style={{ maxWidth: '300px' }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="All">All status</option>
            <option value="Live">Live</option>
            <option value='Draft'>Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="All">All types</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </select>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text2)', textAlign: 'center', padding: '4rem' }}>
            Loading auctions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text2)', textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>No auctions found</div>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(a => <AuctionCard key={a.id} auction={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}
