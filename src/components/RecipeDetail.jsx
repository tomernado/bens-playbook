import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'

/* ─── Ingredient parsing ─────────────────────────────────────────── */
const QTY_RE =
  /\s+(\d[\d.\/,\-]*(?:\s*-\s*\d+)?)\s*(קג|גרם|מ"ל|מל|ליטר|כוסות?|כפות?|כפיות?|יחידות?|יחידה|סמ|ס"מ|חבילות?|צרורות?|שיניים?|ענפים?|ראשים?|פרוסות?|קורט|חופנים?)\.?\s*$/u

function parseIngLine(raw) {
  raw = raw.trim().replace(/\.$/, '').replace(/,\s*$/, '')
  const m = raw.match(QTY_RE)
  if (m) return { name: raw.slice(0, m.index).trim().replace(/,\s*$/, ''), qty: `${m[1].trim()} ${m[2]}` }
  return { name: raw, qty: null }
}

function splitIngredients(rawText) {
  if (!rawText) return []
  return rawText
    .split(/,\s*(?=[^\d])/)
    .map(s => s.trim())
    .filter(s => s.length > 2)
    .map(parseIngLine)
}

function groupByGroupName(rows) {
  const order = []
  const map = {}
  for (const row of rows) {
    const g = row.group_name || 'רכיבים'
    if (!map[g]) { map[g] = []; order.push(g) }
    map[g].push(row)
  }
  return order.map(g => ({ group: g, rows: map[g] }))
}

/* ─── Inline field editor for recipe metadata ────────────────────── */
function InlineField({ value, onSave, placeholder, className, multiline }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => { setVal(value || '') }, [value])
  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  async function save() {
    setEditing(false)
    const trimmed = val.trim()
    if (trimmed !== (value || '').trim()) {
      await onSave(trimmed || null)
    }
  }

  if (editing) {
    const sharedProps = {
      ref,
      value: val,
      onChange: e => setVal(e.target.value),
      onBlur: save,
      onKeyDown: e => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); save() }
        if (e.key === 'Escape') { setEditing(false); setVal(value || '') }
      },
      className: `border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-200 w-full text-sm ${className || ''}`,
    }
    return multiline ? <textarea {...sharedProps} rows={3} /> : <input {...sharedProps} />
  }

  return (
    <span
      className={`group inline-flex items-center gap-1.5 cursor-pointer hover:text-amber-700 transition-colors ${className || ''}`}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-stone-300 italic">{placeholder}</span>}
      <span className="text-stone-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity select-none">✏</span>
    </span>
  )
}

/* ─── Ingredient DB row (edit/delete at row level, display parsed) ── */
function IngredientDBRow({ ing, checkedMap, onCheckChange, onSave, onDelete }) {
  const [editing, setEditing] = useState(!!ing._isNew)
  const [val, setVal] = useState(ing.raw_text || '')
  const ref = useRef(null)

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])
  useEffect(() => { setVal(ing.raw_text || '') }, [ing.raw_text])

  const items = useMemo(() => splitIngredients(ing.raw_text || ''), [ing.raw_text])

  async function save() {
    if (!val.trim()) { setEditing(false); return }
    setEditing(false)
    if (val.trim() !== (ing.raw_text || '').trim()) {
      await onSave(val.trim())
    }
  }

  if (editing) {
    return (
      <div className="py-2 border-b border-stone-100 last:border-0">
        <textarea
          ref={ref}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); setVal(ing.raw_text || '') } }}
          rows={2}
          dir="rtl"
          placeholder="שם רכיב + כמות, ניתן להפריד בפסיקים"
          className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
        />
        <div className="flex gap-2 mt-1.5 justify-start">
          <button
            onClick={() => { setEditing(false); setVal(ing.raw_text || '') }}
            className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg"
          >
            ביטול
          </button>
          <button
            onClick={save}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1 font-medium"
          >
            שמור
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      <div className="absolute left-0 top-1 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => setEditing(true)}
          className="text-stone-400 hover:text-amber-500 text-sm leading-none p-1 touch-manipulation"
          title="עריכה"
        >✏</button>
        <button
          onClick={onDelete}
          className="text-stone-400 hover:text-red-400 text-sm font-bold leading-none p-1 touch-manipulation"
          title="מחיקה"
        >×</button>
      </div>

      {items.length === 0 ? (
        <div className="py-2 text-stone-300 text-sm text-right italic border-b border-stone-100">
          {ing.raw_text || '(ריק)'}
        </div>
      ) : (
        items.map((item, splitIdx) => {
          const key = `${ing.id}-${splitIdx}`
          const checked = !!checkedMap[key]
          return (
            <label
              key={key}
              className="flex items-baseline gap-3 py-2 cursor-pointer border-b border-stone-100 last:border-0 pr-6"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onCheckChange(key)}
                className="mt-1 shrink-0 accent-amber-500 w-4 h-4 rounded"
              />
              <span className={`flex-1 text-sm leading-snug text-right transition-all duration-200
                ${checked ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                {item.name}
              </span>
              {item.qty && (
                <span className={`shrink-0 text-xs font-mono font-semibold rounded-lg px-2 py-0.5 transition-all
                  ${checked ? 'bg-stone-100 text-stone-300' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {item.qty}
                </span>
              )}
            </label>
          )
        })
      )}
    </div>
  )
}

/* ─── Step row with inline edit ──────────────────────────────────── */
function StepRow({ step, checked, onChange, onSave, onDelete }) {
  const [editing, setEditing] = useState(!step.body)
  const [title, setTitle] = useState(step.title || '')
  const [body, setBody] = useState(step.body || '')

  useEffect(() => { setTitle(step.title || ''); setBody(step.body || '') }, [step])

  async function save() {
    setEditing(false)
    await onSave({ ...step, title: title.trim(), body: body.trim() })
  }

  if (editing) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
            {step.step}
          </span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="כותרת שלב (אופציונלי)"
            dir="rtl"
            className="flex-1 border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:border-amber-400"
          />
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          autoFocus={!step.body}
          rows={5}
          dir="rtl"
          placeholder="תוכן השלב..."
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-amber-400 resize-none"
        />
        <div className="flex gap-2 mt-3 justify-start">
          <button
            onClick={() => { setEditing(false); setTitle(step.title||''); setBody(step.body||'') }}
            className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 rounded-lg"
          >
            ביטול
          </button>
          <button
            onClick={save}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 font-medium"
          >
            שמור שלב
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 p-3 rounded-xl transition-all duration-200 mb-2 group
      ${checked ? 'bg-stone-50 opacity-50' : 'bg-white border border-stone-100 shadow-sm hover:shadow'}`}>
      <div className="shrink-0 flex flex-col items-center gap-1.5 mt-0.5">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${checked ? 'bg-stone-200 text-stone-400' : 'bg-amber-500 text-white'}`}>
          {step.step}
        </span>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="accent-amber-500 w-4 h-4 touch-manipulation"
        />
      </div>
      <div className="flex-1 text-right min-w-0">
        {step.title && (
          <div className={`font-semibold text-sm mb-1 ${checked ? 'text-stone-400' : 'text-stone-800'}`}>
            {step.title}
          </div>
        )}
        <p className={`text-sm leading-relaxed ${checked ? 'text-stone-400' : 'text-stone-600'}`}>
          {step.body}
        </p>
      </div>
      <div className="shrink-0 flex flex-col gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-0.5">
        <button
          onClick={() => setEditing(true)}
          className="text-stone-400 hover:text-amber-600 text-sm leading-none p-1 touch-manipulation"
          title="עריכה"
        >✏</button>
        <button
          onClick={onDelete}
          className="text-stone-300 hover:text-red-400 text-sm font-bold leading-none p-1 touch-manipulation"
          title="מחיקה"
        >×</button>
      </div>
    </div>
  )
}

/* ─── RECIPE DETAIL ──────────────────────────────────────────────── */
export default function RecipeDetail({ recipe: initialRecipe, onBack, onRecipeUpdate }) {
  const [recipe, setRecipe] = useState(initialRecipe)
  const [ingRows, setIngRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkedIng, setCheckedIng] = useState({})
  const [checkedStep, setCheckedStep] = useState({})

  useEffect(() => {
    setRecipe(initialRecipe)
    setCheckedIng({})
    setCheckedStep({})
    setLoading(true)
    supabase
      .from('ingredients')
      .select('*')
      .eq('recipe_id', initialRecipe.id)
      .order('sort_order')
      .then(({ data }) => { setIngRows(data || []); setLoading(false) })
  }, [initialRecipe.id])

  const groups = useMemo(() => groupByGroupName(ingRows), [ingRows])
  const steps = useMemo(
    () => Array.isArray(recipe.instructions) ? recipe.instructions : [],
    [recipe.instructions]
  )

  const totalIng = useMemo(
    () => ingRows.reduce((s, r) => s + splitIngredients(r.raw_text || '').length, 0),
    [ingRows]
  )
  const doneIng  = Object.values(checkedIng).filter(Boolean).length
  const doneStep = Object.values(checkedStep).filter(Boolean).length

  /* ── Recipe field updates ── */
  async function updateRecipeField(field, value) {
    const { data } = await supabase
      .from('recipes').update({ [field]: value }).eq('id', recipe.id).select().single()
    if (data) { setRecipe(data); onRecipeUpdate?.(data) }
  }

  /* ── Ingredient CRUD ── */
  async function saveIngRow(ingId, newText) {
    await supabase.from('ingredients').update({ raw_text: newText }).eq('id', ingId)
    setIngRows(rows => rows.map(r => r.id === ingId ? { ...r, raw_text: newText, _isNew: false } : r))
    setCheckedIng(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { if (k.startsWith(`${ingId}-`)) delete next[k] })
      return next
    })
  }

  async function deleteIngRow(ingId) {
    await supabase.from('ingredients').delete().eq('id', ingId)
    setIngRows(rows => rows.filter(r => r.id !== ingId))
  }

  async function addIngRow() {
    const maxSort = ingRows.length > 0 ? Math.max(...ingRows.map(r => r.sort_order || 0)) : 0
    const { data } = await supabase
      .from('ingredients')
      .insert({ recipe_id: recipe.id, raw_text: '', group_name: 'רכיבים', sort_order: maxSort + 1 })
      .select()
      .single()
    if (data) setIngRows(rows => [...rows, { ...data, _isNew: true }])
  }

  /* ── Step CRUD (JSONB in recipes.instructions) ── */
  async function saveStep(idx, updatedStep) {
    const newSteps = steps.map((s, i) => i === idx ? updatedStep : s)
    const { data } = await supabase
      .from('recipes').update({ instructions: newSteps }).eq('id', recipe.id).select().single()
    if (data) setRecipe(data)
  }

  async function deleteStep(idx) {
    const newSteps = steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, step: i + 1 }))
    const { data } = await supabase
      .from('recipes').update({ instructions: newSteps }).eq('id', recipe.id).select().single()
    if (data) { setRecipe(data); setCheckedStep({}) }
  }

  async function addStep() {
    const newStep = { step: steps.length + 1, title: '', body: '' }
    const { data } = await supabase
      .from('recipes').update({ instructions: [...steps, newStep] }).eq('id', recipe.id).select().single()
    if (data) setRecipe(data)
  }

  return (
    <div dir="rtl">

      {/* ── Header ── */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-stone-400 hover:text-amber-600 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          <span>→</span><span>חזרה לרשימה</span>
        </button>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="text-right flex-1 min-w-0" style={{minWidth: '60%'}}>
            <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold
                             px-2 py-0.5 rounded-full mb-2 font-mono">
              # {String(recipe.recipe_number).padStart(2, '0')}
            </span>
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">
              <InlineField
                value={recipe.title}
                onSave={v => updateRecipeField('title', v)}
                className="text-2xl font-bold text-stone-900"
                placeholder="שם המתכון"
              />
            </h1>
            <div className="mt-0.5">
              <InlineField
                value={recipe.title_en}
                onSave={v => updateRecipeField('title_en', v)}
                className="text-stone-400 text-sm italic"
                placeholder="English name"
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 shrink-0">
            <div className="text-center bg-white border border-stone-200 rounded-xl px-3 py-2 min-w-[60px]">
              <div className="text-xs text-stone-500 mb-1">זמן</div>
              <InlineField
                value={recipe.cook_time}
                onSave={v => updateRecipeField('cook_time', v)}
                className="text-xs font-medium text-stone-700 block text-center"
                placeholder="—"
              />
            </div>
            <div className="text-center bg-white border border-stone-200 rounded-xl px-3 py-2">
              <div className="text-lg font-bold text-amber-600">{totalIng}</div>
              <div className="text-xs text-stone-500 mt-0.5">רכיבים</div>
            </div>
            <div className="text-center bg-white border border-stone-200 rounded-xl px-3 py-2">
              <div className="text-lg font-bold text-amber-600">{steps.length}</div>
              <div className="text-xs text-stone-500 mt-0.5">שלבים</div>
            </div>
          </div>
        </div>

        {/* Texture note */}
        <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100
                        rounded-xl px-4 py-2.5 text-right">
          <span className="font-semibold">טקסטורה: </span>
          <InlineField
            value={recipe.texture}
            onSave={v => updateRecipeField('texture', v)}
            className="text-amber-800"
            placeholder="לא הוגדר — לחץ לעריכה"
            multiline
          />
        </div>
      </div>

      {/* ── Progress bar ── */}
      {(totalIng > 0 || steps.length > 0) && (
        <div className="mb-6 bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex justify-between text-xs text-stone-500 mb-2">
            <span>התקדמות</span>
            <span>{doneIng}/{totalIng} רכיבים · {doneStep}/{steps.length} שלבים</span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{
                width: `${totalIng + steps.length > 0
                  ? Math.round(((doneIng + doneStep) / (totalIng + steps.length)) * 100)
                  : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* ── Kitchen Split View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">

        {/* ── INGREDIENTS ── */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">{doneIng}/{totalIng} סומנו</span>
            <h2 className="font-bold text-stone-800 text-sm flex items-center gap-2">
              רכיבים <span className="text-base">🧂</span>
            </h2>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {groups.length === 0 ? (
                  <p className="text-stone-400 text-sm text-center py-4">אין רכיבים — לחץ להוסיף.</p>
                ) : (
                  groups.map(({ group, rows }) => (
                    <div key={group} className="mb-5 last:mb-0">
                      {group !== 'רכיבים' && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px flex-1 bg-amber-100" />
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-wide
                                           bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">
                            {group}
                          </span>
                        </div>
                      )}
                      {rows.map(ing => (
                        <IngredientDBRow
                          key={ing.id}
                          ing={ing}
                          checkedMap={checkedIng}
                          onCheckChange={key => setCheckedIng(p => ({ ...p, [key]: !p[key] }))}
                          onSave={newText => saveIngRow(ing.id, newText)}
                          onDelete={() => deleteIngRow(ing.id)}
                        />
                      ))}
                    </div>
                  ))
                )}

                <button
                  onClick={addIngRow}
                  className="mt-3 w-full py-2 border-2 border-dashed border-stone-200 rounded-xl
                             text-xs text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors"
                >
                  + הוסף רכיב
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── STEPS ── */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 bg-white flex items-center justify-between">
            <span className="text-xs text-stone-400">{doneStep}/{steps.length} שלבים</span>
            <h2 className="font-bold text-stone-800 text-sm flex items-center gap-2">
              הוראות הכנה <span className="text-base">👨‍🍳</span>
            </h2>
          </div>

          <div className="p-4">
            {steps.length === 0 && (
              <p className="text-stone-400 text-sm text-center py-4">אין שלבים — לחץ להוסיף.</p>
            )}

            {steps.map((step, idx) => (
              <StepRow
                key={idx}
                step={step}
                checked={!!checkedStep[idx]}
                onChange={() => setCheckedStep(p => ({ ...p, [idx]: !p[idx] }))}
                onSave={updatedStep => saveStep(idx, updatedStep)}
                onDelete={() => deleteStep(idx)}
              />
            ))}

            <button
              onClick={addStep}
              className="mt-2 w-full py-2 border-2 border-dashed border-stone-200 rounded-xl
                         text-xs text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors"
            >
              + הוסף שלב
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
