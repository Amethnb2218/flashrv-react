import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiHeadphones, FiHelpCircle, FiMic, FiSend, FiVolume2, FiX } from 'react-icons/fi'
import apiFetch from '@/api/client'
import { useAuth } from '../../context/AuthContext'

const QUICK_PROMPTS = [
  'Comment réserver un salon ?',
  'Naka laa booking def ?',
  'Comment payer mon acompte ?',
  'Où voir mes réservations ?',
]

function SiteAssistantWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const role = String(user?.role || '').toUpperCase()
  const isAdminArea = location.pathname.startsWith('/admin')
  const isProArea = location.pathname.startsWith('/pro')
  const isClientScope = !isAuthenticated || role === 'CLIENT'
  const shouldRender = !isAdminArea && !isProArea && isClientScope

  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text: 'Bonjour. Je suis votre assistant client StyleFlow (français + wolof simple).',
      cta: null,
    },
  ])
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)

  const listRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  const supportsAudioRecording = useMemo(
    () => typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined',
    []
  )

  useEffect(() => {
    if (!isOpen || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, isOpen])

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      } catch {
        // noop
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  if (!shouldRender) return null

  const buildHistory = (list) =>
    list
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }))
      .filter((m) => m.text && (m.role === 'assistant' || m.role === 'user'))

  const sendPrompt = async (rawText) => {
    const clean = String(rawText || '').trim()
    if (!clean || sending) return

    const userMessage = { id: `user-${Date.now()}-${Math.random()}`, role: 'user', text: clean, cta: null }
    const snapshot = [...messages, userMessage]
    setMessages(snapshot)
    setInput('')
    setSending(true)

    try {
      const res = await apiFetch('/assistant/chat', {
        method: 'POST',
        body: {
          message: clean,
          history: buildHistory(messages),
          page: location.pathname,
        },
      })
      const answer = res?.data?.answer || 'Je n’ai pas de réponse pour le moment.'
      const cta = (() => {
        const text = String(answer || '').toLowerCase()
        if (text.includes('salon')) return { label: 'Voir les salons', path: '/salons' }
        if (text.includes('profil')) return { label: 'Mon profil', path: '/profile' }
        if (text.includes('dashboard') || text.includes('réservation')) return { label: 'Mon dashboard', path: '/dashboard' }
        return null
      })()
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          text: answer,
          cta,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          text: "Je n'arrive pas à répondre maintenant. Réessayez dans quelques secondes.",
          cta: null,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const startRecording = async () => {
    if (!supportsAudioRecording || recording || transcribing) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (!blob.size) return
        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }))
          const res = await apiFetch('/assistant/transcribe', { method: 'POST', body: form })
          const text = String(res?.data?.text || '').trim()
          if (text) {
            setInput(text)
            await sendPrompt(text)
          }
        } catch {
          // noop
        } finally {
          setTranscribing(false)
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setRecording(false)
    }
  }

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return
    recorderRef.current.stop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const speak = async (msg) => {
    if (!msg?.text) return
    setSpeakingId(msg.id)
    try {
      const res = await apiFetch('/assistant/speak', {
        method: 'POST',
        body: {
          text: msg.text,
          voice: 'alloy',
        },
      })
      const base64 = res?.data?.audioBase64
      if (base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
        await audio.play()
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(msg.text)
        utterance.lang = /[ñŋ]/i.test(msg.text) ? 'wo-SN' : 'fr-FR'
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(msg.text)
        utterance.lang = 'fr-FR'
        window.speechSynthesis.speak(utterance)
      }
    } finally {
      setSpeakingId(null)
    }
  }

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(37,99,235,0.45)] transition hover:scale-[1.02]"
        >
          <FiHelpCircle className="h-4 w-4" />
          Chat IA
        </button>
      ) : null}

      {isOpen ? (
        <div className="fixed bottom-6 right-6 z-[60] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Chat IA Client</p>
              <p className="text-xs text-cyan-50">FR + Wolof vocal</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 hover:bg-white/15">
              <FiX className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto bg-slate-50 px-4 py-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.cta ? (
                    <button
                      type="button"
                      onClick={() => navigate(msg.cta.path)}
                      className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      {msg.cta.label}
                    </button>
                  ) : null}
                  {msg.role === 'assistant' ? (
                    <button
                      type="button"
                      onClick={() => speak(msg)}
                      disabled={speakingId === msg.id}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      <FiVolume2 className="h-3 w-3" />
                      {speakingId === msg.id ? 'Lecture...' : 'Écouter'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                <FiHeadphones className="h-3 w-3 animate-pulse" />
                Réponse en cours...
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-white px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendPrompt(q)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendPrompt(input)
                }}
                placeholder={transcribing ? 'Transcription en cours...' : 'Posez votre question...'}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                disabled={transcribing}
              />
              {supportsAudioRecording ? (
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={transcribing}
                  className={`rounded-xl border px-3 py-2 ${
                    recording ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  } disabled:opacity-50`}
                  title={recording ? 'Arrêter' : 'Parler'}
                >
                  <FiMic className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => sendPrompt(input)}
                disabled={sending || transcribing}
                className="rounded-xl bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <FiSend className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default SiteAssistantWidget
