import { useState, useEffect } from 'react'
import ChatPanel from './ChatPanel'

export default function FloatingChat({ messages, loading, onSend, currentRecipe = null }) {
  const [open, setOpen]               = useState(false)
  const [side, setSide]               = useState('right') // 'right' | 'left'
  const [expanded, setExpanded]       = useState(false)
  const [hasNewReply, setHasNewReply] = useState(false)

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant' && !open) setHasNewReply(true)
  }, [messages, open])

  function toggleOpen() {
    setOpen(o => !o)
    setHasNewReply(false)
  }

  const isRight = side === 'right'

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 bottom-0 z-50 flex flex-col
          w-full sm:w-[22rem] bg-white/95 backdrop-blur-sm shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isRight ? 'right-0 border-l border-stone-200' : 'left-0 border-r border-stone-200'}
          ${open ? 'translate-x-0' : isRight ? 'translate-x-full' : '-translate-x-full'}`}
        aria-hidden={!open}
      >
        {/* Panel header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-stone-200 bg-white shrink-0" dir="rtl">
          <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-base shrink-0">
            👨‍🍳
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-stone-800 text-sm leading-tight">שף After Taste</div>
            <div className="text-stone-400 text-xs truncate">מתכונים · טכניקות · תחליפים</div>
          </div>

          {/* Expand to fullscreen */}
          <button
            onClick={() => setExpanded(true)}
            className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center
                       text-stone-400 hover:text-stone-600 transition-colors shrink-0"
            title="הרחב"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>

          {/* Dock side toggle */}
          <button
            onClick={() => setSide(s => s === 'right' ? 'left' : 'right')}
            className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center
                       text-stone-400 hover:text-stone-600 transition-colors text-sm shrink-0"
            title={isRight ? 'הצמד לשמאל' : 'הצמד לימין'}
          >
            {isRight ? '⟵' : '⟶'}
          </button>

          {/* Close */}
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center
                       text-stone-400 hover:text-stone-600 transition-colors text-lg leading-none shrink-0"
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatPanel
            messages={messages}
            loading={loading}
            onSend={onSend}
            currentRecipe={currentRecipe}
          />
        </div>
      </div>

      {/* Fullscreen expand modal */}
      {expanded && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
               style={{ height: 'min(80vh, 700px)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-200 bg-amber-50/60 shrink-0" dir="rtl">
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-base shrink-0">
                👨‍🍳
              </div>
              <div className="flex-1">
                <div className="font-bold text-stone-800 text-sm">שף After Taste</div>
                <div className="text-stone-400 text-xs">מתכונים · טכניקות · תחליפים</div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-lg hover:bg-amber-100 flex items-center justify-center
                           text-stone-400 hover:text-amber-700 transition-colors shrink-0"
                title="מזער"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel messages={messages} loading={loading} onSend={onSend} currentRecipe={currentRecipe} />
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphism FAB */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 z-50 w-14 h-14 rounded-full
          flex items-center justify-center text-2xl
          transition-all duration-200 ease-in-out
          shadow-lg backdrop-blur-md border border-white/20
          ${isRight ? 'right-4' : 'left-4'}
          ${open
            ? 'bg-stone-600/80 text-white scale-95'
            : 'bg-white hover:bg-amber-50 hover:scale-110 active:scale-90 border-2 border-amber-300 hover:border-amber-400 shadow-md'}`}
        title="שאל את השף"
        aria-label="פתח צ'אט עם השף"
      >
        <span className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          {open ? '✕' : '👨‍🍳'}
        </span>

        {hasNewReply && !open && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
        )}
      </button>
    </>
  )
}
