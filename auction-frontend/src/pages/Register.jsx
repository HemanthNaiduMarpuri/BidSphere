import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff } from 'lucide-react';
import { notify } from '../services/notify';
import axios from 'axios';

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', is_auctioner: false
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('register')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputsRef = useRef([])
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const { setUser } = useAuth()

  const handle = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)

    try {
      await authAPI.register(form)

      await axios.post('http://localhost:8000/api/users/request-otp/', {
        email: form.email,
        password: form.password
      })

      notify.success('OTP sent to your email')
      setStep('otp')

    } catch (err) {
      const data = err.response?.data
      notify.error(typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Registration failed'
      )
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    const otpValue = otp.join('')

    if (otpValue.length !== 6) {
      notify.error('Enter complete OTP')
      return
    }

    try {
      const res = await axios.post(
        'http://localhost:8000/api/users/verify-otp/',
        {
          email: form.email,
          otp: otpValue
        }
      )

      const { access, refresh } = res.data

      localStorage.setItem('access', access)
      localStorage.setItem('refresh', refresh)
      localStorage.setItem('otp_timer', Date.now())

      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`

      const userRes = await axios.get('http://localhost:8000/api/users/me/')
      setUser(userRes.data)

      notify.loginSuccess()
      navigate('/')

    } catch (err) {
      notify.error(err.response?.data?.error || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (!canResend) return

    try {
      await axios.post(
        'http://localhost:8000/api/users/request-otp/',
        {
          email: form.email,
          password: form.password
        }
      )

      notify.success('OTP resent')
      setTimer(30)
      setCanResend(false)

    } catch (err) {
      notify.error('Failed to resend OTP')
    }
  }

  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/, '')

    if (!value) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (index < 5) {
      inputsRef.current[index + 1].focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      } else if (index > 0) {
        inputsRef.current[index - 1].focus()
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()

    const pasteData = e.clipboardData.getData('text').slice(0, 6)

    if (!/^\d+$/.test(pasteData)) return

    const newOtp = pasteData.split('')
    setOtp(newOtp)

    newOtp.forEach((digit, index) => {
      if (inputsRef.current[index]) {
        inputsRef.current[index].value = digit
      }
    })

    inputsRef.current[Math.min(newOtp.length, 5)].focus()
  }

  useEffect(() => {
    let interval

    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1)
      }, 1000)
    } else if (timer === 0) {
      setCanResend(true)
    }

    return () => clearInterval(interval)
  }, [step, timer])


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
          {step === 'register' ? (
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
                  type="checkbox"
                  name="is_auctioner"
                  checked={form.is_auctioner}
                  onChange={handle}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>Register as Auctioneer</div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Create and manage live auction rooms</div>
                </div>
              </div>

              <button type="submit" className="btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Create account'}
              </button>
            </form>
          ) : (
            <div>
              <div className="input-group">
                <label>Enter OTP</label>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      ref={(el) => (inputsRef.current[index] = el)}
                      style={{
                        width: '45px',
                        height: '50px',
                        textAlign: 'center',
                        fontSize: '20px',
                        borderRadius: '8px',
                        border: '1px solid #ccc'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={verifyOtp}
                className="btn-primary btn-full btn-lg"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                {canResend ? (
                  <button
                    onClick={resendOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer'
                    }}
                  >
                    Resend OTP
                  </button>
                ) : (
                  <span style={{ color: 'var(--text2)', fontSize: '14px' }}>
                    Resend in {timer}s
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text2)', fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
