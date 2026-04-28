import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auctionAPI } from '../services/api'
import Navbar from '../components/Navbar'
import { notify } from '../services/notify'

export default function AuctionAccess() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [auction, setAuction] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    auctionAPI.detail(id).then(res => {
      const data = res.data
      setAuction(data)
      if (!data.is_private) {
        navigate(`/auction/${id}/live`, { replace: true })
      }
    }).catch(() => navigate('/home'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const verify = async e => {
    e.preventDefault()
    setVerifying(true)
    try {
      await auctionAPI.verifyAccess(id, code)
      sessionStorage.setItem(`auction_access_${id}`, 'granted')
      notify.success('Redirecting to Live Room')
      navigate(`/auction/${id}/live`)
    } catch {
      notify.error('Invalid access code. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text2)' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Private Auction</h2>
            {auction && (
              <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
                <strong style={{ color: 'var(--text)' }}>{auction.auction_title}</strong>
                <br />Enter the access code to join this room
              </p>
            )}
          </div>

          <div className="card">
            <form onSubmit={verify}>
              <div className="input-group">
                <label>Access code</label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IPL2025"
                  style={{ letterSpacing: '0.15em', fontWeight: 500, textAlign: 'center', fontSize: '18px' }}
                  required
                />
              </div>
              <button type="submit" className="btn-gold btn-full btn-lg" disabled={verifying || !code}>
                {verifying ? 'Verifying...' : 'Enter Auction Room'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text3)', fontSize: '13px' }}>
            Contact the auctioneer for the access code
          </p>
        </div>
      </div>
    </div>
  )
}
