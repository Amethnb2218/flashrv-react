import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiHeadphones, FiHelpCircle, FiMic, FiSend, FiVolume2, FiX } from 'react-icons/fi'
import apiFetch from '@/api/client'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_PATH } from '../../utils/adminPath'

const ASSISTANT_LANGUAGE_KEY = 'flashrv_site_assistant_language'
const WOLof_HINTS = ['naka', 'salam', 'na nga def', 'mangi', 'maa ngi', 'jereje', 'waaw', 'deedet', 'lan', 'ana', 'ndimbal', 'booking def', 'sama']

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'fr', label: 'Francais' },
  { value: 'wo', label: 'Wolof' },
]

const LANGUAGE_COPY = {
  auto: {
    launcher: 'Aide',
    greeting: "Bonjour. Je suis votre assistant client Jolof'Era. Je peux repondre en francais ou en wolof simple.",
    hint: 'Choisissez votre langue ou laissez Auto.',
    placeholder: 'Posez votre question...',
    quickPrompts: [
      'Comment reserver un salon ?',
      'Naka laa booking def ?',
      'Comment payer mon acompte ?',
      'Ou voir mes reservations ?',
    ],
    listen: 'Ecouter',
    listening: 'Lecture...',
    typing: 'Reponse en cours...',
    recordTitle: 'Parler',
    stopRecordTitle: 'Arreter',
    errorReply: "Je n'arrive pas a repondre maintenant. Reessayez dans quelques secondes.",
  },
  fr: {
    launcher: 'Aide',
    greeting: "Bonjour. Je suis votre assistant client Jolof'Era. Je reponds en francais.",
    hint: 'Le chat vous repondra maintenant en francais.',
    placeholder: 'Posez votre question...',
    quickPrompts: [
      'Comment reserver un salon ?',
      'Comment payer mon acompte ?',
      'Ou voir mes reservations ?',
      'Comment modifier mon profil ?',
    ],
    listen: 'Ecouter',
    listening: 'Lecture...',
    typing: 'Reponse en cours...',
    recordTitle: 'Parler',
    stopRecordTitle: 'Arreter',
    errorReply: "Je n'arrive pas a repondre maintenant. Reessayez dans quelques secondes.",
  },
  wo: {
    launcher: 'Ndimbal',
    greeting: "Salaam. Man maa di sa assistant client Jolof'Era. Man naa la dimbali ci wolof bu yomb.",
    hint: 'Le chat dina la tontu ci wolof.',
    placeholder: 'Laajal sa laaj...',
    quickPrompts: [
      'Naka laa booking def ?',
      'Ana laa gis sama reservations yi ?',
      'Naka laa fey acompte bi ?',
      'Naka laa soppi sama profil ?',
    ],
    listen: 'Degg',
    listening: 'Degg naa...',
    typing: 'Maa ngi tontu...',
    recordTitle: 'Wax',
    stopRecordTitle: 'Taxawal',
    errorReply: 'Manuma tontu leegi. Jekkal, jeyaatal ci ay secondes.',
  },
}

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const normalizeAssistantLanguage = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return ['auto', 'fr', 'wo'].includes(normalized) ? normalized : 'auto'
}

const looksLikeWolofText = (value) => {
  const text = normalizeText(value)
  return Boolean(text) && WOLof_HINTS.some((hint) => text.includes(hint))
}

const getSpeechLang = (language, text = '') => {
  if (language === 'wo') return 'wo-SN'
  if (language === 'fr') return 'fr-FR'
  return looksLikeWolofText(text) ? 'wo-SN' : 'fr-FR'
}

const createId = (role) => `${role}-${Date.now()}-${Math.random()}`

const createAssistantMessage = (text, cta = null) => ({
  id: createId('assistant'),
  role: 'assistant',
  text,
  cta,
})

const getInitialAssistantLanguage = () => {
  if (typeof window === 'undefined') return 'auto'
  try {
    return normalizeAssistantLanguage(window.localStorage.getItem(ASSISTANT_LANGUAGE_KEY))
  } catch {
    return 'auto'
  }
}

function SiteAssistantWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const role = String(user?.role || '').toUpperCase()
  const isAdminArea = location.pathname.startsWith(ADMIN_PATH) || location.pathname.startsWith('/admin')
  const isProArea = location.pathname.startsWith('/pro')
  const isBookingPage = location.pathname.startsWith('/booking')
  const isClientScope = !isAuthenticated || role === 'CLIENT'
  const shouldRender = !isAdminArea && !isProArea && isClientScope

  const [assistantLanguage, setAssistantLanguage] = useState(() => getInitialAssistantLanguage())
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => [
    createAssistantMessage(LANGUAGE_COPY[getInitialAssistantLanguage()].greeting),
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

  const languageCopy = LANGUAGE_COPY[assistantLanguage] || LANGUAGE_COPY.auto

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(ASSISTANT_LANGUAGE_KEY, assistantLanguage)
    } catch {
      // noop
    }
  }, [assistantLanguage])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.role !== 'assistant') return prev
      return [{ ...prev[0], text: languageCopy.greeting }]
    })
  }, [languageCopy.greeting])

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
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  if (!shouldRender) return null

  const buildHistory = (list) =>
    list
      .slice(-10)
      .map((message) => ({ role: message.role, text: message.text }))
      .filter((message) => message.text && (message.role === 'assistant' || message.role === 'user'))

  const getMessageCta = (answer, prompt) => {
    const text = normalizeText(`${prompt || ''} ${answer || ''}`)
    if (text.includes('salon')) return { label: 'Voir les salons', path: '/salons' }
    if (text.includes('profil') || text.includes('profile') || text.includes('compte')) return { label: 'Mon profil', path: '/profile' }
    if (text.includes('dashboard') || text.includes('reservation') || text.includes('rendez') || text.includes('booking')) {
      return { label: 'Mon dashboard', path: '/dashboard' }
    }
    return null
  }

  const sendPrompt = async (rawText) => {
    const clean = String(rawText || '').trim()
    if (!clean || sending) return

    const userMessage = { id: createId('user'), role: 'user', text: clean, cta: null }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const res = await apiFetch('/assistant/chat', {
        method: 'POST',
        body: {
          message: clean,
          history: buildHistory(messages),
          page: location.pathname,
          language: assistantLanguage,
        },
      })
      const answer = res?.data?.answer || "Je n'ai pas de reponse pour le moment."
      const cta = getMessageCta(answer, clean)
      setMessages((prev) => [...prev, createAssistantMessage(answer, cta)])
    } catch {
      setMessages((prev) => [...prev, createAssistantMessage(languageCopy.errorReply)])
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
          form.append('language', assistantLanguage)
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
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const speak = async (message) => {
    if (!message?.text) return
    setSpeakingId(message.id)

    try {
      const res = await apiFetch('/assistant/speak', {
        method: 'POST',
        body: {
          text: message.text,
          voice: 'alloy',
          language: assistantLanguage,
        },
      })
      const base64 = res?.data?.audioBase64
      if (base64) {
        const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
        await audio.play()
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message.text)
        utterance.lang = getSpeechLang(assistantLanguage, message.text)
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message.text)
        utterance.lang = getSpeechLang(assistantLanguage, message.text)
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
          className={`fixed right-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-primary-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-primary-700 shadow-md transition hover:bg-primary-50 hover:shadow-lg sm:right-6 ${
            isBookingPage
              ? 'bottom-[calc(env(safe-area-inset-bottom)+6rem)] sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
              : 'bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
          }`}
        >
          <FiHelpCircle className="h-4 w-4 text-blue-500" />
          {languageCopy.launcher}
        </button>
      ) : null}

      {isOpen ? (
        <div
          className={`fixed right-4 z-[60] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-2xl sm:right-6 ${
            isBookingPage
              ? 'bottom-[calc(env(safe-area-inset-bottom)+6rem)] sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
              : 'bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
          }`}
        >
          <div className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Assistant client</p>
                <p className="mt-1 text-[11px] text-white/80">{languageCopy.hint}</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-2 hover:bg-white/15">
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = assistantLanguage === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAssistantLanguage(option.value)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                      selected
                        ? 'border-white bg-white text-blue-700'
                        : 'border-white/35 bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto bg-primary-50 px-4 py-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] rounded-xl border px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'border-primary-900 bg-primary-900 text-white'
                      : 'border-primary-200 bg-white text-primary-900'
                  }`}
                >
                  <p>{message.text}</p>
                  {message.cta ? (
                    <button
                      type="button"
                      onClick={() => navigate(message.cta.path)}
                      className="mt-2 rounded-lg bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-200"
                    >
                      {message.cta.label}
                    </button>
                  ) : null}
                  {message.role === 'assistant' ? (
                    <button
                      type="button"
                      onClick={() => speak(message)}
                      disabled={speakingId === message.id}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      <FiVolume2 className="h-3 w-3" />
                      {speakingId === message.id ? languageCopy.listening : languageCopy.listen}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {sending ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-3 py-2 text-xs text-primary-500">
                <FiHeadphones className="h-3 w-3 animate-pulse" />
                {languageCopy.typing}
              </div>
            ) : null}
          </div>

          <div className="border-t border-primary-100 bg-white px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {languageCopy.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendPrompt(prompt)}
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs text-primary-700 hover:bg-primary-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendPrompt(input)
                }}
                placeholder={transcribing ? 'Transcription en cours...' : languageCopy.placeholder}
                className="flex-1 rounded-xl border border-primary-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                disabled={transcribing}
              />
              {supportsAudioRecording ? (
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={transcribing}
                  className={`rounded-xl border px-3 py-2 ${
                    recording ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-primary-200 text-primary-700 hover:bg-primary-50'
                  } disabled:opacity-50`}
                  title={recording ? languageCopy.stopRecordTitle : languageCopy.recordTitle}
                >
                  <FiMic className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => sendPrompt(input)}
                disabled={sending || transcribing}
                className="rounded-xl bg-primary-900 px-3 py-2 text-white hover:bg-primary-800 disabled:opacity-50"
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
