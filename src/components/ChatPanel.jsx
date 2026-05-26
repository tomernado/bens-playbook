import { useState, useEffect, useRef } from 'react'

/* ── Markdown renderer ─────────────────────────────────────────────────────
   Handles: ## headings, **bold**, *italic*, - bullets, tables, blank lines.
   Bold inside table cells is parsed correctly.                              */

function inlineMd(text) {
  // Split on bold (**...**) and italic (*...*)
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((t, i) => {
    if (t.startsWith('**') && t.endsWith('**')) return <strong key={i}>{t.slice(2, -2)}</strong>
    if (t.startsWith('*')  && t.endsWith('*'))  return <em key={i}>{t.slice(1, -1)}</em>
    return t
  })
}

function TableBlock({ lines }) {
  // Filter out separator rows (|---|---|)
  const dataRows = lines.filter(l => !/^\|[\s|:-]+\|$/.test(l.trim()))
  const parsed   = dataRows.map(l =>
    l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
  )
  if (parsed.length === 0) return null
  const [head, ...body] = parsed
  return (
    <div className="overflow-x-auto my-2 rounded-xl border border-stone-200 text-right" dir="rtl">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="bg-amber-50 border-b border-amber-100">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold text-stone-700 whitespace-nowrap text-right">
                {inlineMd(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-stone-700 border-t border-stone-100 text-right align-top">
                  {inlineMd(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Markdown({ text }) {
  const lines = text.split('\n')
  const out = []; let tbl = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Collect table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tbl.push(line); continue
    }
    // Flush table
    if (tbl.length) { out.push(<TableBlock key={`t${i}`} lines={tbl} />); tbl = [] }

    // Blank line
    if (!trimmed) { out.push(<div key={i} className="h-2" />); continue }

    // ## Heading
    const h2 = trimmed.match(/^#{1,3}\s+(.+)/)
    if (h2) {
      out.push(
        <div key={i} className="font-bold text-stone-800 text-sm mt-3 mb-1 border-b border-stone-100 pb-1">
          {inlineMd(h2[1])}
        </div>
      )
      continue
    }

    // Bullet
    const bullet = trimmed.match(/^[-•*]\s+(.*)/)
    if (bullet) {
      out.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="mt-0.5 shrink-0 text-amber-500 font-bold">•</span>
          <span>{inlineMd(bullet[1])}</span>
        </div>
      )
      continue
    }

    // Numbered list
    const numbered = trimmed.match(/^(\d+)\.\s+(.*)/)
    if (numbered) {
      out.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="mt-0.5 shrink-0 text-stone-400 text-xs font-mono">{numbered[1]}.</span>
          <span>{inlineMd(numbered[2])}</span>
        </div>
      )
      continue
    }

    // Regular paragraph
    out.push(<div key={i}>{inlineMd(line)}</div>)
  }

  if (tbl.length) out.push(<TableBlock key="tend" lines={tbl} />)
  return <div className="space-y-0.5 text-right" dir="rtl">{out}</div>
}

/* ── Icons ─────────────────────────────────────────────────────────────── */
function StarIcon({ filled, className = 'w-3.5 h-3.5' }) {
  return filled
    ? <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    : <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
}
function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
}
function CopyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}

function relTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return 'עכשיו'
  if (diff < 3600)  return `לפני ${Math.floor(diff / 60)} דק׳`
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`
  return `לפני ${Math.floor(diff / 86400)} ימים`
}

/* ── Saved tab ─────────────────────────────────────────────────────────── */
function SavedTab({ onFetchBookmarks, onDeleteBookmark, bookmarkedMsgs }) {
  const [items, setItems]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied]     = useState(null)

  function localFallback() {
    return bookmarkedMsgs.map((text, i) => ({
      id: `local-${i}`, message_text: text,
      recipe_id: null, created_at: new Date().toISOString(), recipes: null,
    }))
  }

  useEffect(() => {
    if (!onFetchBookmarks) { setItems(localFallback()); return }
    setLoading(true)
    onFetchBookmarks()
      .then(data => setItems(data.length > 0 ? data : localFallback()))
      .catch(()  => setItems(localFallback()))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(item) {
    setItems(prev => prev.filter(b => b.id !== item.id))
    const isLocal = String(item.id).startsWith('local-')
    await onDeleteBookmark?.(isLocal ? null : item.id, item.message_text)
  }

  function copy(text, id) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id); setTimeout(() => setCopied(null), 1500)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!items || items.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8 text-stone-400">
      <StarIcon className="w-10 h-10 text-stone-300 mb-3" />
      <p className="text-sm font-medium text-stone-500">אין החלטות שמורות</p>
      <p className="text-xs mt-1">לחץ ⭐ ליד תשובת השף כדי לשמור</p>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2" dir="rtl">
      {items.map(item => {
        const isExp  = expanded === item.id
        const preview = item.message_text.slice(0, 150)
        const hasMore = item.message_text.length > 150
        return (
          <div key={item.id}
            className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm hover:border-amber-200 transition-colors">
            {/* Meta */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {item.recipes?.title && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 truncate max-w-[120px]">
                    📖 {item.recipes.title}
                  </span>
                )}
                {!String(item.id).startsWith('local-') && (
                  <span className="text-[10px] text-stone-400">{relTime(item.created_at)}</span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => copy(item.message_text, item.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors
                    ${copied === item.id ? 'text-green-500' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                  title="העתק"><CopyIcon /></button>
                <button onClick={() => remove(item)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  title="מחק"><TrashIcon /></button>
              </div>
            </div>
            {/* Content */}
            <div className="text-xs text-stone-700 leading-relaxed">
              <Markdown text={isExp ? item.message_text : preview} />
              {hasMore && (
                <button onClick={() => setExpanded(isExp ? null : item.id)}
                  className="mt-1 text-amber-600 hover:text-amber-700 font-medium text-[11px]">
                  {isExp ? 'הצג פחות ▲' : '... הצג עוד ▼'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── ChatPanel ─────────────────────────────────────────────────────────── */
export default function ChatPanel({
  messages, loading, onSend, compact = false, currentRecipe = null,
  onBookmark = null, bookmarkedMsgs = [],
  onFetchBookmarks = null, onDeleteBookmark = null,
}) {
  const [tab, setTab]                   = useState('chat')
  const [input, setInput]               = useState('')
  const [useRecipeCtx, setUseRecipeCtx] = useState(true)
  const [isPlanningMode, setPlanning]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { setUseRecipeCtx(true) }, [currentRecipe?.id])
  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, tab])

  function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const contextId = (currentRecipe && useRecipeCtx) ? currentRecipe.id : null
    onSend(text, contextId, isPlanningMode)
  }

  const savedCount = bookmarkedMsgs.length

  return (
    <div className={`flex flex-col ${compact ? 'h-[380px]' : 'h-full'}`} dir="rtl">

      {/* ── Tab bar ── */}
      <div className="flex shrink-0 border-b border-stone-100 bg-white">
        {[
          { id: 'chat',  label: 'צ׳אט' },
          { id: 'saved', label: savedCount > 0 ? `שמורים (${savedCount})` : 'שמורים' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors relative
              ${tab === t.id
                ? 'text-amber-700 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-amber-500 after:rounded-t'
                : 'text-stone-400 hover:text-stone-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Saved tab ── */}
      {tab === 'saved' && (
        <SavedTab
          onFetchBookmarks={onFetchBookmarks}
          onDeleteBookmark={onDeleteBookmark}
          bookmarkedMsgs={bookmarkedMsgs}
        />
      )}

      {/* ── Chat tab ── */}
      {tab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 py-4">
                <div className="text-4xl mb-2">👨‍🍳</div>
                <p className="text-sm font-medium text-stone-500">שאל אותי על כל מתכון</p>
                <p className="text-xs mt-1">טכניקות, תחליפים, תכנון תפריט</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isAssistant = msg.role === 'assistant'
              const isBookmarked = bookmarkedMsgs.includes(msg.content)
              return (
                <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm shrink-0 mb-0.5">
                      👨‍🍳
                    </div>
                  )}
                  <div className={`relative group max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                    ${msg.role === 'user'
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tr-sm shadow-sm'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'}`}>
                    {msg.role === 'user' ? msg.content : <Markdown text={msg.content} />}
                    {isAssistant && onBookmark && (
                      <button
                        onClick={() => onBookmark(msg.content)}
                        title={isBookmarked ? 'הסר סימניה' : 'שמור החלטה'}
                        className={`absolute -bottom-2 -left-2 w-6 h-6 rounded-full border flex items-center justify-center
                          transition-all duration-150 shadow-sm opacity-0 group-hover:opacity-100
                          ${isBookmarked
                            ? 'bg-amber-400 border-amber-300 text-white opacity-100'
                            : 'bg-white border-stone-200 text-stone-400 hover:text-amber-500 hover:border-amber-300'}`}
                      >
                        <StarIcon filled={isBookmarked} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

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

          {/* ── Context + Planning toggles ── */}
          <div className="px-3 py-2 border-t border-stone-100 bg-white shrink-0 space-y-2" dir="rtl">
            {/* Recipe context selector */}
            {currentRecipe && (
              <div className="flex gap-1 p-1 bg-stone-100 rounded-xl">
                <button type="button" onClick={() => setUseRecipeCtx(true)}
                  className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all truncate text-right
                    ${useRecipeCtx ? 'bg-white text-amber-700 shadow-sm border border-amber-200/60' : 'text-stone-500 hover:text-stone-700'}`}>
                  📖 {currentRecipe.title}
                </button>
                <button type="button" onClick={() => setUseRecipeCtx(false)}
                  className={`shrink-0 text-xs py-1.5 px-3 rounded-lg font-medium transition-all
                    ${!useRecipeCtx ? 'bg-white text-stone-700 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-700'}`}>
                  שאלה כללית
                </button>
              </div>
            )}

            {/* Planning mode toggle */}
            <button
              type="button"
              onClick={() => setPlanning(p => !p)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all
                ${isPlanningMode
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'}`}
            >
              <span>🗓 מצב תכנון אירוע</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors
                ${isPlanningMode ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-400'}`}>
                {isPlanningMode ? 'פעיל' : 'כבוי'}
              </span>
            </button>
          </div>

          {/* ── Input bar ── */}
          <form onSubmit={handleSubmit} className="border-t border-stone-200 p-3 flex gap-2 bg-white shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder={
                isPlanningMode
                  ? 'תכנן תפריט לאירוע...'
                  : currentRecipe && useRecipeCtx
                    ? `שאל על ${currentRecipe.title}...`
                    : 'שאל את השף...'
              }
              disabled={loading} autoComplete="off"
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm transition-colors
                         focus:outline-none focus:ring-2 disabled:opacity-50 bg-white placeholder-stone-400
                         ${isPlanningMode
                           ? 'border-amber-300 focus:border-amber-400 focus:ring-amber-100'
                           : 'border-stone-200 focus:border-amber-400 focus:ring-amber-100'}`} />
            <button type="submit" disabled={!input.trim() || loading}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40
                         text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors shrink-0">
              שלח
            </button>
          </form>
        </>
      )}
    </div>
  )
}
