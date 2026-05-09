import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { notify } from '../services/notify'

export default function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ new_password1: '', new_password2: '' })
  const [loading, setLoading] = useState(false)
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const passwordsMatch = form.new_password1 && form.new_password1 === form.new_password2

  const submit = async (e) => {
    e.preventDefault()
    if (!passwordsMatch) return notify.error('Passwords do not match')
    try {
      setLoading(true)
      await axios.post('http://localhost:8000/api/auth/password/reset/confirm/', {
        uid, token,
        new_password1: form.new_password1,
        new_password2: form.new_password2,
      })
      notify.success('Password reset successful')
      navigate('/login')
    } catch (err) {
      notify.error(err.response?.data?.detail || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset your password</h2>
        <p className="auth-sub">Choose a new password for your account.</p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="pw1">New password</label>
            <div className="pw-wrap">
              <input
                id="pw1"
                type={show1 ? 'text' : 'password'}
                name="new_password1"
                placeholder="At least 8 characters"
                value={form.new_password1}
                onChange={handle}
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShow1(!show1)}>
                {show1 ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="pw2">Confirm password</label>
            <div className="pw-wrap">
              <input
                id="pw2"
                type={show2 ? 'text' : 'password'}
                name="new_password2"
                placeholder="Repeat password"
                value={form.new_password2}
                onChange={handle}
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShow2(!show2)}>
                {show2 ? '🙈' : '👁'}
              </button>
            </div>
            {form.new_password2 && (
              <p className={passwordsMatch ? 'hint-success' : 'hint-error'}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !passwordsMatch}>
            {loading ? 'Updating...' : 'Reset password'}
          </button>
        </form>
      </div>
    </div>
  )
}