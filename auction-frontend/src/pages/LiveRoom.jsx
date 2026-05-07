import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useWebSocket from 'react-use-websocket'
import { auctionAPI, bidAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { FiMessageCircle } from 'react-icons/fi'
import { notify } from '../services/notify'

const imgSrc = path => {
  if (!path) return null
  return path.startsWith('http') ? path : `http://localhost:8000${path}`
}

const STATUS_COLOR = {
  active: { color: 'var(--gold)', bg: 'rgba(240,180,41,0.12)', border: 'rgba(240,180,41,0.4)' },
  pending: { color: 'var(--text3)', bg: 'var(--bg3)', border: 'var(--border)' },
  sold: { color: 'var(--success)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)' },
  not_sold: { color: 'var(--danger)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)' },
  passed: { color: 'var(--text3)', bg: 'var(--bg3)', border: 'var(--border)' },
}

export default function LiveRoom() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [auction, setAuction] = useState(null)
  const [currentItem, setCurrentItem] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [bidHistory, setBidHistory] = useState([])
  const [placing, setPlacing] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [upcomingItems, setUpcomingItems] = useState([])
  const [showAllItems, setShowAllItems] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', description: '', base_price: '', image: null })

  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', base_price: '', image: null })
  const [updatingItem, setUpdatingItem] = useState(false)

  const [itemTimeLeft, setItemTimeLeft] = useState(0)
  const [roomTimeLeft, setRoomTimeLeft] = useState(null)

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  const [showChat, setShowChat] = useState(false)

  const [loadingBids, setLoadingBids] = useState(true)

  const [wishlistIds, setWishlistIds] = useState([])

  const [highestBidder, setHighestBidder] = useState(null)

  const [cooldown, setCooldown] = useState(null)

  const [remainingExtensions, setRemainingExtensions] = useState(0)
  const [activeTab, setActiveTab] = useState('chat')
  const [requestPanels, setRequestPanels] = useState([])

  const WS_URL = `ws://localhost:8000/ws/auction/${id}/`
  const socketRef = useRef(null)

  const { lastMessage, readyState, sendMessage: wsSend } = useWebSocket(WS_URL, {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    onOpen: () => {
      socketRef.current = {
        send: wsSend
      }
    }
  })

  const connected = readyState === 1

  const loadItems = async () => {
    try {
      const res = await auctionAPI.items(id)
      setUpcomingItems(res.data)
    } catch { }
  }

  const loadRequestedItems = async () => {
    try {
      const res = await auctionAPI.requestedItems(id)
      setRequestPanels(res.data)
    } catch {
      notify.error('Failed to load requests')
    }
  }

  const imgSrc = path => {
    if (!path) return null
    return path.startsWith('http')
      ? path
      : `http://localhost:8000${path}`
  }

  const loadBidHistory = async () => {
    try {
      const res = await auctionAPI.bidHistory(id)

      setBidHistory(res.data)
    } finally {
      setLoadingBids(false)
    }
  }
  const loadChatHistory = async () => {
    try {
      const res = await auctionAPI.chatHistory(id)
      setChatMessages(res.data)
    } catch { }
  }

  useEffect(() => {
    loadChatHistory(),
      loadBidHistory(),
      loadRequestedItems()
  }, [])

  const parseServerTime = (str) => new Date(str)

  const loadCurrentItem = async () => {
    try {
      const res = await auctionAPI.currentItem(id)
      const item = res.data.item
      const endsAt = res.data.ends_at
      setCurrentItem(item || null)
      setBidHistory(
        res.data.highest_bid
          ? [{
            bidder: res.data.highest_bidder,
            amount: res.data.highest_bid,
            time: new Date().toLocaleTimeString()
          }]
          : []
      )
      if (endsAt) {
        const seconds = Math.floor((parseServerTime(endsAt) - Date.now()) / 1000)
        startTimer(seconds > 0 ? seconds : 0)
      }
    } catch {
      setCurrentItem(null)
    }
  }

  useEffect(() => {
    auctionAPI.detail(id).then(res => setAuction(res.data)).catch(() => navigate('/home'))
    loadCurrentItem()
    loadItems()
  }, [id])

  useEffect(() => {
    if (showChat) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showChat])

  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    auctionAPI.wishlistList().then(res => {
      const ids = res.data.map(i => i.auction_item)
      setWishlistIds(ids)
    })
  }, [])

  useEffect(() => {
    if (!lastMessage) return
    const data = JSON.parse(lastMessage.data)

    if (data.type === 'init') {
      setBidAmount('')

      if (data.highest_bid) {
        setBidHistory(prev => {
          if (prev.length > 0) return prev

          return [{
            bidder: data.bidder,
            amount: data.highest_bid,
            time: new Date().toLocaleTimeString()
          }]
        })
        setHighestBidder(data.bidder)
      }
      else {
        setHighestBidder(null)
      }
    }

    if (data.type === 'bid_update') {
      if (currentItem && data.item && data.item !== currentItem.name) return
      setHighestBidder(data.bidder)
      setBidHistory(prev => {
        const filtered = prev.filter(b => b.bidder !== data.bidder)

        if (!data.bid_amount) {
          return filtered
        }

        const updated = [
          {
            bidder: data.bidder,
            amount: data.bid_amount,
            item: data.item,
            time: new Date().toLocaleTimeString()
          },
          ...filtered
        ]

        return updated.slice(0, 20)
      })

      auctionAPI.currentItem(id)
        .then(res => {
          setCurrentItem(res.data.item)
          setHighestBidder(res.data.highest_bidder)

          if (res.data.ends_at) {
            const seconds = Math.floor(
              (new Date(res.data.ends_at) - new Date()) / 1000
            )
            startTimer(seconds > 0 ? seconds : 0)
          }
        })
    }

    if (data.type === 'item_changed') {
      setCurrentItem({ id: data.item_id, name: data.item_name, base_price: data.base_price })
      setBidHistory(data.highest_bid
        ? [{ bidder: data.bidder, amount: data.highest_bid, time: new Date().toLocaleTimeString() }]
        : [])
      setBidAmount('')
      notify.info('Item Changed')
      loadItems()


      if (data.ends_at) {
        const seconds = Math.floor((parseServerTime(data.ends_at) - Date.now()) / 1000)
        startTimer(seconds > 0 ? seconds : 0)
      }
      if (wishlistIds.includes(data.item_id)) {
        notify.success(`Your wishlisted item "${data.item_name}" is LIVE!`)
      }
    }

    if (data.type === 'auction_status') {
      setAuction(prev => prev ? { ...prev, status: data.status } : prev)
    }

    if (data.type === 'item_status') {
      if (['sold', 'not_sold', 'passed'].includes(data.status)) {
        setCurrentItem(null)
        setItemTimeLeft(0)
        clearInterval(timerRef.current)
      }
    }

    if (data.type === 'timer_extended') {
      if (currentItem && data.item_id === currentItem.id) {
        const seconds = Math.floor(
          (new Date(data.ends_at) - new Date()) / 1000
        )
        startTimer(seconds > 0 ? seconds : 0)
      }
    }

    if (data.type === 'chat_message') {
      setChatMessages(prev => [
        ...prev,
        {
          username: data.username,
          message: data.message,
          time: data.time
        }
      ])
    }

    if (data.type === 'retract_bid') {
      notify.info(`${data.bidder} retracted bid`)

      setBidHistory(prev => {
        const updated = prev.filter(b => b.bidder !== data.bidder)
        setHighestBidder(updated[0]?.bidder || null)
        return updated.sort((a, b) => b.amount - a.amount)
      })
    }

    if (data.type === 'item_request') {
      if (user?.email === auction?.created_by) {
        notify.info(`${data.user} requested ${data.item}`)
      }
    }

    if (data.type === 'request_vote_update') {
      setRequestPanels(prev =>
        prev.map(p =>
          p.id === data.panel_id
            ? { ...p, likes: data.likes, dislikes: data.dislikes }
            : p
        )
      )
    }

    if (data.type === 'item_request_update') {
      notify.info(`"${data.item_name}" was ${data.action === 'activated' ? 'activated ✅' : 'rejected ❌'}`)
      loadRequestedItems()
      if (data.action === 'activated') {
        loadCurrentItem()
        loadItems()
      }
    }

  }, [lastMessage])

  const sendMessage = () => {
    if (!chatInput.trim()) return

    const payload = {
      message: chatInput,
      username: user?.first_name || user?.username,
      email: user?.email,
      auction_id: id,
      user_id: user?.id
    }

    socketRef.current.send(JSON.stringify(payload))
    setChatInput('')
  }

  const placeBid = async e => {
    e.preventDefault()
    if (!currentItem || !bidAmount) return
    setPlacing(true);
    try {
      await bidAPI.place({ auction_room: id, auction_item: currentItem.id, bid_amount: bidAmount })
      notify.bidPlaced()
      setBidAmount('')
    } catch (err) {
      notify.error(err.response?.data?.bid_amount?.[0] || err.response?.data?.non_field_errors?.[0] || 'Bid failed')
    } finally {
      setPlacing(false)
    }
  }

  const doItemAction = async action => {
    if (!currentItem && action !== 'next') return
    setActionLoading(action);
    try {
      if (action === 'sold') await auctionAPI.soldItem(id, currentItem.id)
      if (action === 'unsold') await auctionAPI.unsoldItem(id, currentItem.id)
      if (action === 'pass') await auctionAPI.passItem(id, currentItem.id)
      if (['sold', 'unsold', 'pass'].includes(action)) {
        setCurrentItem(null)
      }
      if (action === 'extendTime') {
        try {
          setCooldown(true);

          const res = await auctionAPI.extendTime(id, currentItem.id);

          const endsAt = res.data?.ends_at;
          const countFromDB = res.data?.remaining_extensions;

          setRemainingExtensions(5 - countFromDB);

          if (endsAt) {
            const seconds = Math.floor((new Date(endsAt) - new Date()) / 1000);
            setItemTimeLeft(seconds > 0 ? seconds : 0);
          }

          notify.info('Time Extended');

        } catch (err) {
          notify.error(err.response?.data?.error || 'Cannot extend');
        } finally {
          setTimeout(() => setCooldown(false), 2000);
        }
      }

      if (action === 'next') {
        await auctionAPI.nextItem(id)
        await loadCurrentItem()
      }
      await loadItems()

      notify.success(`Done — ${action}`)
    } catch (err) {
      notify.error('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const addItem = async e => {
    e.preventDefault()
    setAddingItem(true)
    try {
      const fd = new FormData()
      fd.append('name', newItem.name)
      fd.append('description', newItem.description)
      fd.append('base_price', newItem.base_price)
      if (newItem.image) fd.append('image', newItem.image)
      await auctionAPI.addItem(id, fd)
      setNewItem({ name: '', description: '', base_price: '', image: null })
      setShowAddForm(false)
      notify.itemAdded()
      loadItems()
    } catch {
      notify.error('Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const updateItem = async e => {
    e.preventDefault()
    if (!editingItem) return
    setUpdatingItem(true)
    try {
      const fd = new FormData()
      fd.append('name', editForm.name)
      fd.append('description', editForm.description)
      fd.append('base_price', editForm.base_price)
      if (editForm.image) fd.append('image', editForm.image)
      await auctionAPI.updateItem(id, editingItem.id, fd)
      notify.itemUpdated()
      setEditingItem(null)
      loadItems()
    } catch {
      notify.error('Failed to update item', true)
    } finally {
      setUpdatingItem(false)
    }
  }

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60

    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const highestBid = bidHistory[0]?.amount
  const isAuctioneer = user?.is_auctioner && auction?.created_by === user?.email
  const isLive = auction?.status === 'Live'
  const isClosed = auction?.status === 'Closed'
  const isScheduled = auction?.status === 'Scheduled'
  const isDraft = auction?.status === 'Draft'
  const doneItems = upcomingItems.filter(i => ['sold', 'not_sold', 'passed'].includes(i.is_sold))
  const visibleItems = showAllItems ? upcomingItems : upcomingItems.slice(0, 6)
  const [timeLeft, setTimeLeft] = useState('')
  const [showRetractWarning, setShowRetractWarning] = useState(false)
  const [retracting, setRetracting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(null)
  const [showReactive, setShowReactive] = useState(null)
  const [reactivating, setReactivating] = useState(false)
  const [activating, setActivating] = useState(false)
  const [showActive, setShowActive] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const isTopBidder = highestBidder && user?.email === highestBidder

  const handleRetract = async () => {
    try {
      await auctionAPI.retractBid(parseInt(id), currentItem.id)
      notify.warn('Bid retracted')
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to retract')
    }
  }

  const voteItem = async (panel, vote) => {
    try {
      await auctionAPI.voteItem(panel.auction_room, panel.id, vote)
      notify.success('Vote submitted')
      loadRequestedItems()
    } catch (err) {
      notify.error(err.response?.data?.message || 'Vote failed')
    }
  }

  const timerRef = useRef(null)

  const startTimer = (seconds) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setItemTimeLeft(seconds)

    timerRef.current = setInterval(() => {
      setItemTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          notify.info('Item time ended')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  useEffect(() => {
    if (!isLive && !auction?.end_time_iso) return

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(auction.end_time_iso).getTime() - Date.now()) / 1000)
      if (diff <= 0 && !isClosed) {
        setRoomTimeLeft(0)
        notify.warn('Auction Closes Soon!')
        clearInterval(interval)
      } else {
        setRoomTimeLeft(diff)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [auction])


  useEffect(() => {
    if (!isScheduled || !auction?.start_time) return
    const tick = () => {
      const diff = new Date(auction.start_time) - new Date()
      if (diff <= 0) { setTimeLeft('Starting soon...'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isScheduled, auction?.start_time])


  if (isClosed || isScheduled || isDraft) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>

        {isClosed && <>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40 }}>Auction Closed</h1>
          <p style={{ color: 'var(--text2)' }}>This auction has ended</p>
          <button className="btn-gold" onClick={() => navigate('/home')}>Back to home</button>
        </>}

        {isDraft && <>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40 }}>Not Available</h1>
          <p style={{ color: 'var(--text2)' }}>This auction is not open yet</p>
          <button className="btn-gold" onClick={() => navigate('/home')}>Back to home</button>
        </>}

        {isScheduled && (<>
          <p style={{ fontSize: 13, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '50px' }}>
            Auction starts in
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--gold)', margin: 0 }}>
            {timeLeft}
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            {new Date(auction.start_time).toLocaleString()}
          </p>
          <div style={{
            marginTop: 8,
            padding: '8px 16px',
            background: 'rgba(240,180,41,0.08)',
            border: '1px solid rgba(240,180,41,0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            color: 'var(--text2)'
          }}>
            Ends: {new Date(auction.end_time).toLocaleString()}
          </div>
          <button className="btn-gold" style={{ marginTop: 8 }} onClick={() => navigate('/home')}>
            Back to home
          </button>
          <div style={{
            marginTop: '2rem',
            width: '100%',
            maxWidth: 900
          }}>
            <h3 style={{
              fontSize: 16,
              marginBottom: 12,
              color: 'var(--text2)'
            }}>
              Upcoming Items
            </h3>

            {upcomingItems.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>
                No items added yet
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))',
                gap: 14
              }}>
                {upcomingItems.map(item => (
                  <div key={item.id} className="card" style={{ padding: 10, marginRight: '5px', marginBottom: '25px' }}>

                    {imgSrc(item.image) ? (
                      <img
                        src={imgSrc(item.image)}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          marginBottom: 8
                        }}
                      />
                    ) : (
                      <div style={{
                        height: 120,
                        background: 'var(--bg3)',
                        borderRadius: 8,
                        marginBottom: 8
                      }} />
                    )}

                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {item.name}
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 8
                    }}>

                      <button
                        className="btn-outline btn-sm"
                        onClick={async () => {
                          try {
                            await auctionAPI.toggle(auction.id, item.id)
                            notify.success('Wishlist updated')
                          } catch {
                            notify.error('Failed')
                          }
                        }}
                      >
                        ❤️
                      </button>

                      <button
                        className="btn-gold btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => setViewItem(item)}
                      >
                        View
                      </button>

                    </div>

                  </div>

                ))}
              </div>
            )}
          </div>
        </>)}
        {viewItem && (
          <>
            <div
              onClick={() => setViewItem(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 1000
              }}
            />

            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 360,
              background: '#0f172a',
              borderRadius: 12,
              padding: 16,
              zIndex: 1001
            }}>

              {imgSrc(viewItem.image) && (
                <img
                  src={imgSrc(viewItem.image)}
                  alt=""
                  style={{
                    width: '100%',
                    height: 160,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 10
                  }}
                />
              )}

              <h3>{viewItem.name}</h3>

              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                {viewItem.description || 'No description'}
              </p>

              <div style={{
                marginTop: 10,
                fontWeight: 600,
                color: 'var(--gold)'
              }}>
                ₹{parseFloat(viewItem.base_price).toLocaleString()}
              </div>

              <button
                className="btn-outline btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setViewItem(null)}
              >
                Close
              </button>

            </div>
          </>
        )}

      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div className="container" style={{ padding: '1.5rem' }}>
        <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24 }}>{auction?.title}</h1>
              <span className="badge badge-live"><span className="dot-live" /> Live</span>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>{auction?.sector}</p>

          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {roomTimeLeft !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                borderRadius: 100,
                background: roomTimeLeft <= 60 ? 'rgba(239,68,68,0.12)' : 'var(--bg3)',
                border: `1px solid ${roomTimeLeft <= 60 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                fontSize: 13, fontWeight: 600,
                color: roomTimeLeft <= 60 ? 'var(--danger)' : 'var(--text2)',
              }}>
                {formatTime(roomTimeLeft)}
              </div>
            )}
            {isAuctioneer && !isClosed && (
              <button className="btn-outline btn-sm" onClick={() => { setShowAddForm(!showAddForm); setEditingItem(null) }}>
                {showAddForm ? 'Cancel' : '+ Add item'}
              </button>
            )}
            {isAuctioneer && isLive && (
              <button className="btn-danger btn-sm" onClick={async () => {
                await auctionAPI.close(id)
                setAuction(prev => ({ ...prev, status: 'Closed' }))
              }}>
                Close auction
              </button>
            )}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--danger)' }} />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{connected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        </div>

        {showAddForm && isAuctioneer && (
          <div className="card fade-in" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>Add new item</h3>
            <form onSubmit={addItem}>
              <div className="grid-2">
                <div className="input-group">
                  <label>Name</label>
                  <input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Virat Kohli" required />
                </div>
                <div className="input-group">
                  <label>Base price (₹)</label>
                  <input type="number" value={newItem.base_price} onChange={e => setNewItem(p => ({ ...p, base_price: e.target.value }))} placeholder="200000" required />
                </div>
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder="Details..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div className="input-group">
                <label>Image (optional)</label>
                <input type="file" accept="image/*" onChange={e => setNewItem(p => ({ ...p, image: e.target.files[0] }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary btn-sm" disabled={addingItem}>{addingItem ? 'Adding...' : 'Add item'}</button>
                <button type="button" className="btn-outline btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {editingItem && (
          <div className="card fade-in" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>Edit — {editingItem.name}</h3>
            <form onSubmit={updateItem}>
              <div className="grid-2">
                <div className="input-group">
                  <label>Name</label>
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label>Base price (₹)</label>
                  <input type="number" value={editForm.base_price} onChange={e => setEditForm(p => ({ ...p, base_price: e.target.value }))} required />
                </div>

              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div className="input-group">
                <label>Replace image (optional)</label>
                <input type="file" accept="image/*" onChange={e => setEditForm(p => ({ ...p, image: e.target.files[0] }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn-primary btn-sm" disabled={updatingItem}>{updatingItem ? 'Saving...' : 'Save changes'}</button>
                <button type="button" className="btn-outline btn-sm" onClick={() => setEditingItem(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div className="card fade-in">
              {currentItem ? (
                <>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                    Current item
                  </div>

                  {imgSrc(currentItem.image) && (
                    <img
                      src={imgSrc(currentItem.image)}
                      alt={currentItem.name}
                      style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 10, marginBottom: '1rem' }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}

                  <h2 style={{ fontSize: 28, marginBottom: 6 }}>{currentItem.name}</h2>

                  {currentItem.description && (
                    <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: '1rem' }}>{currentItem.description}</p>
                  )}

                  <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                      <div className="label">Base price</div>
                      <div className="value" style={{ color: 'var(--text2)' }}>₹{parseFloat(currentItem.base_price || 0).toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                      <div className="label">Highest bid</div>
                      <div className="value" style={{ color: 'var(--gold)' }}>
                        {highestBid ? `₹${parseFloat(highestBid).toLocaleString()}` : 'No bids yet'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 14px',
                    borderRadius: 100,
                    marginBottom: 12,
                    background: itemTimeLeft <= 10 ? 'rgba(239,68,68,0.12)' : 'rgba(240,180,41,0.10)',
                    border: `1px solid ${itemTimeLeft <= 10 ? 'rgba(239,68,68,0.4)' : 'rgba(240,180,41,0.3)'}`,
                    fontSize: 15, fontWeight: 700,
                    color: itemTimeLeft <= 10 ? 'var(--danger)' : 'var(--gold)',
                  }}>
                    {itemTimeLeft > 0 ? `${itemTimeLeft}s` : 'Ended'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    {!isAuctioneer && isLive && highestBidder && user?.email === highestBidder && (
                      <button
                        onClick={() => setShowRetractWarning(true)}
                        className="btn-gold btn-sm"
                      >
                        Retract Bid
                      </button>
                    )}
                  </div>

                  {showRetractWarning && (
                    <>
                      <div
                        onClick={() => setShowRetractWarning(false)}
                        style={{
                          position: 'fixed',
                          inset: 0,
                          background: 'rgba(0,0,0,0.55)',
                          backdropFilter: 'blur(3px)',
                          zIndex: 1000
                        }}
                      />

                      <div
                        style={{
                          position: 'fixed',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 340,
                          background: '#0f172a',
                          borderRadius: 14,
                          padding: '20px 18px',
                          zIndex: 1001,
                          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}
                      >

                        <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>
                          Retract your bid?
                        </h3>

                        <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                          This will remove your <b>highest bid</b> permanently.
                          <br />
                          You may lose your position in the auction.
                        </p>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 8,
                          marginTop: 18
                        }}>
                          <button
                            className="btn-outline btn-sm"
                            onClick={() => setShowRetractWarning(false)}
                          >
                            Cancel
                          </button>

                          <button
                            className="btn-danger btn-sm"
                            disabled={retracting}
                            onClick={async () => {
                              try {
                                setRetracting(true)
                                await auctionAPI.retractBid(id, currentItem.id)
                                notify.success("Bid retracted")
                                setShowRetractWarning(false)
                              } catch {
                                notify.error("Failed to retract")
                              } finally {
                                setRetracting(false)
                              }
                            }}
                          >
                            {retracting ? 'Processing...' : 'Yes, Retract'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {!isAuctioneer && isLive && itemTimeLeft > 0 && !isTopBidder && (
                    <form onSubmit={placeBid} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <input
                        type="number" value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        placeholder={`Min ₹${parseFloat(currentItem.base_price || 0).toLocaleString()}`}
                        style={{ flex: 1 }} min={currentItem.base_price} step="1"
                      />
                      <button type="submit" className="btn-gold" disabled={placing || !bidAmount}>
                        {placing ? 'Placing...' : 'Place bid'}
                      </button>
                    </form>
                  )}

                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Extensions left: {remainingExtensions}
                  </p>

                  {!isAuctioneer && isLive && itemTimeLeft > 0 && !isTopBidder && (
                    <button
                      className="btn-outline btn-sm"
                      onClick={() => doItemAction('extendTime')}
                    >
                      +5 sec
                    </button>

                  )}

                  {isAuctioneer && isLive && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        style={{ background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 18px', cursor: 'pointer', fontWeight: 500 }}
                        onClick={() => doItemAction('sold')} disabled={!!actionLoading}
                      >
                        {actionLoading === 'sold' ? '...' : 'Mark sold'}
                      </button>
                      <button className="btn-danger" onClick={() => doItemAction('unsold')} disabled={!!actionLoading}>
                        {actionLoading === 'unsold' ? '...' : 'Mark unsold'}
                      </button>
                      <button className="btn-outline" onClick={() => doItemAction('pass')} disabled={!!actionLoading}>
                        {actionLoading === 'pass' ? '...' : 'Pass'}
                      </button>
                      <button className="btn-primary" onClick={() => doItemAction('next')} disabled={!!actionLoading} style={{ marginLeft: 'auto' }}>
                        {actionLoading === 'next' ? 'Moving...' : 'Next item →'}
                      </button>
                    </div>
                  )}

                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Waiting for next item</div>
                  <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: '1.5rem' }}>
                    {isAuctioneer ? 'Click to advance or reactivate an item below' : 'The auctioneer will start the next item shortly'}
                  </p>
                  {isAuctioneer && (
                    <button className="btn-gold" onClick={() => doItemAction('next')} disabled={!!actionLoading}>
                      {actionLoading === 'next' ? 'Loading...' : 'Start next item →'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {upcomingItems.length > 0 && (
              <div className="card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    All items
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
                      {doneItems.length}/{upcomingItems.length} done
                    </span>
                  </div>
                  {upcomingItems.length > 6 && (
                    <button className="btn-outline btn-sm" onClick={() => setShowAllItems(!showAllItems)}>
                      {showAllItems ? 'Show less' : `Show all ${upcomingItems.length}`}
                    </button>
                  )}
                </div>

                <div className="grid-3">
                  {visibleItems.map(item => {
                    const st = STATUS_COLOR[item.is_sold] || STATUS_COLOR.pending
                    const isPending = item.is_sold === 'Pending'
                    const isReactivatable = ['Not Sold', 'Pass'].includes(item.is_sold)

                    return (
                      <div key={item.id} style={{
                        background: st.bg,
                        border: `1px solid ${st.border}`,
                        borderRadius: 'var(--radius)',
                        padding: 12,
                        opacity: item.is_sold === 'sold' ? 0.4 : 1,
                        transition: 'all 0.2s',
                      }}>
                        {imgSrc(item.image) && (
                          <img src={imgSrc(item.image)} alt={item.name}
                            style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                            onError={e => { e.target.style.display = 'none' }}
                          />
                        )}
                        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                          ₹{parseFloat(item.base_price).toLocaleString()}
                        </div>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 100,
                          background: 'var(--bg2)', color: st.color,
                          border: `1px solid ${st.border}`, textTransform: 'capitalize'
                        }}>
                          {item.is_sold.replace('_', ' ')}
                        </span>

                        {isAuctioneer && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                            {isPending && (
                              <>
                                <button className="btn-gold btn-sm" style={{ flex: 2, fontSize: 11, padding: '4px 6px' }}
                                  onClick={() => {
                                    setEditingItem(item)
                                    setEditForm({ name: item.name, description: item.description || '', base_price: item.base_price, image: null })
                                    setShowAddForm(false)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }}>
                                  Edit
                                </button>
                                <button className="btn-green btn-sm" style={{ flex: 2, fontSize: 11, padding: '4px 8px' }}
                                  onClick={() => setShowActive(item)}>
                                  Activate
                                </button>
                                <button className="btn-danger btn-sm" style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                                  onClick={() => setShowDelete(item)}>
                                  Del
                                </button>
                              </>
                            )}
                            {isReactivatable && (
                              <button
                                className="btn-outline btn-sm"
                                style={{ width: '100%', fontSize: 11, padding: '4px 6px', color: 'var(--gold)', borderColor: 'var(--gold)' }}
                                onClick={() => setShowReactive(item)}
                              >
                                Make active
                              </button>
                            )}
                          </div>
                        )}
                        {showDelete && (
                          <>
                            <div
                              onClick={() => setShowDelete(false)}
                              style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(3px)',
                                zIndex: 1000
                              }}
                            />

                            <div
                              style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 340,
                                background: '#0f172a',
                                borderRadius: 14,
                                padding: '20px 18px',
                                zIndex: 1001,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.08)'
                              }}
                            >

                              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>
                                Remove this item?
                              </h3>

                              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                                This will remove your <b>item</b> permanently.
                                <br />
                                You may lose your item in the auction.
                              </p>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 8,
                                marginTop: 18
                              }}>
                                <button
                                  className="btn-outline btn-sm"
                                  onClick={() => setShowDelete(false)}
                                >
                                  Cancel
                                </button>

                                <button
                                  className="btn-danger btn-sm"
                                  disabled={deleting}
                                  onClick={async () => {
                                    try {
                                      setDeleting(true)
                                      await auctionAPI.deleteItem(id, showDelete.id)
                                      loadItems()
                                      notify.success("Item Deleted")
                                      setShowDelete(false)
                                    } catch {
                                      notify.error("Failed to Reactivate")
                                    } finally {
                                      setDeleting(false)
                                    }
                                  }}
                                >
                                  {deleting ? 'Processing...' : 'Yes, Delete'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}{showReactive && (
                          <>
                            <div
                              onClick={() => setShowReactive(false)}
                              style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(3px)',
                                zIndex: 1000
                              }}
                            />

                            <div
                              style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 340,
                                background: '#0f172a',
                                borderRadius: 14,
                                padding: '20px 18px',
                                zIndex: 1001,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.08)'
                              }}
                            >

                              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>
                                Re-activate this item?
                              </h3>

                              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                                This item will be again re-auctioned
                              </p>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 8,
                                marginTop: 18
                              }}>
                                <button
                                  className="btn-outline btn-sm"
                                  onClick={() => setShowReactive(false)}
                                >
                                  Cancel
                                </button>

                                <button
                                  className="btn-danger btn-sm"
                                  disabled={reactivating}
                                  onClick={async () => {
                                    try {
                                      setReactivating(true)

                                      await auctionAPI.changeStatus(id, showReactive.id)

                                      notify.success("Item reactivated")
                                      setShowReactive(null)

                                      loadItems()
                                      loadCurrentItem()

                                    } catch {
                                      notify.error("Failed to reactivate")
                                    } finally {
                                      setReactivating(false)
                                    }
                                  }}
                                >
                                  {reactivating ? 'Processing...' : 'Yes, Reactivate'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                        {showActive && (
                          <>
                            <div
                              onClick={() => setShowActive(false)}
                              style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(3px)',
                                zIndex: 1000
                              }}
                            />

                            <div
                              style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 340,
                                background: '#0f172a',
                                borderRadius: 14,
                                padding: '20px 18px',
                                zIndex: 1001,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                                border: '1px solid rgba(255,255,255,0.08)'
                              }}
                            >

                              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>
                                Activate {showActive.name} item?
                              </h3>

                              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                                This item will be again Activated
                              </p>

                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 8,
                                marginTop: 18
                              }}>
                                <button
                                  className="btn-outline btn-sm"
                                  onClick={() => setShowActive(false)}
                                >
                                  Cancel
                                </button>

                                <button
                                  className="btn-gold btn-sm"
                                  disabled={activating}
                                  onClick={async () => {
                                    try {
                                      setActivating(true)

                                      await auctionAPI.activateItem(id, showActive.id)

                                      notify.success("Item Activated")
                                      setShowActive(null)

                                      loadItems()
                                      loadCurrentItem()

                                    } catch {
                                      notify.error("Failed to Activate")
                                    } finally {
                                      setActivating(false)
                                    }
                                  }}
                                >
                                  {activating ? 'Processing...' : 'Yes, Activate'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {!isAuctioneer && isReactivatable && (
                          <button
                            className="btn-outline btn-sm"
                            style={{ width: '100%', marginTop: 8, fontSize: 11 }}
                            onClick={async () => {
                              try {
                                await auctionAPI.requestItem(id, item.id)
                                notify.info(`Request sent for "${item.name}"`)
                                loadRequestedItems()
                                setActiveTab('requests')
                                setShowChat(true)
                              } catch (err) {
                                notify.error(err.response?.data?.message || 'Request failed')
                              }
                            }}
                          >
                            Request item
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="card fade-in" style={{ height: 'fit-content', position: 'sticky', top: 76 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Bid activity</div>
            {bidHistory.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>No bids yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bidHistory.map((bid, i) => (
                  <div key={i} style={{
                    padding: '10px 12px',
                    background: i === 0 ? 'rgba(240,180,41,0.08)' : 'var(--bg3)',
                    borderRadius: 'var(--radius-sm)',
                    border: i === 0 ? '1px solid rgba(240,180,41,0.2)' : '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{bid.bidder}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{bid.time}</div>
                    </div>
                    <div style={{ color: i === 0 ? 'var(--gold)' : 'var(--text)', fontWeight: 600, fontSize: 14 }}>
                      ₹{parseFloat(bid.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--gold)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.2)', zIndex: 1000
          }}
        >
          <FiMessageCircle size={22} color="#fff" />
        </button>
      )}

      {showChat && (
        <div
          onClick={() => setShowChat(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 998, backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0,
        right: showChat ? 0 : '-100%',
        width: 'clamp(260px, 32%, 380px)',
        height: '100%',
        background: '#12121f',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-6px 0 25px rgba(0,0,0,0.4)',
        transition: 'right 0.3s ease',
        zIndex: 999,
        display: 'flex', flexDirection: 'column'
      }}>

        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#1a1a2e', flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['chat', 'requests'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12,
                  fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: activeTab === tab
                    ? 'rgba(240,180,41,0.2)'
                    : 'rgba(255,255,255,0.06)',
                  color: activeTab === tab ? '#f0b429' : '#64748b',
                  outline: activeTab === tab ? '1px solid rgba(240,180,41,0.35)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {tab === 'chat' ? `Live Chat${chatMessages.length ? `(${chatMessages.length})`: ''}` : `Requests${requestPanels.length ? ` (${requestPanels.length})` : ''}`}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowChat(false)}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.06)',
              cursor: 'pointer', color: '#64748b', fontSize: 14,
              width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#0f0f1a' }}>

          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {chatMessages.length === 0 && (
                <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                  No messages yet. Say hi!
                </p>
              )}
              {chatMessages.map((msg, i) => {
                const currentUsername = user?.first_name
                const isMine = msg.username === currentUsername
                const isAuctioneerMsg = msg.email === auction?.created_by
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start'
                  }}>
                    {!isMine && (
                      <div style={{
                        fontSize: 10, fontWeight: 600, marginBottom: 3,
                        color: isAuctioneerMsg ? '#60a5fa' : 'rgba(240,180,41,0.7)',
                        letterSpacing: '0.03em'
                      }}>
                        {msg.username}{isAuctioneerMsg ? ' · Auctioneer' : ''}
                      </div>
                    )}
                    <div style={{
                      padding: '8px 12px', borderRadius: 12,
                      fontSize: 13, maxWidth: '80%',
                      wordBreak: 'break-word', lineHeight: 1.45,
                      background: isMine
                        ? 'rgba(240,180,41,0.18)'
                        : isAuctioneerMsg
                          ? 'rgba(96,165,250,0.1)'
                          : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isMine
                        ? 'rgba(240,180,41,0.3)'
                        : isAuctioneerMsg
                          ? 'rgba(96,165,250,0.25)'
                          : 'rgba(255,255,255,0.1)'}`,
                      color: isMine ? '#fde68a' : '#cbd5e1',
                      borderBottomRightRadius: isMine ? 4 : 12,
                      borderBottomLeftRadius: isMine ? 12 : 4,
                    }}>
                      {msg.message}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{msg.time}</div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
          )}

          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requestPanels.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <p style={{ color: '#475569', fontSize: 13 }}>No item requests yet</p>
                  <p style={{ color: '#334155', fontSize: 11, marginTop: 4 }}>
                    Vote on items in the "All items" section below
                  </p>
                </div>
              ) : (
                requestPanels.map(panel => (
                  <div key={panel.id} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: 12
                  }}>
                    <div style={{
                      fontWeight: 600, marginBottom: 4,
                      color: '#e2e8f0', fontSize: 13
                    }}>
                      {panel.auction_item_name}
                    </div>
                    <div style={{
                      fontSize: 11, color: '#475569', marginBottom: 10
                    }}>
                      {panel.likes + panel.dislikes} votes total
                    </div>

                    {/* vote bar */}
                    {(panel.likes + panel.dislikes) > 0 && (
                      <div style={{
                        height: 4, borderRadius: 4,
                        background: 'rgba(255,255,255,0.08)',
                        marginBottom: 10, overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.round(panel.likes / (panel.likes + panel.dislikes) * 100)}%`,
                          background: 'var(--gold)', borderRadius: 4,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginBottom: isAuctioneer ? 10 : 0 }}>
                      <button
                        onClick={() => voteItem(panel, 'like')}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8,
                          fontSize: 12, cursor: 'pointer', fontWeight: 500,
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          color: '#4ade80'
                        }}
                      >
                        👍 {panel.likes}
                      </button>
                      <button
                        onClick={() => voteItem(panel, 'dislike')}
                        style={{
                          flex: 1, padding: '6px 0', borderRadius: 8,
                          fontSize: 12, cursor: 'pointer', fontWeight: 500,
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: '#f87171'
                        }}
                      >
                        👎 {panel.dislikes}
                      </button>
                    </div>

                    {isAuctioneer && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={async () => {
                            try {
                              await auctionAPI.activateItem(panel.auction_room, panel.auction_item, 'request-panel')
                              notify.success('Item activated')
                              loadRequestedItems()
                            } catch { notify.error('Activation failed') }
                          }}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8,
                            fontSize: 12, cursor: 'pointer', fontWeight: 500,
                            background: 'rgba(240,180,41,0.15)',
                            border: '1px solid rgba(240,180,41,0.3)',
                            color: '#f0b429'
                          }}
                        >
                          Activate
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await auctionAPI.rejectRequestedItem(panel.auction_room, panel.auction_item)
                              notify.success('Request rejected')
                              loadRequestedItems()
                            } catch { notify.error('Reject failed') }
                          }}
                          style={{
                            flex: 1, padding: '6px 0', borderRadius: 8,
                            fontSize: 12, cursor: 'pointer', fontWeight: 500,
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#f87171'
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── input bar — only on chat tab ── */}
        {activeTab === 'chat' && (
          <div style={{
            display: 'flex', gap: 8, padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: '#1a1a2e', alignItems: 'center', flexShrink: 0
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 13, color: '#e2e8f0', outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                background: 'rgba(240,180,41,0.15)',
                border: '1px solid rgba(240,180,41,0.35)',
                color: '#f0b429', borderRadius: 8,
                padding: '8px 14px', fontSize: 13,
                fontWeight: 500, cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>

    </div>

  )
}
