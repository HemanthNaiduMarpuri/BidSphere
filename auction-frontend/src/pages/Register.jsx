import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react';
import { notify } from '../services/notify';

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', is_auctioner: false
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false);

  const handle = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.register(form)
      await login(form.email, form.password)
      notify.loginSuccess()
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      notify.error(typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Create account</h1>
          <p style={{ color: 'var(--text2)', fontSize: '14px' }}>Join BidSphere today</p>
        </div>

        <div className="card">
          <form onSubmit={submit}>
            <div className="grid-2">
              <div className="input-group">
                <label>First name</label>
                <input name="first_name" value={form.first_name} onChange={handle} placeholder="Rahul" required />
              </div>
              <div className="input-group">
                <label>Last name</label>
                <input name="last_name" value={form.last_name} onChange={handle} placeholder="Sharma" required />
              </div>
            </div>
            <div className="input-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required />
            </div>
            <div className="input-group" style={{ position: 'relative' }}>
              <label>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  name='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handle}
                  required
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem', cursor: 'pointer'
            }} onClick={() => setForm(f => ({ ...f, is_auctioner: !f.is_auctioner }))}>
              <input
                type="checkbox" name="is_auctioner"
                checked={form.is_auctioner} onChange={handle}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Register as Auctioneer</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Create and manage live auction rooms</div>
              </div>
            </div>

            <button type="submit" className="btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text2)', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
