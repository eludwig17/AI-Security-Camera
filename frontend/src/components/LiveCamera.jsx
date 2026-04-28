import { useEffect, useRef, useState, useCallback } from 'react'

function LiveCamera({ onStatusChange }) {
  const videoRef = useRef(null)
  const pcRef = useRef(null)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const [status, setStatus] = useState('disconnected')

  const updateStatus = useCallback((s) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  const cleanup = useCallback(() => {
    clearTimeout(reconnectTimer.current)
    pcRef.current?.close()
    pcRef.current = null
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const connect = useCallback(() => {
    cleanup()
    updateStatus('connecting')

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/signaling`)
    wsRef.current = ws

    let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]

    ws.onopen = () => console.log('[Camera] Signaling connected')

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'ice_config') {
        iceServers = data.servers

        const pc = new RTCPeerConnection({ iceServers })
        pcRef.current = pc

        pc.addTransceiver('video', { direction: 'recvonly' })

        pc.ontrack = (evt) => {
          if (videoRef.current && evt.streams[0]) {
            videoRef.current.srcObject = evt.streams[0]
          }
        }

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState
          if (state === 'connected' || state === 'completed') {
            updateStatus('connected')
          } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            updateStatus('disconnected')
            reconnectTimer.current = setTimeout(connect, 3000)
          }
        }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await new Promise((resolve) => {
          if (pc.iceGatheringState === 'complete') return resolve()
          const check = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', check)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', check)
          setTimeout(resolve, 2000)
        })

        ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp }))
      }

      if (data.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: data.sdp })
        )
      }
    }

    ws.onerror = () => updateStatus('disconnected')
    ws.onclose = () => {
      if (pcRef.current?.iceConnectionState !== 'connected') {
        updateStatus('disconnected')
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }
  }, [cleanup, updateStatus])

  useEffect(() => {
    connect()
    return cleanup
  }, [connect, cleanup])

  const statusColor = {
    connected: '#22c55e',
    connecting: '#f59e0b',
    disconnected: '#ef4444',
  }[status] ?? '#ef4444'

  const statusLabel = {
    connected: 'Live',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
  }[status] ?? 'Disconnected'

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16 / 9',
      background: '#080e1a',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.4)',
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: '14px',
        left: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 12px',
        borderRadius: '999px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: statusColor,
          boxShadow: status === 'connected' ? `0 0 0 3px ${statusColor}33` : 'none',
          animation: status === 'connected' ? 'pulse 2s infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#e2e8f0',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {statusLabel}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        top: '14px',
        right: '14px',
        padding: '5px 12px',
        borderRadius: '999px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '11px',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        CAM 01
      </div>

      {status !== 'connected' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: 'rgba(8,14,26,0.75)',
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: `2px solid ${statusColor}44`,
            borderTopColor: statusColor,
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {status === 'connecting' ? 'Establishing connection...' : 'Signal lost — retrying'}
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(34,197,94,0.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LiveCamera