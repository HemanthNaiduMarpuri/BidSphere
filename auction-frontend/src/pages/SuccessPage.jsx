import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext'
import { notify } from '../services/notify';

const SuccessPage = () => {
    const {user} = useAuth()
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading');
    const sessionId = searchParams.get('session_id');
    const navigate = useNavigate();

    const { refreshUser } = useAuth()

    useEffect(() => {
        let called = false;

        const verifyPayment = async () => {
            if (called) return;
            called = true;

            try {
                await API.get(`/payment/topup/success/?session_id=${sessionId}`);
                await refreshUser();
                notify.paymentDone()
                setStatus('success');
            } catch (error) {
                notify.error('Payment Unsuccessful')
                setStatus('error');
            }
        };

        if (sessionId) verifyPayment();
    }, [sessionId]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            <div className="container-sm" style={{ padding: '2rem' }}>
                <div className="card fade-in" style={{
                    textAlign: 'center',
                    padding: '3rem',
                    background: 'linear-gradient(135deg, rgba(124,106,247,0.15) 0%, rgba(46,204,113,0.12) 100%)',
                    border: '1px solid rgba(46,204,113,0.3)'
                }}>
                    {status === 'loading' && (
                        <>
                            <h2 style={{ marginBottom: '1rem' }}>Processing Payment...</h2>
                            <p style={{ color: 'var(--text2)' }}>
                                Please wait while we confirm your transaction.
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>

                            <h1 style={{
                                fontSize: '28px',
                                marginBottom: '0.5rem',
                                fontFamily: 'var(--font-display)'
                            }}>
                                Payment Successful
                            </h1>

                            <p style={{
                                color: 'var(--text2)',
                                marginBottom: '2rem'
                            }}>
                                Your wallet has been updated successfully.
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
                                    Go to Wallet
                                </button>

                                {!user.is_auctioner ?
                                <button
                                    className="btn-gold"
                                    onClick={() => navigate('/user-dashboard')}
                                >
                                    DashBoard
                                </button>: <></>}

                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>

                            <h1 style={{ fontSize: '26px', marginBottom: '0.5rem' }}>
                                Payment Failed
                            </h1>

                            <p style={{ color: 'var(--text2)', marginBottom: '2rem' }}>
                                Something went wrong while verifying your payment.
                            </p>

                            <button
                                className="btn-gold"
                                onClick={() => navigate('/wallet')}
                            >
                                Try Again
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;

