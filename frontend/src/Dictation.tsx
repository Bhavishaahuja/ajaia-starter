import { useEffect, useRef, useState } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'

// the browser's speech recognition, typed by hand so we don't need extra type packages
type SpeechResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
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

export default function Dictation({ editor }: { editor: TiptapEditor }) {
  const Ctor = speechCtor()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef<SpeechRec | null>(null)

  // stop the mic if the user leaves the page or the editor
  useEffect(() => {
    return () => recRef.current?.stop()
  }, [])

  if (!Ctor) {
    return <span className="px-2 text-xs text-slate-500">Dictation needs Chrome or Edge.</span>
  }

  function toggle() {
    setError('')
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new Ctor!()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      // only final pieces go in, so the editor doesn't fill with half-heard words
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript
      }
      if (text.trim()) editor.chain().focus().insertContent(text.trim() + ' ').run()
    }
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Microphone blocked. Allow it in the browser settings.' : `Dictation stopped: ${e.error}`)
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
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
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  )
}
