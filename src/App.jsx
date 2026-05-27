import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import RecipeDetail from './components/RecipeDetail'
import ChatPanel from './components/ChatPanel'
import FloatingChat from './components/FloatingChat'

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smooth-action`
const CHAT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/* ─── Spinner ──────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

/* ─── Category Grid ────────────────────────────────────────────────────── */
function CategoryGrid({ categories, recipeCounts, onSelect, onAdd }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {categories.map((cat) => (
        <button key={cat.id} onClick={() => onSelect(cat)}
          className="group text-right bg-[#fffcf0] border border-amber-100 rounded-2xl p-4 sm:p-5
                     shadow-[0_2px_12px_-4px_rgba(0,0,0,0.07)]
                     hover:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.13)]
                     hover:bg-[#fff8e6] hover:border-amber-200
                     active:scale-[.98] transition-all duration-200
                     relative overflow-hidden flex flex-col h-[150px] sm:h-[165px]"
        >
          {/* Accent bar right edge */}
          <div className="absolute top-0 right-0 w-[3px] h-full rounded-r-2xl
                          bg-gradient-to-b from-amber-400 to-amber-100
                          opacity-40 group-hover:opacity-100 transition-opacity duration-200" />

          <div className="font-bold text-stone-800 text-sm sm:text-base leading-snug mb-1.5 flex-1">
            {cat.name}
          </div>
          <div className="text-stone-400 text-[11px] sm:text-xs leading-relaxed line-clamp-2">
            {cat.description}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-amber-100/80">
            <span className="text-[11px] font-bold text-amber-600/70">{recipeCounts[cat.id] ?? 0} מתכונים</span>
            <svg xmlns="http://www.w3.org/2000/svg"
                 className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </div>
        </button>
      ))}
      <button onClick={onAdd}
        className="text-right border border-dashed border-stone-200 rounded-2xl p-4 sm:p-5
                   hover:border-amber-300 hover:bg-amber-50/30 active:scale-[.98]
                   transition-all duration-200 text-stone-300 hover:text-amber-500
                   flex flex-col justify-center h-[150px] sm:h-[165px]">
        <div className="text-xl mb-1 font-light">+</div>
        <div className="font-medium text-xs sm:text-sm">קטגוריה חדשה</div>
      </button>
    </div>
  )
}

/* ─── Recipe List ──────────────────────────────────────────────────────── */
function RecipeList({ category, recipes, onSelect, onAdd, onBack, eventIds, onToggleEvent }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-stone-500 hover:text-amber-600 transition-colors text-sm">← חזרה</button>
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-2xl">{category.emoji}</span>
          <h2 className="font-bold text-stone-800 text-lg">{category.name}</h2>
        </div>
      </div>

      {recipes.length === 0 && (
        <p className="text-stone-400 text-center py-12">אין מתכונים בקטגוריה זו עדיין.</p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {recipes.map(r => (
          <div key={r.id} className="relative group/card h-[150px] sm:h-[165px]">
            <button onClick={() => onSelect(r)}
              className="w-full h-full text-right bg-white border border-stone-200 rounded-2xl p-4
                         shadow-[0_2px_12px_-4px_rgba(0,0,0,0.07)]
                         hover:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.13)]
                         hover:border-amber-200 hover:bg-amber-50/30
                         active:scale-[.98] transition-all duration-150
                         relative overflow-hidden flex flex-col">
              {/* Accent bar right edge */}
              <div className="absolute top-0 right-0 w-[3px] h-full rounded-r-2xl
                              bg-gradient-to-b from-amber-300 to-amber-100
                              opacity-0 group-hover/card:opacity-100 transition-opacity duration-200" />

              <div className="flex items-start justify-between gap-1.5 mb-1">
                <span className="text-amber-500 font-mono text-[10px] font-bold mt-0.5 shrink-0">#{String(r.recipe_number).padStart(2, '0')}</span>
                <span className="font-bold text-stone-800 text-sm leading-snug text-right flex-1 line-clamp-2">{r.title}</span>
              </div>
              {r.title_en && <div className="text-stone-400 text-[11px] mb-1 truncate text-right">{r.title_en}</div>}
              {r.texture  && <div className="text-stone-400 text-[11px] line-clamp-2 flex-1">{r.texture}</div>}

              <div className="flex flex-wrap gap-1 justify-end mt-auto pt-2 border-t border-stone-100">
                {(r.vibe_tags || []).slice(0, 1).map(tag => (
                  <span key={tag} className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5">{tag}</span>
                ))}
                {r.cook_time && (
                  <span className="text-[10px] text-stone-400 font-medium">⏱ {r.cook_time}</span>
                )}
              </div>
            </button>
            {/* Star button */}
            <button
              onClick={() => onToggleEvent(r.id)}
              className={`absolute top-2 left-2 text-base leading-none touch-manipulation transition-all z-10
                ${eventIds.includes(r.id)
                  ? 'opacity-100 drop-shadow-sm'
                  : 'opacity-30 hover:opacity-80 sm:opacity-0 sm:group-hover/card:opacity-50'}`}
              title={eventIds.includes(r.id) ? 'הסר מתפריט אירוע' : 'הוסף לתפריט אירוע'}
            >{eventIds.includes(r.id) ? '⭐' : '☆'}</button>
          </div>
        ))}

        <button onClick={onAdd}
          className="text-right border border-dashed border-stone-200 rounded-2xl p-4
                     hover:border-amber-300 hover:bg-amber-50/30 active:scale-[.98]
                     transition-all duration-150 text-stone-300 hover:text-amber-500
                     h-[150px] sm:h-[165px] flex flex-col justify-center">
          <div className="text-xl mb-1 font-light">+</div>
          <div className="font-medium text-xs sm:text-sm">הוסף מתכון</div>
        </button>
      </div>
    </div>
  )
}

/* ─── Search Bar ───────────────────────────────────────────────────────── */
function SearchBar({ value, onChange }) {
  return (
    <div className="relative mb-6">
      <input type="search" placeholder="חפש מתכון לפי שם, אנגלית או מספר..."
        value={value} onChange={e => onChange(e.target.value)} dir="rtl"
        className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-3 pr-11
                   text-stone-800 placeholder-stone-400 text-sm shadow-sm
                   focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
    </div>
  )
}

/* ─── Event Menu ───────────────────────────────────────────────────────── */
function EventMenu({ recipes, eventIds, onOpen, onRemove, onClear, onBack, onAdd }) {
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const q = search.trim()
    const isNum = /^\d+$/.test(q)
    const parts = [`title.ilike.%${q}%`, `title_en.ilike.%${q}%`]
    if (isNum) parts.push(`recipe_number.eq.${+q}`)
    supabase.from('recipes').select('*, categories(name,emoji)').or(parts.join(',')).limit(10)
      .then(({ data }) => setResults(data || []))
  }, [search])

  return (
    <div dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-stone-400 hover:text-amber-600 text-sm transition-colors">← חזרה</button>
        <h2 className="font-bold text-stone-800 text-xl flex-1 text-right">🎪 תפריט אירוע</h2>
        {recipes.length > 0 && (
          <button onClick={onClear}
            className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors">
            נקה הכל
          </button>
        )}
      </div>

      {/* Add search */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-5">
        <h3 className="font-semibold text-stone-700 text-sm mb-3 text-right">הוסף מנה לתפריט</h3>
        <div className="relative">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חפש לפי שם או מספר..." dir="rtl"
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-amber-400" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
        </div>
        {results.length > 0 && (
          <div className="mt-2 divide-y divide-stone-100">
            {results.map(r => {
              const already = eventIds.includes(r.id)
              return (
                <div key={r.id} className="flex items-center gap-2 py-2">
                  <button
                    onClick={() => { if (!already) { onAdd(r.id); setSearch('') } }}
                    disabled={already}
                    className={`shrink-0 text-xs px-3 py-1 rounded-lg font-medium transition-colors
                      ${already ? 'bg-stone-100 text-stone-400 cursor-default' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                  >{already ? '✓ ברשימה' : '+ הוסף'}</button>
                  <div className="flex-1 text-right min-w-0">
                    <span className="text-stone-700 text-sm truncate block">{r.title}</span>
                    {r.categories && <span className="text-stone-400 text-xs">{r.categories.emoji} {r.categories.name}</span>}
                  </div>
                  <span className="text-amber-600 font-mono text-xs shrink-0">#{r.recipe_number}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recipe list */}
      {recipes.length === 0 ? (
        <div className="text-center py-14">
          <div className="text-5xl mb-3">🎪</div>
          <p className="text-stone-500 text-sm mb-1">תפריט האירוע ריק</p>
          <p className="text-stone-400 text-xs">חפש מנות למעלה או לחץ ☆ על כל מנה</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recipes.map(r => (
            <div key={r.id}
              className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
              <div className="flex-1 text-right cursor-pointer min-w-0" onClick={() => onOpen(r)}>
                <div className="flex items-start gap-2 mb-1">
                  <span className="font-bold text-stone-800 text-sm flex-1 leading-snug">{r.title}</span>
                  <span className="text-amber-600 font-mono text-xs shrink-0 mt-0.5">#{r.recipe_number}</span>
                </div>
                {r.categories && <div className="text-xs text-stone-400">{r.categories.emoji} {r.categories.name}</div>}
                {r.cook_time  && <div className="text-xs text-stone-400 mt-0.5">⏱ {r.cook_time}</div>}
              </div>
              <button onClick={() => onRemove(r.id)}
                className="shrink-0 text-stone-300 hover:text-red-400 text-xl font-bold leading-none touch-manipulation mt-0.5">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Modal: Add Category ──────────────────────────────────────────────── */
function AddCategoryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', emoji: '🍴' })
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('categories').insert({ name: form.name, description: form.description, emoji: form.emoji })
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" dir="rtl">
        <h3 className="font-bold text-stone-800 text-lg mb-4">קטגוריה חדשה</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="אימוג׳י" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400" />
          <input required placeholder="שם הקטגוריה" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400" />
          <textarea placeholder="תיאור (אופציונלי)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50">ביטול</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Modal: Add Recipe ────────────────────────────────────────────────── */
function AddRecipeModal({ categoryId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', title_en: '', texture: '', cook_time: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputCls = 'w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400'

  async function submit(e) {
    e.preventDefault(); setSaving(true); setError(null)
    const { error: err } = await supabase.from('recipes').insert({
      category_id: categoryId, title: form.title.trim(),
      title_en: form.title_en.trim() || null, texture: form.texture.trim() || null,
      cook_time: form.cook_time.trim() || null, instructions: [], vibe_tags: [],
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" dir="rtl">
        <h3 className="font-bold text-stone-800 text-lg mb-4">מתכון חדש</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="שם המתכון *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
          <input placeholder="English name" value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} className={inputCls} />
          <textarea placeholder="טקסטורה / תיאור" value={form.texture} onChange={e => setForm(f => ({ ...f, texture: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
          <input placeholder="זמן הכנה" value={form.cook_time} onChange={e => setForm(f => ({ ...f, cook_time: e.target.value }))} className={inputCls} />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50">ביטול</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'שומר...' : 'צור מתכון'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── APP ──────────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView]                   = useState('dashboard')
  const [categories, setCategories]       = useState([])
  const [recipes, setRecipes]             = useState([])
  const [recipeCounts, setRecipeCounts]   = useState({})
  const [selectedCat, setSelectedCat]     = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showAddCat, setShowAddCat]       = useState(false)
  const [showAddRecipe, setShowAddRecipe] = useState(false)

  // ── Chat ─────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages]   = useState([])
  const [chatLoading, setChatLoading]     = useState(false)
  const [chatExpanded, setChatExpanded]   = useState(false)
  const [chatOpen, setChatOpen]           = useState(false)
  const [isPlanningMode, setIsPlanningMode] = useState(false)
  const [isIngestMode, setIsIngestMode]   = useState(false)
  const [embeddedTab, setEmbeddedTab]     = useState('chat')
  const [showChatHelp, setShowChatHelp]   = useState(false)

  function clearChat() { setChatMessages([]) }

  function togglePlanning() {
    setIsPlanningMode(v => { if (!v) setIsIngestMode(false); return !v })
  }
  function toggleIngest() {
    setIsIngestMode(v => { if (!v) setIsPlanningMode(false); return !v })
  }

  // Persistent anonymous user ID
  const [userId] = useState(() => {
    let id = localStorage.getItem('at_user_id')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('at_user_id', id) }
    return id
  })

  // Bookmarked messages (persisted in localStorage)
  const [bookmarkedMsgs, setBookmarkedMsgs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('at_bookmarks') || '[]') } catch { return [] }
  })

  function updateBookmarks(next) {
    setBookmarkedMsgs(next)
    localStorage.setItem('at_bookmarks', JSON.stringify(next))
  }

  async function fetchBookmarks() {
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHAT_KEY}` },
        body: JSON.stringify({ action: 'get_bookmarks', userId }),
      })
      const data = await res.json()
      return data.bookmarks ?? []
    } catch { return [] }
  }

  async function deleteBookmarkById(bookmarkId, messageText) {
    updateBookmarks(bookmarkedMsgs.filter(m => m !== messageText))
    try {
      await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHAT_KEY}` },
        body: JSON.stringify({ action: 'delete_bookmark', userId, bookmarkId, messageText }),
      })
    } catch {}
  }

  async function toggleBookmark(messageText) {
    const isBookmarked = bookmarkedMsgs.includes(messageText)
    updateBookmarks(isBookmarked
      ? bookmarkedMsgs.filter(m => m !== messageText)
      : [...bookmarkedMsgs, messageText]
    )
    try {
      await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHAT_KEY}` },
        body: JSON.stringify({
          action:      isBookmarked ? 'delete_bookmark' : 'save_bookmark',
          userId,
          messageText,
          recipeId:    selectedRecipe?.id ?? null,
        }),
      })
    } catch { /* fire-and-forget, localStorage is source of truth */ }
  }

  const chatHasNew = !chatOpen && chatMessages.length > 0 && chatMessages.at(-1)?.role === 'assistant'

  async function deleteRecipe(recipeId) {
    try {
      await supabase.from('event_menu').delete().eq('recipe_id', recipeId)
      await supabase.from('chat_bookmarks').delete().eq('recipe_id', recipeId)
      await supabase.from('ingredients').delete().eq('recipe_id', recipeId)
      const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
      if (error) throw new Error(error.message)

      setSelectedRecipe(null)
      if (selectedCat) {
        setView('category')
        loadRecipesForCat(selectedCat.id)
      } else {
        setView('dashboard')
      }
      loadEventIds()
      supabase.from('recipes').select('category_id').then(({ data: rows }) => {
        if (rows) {
          const counts = {}
          rows.forEach(r => { counts[r.category_id] = (counts[r.category_id] || 0) + 1 })
          setRecipeCounts(counts)
        }
      })
    } catch (err) {
      console.error('[deleteRecipe]', err)
      alert('שגיאה במחיקת המתכון: ' + err.message)
    }
  }

  async function updateRecipeNumber(recipeId, newNumber) {
    try {
      await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHAT_KEY}` },
        body: JSON.stringify({ action: 'update_recipe_number', recipeId, newNumber }),
      })
      const updated = { ...selectedRecipe, recipe_number: Number(newNumber) }
      setSelectedRecipe(updated)
      setRecipes(prev => prev.map(r => r.id === recipeId ? updated : r))
    } catch {}
  }

  async function sendChatMessage(text, contextId = null, isPlanningMode = false, imageBase64 = null, imageMime = 'image/jpeg', isIngestMode = false, selectedCategoryId = null, recipeNumber = null) {
    // Keep history as plain text — images are one-shot, never stored
    const next = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(next)
    setChatLoading(true)
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${CHAT_KEY}`,
        },
        body: JSON.stringify({
          messages:           next,
          currentRecipeId:    contextId,
          isPlanningMode,
          isIngestMode,
          userId,
          imageBase64:        imageBase64 ?? undefined,
          imageMime:          imageBase64 ? imageMime : undefined,
          selectedCategoryId: selectedCategoryId ?? undefined,
          recipeNumber:       recipeNumber ?? undefined,
        }),
      })
      const data = await res.json()
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.content ?? data.error ?? 'שגיאה לא ידועה' },
      ])
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'שגיאה בחיבור לשרת. נסה שוב.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // ── Event menu (Supabase-backed) ─────────────────────────────────────
  const [eventIds, setEventIds]       = useState([])
  const [eventRecipes, setEventRecipes] = useState([])

  const loadEventIds = useCallback(async () => {
    const { data } = await supabase.from('event_menu').select('recipe_id').order('added_at')
    setEventIds((data || []).map(r => r.recipe_id))
  }, [])

  useEffect(() => { loadEventIds() }, [loadEventIds])

  useEffect(() => {
    if (view !== 'event') return
    if (eventIds.length === 0) { setEventRecipes([]); return }
    supabase.from('recipes').select('*, categories(name,emoji)').in('id', eventIds)
      .then(({ data }) => {
        const ordered = eventIds.map(id => (data || []).find(r => r.id === id)).filter(Boolean)
        setEventRecipes(ordered)
      })
  }, [view, eventIds])

  async function toggleEvent(recipeId) {
    if (eventIds.includes(recipeId)) {
      await supabase.from('event_menu').delete().eq('recipe_id', recipeId)
    } else {
      await supabase.from('event_menu').insert({ recipe_id: recipeId })
    }
    loadEventIds()
  }

  async function clearEvent() {
    await supabase.from('event_menu').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setEventIds([])
    setEventRecipes([])
  }

  // ── Load categories ──────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    setCategories(data || [])
  }, [])

  const loadRecipesForCat = useCallback(async (catId) => {
    setLoading(true)
    const { data } = await supabase.from('recipes').select('*').eq('category_id', catId).order('recipe_number')
    setRecipes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadCategories()
      const { data } = await supabase.from('recipes').select('category_id')
      if (data) {
        const counts = {}
        data.forEach(r => { counts[r.category_id] = (counts[r.category_id] || 0) + 1 })
        setRecipeCounts(counts)
      }
      setLoading(false)
    }
    init()
  }, [loadCategories])

  // ── Search (supports number lookup) ─────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const q = search.trim()
    const isNum = /^\d+$/.test(q)
    const parts = [`title.ilike.%${q}%`, `title_en.ilike.%${q}%`]
    if (isNum) parts.push(`recipe_number.eq.${+q}`)
    supabase.from('recipes').select('*, categories(name,emoji)').or(parts.join(',')).limit(20)
      .then(({ data }) => setSearchResults(data || []))
  }, [search])

  // ── Navigation ───────────────────────────────────────────────────────
  function openCategory(cat) {
    setSelectedCat(cat); setView('category'); loadRecipesForCat(cat.id)
  }

  function openRecipe(r) {
    setSelectedRecipe(r); setView('recipe')
  }

  function goBack() {
    if (view === 'recipe') {
      setView(selectedCat ? 'category' : 'event')
      setSelectedRecipe(null)
    } else if (view === 'category') {
      setView('dashboard'); setSelectedCat(null); setRecipes([])
    } else {
      setView('dashboard')
    }
  }

  function goHome() {
    setView('dashboard'); setSelectedCat(null); setSelectedRecipe(null); setRecipes([]); setSearch('')
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(170deg, #faf9f6 0%, #f4f2ed 100%)' }} dir="rtl">

      {/* ── Header ── */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-stone-100 sticky top-0 z-40 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <button onClick={goHome} className="shrink-0 flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
              </svg>
            </div>
            <div className="leading-tight text-right">
              <div className="font-black text-stone-900 text-base sm:text-lg tracking-tight group-hover:text-amber-600 transition-colors">After Taste</div>
              <div className="text-stone-400 text-[10px] font-medium hidden sm:block">מטבח · ספר המתכונים</div>
            </div>
          </button>

          {selectedCat && view !== 'event' && (
            <div className="text-stone-400 text-sm hidden sm:block truncate">
              {selectedCat.name}
              {selectedRecipe && <> › <span className="text-stone-600 font-medium">{selectedRecipe.title}</span></>}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {/* Chat button — mobile only (desktop uses the FAB) */}
            <button
              onClick={() => setChatOpen(o => !o)}
              className={`relative sm:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all touch-manipulation
                ${chatOpen
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'}`}
              title="שאל את השף"
              aria-label="פתח צ'אט"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {chatHasNew && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>

            {/* Event menu button */}
            <button
              onClick={() => setView(view === 'event' ? 'dashboard' : 'event')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-sm touch-manipulation transition-all
                ${view === 'event'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : eventIds.length > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/>
                <path d="M8 7h8M8 11h8M8 15h5"/>
              </svg>
              <span className="sm:hidden">שמורים</span>
              <span className="hidden sm:inline">מתכונים שמורים</span>
              {eventIds.length > 0 && (
                <span className={`min-w-[18px] h-[18px] text-[10px] rounded-full flex items-center justify-center px-1 font-bold
                  ${view === 'event' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                  {eventIds.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Dashboard */}
        {view === 'dashboard' && (
          <>
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-1.5 text-amber-600 text-[11px] font-bold tracking-widest uppercase mb-3 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                After Taste Kitchen
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight mb-2 leading-tight">
                ספר <span className="text-amber-500">המתכונים</span>
              </h1>
              <p className="text-stone-400 text-sm font-medium">{Object.values(recipeCounts).reduce((a, b) => a + b, 0)} מתכונים במאגר</p>
            </div>
            <SearchBar value={search} onChange={setSearch} />

            {search.trim() ? (
              <div className="mb-6">
                <div className="text-sm font-semibold text-stone-600 mb-3">תוצאות ({searchResults.length})</div>
                {searchResults.length === 0
                  ? <p className="text-stone-400 text-sm">לא נמצאו מתכונים.</p>
                  : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {searchResults.map(r => (
                        <button key={r.id} onClick={() => openRecipe(r)}
                          className="text-right bg-white border border-stone-200 rounded-xl p-4
                                     hover:border-amber-300 hover:shadow-sm transition-all active:scale-[.98]">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-amber-600 font-mono text-xs">#{r.recipe_number}</span>
                            <span className="font-semibold text-stone-800 text-sm flex-1 text-right">{r.title}</span>
                          </div>
                          {r.categories && (
                            <div className="text-xs text-stone-400 mt-1">{r.categories.emoji} {r.categories.name}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                }
              </div>
            ) : (
              loading ? <Spinner /> : (
                <CategoryGrid categories={categories} recipeCounts={recipeCounts}
                  onSelect={openCategory} onAdd={() => setShowAddCat(true)} />
              )
            )}

            {/* ── Embedded Chef Chat ── */}
            <div className="mt-8 bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 pt-3 pb-2 border-b border-stone-100 bg-stone-50/60" dir="rtl">
                {/* Row 1: identity + icon actions */}
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                      <line x1="6" y1="17" x2="18" y2="17"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-800 text-sm tracking-tight">שאל את השף</div>
                    <div className="text-stone-400 text-[11px]">מתכונים · טכניקות · תחליפים</div>
                  </div>
                  {/* Help */}
                  <button onClick={() => setShowChatHelp(true)}
                    className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-amber-100 flex items-center justify-center text-stone-400 hover:text-amber-600 transition-colors text-xs font-bold shrink-0"
                    title="מה אני יכול לשאול?">?</button>
                  {/* Clear */}
                  {chatMessages.length > 0 && (
                    <button onClick={clearChat}
                      className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-red-50 flex items-center justify-center text-stone-300 hover:text-red-400 transition-colors shrink-0"
                      title="נקה שיחה">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                  {/* Expand */}
                  <button onClick={() => setChatExpanded(true)}
                    className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center text-stone-400 hover:text-amber-700 transition-colors shrink-0"
                    title="הרחב">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                  </button>
                </div>
                {/* Row 2: mode buttons */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={togglePlanning}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                      ${isPlanningMode ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-500 hover:border-amber-300 hover:text-amber-600'}`}>
                    🗓 תכנון {isPlanningMode && <span className="text-[9px] font-bold bg-white/30 px-1 py-0.5 rounded-full">פעיל</span>}
                  </button>
                  <button type="button" onClick={toggleIngest}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                      ${isIngestMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                    ➕ הוספה {isIngestMode && <span className="text-[9px] font-bold bg-white/30 px-1 py-0.5 rounded-full">פעיל</span>}
                  </button>
                  <button type="button" onClick={() => setEmbeddedTab(t => t === 'saved' ? 'chat' : 'saved')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                      ${embeddedTab === 'saved' ? 'bg-amber-100 text-amber-700' : bookmarkedMsgs.length > 0 ? 'bg-white border border-stone-200 text-amber-500 hover:border-amber-300' : 'bg-white border border-stone-200 text-stone-400 hover:text-stone-600'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
                      fill={bookmarkedMsgs.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {bookmarkedMsgs.length > 0 ? bookmarkedMsgs.length : 'שמורים'}
                  </button>
                </div>
              </div>
              <ChatPanel messages={chatMessages} loading={chatLoading} onSend={sendChatMessage}
                compact onBookmark={toggleBookmark} bookmarkedMsgs={bookmarkedMsgs}
                onFetchBookmarks={fetchBookmarks} onDeleteBookmark={deleteBookmarkById}
                isPlanningMode={isPlanningMode} isIngestMode={isIngestMode} tab={embeddedTab} onTabChange={setEmbeddedTab}
                categories={categories} />
            </div>

            {/* Fullscreen chat modal */}
            {chatExpanded && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden"
                     style={{ height: 'min(88vh, 820px)' }}>
                  <div className="px-4 pt-3 pb-2 border-b border-stone-100 bg-stone-50/60 shrink-0" dir="rtl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                          <line x1="6" y1="17" x2="18" y2="17"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-stone-800 text-sm tracking-tight">שאל את השף</div>
                        <div className="text-stone-400 text-[11px]">מתכונים · טכניקות · תחליפים</div>
                      </div>
                      <button onClick={() => setShowChatHelp(true)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-amber-100 flex items-center justify-center text-stone-400 hover:text-amber-600 transition-colors text-xs font-bold shrink-0">?</button>
                      {chatMessages.length > 0 && (
                        <button onClick={clearChat}
                          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-red-50 flex items-center justify-center text-stone-300 hover:text-red-400 transition-colors shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                      <button onClick={() => setChatExpanded(false)}
                        className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center text-stone-400 hover:text-amber-700 transition-colors shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={togglePlanning}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                          ${isPlanningMode ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-500 hover:border-amber-300 hover:text-amber-600'}`}>
                        🗓 תכנון {isPlanningMode && <span className="text-[9px] font-bold bg-white/30 px-1 py-0.5 rounded-full">פעיל</span>}
                      </button>
                      <button type="button" onClick={toggleIngest}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                          ${isIngestMode ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-600'}`}>
                        ➕ הוספה {isIngestMode && <span className="text-[9px] font-bold bg-white/30 px-1 py-0.5 rounded-full">פעיל</span>}
                      </button>
                      <button type="button" onClick={() => setEmbeddedTab(t => t === 'saved' ? 'chat' : 'saved')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
                          ${embeddedTab === 'saved' ? 'bg-amber-100 text-amber-700' : bookmarkedMsgs.length > 0 ? 'bg-white border border-stone-200 text-amber-500 hover:border-amber-300' : 'bg-white border border-stone-200 text-stone-400 hover:text-stone-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
                          fill={bookmarkedMsgs.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        {bookmarkedMsgs.length > 0 ? bookmarkedMsgs.length : 'שמורים'}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatPanel messages={chatMessages} loading={chatLoading} onSend={sendChatMessage}
                      onBookmark={toggleBookmark} bookmarkedMsgs={bookmarkedMsgs}
                      onFetchBookmarks={fetchBookmarks} onDeleteBookmark={deleteBookmarkById}
                      isPlanningMode={isPlanningMode} isIngestMode={isIngestMode} tab={embeddedTab} onTabChange={setEmbeddedTab}
                      categories={categories} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Category */}
        {view === 'category' && selectedCat && (
          loading ? <Spinner /> : (
            <RecipeList category={selectedCat} recipes={recipes}
              onSelect={openRecipe} onAdd={() => setShowAddRecipe(true)} onBack={goBack}
              eventIds={eventIds} onToggleEvent={toggleEvent} />
          )
        )}

        {/* Recipe */}
        {view === 'recipe' && selectedRecipe && (
          <RecipeDetail recipe={selectedRecipe} onBack={goBack}
            onRecipeUpdate={updated => {
              setSelectedRecipe(updated)
              setRecipes(prev => prev.map(r => r.id === updated.id ? updated : r))
            }}
            eventIds={eventIds} onToggleEvent={toggleEvent}
            onDeleteRecipe={deleteRecipe}
            onUpdateRecipeNumber={updateRecipeNumber} />
        )}

        {/* Event Menu */}
        {view === 'event' && (
          <EventMenu
            recipes={eventRecipes}
            eventIds={eventIds}
            onOpen={r => { openRecipe(r) }}
            onRemove={id => toggleEvent(id)}
            onClear={clearEvent}
            onBack={goBack}
            onAdd={id => toggleEvent(id)}
          />
        )}
      </main>

      {/* Modals */}
      {showAddCat && <AddCategoryModal onClose={() => setShowAddCat(false)} onSaved={loadCategories} />}
      {showAddRecipe && selectedCat && (
        <AddRecipeModal categoryId={selectedCat.id}
          onClose={() => setShowAddRecipe(false)}
          onSaved={() => loadRecipesForCat(selectedCat.id)} />
      )}

      {/* ── Chat Help Modal ── */}
      {showChatHelp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={() => setShowChatHelp(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="font-bold text-stone-800 text-base">יכולות הצ׳אט עם השף</h3>
              <button onClick={() => setShowChatHelp(false)}
                className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
            </div>
            <div className="p-4 space-y-3">
              {[
                {
                  icon: '🍳',
                  title: 'שאלות כלליות',
                  desc: 'שאל כל שאלה על בישול — טכניקות, תחליפים, מרקמים, כמויות. השף מכיר את כל המתכונים שלך ויכול לעזור עם כל נושא.',
                },
                {
                  icon: '📖',
                  title: 'מתכון פעיל',
                  desc: 'כשנמצאים בדף מתכון ספציפי, לחץ על שמו בתחתית הצ׳אט. השף יקבל את כל הפרטים — רכיבים, שלבים, כמויות — ויוכל לענות ספציפית.',
                },
                {
                  icon: '🗓',
                  title: 'מצב תכנון',
                  desc: 'לחץ "תכנון" לתכנון תפריט אירוע שלם. השף מציע סינרגיות בין מנות, מדגיש קונפליקטים בתזמון, ומסדר סדר הגשה. מקבלים תגובות ארוכות ומפורטות.',
                },
                {
                  icon: '➕',
                  title: 'מצב הוספה',
                  desc: 'לחץ "הוספה", בחר קטגוריה ומספר מנה, ואז שלח טקסט מתכון, תמונה, או הקלט בקול. השף יחלץ את הנתונים ויוסיף למאגר אוטומטית.',
                },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-3 bg-stone-50 rounded-xl">
                  <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-stone-800 text-sm mb-0.5">{item.title}</div>
                    <div className="text-stone-500 text-xs leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global floating chef chat */}
      <FloatingChat
        open={chatOpen}
        onToggle={() => setChatOpen(o => !o)}
        messages={chatMessages}
        loading={chatLoading}
        onSend={sendChatMessage}
        currentRecipe={selectedRecipe}
        onBookmark={toggleBookmark}
        bookmarkedMsgs={bookmarkedMsgs}
        onFetchBookmarks={fetchBookmarks}
        onDeleteBookmark={deleteBookmarkById}
        isPlanningMode={isPlanningMode}
        onTogglePlanning={togglePlanning}
        isIngestMode={isIngestMode}
        onToggleIngest={toggleIngest}
        categories={categories}
      />
    </div>
  )
}
