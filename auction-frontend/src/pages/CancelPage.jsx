import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { notify } from '../services/notify';

const CancelPage = () => {
    const navigate = useNavigate();
    useEffect(()=>{
        notify.error('Payment Cancelled')
    }, [])

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            <div className="container-sm" style={{ padding: '2rem' }}>
                <div className="card fade-in" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    background: 'linear-gradient(135deg, rgba(231,76,60,0.12) 0%, rgba(241,196,15,0.12) 100%)',
                    border: '1px solid rgba(231,76,60,0.3)'
                }}>

                    <h1 style={{
                        fontSize: '28px',
                        marginBottom: '0.5rem',
                        fontFamily: 'var(--font-display)'
                    }}>
                        Payment Cancelled
                    </h1>

                    <p style={{
                        color: 'var(--text2)',
                        marginBottom: '2rem'
                    }}>
                        Your payment was cancelled. No money was deducted.
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'center'
                    }}>
                        <button
                            className="btn-outline"
                            onClick={() => navigate('/wallet')}
                        >
                            Back to Wallet
                        </button>

                        <button
                            className="btn-gold"
                            onClick={() => navigate('/')}
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancelPage;