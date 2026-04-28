import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auctionAPI, bidAPI, paymentAPI } from '../services/api'
import Navbar from '../components/Navbar'
import { notify } from '../services/notify'

const fmt = n => `₹${parseFloat(n || 0).toLocaleString('en-IN')}`

const ago = dateStr => {
  const diff = Date.now() - new Date(dateStr)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_META = {
  won: { label: 'Won', color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  active: { label: 'Active', color: '#f0b429', bg: 'rgba(240,180,41,0.10)' },
  outbid: { label: 'Outbid', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  lost: { label: 'Lost', color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
}

const PAY_META = {
  pending: { label: 'Payment due', color: '#f0b429' },
  paid: { label: 'Paid', color: '#22c55e' },
  overdue: { label: 'Overdue', color: '#ef4444' },
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '1.25rem 1.5rem',
      display: 'flex', flexDirection: 'column', gap: 4,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--text)', fontFamily: 'var(--font-display)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

function Badge({ status, type = 'bid' }) {
  const meta = type === 'pay' ? PAY_META[status] : STATUS_META[status]
  if (!meta) return null
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
      color: meta.color, background: meta.bg || 'transparent',
      border: `1px solid ${meta.color}33`, letterSpacing: '0.04em'
    }}>
      {meta.label}
    </span>
  )
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{sub}</div>
    </div>
  )
}

export default function UserDashboard() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('won')
  const [wonBids, setWonBids] = useState([])
  const [allBids, setAllBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [payFilter, setPayFilter] = useState('all')
  const [wishlist, setWishlist] = useState([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [wonRes, allRes, wishRes] = await Promise.all([
        bidAPI.myWonBids(),
        bidAPI.myBids(),
        auctionAPI.wishlistList()
      ])

      setWonBids(wonRes.data)
      setAllBids(allRes.data)
      setWishlist(wishRes.data)

    } catch (err) {
      notify.error("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const settle = async (bid) => {
    setLoading(true);
    try {
      const res = await paymentAPI.settle(bid.id)

      if (res.data.session_url) {
        window.location.href = res.data.session_url
      } else {
        notify.paymentDone()
        if (refreshUser) await refreshUser()
        await fetchData()
      }
    } catch (err) {
      notify.error(err.response?.data?.error || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = wonBids.reduce((s, b) => s + parseFloat(b.bid_amount || 0), 0)
  const pendingCount = wonBids.filter(b => (b.payment_status || 'pending') === 'pending').length
  const activeBids = allBids.filter(b => b.status === 'Active').length

  const filteredWon = payFilter === 'all'
    ? wonBids
    : wonBids.filter(b => (b.payment_status || 'Pending') === payFilter)

  const tabs = [
    { key: 'won', label: 'Won items', count: wonBids.length },
    { key: 'bids', label: 'My bids', count: allBids.length },
    { key: 'wishlist', label: 'Wishlist', count: wishlist.length },
    
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div className="container" style={{ padding: '1.5rem', maxWidth: 1100 }}>

        <div className="fade-in" style={{
          display: 'flex', alignItems: 'center', gap: 20,
          marginBottom: '2rem', padding: '1.5rem',
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold) 0%, #b45309 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#000', flexShrink: 0,
            fontFamily: 'var(--font-display)'
          }}>
            {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.email}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
          </div>
          <button className="btn-outline btn-sm" onClick={() => navigate('/home')}>
            Browse auctions →
          </button>
        </div>

        <div className="fade-in" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem',
        }}>
          <StatCard label="Items won" value={wonBids.length} sub="across all auctions" accent="var(--gold)" />
          <StatCard label="Total spent" value={fmt(totalSpent)} sub="winning bids" accent="#22c55e" />
          <StatCard label="Pending payment" value={pendingCount} sub="items need payment" accent={pendingCount > 0 ? '#f0b429' : undefined} />
          <StatCard label="Active bids" value={activeBids} sub="currently bidding" accent="#3b82f6" />
        </div>

        <div className="fade-in" style={{
          display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: '1.5rem',
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px',
                fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? 'var(--text)' : 'var(--text3)',
                borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s', display: 'flex', gap: 8, alignItems: 'center'
              }}
            >
              {t.label}
              {t.count !== null && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 100,
                  background: tab === t.key ? 'rgba(240,180,41,0.15)' : 'var(--bg3)',
                  color: tab === t.key ? 'var(--gold)' : 'var(--text3)', fontWeight: 600,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'won' && (
          <div className="fade-in">
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
              {['all', 'pending', 'paid'].map(f => (
                <button
                  key={f}
                  onClick={() => setPayFilter(f)}
                  style={{
                    fontSize: 12, padding: '5px 14px', borderRadius: 100, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: payFilter === f ? 'var(--gold)' : 'var(--bg2)',
                    color: payFilter === f ? '#000' : 'var(--text2)',
                    fontWeight: payFilter === f ? 600 : 400, transition: 'all 0.15s',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '2rem' }}>Loading…</div>
            ) : filteredWon.length === 0 ? (
              <EmptyState title="No won items yet" sub="Start bidding in live auctions to win items" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredWon.map(bid => {
                  const payStatus = bid.payment_status || 'pending'
                  return (
                    <div
                      key={bid.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '1rem 1.25rem',
                        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(240,180,41,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏷️</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{bid.auction_item_name || `Item #${bid.auction_item}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {bid.auction_room_name || `Auction #${bid.auction_room}`}
                          {bid.placed_at && ` · ${ago(bid.placed_at)}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 16 }}>{fmt(bid.bid_amount)}</div>
                        <div style={{ marginTop: 4 }}><Badge status={payStatus} type="pay" /></div>
                      </div>

                      {payStatus === 'pending' && (
                        <button
                          onClick={() => settle(bid)}
                          className="btn-gold btn-sm"
                          style={{ flexShrink: 0, marginLeft: 8 }}
                          disabled={loading}
                        >
                          {loading ? '...' : 'Pay now'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'bids' && (
          <div className="fade-in">
            {loading ? <div style={{ color: 'var(--text3)', fontSize: 13, padding: '2rem' }}>Loading…</div> :
              allBids.length === 0 ? <EmptyState title="No bids placed yet" sub="Join a live auction and place your first bid" /> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allBids.map(bid => (
                    <div key={bid.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0.875rem 1.25rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{bid.auction_item_name || `Item #${bid.auction_item}`}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{bid.auction_room_name} · {ago(bid.placed_at)}</div>
                      </div>
                      <div style={{ fontWeight: 600 }}>{fmt(bid.bid_amount)}</div>
                      <Badge status={bid.status} />
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
        {tab === 'wishlist' && (
          <div className="fade-in">
            {loading ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: '2rem' }}>Loading…</div>
            ) : wishlist.length === 0 ? (
              <EmptyState title="Your wishlist is empty" sub="Save items to track them easily" />
            ) : (
              <div className="grid-3">
                {wishlist.map(item => (
                  <div key={item.id} className="card" style={{ padding: 12 }}>


                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.item_name}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          marginBottom: 8
                        }}
                      />
                    )}

                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {item.item_name}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                      ₹{parseFloat(item.base_price || 0).toLocaleString()}
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>

                      <button
                        className="btn-gold btn-sm"
                        onClick={() => navigate(`/room/${item.auction_room}`)}
                        style={{ flex: 1 }}
                      >
                        View
                      </button>
                      <button
                        className="btn-outline btn-sm"
                        onClick={async () => {
                          try {
                            const res = await auctionAPI.toggle(item.auction_room, item.auction_item)

                            if (!res.data.wishlisted) {
                              setWishlist(prev => prev.filter(i => i.id !== item.id))
                              notify.info('Removed from wishlist')
                            } else {
                              notify.success('Added to wishlist')
                            }

                          } catch {
                            notify.error('Failed to update wishlist')
                          }
                        }}
                      >
                        ❤️
                      </button>

                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}