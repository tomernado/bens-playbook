import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import RecipeDetail from './components/RecipeDetail'

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map(cat => (
        <button key={cat.id} onClick={() => onSelect(cat)}
          className="group text-right bg-white border border-stone-200 rounded-2xl p-5 shadow-sm
                     hover:shadow-md hover:border-amber-300 active:scale-[.98] transition-all duration-150">
          <div className="text-3xl mb-3">{cat.emoji}</div>
          <div className="font-bold text-stone-800 text-base leading-snug mb-1">{cat.name}</div>
          <div className="text-stone-500 text-sm mb-3 line-clamp-2">{cat.description}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400">{recipeCounts[cat.id] ?? 0} מתכונים</span>
            <span className="text-amber-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">פתח ←</span>
          </div>
        </button>
      ))}
      <button onClick={onAdd}
        className="text-right border-2 border-dashed border-stone-300 rounded-2xl p-5
                   hover:border-amber-400 hover:bg-amber-50 active:scale-[.98]
                   transition-all duration-150 text-stone-400 hover:text-amber-600">
        <div className="text-3xl mb-3">＋</div>
        <div className="font-medium text-sm">הוסף קטגוריה</div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {recipes.map(r => (
          <div key={r.id} className="relative group/card">
            <button onClick={() => onSelect(r)}
              className="w-full text-right bg-white border border-stone-200 rounded-2xl p-4 shadow-sm
                         hover:shadow-md hover:border-amber-300 active:scale-[.98] transition-all duration-150">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-amber-600 font-mono text-xs font-bold mt-0.5">#{String(r.recipe_number).padStart(2, '0')}</span>
                <span className="font-bold text-stone-800 text-sm leading-snug text-right flex-1">{r.title}</span>
              </div>
              {r.title_en && <div className="text-stone-400 text-xs mb-2">{r.title_en}</div>}
              {r.texture  && <div className="text-stone-500 text-xs line-clamp-2 mb-2">{r.texture}</div>}
              <div className="flex flex-wrap gap-1 justify-end">
                {(r.vibe_tags || []).slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{tag}</span>
                ))}
                {r.cook_time && (
                  <span className="text-xs bg-stone-100 text-stone-500 rounded-full px-2 py-0.5">⏱ {r.cook_time}</span>
                )}
              </div>
            </button>
            {/* Star button */}
            <button
              onClick={() => onToggleEvent(r.id)}
              className={`absolute top-2 left-2 text-lg leading-none touch-manipulation transition-all z-10
                ${eventIds.includes(r.id)
                  ? 'opacity-100 drop-shadow-sm'
                  : 'opacity-30 hover:opacity-80 sm:opacity-0 sm:group-hover/card:opacity-50'}`}
              title={eventIds.includes(r.id) ? 'הסר מתפריט אירוע' : 'הוסף לתפריט אירוע'}
            >{eventIds.includes(r.id) ? '⭐' : '☆'}</button>
          </div>
        ))}

        <button onClick={onAdd}
          className="text-right border-2 border-dashed border-stone-300 rounded-2xl p-4
                     hover:border-amber-400 hover:bg-amber-50 active:scale-[.98]
                     transition-all duration-150 text-stone-400 hover:text-amber-600">
          <div className="text-2xl mb-2">＋</div>
          <div className="font-medium text-sm">הוסף מתכון</div>
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
    <div className="min-h-screen bg-stone-50" dir="rtl">

      {/* ── Header ── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={goHome}
            className="font-bold text-stone-800 text-base tracking-tight hover:text-amber-600 transition-colors shrink-0">
            After Taste 🍴
          </button>

          {selectedCat && view !== 'event' && (
            <div className="text-stone-500 text-sm hidden sm:block truncate">
              {selectedCat.emoji} {selectedCat.name}
              {selectedRecipe && <> › <span className="text-stone-700">{selectedRecipe.title}</span></>}
            </div>
          )}

          <div className="flex items-center gap-3 shrink-0">
            {/* Event menu button */}
            <button
              onClick={() => setView(view === 'event' ? 'dashboard' : 'event')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-sm touch-manipulation transition-all
                ${view === 'event'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : eventIds.length > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
            >
              <span>🎪</span>
              <span className="hidden sm:inline">מתכונים שמורים</span>
              {eventIds.length > 0 && (
                <span className={`min-w-[18px] h-[18px] text-[10px] rounded-full flex items-center justify-center px-1 font-bold
                  ${view === 'event' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                  {eventIds.length}
                </span>
              )}
            </button>
            <div className="text-xs text-stone-400 hidden sm:block">{categories.length} קטגוריות</div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Dashboard */}
        {view === 'dashboard' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-stone-800 mb-1">ספר המתכונים</h1>
              <p className="text-stone-500 text-sm">After Taste Kitchen — {Object.values(recipeCounts).reduce((a, b) => a + b, 0)} מתכונים</p>
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
            eventIds={eventIds} onToggleEvent={toggleEvent} />
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
    </div>
  )
}
