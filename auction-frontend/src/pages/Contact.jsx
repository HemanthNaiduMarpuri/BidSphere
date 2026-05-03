import { useState, useEffect } from 'react'
import { supportAPI } from '../services/api'
import { notify } from '../services/notify'
import Navbar from '../components/Navbar'
import ConfirmModal from '../components/ConfirmModal'

export default function Contact() {
  const [form, setForm] = useState({
    subject: '',
    message: '',
    image: null
  })

  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    subject: '',
    message: '',
    image: null
  })
  const [deleteId, setDeleteId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

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

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const submit = async e => {
    e.preventDefault()
    setLoading(true)

    try {
      const fd = new FormData()
      fd.append('subject', form.subject)
      fd.append('message', form.message)
      if (form.image) fd.append('image', form.image)

      await supportAPI.createTicket(fd)

      notify.success('Your query has been sent')
      setForm({ subject: '', message: '', image: null })
      loadTickets()

    } catch {
      notify.error('Failed to send query')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (ticket) => {
    setEditingId(ticket.id)
    setEditForm({
      subject: ticket.subject,
      message: ticket.message,
      image: null
    })
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const saveEdit = async (id) => {
    try {
      setLoading(true)

      const fd = new FormData()
      fd.append('subject', editForm.subject)
      fd.append('message', editForm.message)
      if (editForm.image) fd.append('image', editForm.image)

      await supportAPI.updateTicket(id, fd)

      notify.success('Ticket updated')
      setEditingId(null)
      loadTickets()

    } catch {
      notify.error('Failed to update')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (id) => {
    setDeleteId(id)
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      await supportAPI.deleteTicket(deleteId)
      notify.success('Deleted')
      loadTickets()
    } catch {
      notify.error('Delete failed')
    } finally {
      setShowConfirm(false)
      setDeleteId(null)
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

      <div style={{ maxWidth: 800, margin: '0 auto', padding: "40px" }}>

        <div style={{
          background: '#12121f',
          padding: 20,
          borderRadius: 12,
          marginBottom: 30
        }}>
          <h2 style={{ marginBottom: 10 }}>Contact Support</h2>

          <form onSubmit={submit}>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Subject"
              required
              style={inputStyle}
            />

            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Describe your issue..."
              required
              rows={4}
              style={inputStyle}
            />

            <input
              type="file"
              onChange={e => setForm(prev => ({ ...prev, image: e.target.files[0] }))}
              style={{ marginBottom: 10 }}
            />

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Sending...' : 'Submit'}
            </button>
          </form>
        </div>

        <div>
          <h3 style={{ marginBottom: 10 }}>Your Requests</h3>

          {tickets.length === 0 ? (
            <p style={{ color: '#888' }}>No queries yet</p>
          ) : (
            tickets.map(t => (
              <div key={t.id} style={{
                background: '#12121f',
                padding: 15,
                borderRadius: 10,
                marginBottom: 12
              }}>

                {editingId === t.id ? (
                  <>
                    <input
                      name="subject"
                      value={editForm.subject}
                      onChange={handleEditChange}
                      style={inputStyle}
                    />

                    <textarea
                      name="message"
                      value={editForm.message}
                      onChange={handleEditChange}
                      rows={3}
                      style={inputStyle}
                    />

                    <input
                      type="file"
                      onChange={e => setEditForm(prev => ({
                        ...prev,
                        image: e.target.files[0]
                      }))}
                    />

                    <button onClick={() => saveEdit(t.id)} style={btnStyle}>
                      Save
                    </button>

                    <button onClick={() => setEditingId(null)} style={cancelBtn}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600 }}>{t.subject}</div>

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
                        <strong>Support Reply:</strong>
                        <div>{t.reply}</div>
                      </div>
                    )}

                    {!t.reply && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          onClick={() => startEdit(t)}
                          style={editBtn}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(t.id)}
                          style={deleteBtn}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

      </div>
      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this ticket?"
      />
    </div>
  )
}

const inputStyle = {
  width: '100%',
  marginBottom: 10,
  padding: 10,
  borderRadius: 6,
  border: '1px solid #333',
  background: '#1a1a2e',
  color: '#fff'
}

const btnStyle = {
  background: '#f0b429',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 6,
  cursor: 'pointer'
}

const editBtn = {
  marginRight: 10,
  background: '#4dabf7',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer'
}

const deleteBtn = {
  background: '#ff4d4f',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  color: '#fff'
}

const cancelBtn = {
  marginLeft: 10,
  background: '#555',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  color: '#fff'
}