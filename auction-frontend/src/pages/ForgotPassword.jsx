import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { notify } from '../services/notify'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await axios.post('http://localhost:8000/api/auth/password/reset/', { email })
      setSent(true)
      notify.success('Reset link sent to email')
    } catch (err) {
      notify.error(err.response?.data?.detail || 'Failed to send reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Forgot your password?</h2>
        <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

        {sent ? (
          <div className="auth-success">
            Check your inbox — a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link to="/login" className="auth-back">← Back to login</Link>
      </div>
    </div>
  )
}