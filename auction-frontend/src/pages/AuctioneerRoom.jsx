import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { auctionAPI } from '../services/api'
import Navbar from '../components/Navbar'
import { notify } from '../services/notify'

export default function AuctioneerRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [auction, setAuction] = useState(null)
  const [items, setItems] = useState([])
  const [currentItem, setCurrentItem] = useState(null)
  const [newItem, setNewItem] = useState({ name: '', description: '', base_price: '', image: null })
  const [addingItem, setAddingItem] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, itemId: null })

  const load = async () => {
    const [aRes, iRes] = await Promise.all([auctionAPI.detail(id), auctionAPI.items(id)])
    setAuction(aRes.data)
    setItems(iRes.data)
    try {
      const cRes = await auctionAPI.currentItem(id)
      setCurrentItem(cRes.data.item)
    } catch { setCurrentItem(null) }
  }

  useEffect(() => { load() }, [id])

  const addItem = async e => {
    e.preventDefault()
    setAddingItem(true)
    try {
      const formData = new FormData()
      formData.append('name', newItem.name)
      formData.append('description', newItem.description)
      formData.append('base_price', newItem.base_price)
      if (newItem.image) formData.append('image', newItem.image)

      await auctionAPI.addItem(id, formData)
      setNewItem({ name: '', description: '', base_price: '', image: null })
      setShowAddForm(false)
      notify.itemAdded()
      load()
    } catch { notify.error('Failed to add item') }
    finally { setAddingItem(false) }
  }

  const doAction = async (action, itemId = null) => {
    setActionLoading(action)
    try {
      if (action === 'start') await auctionAPI.start(id)
      else if (action === 'close') await auctionAPI.close(id)
      notify.success('Action successful')
      load()
    } catch (err) {
      notify.error(err.response?.data?.error || 'Action failed')
    } finally { setActionLoading(null) }
  }

  const statusColor = {
    pending: { bg: 'rgba(255,255,255,0.04)', color: 'var(--text2)' },
    active: { bg: 'rgba(240,180,41,0.1)', color: 'var(--gold)' },
    sold: { bg: 'rgba(34,197,94,0.1)', color: 'var(--success)' },
    not_sold: { bg: 'rgba(239,68,68,0.08)', color: 'var(--danger)' },
    passed: { bg: 'rgba(255,255,255,0.04)', color: 'var(--text3)' },
  }

  const changeToPending = async () => {
    if (!confirmModal.itemId) return

    try {
      await auctionAPI.changeStatus(id, confirmModal.itemId)
      notify.itemStatus('pending')
      setConfirmModal({ open: false, itemId: null })
      load()
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ padding: '2rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }} className="fade-in">
          <div>
            <button onClick={() => navigate('/dashboard')} style={{
              background: 'none', border: 'none', color: 'var(--text2)',
              fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px'
            }}>← Back to dashboard</button>
            <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>{auction?.auction_title}</h1>
            <p style={{ color: 'var(--text2)', fontSize: '13px' }}>{auction?.sector}</p>
          </div>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '60%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: '10px',
              fontSize: '13px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {auction?.status === 'draft' && (
              <button className="btn-primary" onClick={() => doAction('start')} disabled={actionLoading === 'start'}>
                Schedule auction
              </button>
            )}
            {auction?.status === 'scheduled' && (
              <button className="btn-primary" onClick={() => doAction('start')} disabled={actionLoading === 'start'}>
                {actionLoading === 'start' ? 'Starting...' : 'Start auction'}
              </button>
            )}
            {auction?.status === 'Live' && (
              <button className="btn-danger" onClick={() => doAction('close')} disabled={actionLoading === 'close'}>
                {actionLoading === 'close' ? 'Closing...' : 'Close auction'}
              </button>
            )}
            {auction?.is_private && auction?.access_code && (
              <div style={{
                padding: '8px 14px', background: 'rgba(240,180,41,0.1)',
                border: '1px solid rgba(240,180,41,0.2)', borderRadius: 'var(--radius-sm)',
                fontSize: '13px'
              }}>
                Code: <strong style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}>{auction.access_code}</strong>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                Auction items ({items.length})
              </h2>
              {auction?.status !== 'closed' && (
                <button className="btn-outline btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
                  {showAddForm ? 'Cancel' : '+ Add item'}
                </button>
              )}
            </div>

            {showAddForm && (
              <div className="card fade-in" style={{ marginBottom: '1rem', border: '1px solid var(--accent)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '1rem' }}>New item</h3>
                <form onSubmit={addItem}>
                  <div className="input-group">
                    <label>Item name</label>
                    <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="Virat Kohli" required />
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea
                      value={newItem.description}
                      onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                      placeholder="Star batsman, right-handed..."
                      rows={2}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="input-group">
                    <label>Base price (₹)</label>
                    <input type="number" value={newItem.base_price} onChange={e => setNewItem(p => ({ ...p, base_price: e.target.value }))} placeholder="200000" required />
                  </div>
                  <div className="input-group">
                    <label>
                      Item image{' '}
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>(optional — shown to bidders)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <label htmlFor="auction-image" style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        background: 'var(--bg3)',
                        border: `1px dashed ${newItem.image ? 'var(--accent)' : 'var(--border2)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', fontSize: 13,
                        color: newItem.image ? 'var(--accent)' : 'var(--text2)',
                        transition: 'all 0.2s'
                      }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        {newItem.image ? newItem.image.name : 'Click to upload image'}
                      </label>
                      <input
                        id="auction-image" type="file" accept="image/*"
                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                        onChange={e => setNewItem(p => ({ ...p, image: e.target.files[0] }))}
                      />
                    </div>
                    {newItem.image && (
                      <img
                        src={URL.createObjectURL(newItem.image)} alt="preview"
                        style={{ marginTop: 8, height: 120, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border)' }}
                      />
                    )}
                  </div>
                  <button type="submit" className="btn-primary btn-sm" disabled={addingItem}>
                    {addingItem ? 'Adding...' : 'Add item'}
                  </button>
                </form>
              </div>
            )}

            {items.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text2)' }}>
                No items added yet. Add your first item above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items
                  .filter(item =>
                    item.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((item, i) => {
                    const style = statusColor[item.is_sold] || statusColor.pending
                    return (
                      <div key={item.id} className="card" style={{ background: style.bg, border: `1px solid ${item.is_sold === 'active' ? 'rgba(240,180,41,0.3)' : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'var(--bg3)', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '12px', color: 'var(--text2)', flexShrink: 0
                            }}>{i + 1}</span>
                            <div>
                              <div style={{ fontWeight: 500, marginBottom: '2px' }}>{item.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                                ₹{parseFloat(item.base_price).toLocaleString()} base
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '11px', padding: '3px 8px', borderRadius: '100px',
                              background: style.bg, color: style.color, border: `1px solid ${style.color}30`
                            }}>{item.is_sold.replace('_', ' ')}</span>
                          </div>
                          {['Not Sold', 'Pass'].includes(item.is_sold) && (
                            <button
                              className="btn-outline btn-sm"
                              onClick={() => setConfirmModal({ open: true, itemId: item.id })}
                            >
                              Re-auction
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
          <div className="card fade-in">
            <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Room info</h3>
            {[
              { label: 'Status', value: auction?.status },
              { label: 'Sector', value: auction?.sector },
              { label: 'Base price', value: `₹${parseFloat(auction?.reserve_price || 0).toLocaleString()}` },
              { label: 'Start', value: auction?.start_time ? new Date(auction.start_time).toLocaleString() : '-' },
              { label: 'End', value: auction?.end_time ? new Date(auction.end_time).toLocaleString() : '-' },
              { label: 'Type', value: auction?.is_private ? 'Private' : 'Public' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {confirmModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transform: 'scale(0.95)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'var(--bg)',
            padding: '2rem',
            borderRadius: 'var(--radius)',
            width: '320px',
            textAlign: 'center',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ marginBottom: '10px' }}>
              Re-auction Item?
            </h3>

            <p style={{
              fontSize: '13px',
              color: 'var(--text2)',
              marginBottom: '20px'
            }}>
              This item will be moved back to pending.
            </p>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center'
            }}>
              <button
                className="btn-outline"
                onClick={() => setConfirmModal({ open: false, itemId: null })}
              >
                Cancel
              </button>

              <button
                className="btn-gold"
                onClick={changeToPending}
              >
                Yes, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}