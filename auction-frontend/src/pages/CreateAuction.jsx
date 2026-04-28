import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auctionAPI } from '../services/api'
import Navbar from '../components/Navbar'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { notify } from '../services/notify';

const SECTORS = ['Cricket', 'Football', 'Real Estate', 'Art', 'Jewelry', 'Automobiles', 'Technology', 'Other']

export default function CreateAuction() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    sector: '',
    base_wallet: '',
    start_time: null,
    end_time: null,
    is_private: false,
    access_code: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const submit = async e => {
    e.preventDefault()

    if (form.is_private && !form.access_code) {
      notify.error('Access code is required for private auctions')
      return
    }

    if (!form.start_time || !form.end_time) {
      notify.error('Start and End time are required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        start_time: form.start_time.toISOString(),
        end_time: form.end_time.toISOString()
      }

      if (!payload.is_private) delete payload.access_code

      const res = await auctionAPI.create(payload)
      notify.roomCreated()
      navigate(`/dashboard/room/${res.data.id}`)
    } catch (err) {
      const data = err.response?.data
      notify.error(typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container-md" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }} className="fade-in">
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Create auction</h1>
          <p style={{ color: 'var(--text2)' }}>Set up your auction room details</p>
        </div>

        <div className="card fade-in">
          <form onSubmit={submit}>

            <div className="input-group">
              <label>Auction title</label>
              <input name="title" value={form.title} onChange={handle} placeholder="IPL 2025 Player Auction" required />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Sector</label>
                <select name="sector" value={form.sector} onChange={handle} required>
                  <option value="">Select sector</option>
                  {SECTORS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Reserve / base price (₹)</label>
                <input name="reserve_price" type="number" value={form.reserve_price} onChange={handle} placeholder="100000" required />
              </div>
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>Start time</label>
                <DatePicker
                  selected={form.start_time}
                  onChange={(date) => setForm({ ...form, start_time: date })}
                  showTimeSelect
                  timeFormat="hh:mm aa"  
                  timeIntervals={5}
                  dateFormat="MMMM d, yyyy hh:mm aa"
                  placeholderText="Select start time"
                  className="custom-input"
                />
              </div>

              <div className="input-group">
                <label>End time</label>
                <DatePicker
                  selected={form.end_time}
                  onChange={(date) => setForm({ ...form, end_time: date })}
                  showTimeSelect
                  timeFormat="hh:mm aa"  
                  timeIntervals={5}
                  dateFormat="MMMM d, yyyy hh:mm aa"
                  placeholderText="Select end time"
                  className="custom-input"
                />
              </div>
            </div>

            <div className="divider" />
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>Visibility</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  { label: 'Public', desc: 'Anyone can join', value: false },
                  { label: 'Private', desc: 'Access code required', value: true },
                ].map(opt => (
                  <div
                    key={String(opt.value)}
                    onClick={() => setForm(f => ({ ...f, is_private: opt.value }))}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 'var(--radius)',
                      border: `1px solid ${form.is_private === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.is_private === opt.value ? 'rgba(124,106,247,0.08)' : 'var(--bg3)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {form.is_private && (
              <div className="input-group">
                <label>Access code</label>
                <input
                  name="access_code"
                  value={form.access_code}
                  onChange={e => setForm(f => ({ ...f, access_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. IPL2025"
                  style={{ letterSpacing: '0.1em', fontWeight: 500 }}
                  maxLength={20}
                />
                <span style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                  Share this code with invited bidders only
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button type="button" className="btn-outline" onClick={() => navigate('/dashboard')}>Cancel</button>
              <button type="submit" className="btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Creating...' : 'Create auction room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
