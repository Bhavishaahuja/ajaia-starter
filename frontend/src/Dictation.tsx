import { useEffect, useRef, useState } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'

// the browser's speech recognition, typed by hand so we don't need extra type packages
type SpeechAlt = { transcript: string; confidence?: number }
type SpeechResultList = ArrayLike<{ isFinal: boolean } & ArrayLike<SpeechAlt>>
type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SpeechCtor = new () => SpeechRec

// Chrome and Edge have it; Firefox does not
function speechCtor(): SpeechCtor | null {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// keep the alternative the browser is most sure of
function bestText(result: ArrayLike<SpeechAlt>): string {
  let best = result[0]
  for (let j = 1; j < result.length; j++) {
    if ((result[j].confidence ?? 0) > (best.confidence ?? 0)) best = result[j]
  }
  return best.transcript
}

// small text cleanup: drop filler words, collapse a word said twice in a row, tidy spaces
function cleanText(text: string): string {
  return text
    .replace(/\b(um+|uh+|erm)\b,?\s*/gi, '')
    .replace(/\b(\w+)(\s+\1\b)+/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// readable text for the errors the browser reports
function errorText(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone blocked. Allow it in the browser settings.'
    case 'network':
      return 'Speech service unreachable. Check your connection.'
    case 'no-speech':
      return 'No speech heard. Click Mic and try again.'
    case 'audio-capture':
      return 'No microphone found.'
    default:
      return `Dictation stopped: ${code}`
  }
}

// add a space before the new words when needed, and capitalize after a sentence end
function formatForCursor(editor: TiptapEditor, text: string): string {
  const { from } = editor.state.selection
  const before = editor.state.doc.textBetween(Math.max(0, from - 2), from, ' ')
  const startsSentence = before.trim() === '' || /[.!?]\s*$/.test(before)
  const body = startsSentence ? text.charAt(0).toUpperCase() + text.slice(1) : text
  const needsSpace = before.length > 0 && !/\s$/.test(before)
  return (needsSpace ? ' ' : '') + body + ' '
}

export default function Dictation({ editor }: { editor: TiptapEditor }) {
  const Ctor = speechCtor()
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef<SpeechRec | null>(null)
  // true while the user wants the mic on. Chrome ends sessions on silence, so onend restarts them.
  const wantOn = useRef(false)

  // stop the mic if the user leaves the page or the editor
  useEffect(() => {
    return () => {
      wantOn.current = false
      recRef.current?.stop()
    }
  }, [])

  if (!Ctor) {
    return <span className="px-2 text-xs text-slate-500">Dictation needs Chrome or Edge.</span>
  }

  function startSession(make: SpeechCtor) {
    const rec = new make()
    rec.lang = navigator.language || 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 3
    rec.onresult = (e) => {
      // final pieces go into the page. Interim pieces only show in grey.
      let final = ''
      let pending = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = bestText(e.results[i])
        if (e.results[i].isFinal) final += piece
        else pending += piece
      }
      setInterim(pending.trim())
      const text = cleanText(final)
      if (text) editor.chain().focus().insertContent(formatForCursor(editor, text)).run()
    }
    rec.onerror = (e) => {
      setError(errorText(e.error))
      // these mean the mic cannot be used at all, so stop trying
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(e.error)) {
        wantOn.current = false
      }
    }
    rec.onend = () => {
      setInterim('')
      if (wantOn.current) {
        try {
          startSession(make)
        } catch {
          wantOn.current = false
          setListening(false)
        }
      } else {
        setListening(false)
      }
    }
    recRef.current = rec
    rec.start()
  }

  function toggle() {
    setError('')
    if (listening) {
      wantOn.current = false
      recRef.current?.stop()
      setListening(false)
      setInterim('')
      return
    }
    wantOn.current = true
    setListening(true)
    startSession(Ctor!)
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={listening}
        aria-label={listening ? 'Stop dictation' : 'Start dictation'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
        className={`rounded px-2 py-1 text-sm ${
          listening ? 'bg-red-600 text-white' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {listening ? 'Stop' : 'Mic'}
      </button>
      {listening && (
        <span className="flex max-w-[16rem] items-center gap-1 text-xs text-slate-600" role="status">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
          <span>Listening</span>
          {interim && <span className="truncate italic text-slate-400">{interim}</span>}
        </span>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  )
}
