import { useState, useRef, useEffect } from 'react'
import ChatPanel from './ChatPanel'

function ChefIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
      <line x1="6" y1="17" x2="18" y2="17"/>
    </svg>
  )
}

export default function FloatingChat({ open, onToggle, messages, loading, onSend, currentRecipe = null, onBookmark = null, bookmarkedMsgs = [], onFetchBookmarks = null, onDeleteBookmark = null, isPlanningMode = false, onTogglePlanning = null }) {
  const [side, setSide]                 = useState('right')
  const [expanded, setExpanded]         = useState(false)
  const [mobileHeight, setMobileHeight] = useState(70) // % of viewport height
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth < 640)

  const isDragging  = useRef(false)
  const startY      = useRef(0)
  const startHeight = useRef(0)

  const isRight    = side === 'right'
  const chatHasNew = !open && messages.length > 0 && messages.at(-1)?.role === 'assistant'

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function onDragStart(e) {
    isDragging.current  = true
    startY.current      = e.touches ? e.touches[0].clientY : e.clientY
    startHeight.current = mobileHeight

    function onMove(ev) {
      if (!isDragging.current) return
      if (ev.cancelable) ev.preventDefault()
      const y   = ev.touches ? ev.touches[0].clientY : ev.clientY
      const dvh = ((startY.current - y) / window.innerHeight) * 100
      setMobileHeight(prev => Math.max(30, Math.min(92, startHeight.current + dvh)))
    }
    function onEnd() {
      isDragging.current = false
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onEnd)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onEnd)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onEnd)
  }

  // Slide transforms: mobile = vertical (bottom sheet), desktop = horizontal (side panel)
  const slideCls = open
    ? 'translate-y-0 sm:translate-x-0 sm:translate-y-0'
    : isRight
      ? 'translate-y-full sm:translate-y-0 sm:translate-x-full'
      : 'translate-y-full sm:translate-y-0 sm:-translate-x-full'

  const panelStyle = isMobile ? { height: `${mobileHeight}vh` } : { width: '27rem' }

  return (
    <>
      {/* Panel ─ mobile: bottom sheet │ desktop: side panel */}
      <div
        className={`fixed z-50 flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          left-0 right-0 bottom-0 rounded-t-2xl border-t border-stone-200 bg-white
          sm:top-0 sm:bottom-0 sm:rounded-none sm:border-t-0
          sm:bg-white/97 sm:backdrop-blur-sm
          ${isRight
            ? 'sm:right-0 sm:left-auto sm:border-l sm:border-stone-200'
            : 'sm:left-0 sm:right-auto sm:border-r sm:border-stone-200'}
          ${slideCls}`}
        style={panelStyle}
        aria-hidden={!open}
      >
        {/* Drag handle — mobile only */}
        <div
          className="sm:hidden flex justify-center items-center py-2.5 cursor-ns-resize touch-none shrink-0"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <div className="w-10 h-1 bg-stone-300 rounded-full" />
        </div>

        {/* Panel header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100 bg-white shrink-0" dir="rtl">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-500">
            <ChefIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-stone-800 text-sm leading-tight tracking-tight">שף After Taste</div>
            <div className="text-stone-400 text-[11px] truncate">מתכונים · טכניקות · תחליפים</div>
          </div>

          {/* Planning mode toggle */}
          {onTogglePlanning && (
            <button
              type="button"
              onClick={onTogglePlanning}
              className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap
                ${isPlanningMode
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'}`}
            >
              🗓 תכנון
              {isPlanningMode && (
                <span className="text-[9px] font-bold bg-white/25 px-1 py-0.5 rounded-full">פעיל</span>
              )}
            </button>
          )}

          {/* Expand — desktop only */}
          <button
            onClick={() => setExpanded(true)}
            className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-stone-100 items-center justify-center
                       text-stone-400 hover:text-stone-600 transition-colors shrink-0"
            title="הרחב"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>

          {/* Dock toggle — desktop only */}
          <button
            onClick={() => setSide(s => s === 'right' ? 'left' : 'right')}
            className="hidden sm:flex w-7 h-7 rounded-lg hover:bg-stone-100 items-center justify-center
                       text-stone-400 hover:text-stone-600 transition-colors text-sm shrink-0"
            title={isRight ? 'הצמד לשמאל' : 'הצמד לימין'}
          >
            {isRight ? '⟵' : '⟶'}
          </button>

          {/* Close */}
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center
                       text-stone-400 hover:text-stone-600 transition-colors text-lg leading-none shrink-0"
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatPanel messages={messages} loading={loading} onSend={onSend} currentRecipe={currentRecipe} onBookmark={onBookmark} bookmarkedMsgs={bookmarkedMsgs} onFetchBookmarks={onFetchBookmarks} onDeleteBookmark={onDeleteBookmark} isPlanningMode={isPlanningMode} />
        </div>
      </div>

      {/* Fullscreen modal — desktop only */}
      {expanded && (
        <div className="hidden sm:flex fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
               style={{ height: 'min(88vh, 820px)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50/60 shrink-0" dir="rtl">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-500">
                <ChefIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-stone-800 text-sm tracking-tight">שף After Taste</div>
                <div className="text-stone-400 text-[11px]">מתכונים · טכניקות · תחליפים</div>
              </div>
              {onTogglePlanning && <PlanningToggle />}
              <button
                onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center
                           text-stone-400 hover:text-stone-700 transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel messages={messages} loading={loading} onSend={onSend} currentRecipe={currentRecipe} onBookmark={onBookmark} bookmarkedMsgs={bookmarkedMsgs} onFetchBookmarks={onFetchBookmarks} onDeleteBookmark={onDeleteBookmark} isPlanningMode={isPlanningMode} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop FAB — hidden on mobile, hidden when panel open */}
      {!open && (
        <button
          onClick={onToggle}
          className={`fixed bottom-6 z-50 w-14 h-14 rounded-full
            hidden sm:flex items-center justify-center
            bg-white border-2 border-stone-200
            hover:border-amber-300 hover:bg-amber-50/40
            shadow-lg hover:shadow-xl hover:scale-105 active:scale-95
            transition-all duration-200 text-stone-500 hover:text-amber-600
            ${isRight ? 'right-4' : 'left-4'}`}
          title="שאל את השף"
          aria-label="פתח צ'אט עם השף"
        >
          <ChefIcon className="w-5 h-5" />
          {chatHasNew && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
          )}
        </button>
      )}
    </>
  )
}
