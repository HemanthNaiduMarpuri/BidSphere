import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import Navbar from '../components/Navbar'
import { notify } from '../services/notify'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' })
  const [password, setPassword] = useState({ old_password: '', new_password: '' })
  const [saving, setSaving] = useState(false)

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const saveProfile = async e => {
    e.preventDefault()
    setSaving(true); 
    try {
      await authAPI.updateProfile(form)
      await refreshUser()
      notify.success('Profile updated successfully')
    } catch {
      notify.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container-md" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '0.5rem' }} className="fade-in">Profile</h1>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem' }} className="fade-in">Manage your account details</p>

        <div className="card fade-in" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 600, color: '#fff',
            flexShrink: 0
          }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ color: 'var(--text2)', fontSize: '13px' }}>{user?.email}</div>
            <div style={{ marginTop: '6px' }}>
              <span className={`badge ${user?.is_auctioner ? 'badge-scheduled' : 'badge-public'}`}>
                {user?.is_auctioner ? 'Auctioneer' : 'Bidder'}
              </span>
            </div>
          </div>
        </div>

        <div className="card fade-in">
          <h3 style={{ fontSize: '16px', marginBottom: '1.25rem', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Edit profile</h3>
          <form onSubmit={saveProfile}>
            <div className="grid-2">
              <div className="input-group">
                <label>First name</label>
                <input name="first_name" value={form.first_name} onChange={handle} />
              </div>
              <div className="input-group">
                <label>Last name</label>
                <input name="last_name" value={form.last_name} onChange={handle} />
              </div>
            </div>
            <div className="input-group">
              <label>Email</label>
              <input value={user?.email} disabled style={{ opacity: 0.5 }} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
