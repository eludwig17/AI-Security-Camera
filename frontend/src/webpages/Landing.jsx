
import { useEffect, useMemo, useState } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useNavigate } from 'react-router-dom'
import '../App.css'

const sampleSlides = [
  {
    // url: 'https://images.unsplash.com/photo-1529429617124-aee1f1650a5c?auto=format&fit=crop&w=1600&q=80',
    title: 'Page1Test',
    caption: 'Replace caption later',
  },
  {
    // url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1600&q=80',
    title: 'Page2Test',
    caption: 'Replace caption later',
  },
  {
    // url: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1600&q=80',
    title: 'Page3Test',
    caption: 'Replace caption later',
  },
]

function Carousel({ slides, autoAdvanceMs = 4500 }) {
  const [current, setCurrent] = useState(0)
  const hasSlides = slides.length > 0

  useEffect(() => {
    if (!hasSlides) return undefined

    const id = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, autoAdvanceMs)

    return () => window.clearInterval(id)
  }, [slides.length, autoAdvanceMs, hasSlides])

  if (!hasSlides) {
    return <div className="carousel empty">Add images to see them here.</div>
  }

  const { url, title, caption } = slides[current]

  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length)

  return (
    <div className="carousel">
      <div className="carousel__media">
        <img src={url} alt={title} className="carousel__image" />
        <div className="carousel__scrim" />
        <div className="carousel__meta">
          <p className="eyebrow">Spotlight</p>
          <h3>{title}</h3>
          <p>{caption}</p>
        </div>
      </div>
      <div className="carousel__controls">
        <button type="button" onClick={goPrev} aria-label="Previous slide">
          ‹
        </button>
        <div className="dots">
          {slides.map((_, idx) => (
            <span key={idx} className={idx === current ? 'dot active' : 'dot'} />
          ))}
        </div>
        <button type="button" onClick={goNext} aria-label="Next slide">
          ›
        </button>
      </div>
    </div>
  )
}

function Landing() {
  const slides = useMemo(() => sampleSlides, [])
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('googleUser')
    return stored ? JSON.parse(stored) : null
  })

  const handleGoogleSuccess = (credentialResponse) => {
    if (!credentialResponse?.credential) return
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      const profile = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      }
      setUser(profile)
      localStorage.setItem('googleUser', JSON.stringify(profile))
      navigate('/home')
    } catch (err) {
      console.error('Failed to decode Google JWT', err)
      alert('Could not read your Google profile. Please try again.')
    }
  }

  const handleGoogleError = () => {
    alert('Google sign-in failed. Please try again.')
  }

  const handleLogout = () => {
    googleLogout()
    setUser(null)
    localStorage.removeItem('googleUser')
    navigate('/')
  }

  return (
    <div className="page">
      <div className="page__header">
        <p className="pill">Elijah Ludwig - 4th Year Computer Science Student @ Concordia University Irvine</p>
        <h1>Artificial Intelligence Security Camera</h1>
        <p className="lede">
          Fill in later
        </p>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Gallery</p>
              <h2>Project Examples</h2>
            </div>
          </div>
          <Carousel slides={slides} />
        </section>

        <aside className="panel auth">
          <p className="eyebrow">Account</p>
          <h2>Login with Google</h2>
          <p className="lede">
            Finish setting up OAuth2.0
          </p>
          <div className="auth__form">
            {!user ? (
              <>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap />
                <p className="microcopy">
                  Continue with your Google account to access the dashboard.
                </p>
              </>
            ) : (
              <div className="user-card">
                <div className="user-card__info">
                  {user.picture && <img src={user.picture} alt={user.name} />}
                  <div>
                    <p className="eyebrow">Signed in</p>
                    <h3>{user.name}</h3>
                    <p className="microcopy">{user.email}</p>
                  </div>
                </div>
                <div className="user-card__actions">
                  <button type="button" className="google" onClick={() => navigate('/home')}>
                    Go to Home
                  </button>
                  <button type="button" className="google" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Landing