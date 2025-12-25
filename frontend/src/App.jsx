
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const sampleSlides = [
  {
    url: 'https://images.unsplash.com/photo-1529429617124-aee1f1650a5c?auto=format&fit=crop&w=1600&q=80',
    title: 'Coastal morning light',
    caption: 'Swap these URLs with your own images anytime.',
  },
  {
    url: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1600&q=80',
    title: 'City evenings',
    caption: 'Modern, responsive carousel built with plain React.',
  },
  {
    url: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1600&q=80',
    title: 'Creative workspaces',
    caption: 'Replace this list with any images you want to showcase.',
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

function App() {
  const slides = useMemo(() => sampleSlides, [])

  const handleGoogleSignIn = (event) => {
    event.preventDefault()
    // Wire this up to your Google OAuth 2.0 flow (e.g., Google Identity Services).
    alert('Hook this button to your Google OAuth 2.0 flow.')
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
          <form className="auth__form" onSubmit={(e) => e.preventDefault()}>
            <button type="button" className="google" onClick={handleGoogleSignIn}>
              <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.15 0 5.98 1.09 8.21 3.23l6.14-6.14C34.94 2.65 29.8 0.5 24 0.5 14.75 0.5 6.7 5.84 2.92 13.4l7.15 5.55C11.78 14.26 17.39 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24c0-1.56-.14-3.06-.4-4.5H24v9h12.65c-.55 2.95-2.24 5.46-4.76 7.15l7.14 5.55C43.9 37.57 46.5 31.28 46.5 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.07 28.95A14.44 14.44 0 0 1 9.5 24c0-1.71.3-3.35.85-4.88l-7.15-5.55A23.42 23.42 0 0 0 .5 24c0 3.78.9 7.35 2.5 10.5l7.07-5.55z"
                />
                <path
                  fill="#34A853"
                  d="M24 47.5c6.52 0 12.02-2.15 16.03-5.87l-7.14-5.55C30.99 37.96 27.72 39 24 39c-6.61 0-12.22-4.76-13.93-11.35l-7.15 5.55C6.7 42.16 14.75 47.5 24 47.5z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              Continue with Google
            </button>
            <p className="microcopy">
              Finish Setup OAuth flow in backend & connect to button
            </p>
          </form>
        </aside>
      </div>
    </div>
  )
}

export default App
