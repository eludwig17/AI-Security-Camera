import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import '../App.css'
import LiveCamera from '../components/LiveCamera.jsx'

function ViewLive() {
  const [user, setUser] = useState(null)
  const [camStatus, setCamStatus] = useState('disconnected')
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('googleUser')
    if (stored) {
      setUser(JSON.parse(stored))
    } else {
      navigate('/')
    }
  }, [navigate])

  const handleLogout = () => {
    googleLogout()
    localStorage.removeItem('googleUser')
    setUser(null)
    navigate('/')
  }

  return (
    <div className="page">
      <div className="page__header">
        <p className="pill">Live Monitoring</p>
        <h1>View Live Feed</h1>
        <p className="lede">
          Incoming video stream from your external device will render in the panel below.
        </p>
      </div>

      <div className="live-grid">
        <section className="panel live-panel">
          <LiveCamera onStatusChange={setCamStatus} />
        </section>

        <aside className="panel live-actions">
          <p className="eyebrow">Session</p>
          <h3>{user?.name || 'Guest'}</h3>
          <p className="microcopy">{user?.email || 'Not signed in'}</p>

          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: camStatus === 'connected'
                ? 'rgba(34,197,94,0.12)'
                : camStatus === 'connecting'
                ? 'rgba(245,158,11,0.12)'
                : 'rgba(239,68,68,0.12)',
              color: camStatus === 'connected' ? '#22c55e'
                : camStatus === 'connecting' ? '#f59e0b'
                : '#ef4444',
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'currentColor',
              }} />
              {camStatus === 'connected' ? 'Stream live'
                : camStatus === 'connecting' ? 'Connecting'
                : 'Offline'}
            </div>
          </div>

          <div className="user-card__actions">
            <button type="button" className="google" onClick={() => navigate('/home')}>
              Go to Home
            </button>
            <button type="button" className="google" onClick={() => navigate('/archives')}>
              View Archives
            </button>
            <button type="button" className="google" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ViewLive