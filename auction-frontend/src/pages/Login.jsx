import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react';
import { notify } from '../services/notify';
import { GoogleLogin } from '@react-oauth/google'
import axios from 'axios'


export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })
  const { setUser } = useAuth()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      notify.loginSuccess()
      navigate('/')
    } catch (err) {
      notify.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 52, height: 52, background: 'var(--accent)', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '22px', fontFamily: 'var(--font-display)', color: '#fff', fontWeight: 700
          }}>B</div>
          <h1 style={{ fontSize: '28px', marginBottom: '6px' }}>Welcome back</h1>
          <p style={{ color: 'var(--text2)', fontSize: '14px' }}>Sign in to BidSphere</p>
        </div>
        <div className="card">
          <form onSubmit={submit}>
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

            <button type="submit" className="btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
        
      <GoogleLogin
        onSuccess={async (result) => {
          try {
            const res = await axios.post(
              'http://localhost:8000/api/auth/google/',
              { credential: result.credential }
            )

            const { access, refresh } = res.data

            localStorage.setItem('access', access)
            localStorage.setItem('refresh', refresh)

            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`

            const userRes = await axios.get('http://localhost:8000/api/users/me/')

            setUser(userRes.data)

            notify.success('Logged in with Google')

            navigate('/')

          } catch (err) {
            notify.error('Google login failed')
          }
        }}
      />

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text2)', fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }}>Register</Link>
        </p>

      </div>
    </div>
  )
}

