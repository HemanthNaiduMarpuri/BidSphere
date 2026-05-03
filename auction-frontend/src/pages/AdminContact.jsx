import { useEffect, useState } from 'react'
import { supportAPI } from '../services/api'
import { notify } from '../services/notify'
import Navbar from '../components/Navbar'
import ProfileLayout from '../components/ProfileLayout'

export default function AdminContact() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [replyMap, setReplyMap] = useState({}) 

  const loadTickets = async () => {
    try {
      const res = await supportAPI.getTickets()
      setTickets(res.data)
    } catch {
      notify.error('Failed to load tickets')
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleReplyChange = (id, value) => {
    setReplyMap(prev => ({ ...prev, [id]: value }))
  }

  const sendReply = async (id) => {
    const reply = replyMap[id]

    if (!reply) {
      notify.error('Reply cannot be empty')
      return
    }

    try {
      setLoading(true)

      await supportAPI.replyTicket(id, { reply })

      notify.success('Reply sent')
      setReplyMap(prev => ({ ...prev, [id]: '' }))
      loadTickets()

    } catch {
      notify.error('Failed to send reply')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    if (status === 'Solved') return 'lime'
    if (status === 'Received') return '#4dabf7'
    return '#f0b429'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#fff'
    }}>
      <Navbar />
      <ProfileLayout>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px' }}>
        <h2 style={{ marginBottom: 20 }}>All Support Requests</h2>

        {tickets.length === 0 ? (
          <p style={{ color: '#888' }}>No tickets found</p>
        ) : (
          tickets.map(t => (
            <div key={t.id} style={{
              background: '#12121f',
              padding: 15,
              borderRadius: 10,
              marginBottom: 15
            }}>
              <div style={{ fontWeight: 600 }}>
                {t.subject} ({t.user})
              </div>

              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>
                {t.message}
              </div>

              {t.image && (
                <img
                  src={`http://localhost:8000${t.image}`}
                  alt=""
                  style={{ width: 120, borderRadius: 6 }}
                />
              )}

              <div style={{
                marginTop: 8,
                fontSize: 12,
                color: getStatusColor(t.status)
              }}>
                Status: {t.status}
              </div>

              {t.reply && (
                <div style={{
                  marginTop: 10,
                  padding: 10,
                  background: 'rgba(240,180,41,0.1)',
                  borderRadius: 6
                }}>
                  <strong>Reply:</strong>
                  <div>{t.reply}</div>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <textarea
                  placeholder="Write reply..."
                  value={replyMap[t.id] || ''}
                  onChange={(e) => handleReplyChange(t.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    background: '#1a1a2e',
                    color: '#fff',
                    border: '1px solid #333'
                  }}
                />

                <button
                  onClick={() => sendReply(t.id)}
                  disabled={loading}
                  style={{
                    marginTop: 8,
                    background: '#4dabf7',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      </ProfileLayout>
    </div>
  )
}