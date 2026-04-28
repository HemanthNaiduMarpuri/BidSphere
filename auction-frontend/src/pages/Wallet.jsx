import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { paymentAPI } from '../services/api'
import Navbar from '../components/Navbar'
import { notify } from '../services/notify'

export default function Wallet() {
  const { user, refreshUser } = useAuth()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const quickAmounts = [500, 1000, 5000, 10000, 50000]

  const topup = async e => {
    e.preventDefault()
    if (!amount || parseInt(amount) <= 0) return
    setLoading(true); 
    try {
      const res = await paymentAPI.topup(amount)
      if (res.data.session_url) {
        window.location.href = res.data.session_url
      } else {
        notify.amountTopup()
        setAmount('')
        await refreshUser()
      }
    } catch (err) {
      notify.error(err.response?.data?.error || 'Top-up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container-sm" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '0.5rem' }} className="fade-in">Wallet</h1>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem' }} className="fade-in">Manage your bidding balance</p>

        <div className="card fade-in" style={{
          background: 'linear-gradient(135deg, rgba(124,106,247,0.15) 0%, rgba(240,180,41,0.1) 100%)',
          border: '1px solid rgba(240,180,41,0.2)',
          marginBottom: '1.5rem',
          textAlign: 'center',
          padding: '2.5rem'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Available balance
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '44px', color: 'var(--gold)' }}>
            ₹{parseFloat(user?.wallet_balance || 0).toLocaleString()}
          </div>
        </div>

        <div className="card fade-in">
          <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '1.25rem' }}>Add funds</h3>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {quickAmounts.map(a => (
              <button
                key={a}
                className="btn-outline btn-sm"
                onClick={() => setAmount(String(a))}
                style={{ borderColor: amount === String(a) ? 'var(--accent)' : undefined, color: amount === String(a) ? 'var(--accent)' : undefined }}
              >
                ₹{a.toLocaleString()}
              </button>
            ))}
          </div>

          <form onSubmit={topup}>
            <div className="input-group">
              <label>Custom amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
              />
            </div>
            <button type="submit" className="btn-gold btn-full btn-lg" disabled={loading || !amount}>
              {loading ? 'Processing...' : `Add ₹${amount ? parseInt(amount).toLocaleString() : '0'}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
