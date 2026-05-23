import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import RecipeDetail from './components/RecipeDetail'

/* ─── tiny helpers ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

/* ─── CATEGORY GRID ────────────────────────────────────────────── */
function CategoryGrid({ categories, recipeCounts, onSelect, onAdd }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat)}
          className="group text-right bg-white border border-stone-200 rounded-2xl p-5 shadow-sm
                     hover:shadow-md hover:border-amber-300 active:scale-[.98]
                     transition-all duration-150 will-change-transform"
        >
          <div className="text-3xl mb-3">{cat.emoji}</div>
          <div className="font-bold text-stone-800 text-base leading-snug mb-1">{cat.name}</div>
          <div className="text-stone-500 text-sm mb-3 line-clamp-2">{cat.description}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400">
              {recipeCounts[cat.id] ?? 0} מתכונים
            </span>
            <span className="text-amber-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              פתח ←
            </span>
          </div>
        </button>
      ))}

      {/* Add category card */}
      <button
        onClick={onAdd}
        className="text-right border-2 border-dashed border-stone-300 rounded-2xl p-5
                   hover:border-amber-400 hover:bg-amber-50 active:scale-[.98]
                   transition-all duration-150 will-change-transform text-stone-400 hover:text-amber-600"
      >
        <div className="text-3xl mb-3">＋</div>
        <div className="font-medium text-sm">הוסף קטגוריה</div>
      </button>
    </div>
  )
}

/* ─── RECIPE LIST ───────────────────────────────────────────────── */
function RecipeList({ category, recipes, onSelect, onAdd, onBack }) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}
          className="text-stone-500 hover:text-amber-600 transition-colors text-sm">
          ← חזרה
        </button>
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
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className="group text-right bg-white border border-stone-200 rounded-2xl p-4 shadow-sm
                       hover:shadow-md hover:border-amber-300 active:scale-[.98]
                       transition-all duration-150 will-change-transform"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-amber-600 font-mono text-xs font-bold mt-0.5">
                #{String(r.recipe_number).padStart(2, '0')}
              </span>
              <span className="font-bold text-stone-800 text-sm leading-snug text-right flex-1">
                {r.title}
              </span>
            </div>
            {r.title_en && (
              <div className="text-stone-400 text-xs mb-2 text-right">{r.title_en}</div>
            )}
            {r.texture && (
              <div className="text-stone-500 text-xs line-clamp-2 text-right mb-2">{r.texture}</div>
            )}
            <div className="flex flex-wrap gap-1 justify-end">
              {(r.vibe_tags || []).slice(0, 3).map(tag => (
                <span key={tag}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                  {tag}
                </span>
              ))}
              {r.cook_time && (
                <span className="text-xs bg-stone-100 text-stone-500 rounded-full px-2 py-0.5">
                  ⏱ {r.cook_time}
                </span>
              )}
            </div>
          </button>
        ))}

        {/* Add recipe card */}
        <button
          onClick={onAdd}
          className="text-right border-2 border-dashed border-stone-300 rounded-2xl p-4
                     hover:border-amber-400 hover:bg-amber-50 active:scale-[.98]
                     transition-all duration-150 will-change-transform text-stone-400 hover:text-amber-600"
        >
          <div className="text-2xl mb-2">＋</div>
          <div className="font-medium text-sm">הוסף מתכון</div>
        </button>
      </div>
    </div>
  )
}

/* ─── SEARCH BAR ────────────────────────────────────────────────── */
function SearchBar({ value, onChange }) {
  return (
    <div className="relative mb-6">
      <input
        type="search"
        placeholder="חפש מתכון לפי שם או מרכיב..."
        value={value}
        onChange={e => onChange(e.target.value)}
        dir="rtl"
        className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-3 pr-11
                   text-stone-800 placeholder-stone-400 text-sm shadow-sm
                   focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-base">🔍</span>
    </div>
  )
}

/* ─── MODAL: ADD CATEGORY ───────────────────────────────────────── */
function AddCategoryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', emoji: '🍴' })
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('categories').insert({
      name: form.name, description: form.description, emoji: form.emoji
    })
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" dir="rtl">
        <h3 className="font-bold text-stone-800 text-lg mb-4">קטגוריה חדשה</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="אימוג׳י" value={form.emoji}
            onChange={e => setForm(f => ({...f, emoji: e.target.value}))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400" />
          <input required placeholder="שם הקטגוריה" value={form.name}
            onChange={e => setForm(f => ({...f, name: e.target.value}))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400" />
          <textarea placeholder="תיאור (אופציונלי)" value={form.description}
            onChange={e => setForm(f => ({...f, description: e.target.value}))}
            rows={2}
            className="w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50">
              ביטול
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── MODAL: ADD RECIPE ─────────────────────────────────────────── */
function AddRecipeModal({ categoryId, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', title_en: '', texture: '', cook_time: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('recipes').insert({
      category_id: categoryId,
      title: form.title.trim(),
      title_en: form.title_en.trim() || null,
      texture: form.texture.trim() || null,
      cook_time: form.cook_time.trim() || null,
      instructions: [],
      vibe_tags: [],
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  const inputCls = 'w-full border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" dir="rtl">
        <h3 className="font-bold text-stone-800 text-lg mb-4">מתכון חדש</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="שם המתכון *" value={form.title}
            onChange={e => setForm(f => ({...f, title: e.target.value}))}
            className={inputCls} />
          <input placeholder="English name" value={form.title_en}
            onChange={e => setForm(f => ({...f, title_en: e.target.value}))}
            className={inputCls} />
          <textarea placeholder="טקסטורה / תיאור" value={form.texture}
            onChange={e => setForm(f => ({...f, texture: e.target.value}))}
            rows={2}
            className={`${inputCls} resize-none`} />
          <input placeholder="זמן הכנה (לדוגמה: 45 דקות)" value={form.cook_time}
            onChange={e => setForm(f => ({...f, cook_time: e.target.value}))}
            className={inputCls} />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50">
              ביטול
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'שומר...' : 'צור מתכון'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── APP ───────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState('dashboard') // dashboard | category | recipe
  const [categories, setCategories] = useState([])
  const [recipes, setRecipes] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [showAddRecipe, setShowAddRecipe] = useState(false)

  // ── Load categories + recipe counts
  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
    setCategories(data || [])
  }, [])

  const loadRecipesForCat = useCallback(async (catId) => {
    setLoading(true)
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('category_id', catId)
      .order('recipe_number')
    setRecipes(data || [])
    setLoading(false)
  }, [])

  // Counts per category
  const [recipeCounts, setRecipeCounts] = useState({})
  useEffect(() => {
    async function loadCounts() {
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
    loadCounts()
  }, [loadCategories])

  // ── Global search
  const [searchResults, setSearchResults] = useState([])
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const q = search.trim().toLowerCase()
    supabase
      .from('recipes')
      .select('*, categories(name, emoji)')
      .or(`title.ilike.%${q}%,title_en.ilike.%${q}%`)
      .limit(20)
      .then(({ data }) => setSearchResults(data || []))
  }, [search])

  // ── Navigation
  function openCategory(cat) {
    setSelectedCat(cat)
    setView('category')
    loadRecipesForCat(cat.id)
  }

  function openRecipe(recipe) {
    setSelectedRecipe(recipe)
    setView('recipe')
  }

  function goBack() {
    if (view === 'recipe') { setView('category'); setSelectedRecipe(null) }
    else { setView('dashboard'); setSelectedCat(null); setRecipes([]) }
  }

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">

      {/* ── Top Bar ── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { setView('dashboard'); setSelectedCat(null); setSelectedRecipe(null); setRecipes([]); setSearch('') }}
            className="font-bold text-stone-800 text-base tracking-tight hover:text-amber-600 transition-colors"
          >
            After Taste 🍴
          </button>
          {selectedCat && (
            <div className="text-stone-500 text-sm hidden sm:block">
              {selectedCat.emoji} {selectedCat.name}
              {selectedRecipe && <> › <span className="text-stone-700">{selectedRecipe.title}</span></>}
            </div>
          )}
          <div className="text-xs text-stone-400">
            {categories.length} קטגוריות
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
              <p className="text-stone-500 text-sm">After Taste Kitchen — {Object.values(recipeCounts).reduce((a,b)=>a+b,0)} מתכונים</p>
            </div>

            <SearchBar value={search} onChange={setSearch} />

            {/* Search results */}
            {search.trim() && (
              <div className="mb-6">
                <div className="text-sm font-semibold text-stone-600 mb-3">
                  תוצאות חיפוש ({searchResults.length})
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-stone-400 text-sm">לא נמצאו מתכונים.</p>
                ) : (
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
                          <div className="text-xs text-stone-400 mt-1 text-right">
                            {r.categories.emoji} {r.categories.name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!search.trim() && (
              loading ? <Spinner /> : (
                <CategoryGrid
                  categories={categories}
                  recipeCounts={recipeCounts}
                  onSelect={openCategory}
                  onAdd={() => setShowAddCat(true)}
                />
              )
            )}
          </>
        )}

        {/* Category */}
        {view === 'category' && selectedCat && (
          loading ? <Spinner /> : (
            <RecipeList
              category={selectedCat}
              recipes={recipes}
              onSelect={openRecipe}
              onAdd={() => setShowAddRecipe(true)}
              onBack={goBack}
            />
          )
        )}

        {/* Recipe */}
        {view === 'recipe' && selectedRecipe && (
          <RecipeDetail
            recipe={selectedRecipe}
            onBack={goBack}
            onRecipeUpdate={updated => setSelectedRecipe(updated)}
          />
        )}
      </main>

      {/* Modals */}
      {showAddCat && (
        <AddCategoryModal
          onClose={() => setShowAddCat(false)}
          onSaved={loadCategories}
        />
      )}
      {showAddRecipe && selectedCat && (
        <AddRecipeModal
          categoryId={selectedCat.id}
          onClose={() => setShowAddRecipe(false)}
          onSaved={() => loadRecipesForCat(selectedCat.id)}
        />
      )}
    </div>
  )
}
