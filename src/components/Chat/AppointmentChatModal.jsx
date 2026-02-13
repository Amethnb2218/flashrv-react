import { useEffect, useMemo, useRef, useState } from 'react'
import { FiMic, FiSend, FiStopCircle, FiTrash2 } from 'react-icons/fi'
import Modal from '../UI/Modal'
import apiFetch from '@/api/client'
import { resolveMediaUrl } from '../../utils/media'
import { connectRealtime, subscribeRealtime } from '../../utils/realtime'

function AppointmentChatModal({
  isOpen,
  onClose,
  appointment,
  appointments = [],
  showThreadList = false,
  currentUserId,
}) {
  const threads = useMemo(() => {
    if (!showThreadList) return appointment ? [appointment] : []
    const list = Array.isArray(appointments) ? appointments : []
    const seen = new Set()
    return list.filter((item) => {
      const key = String(item?.id || '')
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [showThreadList, appointments, appointment])

  const [selectedAppointmentId, setSelectedAppointmentId] = useState(appointment?.id || null)
  const activeAppointment = useMemo(() => {
    if (!showThreadList) return appointment || null
    if (!threads.length) return null
    const selected = threads.find((t) => String(t.id) === String(selectedAppointmentId))
    return selected || threads[0]
  }, [showThreadList, appointment, threads, selectedAppointmentId])
  const appointmentId = activeAppointment?.id || null

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [voiceBlob, setVoiceBlob] = useState(null)
  const [voicePreview, setVoicePreview] = useState('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    if (!showThreadList) {
      setSelectedAppointmentId(appointment?.id || null)
      return
    }
    if (appointment?.id) {
      setSelectedAppointmentId(appointment.id)
      return
    }
    if (!selectedAppointmentId && threads.length > 0) {
      setSelectedAppointmentId(threads[0].id)
    }
  }, [isOpen, showThreadList, appointment, threads, selectedAppointmentId])

  const title = useMemo(() => {
    if (showThreadList) return 'Chat clients'
    const salonName = activeAppointment?.salon?.name
    return salonName ? `Chat reservation - ${salonName}` : 'Chat reservation'
  }, [showThreadList, activeAppointment])

  const getThreadPrimary = (item) => {
    if (showThreadList) return item?.clientName || item?.client?.name || 'Client'
    return item?.salon?.name || 'Salon'
  }

  const getThreadSecondary = (item) => {
    const service = item?.serviceName || item?.service?.name || ''
    const date = item?.date ? new Date(item.date).toLocaleDateString('fr-FR') : ''
    const time = item?.time || item?.startTime || ''
    return [service, date, time].filter(Boolean).join(' • ')
  }

  const loadMessages = async () => {
    if (!appointmentId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/appointments/${appointmentId}/messages`)
      const list = res?.data?.messages || res?.messages || []
      setMessages(list)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !appointmentId) return
    loadMessages()
    const token = localStorage.getItem('flashrv_token')
    if (token) connectRealtime(token)
    const unsubscribe = subscribeRealtime((event) => {
      if (event?.type !== 'chat:new') return
      const payload = event?.payload || {}
      if (payload.appointmentId !== appointmentId || !payload.message) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev
        return [...prev, payload.message]
      })
    })
    return unsubscribe
  }, [isOpen, appointmentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setText('')
      setVoiceBlob(null)
      setVoicePreview('')
    }
  }, [isOpen])

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        alert('Enregistrement vocal non supporte sur ce navigateur.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setVoiceBlob(blob)
        setVoicePreview(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
    } catch {
      alert("Impossible d'acceder au microphone.")
    }
  }

  const stopRecording = () => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop()
      setRecording(false)
    }
  }

  const clearVoice = () => {
    if (voicePreview) URL.revokeObjectURL(voicePreview)
    setVoiceBlob(null)
    setVoicePreview('')
  }

  const sendMessage = async () => {
    if (!appointmentId) return
    const cleanText = text.trim()
    if (!cleanText && !voiceBlob) return
    setSending(true)
    try {
      const form = new FormData()
      if (cleanText) form.append('text', cleanText)
      if (voiceBlob) form.append('voice', new File([voiceBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }))
      const res = await apiFetch(`/appointments/${appointmentId}/messages`, { method: 'POST', body: form })
      const msg = res?.data?.message || res?.message
      if (msg) setMessages((prev) => [...prev, msg])
      setText('')
      clearVoice()
      await loadMessages()
    } catch {
      // noop
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="p-4">
        <div className={`grid gap-4 ${showThreadList ? 'md:grid-cols-[260px_1fr]' : 'grid-cols-1'}`}>
          {showThreadList ? (
            <aside className="rounded-xl border border-gray-100 bg-white p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Conversations</p>
              <div className="mt-1 max-h-80 overflow-y-auto space-y-1">
                {threads.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-gray-500">Aucun client pour le moment.</p>
                ) : null}
                {threads.map((thread) => {
                  const active = String(thread.id) === String(appointmentId)
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedAppointmentId(thread.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition ${
                        active ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{getThreadPrimary(thread)}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{getThreadSecondary(thread) || 'Reservation'}</p>
                    </button>
                  )
                })}
              </div>
            </aside>
          ) : null}

          <div className="space-y-4">
            <div className="h-80 overflow-y-auto border border-gray-100 rounded-xl bg-white p-3 space-y-3">
              {!appointmentId ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Selectionnez une conversation pour demarrer le chat.
                </p>
              ) : null}
              {loading ? <p className="text-sm text-gray-500">Chargement...</p> : null}
              {!loading && appointmentId && messages.length === 0 ? <p className="text-sm text-gray-500">Aucun message.</p> : null}
              {messages.map((m) => {
                const mine = m.senderId === currentUserId
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${mine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <p className={`text-xs mb-1 ${mine ? 'text-gray-300' : 'text-gray-500'}`}>{m.sender?.name || 'Utilisateur'}</p>
                      {m.text ? <p className="text-sm whitespace-pre-wrap">{m.text}</p> : null}
                      {m.audioUrl ? (
                        <audio controls src={resolveMediaUrl(m.audioUrl)} className="mt-2 w-full" />
                      ) : null}
                      <p className={`text-[11px] mt-1 ${mine ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(m.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {voicePreview ? (
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Message vocal pret</p>
                <audio controls src={voicePreview} className="w-full" />
                <button
                  type="button"
                  onClick={clearVoice}
                  className="mt-2 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                >
                  <FiTrash2 /> Supprimer l'audio
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ecrire un message..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
              {!recording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                  title="Enregistrer un vocal"
                >
                  <FiMic />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-3 py-3 rounded-xl border border-red-300 text-red-600 hover:bg-red-50"
                  title="Arreter l'enregistrement"
                >
                  <FiStopCircle />
                </button>
              )}
              <button
                type="button"
                disabled={!appointmentId || sending || (!text.trim() && !voiceBlob)}
                onClick={sendMessage}
                className="px-4 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <FiSend /> Envoyer
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default AppointmentChatModal
