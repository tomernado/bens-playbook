import { useState, useEffect, useRef } from 'react'

/* ── Lightweight markdown renderer ────────────────────────────────────────
   Handles: **bold**, *italic*, - bullet lines, blank-line spacing          */
function inlineMd(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
  return tokens.map((t, i) => {
    if (t.startsWith('**') && t.endsWith('**')) return <strong key={i}>{t.slice(2, -2)}</strong>
    if (t.startsWith('*')  && t.endsWith('*'))  return <em key={i}>{t.slice(1, -1)}</em>
    return t
  })
}

function Markdown({ text }) {
  return (
    <div className="space-y-0.5">
      {text.split('\n').map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-1.5" />
        const bullet = line.match(/^[\s]*[-•]\s+(.*)/)
        if (bullet) return (
          <div key={i} className="flex gap-2 items-start">
            <span className="mt-0.5 shrink-0 text-current opacity-60">•</span>
            <span>{inlineMd(bullet[1])}</span>
          </div>
        )
        return <div key={i}>{inlineMd(line)}</div>
      })}
    </div>
  )
}

export default function ChatPanel({ messages, loading, onSend, compact = false, currentRecipe = null }) {
  const [input, setInput]           = useState('')
  const [useRecipeCtx, setUseRecipeCtx] = useState(true)
  const bottomRef = useRef(null)

  // Reset toggle to "recipe" whenever the active recipe changes
  useEffect(() => { setUseRecipeCtx(true) }, [currentRecipe?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const contextId = (currentRecipe && useRecipeCtx) ? currentRecipe.id : null
    onSend(text, contextId)
  }

  return (
    <div className={`flex flex-col ${compact ? 'h-[380px]' : 'h-full'}`} dir="rtl">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 py-4">
            <div className="text-4xl mb-2">👨‍🍳</div>
            <p className="text-sm font-medium text-stone-500">שאל אותי על כל מתכון</p>
            <p className="text-xs mt-1">טכניקות, תחליפים, טיפים</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm shrink-0 mb-0.5">
                👨‍🍳
              </div>
            )}
            <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
              ${msg.role === 'user'
                ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tr-sm shadow-sm'
                : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'}`}>
              {msg.role === 'user'
                ? msg.content
                : <Markdown text={msg.content} />}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm shrink-0">
              👨‍🍳
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-4">
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Context selector — shown only when inside a recipe page */}
      {currentRecipe && (
        <div className="px-3 py-2 border-t border-stone-100 bg-white" dir="rtl">
          <div className="flex gap-1 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setUseRecipeCtx(true)}
              className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all truncate text-right
                ${useRecipeCtx
                  ? 'bg-white text-amber-700 shadow-sm border border-amber-200/60'
                  : 'text-stone-500 hover:text-stone-700'}`}
            >
              📖 {currentRecipe.title}
            </button>
            <button
              type="button"
              onClick={() => setUseRecipeCtx(false)}
              className={`shrink-0 text-xs py-1.5 px-3 rounded-lg font-medium transition-all
                ${!useRecipeCtx
                  ? 'bg-white text-stone-700 shadow-sm border border-stone-200/60'
                  : 'text-stone-500 hover:text-stone-700'}`}
            >
              שאלה כללית
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="border-t border-stone-200 p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={currentRecipe && useRecipeCtx ? `שאל על ${currentRecipe.title}...` : 'שאל את השף...'}
          disabled={loading}
          autoComplete="off"
          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm
                     focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                     disabled:opacity-50 bg-white placeholder-stone-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40
                     text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
        >
          שלח
        </button>
      </form>
    </div>
  )
}
