import { useState, useEffect, useRef } from 'react'
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
  const [step, setStep] = useState('login')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputsRef = useRef([])
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.post('http://localhost:8000/api/users/request-otp/', form)

      notify.success('OTP sent to your email')
      setStep('otp')

    } catch (err) {
      notify.error(err.response?.data?.error || 'Invalid credentials')
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
      setLoading(true)

      await axios.post(
        'http://localhost:8000/api/users/request-otp/',
        form
      )

      notify.success('OTP resent')

      setTimer(30)
      setCanResend(false)

    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to resend OTP')
    } finally {
      setLoading(false)
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
          {step === 'login' ? (
            <form onSubmit={submit}>
              <div className="input-group">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handle}
                  placeholder="you@example.com"
                  required
                />
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
                {loading ? 'Sending OTP...' : 'Send OTP'}
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
          <Link to="/forgot-password" style={{ color: 'var(--accent)' }}>Forgot Password</Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text2)', fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }}>Register</Link>
        </p>

      </div>
    </div>
  )
}

