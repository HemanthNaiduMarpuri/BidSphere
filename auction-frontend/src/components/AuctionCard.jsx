import { useNavigate } from 'react-router-dom'

export default function AuctionCard({ auction }) {
  const navigate = useNavigate()

  const statusColor = {
    live: 'badge-live',
    scheduled: 'badge-scheduled',
    closed: 'badge-closed',
    draft: 'badge-closed',
  }

  return (
    <div
      className="card fade-in"
      onClick={() => navigate(`/auction/${auction.id}`)}
      style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${statusColor[auction.status] || 'badge-closed'}`}>
            {auction.status === 'live' && <span className="dot-live" />}
            {auction.status}
          </span>
          <span className={`badge ${auction.is_private ? 'badge-private' : 'badge-public'}`}>
            {auction.is_private ? 'Private' : 'Public'}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{auction.sector}</span>
      </div>

      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
        {auction.auction_title}
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>Base price</div>
          <div style={{ color: 'var(--gold)', fontWeight: 500 }}>
            ₹{parseFloat(auction.reserve_price).toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>
            {auction.status === 'live' ? 'Ends' : 'Starts'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
            {new Date(auction.status === 'live' ? auction.end_time : auction.start_time).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
