let socket = null
let reconnectTimer = null
let activeToken = ''
let listeners = new Set()
let manuallyClosed = false

const emit = (event) => {
  listeners.forEach((fn) => {
    try {
      fn(event)
    } catch (e) {
      // ignore listener errors
    }
  })
}

const resolveWsUrl = () => {
  const apiBase = (import.meta.env.VITE_API_URL || '/api').trim()
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const url = new URL(apiBase)
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${url.host}/realtime`
  }
  if (typeof window === 'undefined') return 'ws://localhost:4000/realtime'
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (import.meta.env.DEV) {
    const port = import.meta.env.VITE_BACKEND_PORT || '4000'
    return `${proto}//${window.location.hostname}:${port}/realtime`
  }
  return `${proto}//${window.location.host}/realtime`
}

const scheduleReconnect = () => {
  if (reconnectTimer || !activeToken || manuallyClosed) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectRealtime(activeToken)
  }, 2000)
}

export const connectRealtime = (token) => {
  const nextToken = String(token || '').trim()
  if (!nextToken) return null
  activeToken = nextToken
  manuallyClosed = false

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }

  const base = resolveWsUrl()
  const wsUrl = `${base}?token=${encodeURIComponent(nextToken)}`
  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    emit({ type: 'realtime:open' })
  }
  socket.onmessage = (evt) => {
    try {
      const parsed = JSON.parse(String(evt.data || '{}'))
      emit(parsed)
    } catch (e) {
      // ignore invalid payload
    }
  }
  socket.onclose = () => {
    emit({ type: 'realtime:close' })
    socket = null
    scheduleReconnect()
  }
  socket.onerror = () => {
    emit({ type: 'realtime:error' })
  }

  return socket
}

export const subscribeRealtime = (listener) => {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const disconnectRealtime = () => {
  manuallyClosed = true
  activeToken = ''
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    socket.close()
    socket = null
  }
}

