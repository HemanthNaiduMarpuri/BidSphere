import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import ProfileLayout from '../components/ProfileLayout'
import { paymentAPI } from '../services/api'
import { notify } from '../services/notify'

export default function Transactions() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [type, setType] = useState('topup')

    const filteredTransactions =
        filter === 'all'
            ? transactions
            : transactions.filter(t => t.payment_status === filter)

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const res = await paymentAPI.history(type)
                setTransactions(res.data.data)
            } catch {
                notify.error('Failed to load transactions')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [type])

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />
            <ProfileLayout>
            <div className="container-md" style={{ padding: '2rem' }}>
                

                    <h2 style={{
                        fontSize: 24,
                        fontWeight: 600,
                        marginBottom: '0.5rem'
                    }}>
                        Transaction History
                    </h2>

                    <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                        {['payment', 'topup'].map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 100,
                                    border: '1px solid var(--border)',
                                    background: type === t ? 'var(--gold)' : 'var(--bg2)',
                                    color: type === t ? '#000' : 'var(--text2)',
                                    fontWeight: type === t ? 600 : 400,
                                    cursor: 'pointer'
                                }}
                            >
                                {t === 'payment' ? 'Payments' : 'Topups'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
                        {['all', 'success', 'failed', 'yet_to_pay'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    fontSize: 12,
                                    padding: '6px 14px',
                                    borderRadius: 100,
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    background: filter === f ? 'var(--gold)' : 'var(--bg2)',
                                    color: filter === f ? '#000' : 'var(--text2)',
                                    fontWeight: filter === f ? 600 : 400
                                }}
                            >
                                {f.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p style={{ color: 'var(--text3)' }}>Loading...</p>
                    ) : transactions.length === 0 ? (
                        <p style={{ color: 'var(--text3)' }}>No transactions yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {filteredTransactions.map(t => (
                                <div key={t.id} style={{
                                    padding: '1rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg2)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>
                                            {t.auction_name || 'Top-up' }
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                                            {new Date(t.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600 }}>
                                            ₹{parseFloat(t.bid_amount || t.amount || 0).toLocaleString()}
                                        </div>

                                        <div style={{
                                            fontSize: 11,
                                            color:
                                                t.payment_status === 'success'
                                                    ? '#22c55e'
                                                    : t.payment_status === 'failed'
                                                        ? '#ef4444'
                                                        : '#f0b429'
                                        }}>
                                            {t.payment_status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                
            </div>
            </ProfileLayout>
        </div>
    )
}