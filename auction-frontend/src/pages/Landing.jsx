import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Stepper, { Step } from '../components/Stepper';

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>

      <Navbar />

      <section style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '60px 40px',
        flexWrap: 'wrap',
        gap: 30
      }}>
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 38, marginBottom: 12 }}>
            Live Auctions. Real-Time Bidding.
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 15 }}>
            Join auction rooms, place bids instantly, and compete live
            with others in a fast and interactive environment.
          </p>

          <button
            onClick={() => navigate('/home')}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#f0b429',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Explore Auctions →
          </button>
        </div>

        <img
          src="https://images.pexels.com/photos/7563679/pexels-photo-7563679.jpeg"
          alt="auction"
          style={{
            width: '420px',
            maxWidth: '100%',
            borderRadius: 12,
            opacity: 0.9
          }}
        />
      </section>

      <section style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        padding: '20px 40px',
        flexWrap: 'wrap'
      }}>
        {[
          '⚡ Live Bidding',
          '💬 Real-Time Chat',
          '⏱ Smart Timer',
          '🔐 Secure Login'
        ].map((f, i) => (
          <div key={i} style={{
            padding: '12px 18px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            fontSize: 14
          }}>
            {f}
          </div>
        ))}
      </section>
      <section style={{
        maxWidth: '800px',
        margin: '4rem auto',
        padding: '2rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: '2rem',
          background: 'linear-gradient(to right, #fff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          How It Works
        </h2>
        <Stepper
          initialStep={1}
          onStepChange={(step) => {
            console.log(step);
          }}
          onFinalStepCompleted={() => console.log("All steps completed!")}
          backButtonText="Previous"
          nextButtonText="Next"
        >
          <Step>
            <h2>Step 1</h2>
            <h1>Join Auction Room</h1>
          </Step>
          <Step>
            <h2>Step 2</h2>
            <h1>Place Live Bids</h1>
          </Step>

          <Step>
            <h2>Final Step</h2>
            <h1>Win The Item</h1>
          </Step>
        </Stepper>
        </section>

        <footer style={{
          textAlign: 'center',
          padding: 20,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: '#64748b',
          fontSize: 13
        }}>
          © 2026 BidSphere. All rights reserved.
        </footer>
    </div>
  )
}

const linkStyle = {
  color: '#cbd5e1',
  textDecoration: 'none',
  fontSize: 14
}