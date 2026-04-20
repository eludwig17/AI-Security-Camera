import { useEffect, useRef, useState, useCallback } from 'react'

function LiveCamera({onStatusChange}) {
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

        // receive video
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

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        borderRadius: '8px',
        background: '#0f172a',
      }}
    />
  )
}

export default LiveCamera