import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Unit recognition ──────────────────────────────────────────────────────
// Ordered longest-first to prevent partial matches in alternation
const UNITS_PAT = [
  'קילוגרם','מיליליטר','כפיות','יחידות','חבילות','צרורות','שיניים','ענפים','ראשים','פרוסות','חופנים',
  'כפות','כוסות','כפית','יחידה','חבילה','צרור','ענף','ראש','פרוסה','חופן',
  'ס"מ','ק"ג','קילו','כוס','כף','שן','ליטר','גרם','מ"ל','קורט','מל','קג','סמ',
].join('|')

// qty at END:   "שמן זית 3 כפות"
const QTY_END_RE = new RegExp(
  `\\s+(\\d[\\d./\\-]*(?:\\s*-\\s*\\d+)?)\\s*(${UNITS_PAT})\\.?\\s*$`, 'u'
)
// qty at START: "3 כפות שמן זית"
const QTY_START_RE = new RegExp(
  `^(\\d[\\d./\\-]*(?:\\s*-\\s*\\d+)?)\\s*(${UNITS_PAT})\\.?\\s+`, 'u'
)

function parseIngLine(raw) {
  raw = raw.trim().replace(/\.$/, '').replace(/,\s*$/, '')
  const m = raw.match(QTY_END_RE)
  if (m) return { name: raw.slice(0, m.index).trim().replace(/,\s*$/, ''), qty: `${m[1].trim()} ${m[2]}` }
  const m2 = raw.match(QTY_START_RE)
  if (m2) return { name: raw.slice(m2[0].length).trim(), qty: `${m2[1].trim()} ${m2[2]}` }
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
  const order = [], map = {}
  for (const row of rows) {
    const g = row.group_name || 'רכיבים'
    if (!map[g]) { map[g] = []; order.push(g) }
    map[g].push(row)
  }
  return order.map(g => ({ group: g, rows: map[g] }))
}

// ─── Steps ↔ text conversion ───────────────────────────────────────────────
function stepsToText(steps) {
  return steps.map(s => (s.body || '').replace(/\.$/, '')).join('. ') + (steps.length ? '.' : '')
}

function textToSteps(text) {
  return text
    .split(/\.\s+(?=[א-תA-Za-z0-9])/)
    .map(s => s.trim().replace(/\.$/, '').trim())
    .filter(s => s.length > 2)
    .map((body, i) => ({ step: i + 1, title: null, body }))
}

// ─── Shared input class ────────────────────────────────────────────────────
const INPUT = 'w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100'

// ─── Ingredient DB Row ─────────────────────────────────────────────────────
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
    if (val.trim() !== (ing.raw_text || '').trim()) await onSave(val.trim())
  }

  if (editing) {
    return (
      <div className="py-2 border-b border-stone-100 last:border-0">
        <textarea
          ref={ref}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setEditing(false); setVal(ing.raw_text || '') } }}
          rows={2} dir="rtl"
          placeholder="שם רכיב + כמות, ניתן להפריד בפסיקים"
          className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
        />
        <div className="flex gap-2 mt-1.5">
          <button onClick={() => { setEditing(false); setVal(ing.raw_text || '') }}
            className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg">ביטול</button>
          <button onClick={save}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1 font-medium">שמור</button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      <div className="absolute left-0 top-1 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
        <button onClick={() => setEditing(true)}
          className="text-stone-400 hover:text-amber-500 text-sm p-1 touch-manipulation">✏</button>
        <button onClick={onDelete}
          className="text-stone-400 hover:text-red-400 text-sm font-bold p-1 touch-manipulation">×</button>
      </div>
      {items.length === 0 ? (
        <div className="py-2 text-stone-300 text-sm text-right italic border-b border-stone-100">{ing.raw_text || '(ריק)'}</div>
      ) : (
        items.map((item, i) => {
          const key = `${ing.id}-${i}`
          const checked = !!checkedMap[key]
          return (
            <label key={key} className="flex items-baseline gap-3 py-2 cursor-pointer border-b border-stone-100 last:border-0 pr-6">
              <input type="checkbox" checked={checked} onChange={() => onCheckChange(key)}
                className="mt-1 shrink-0 accent-amber-500 w-4 h-4 touch-manipulation" />
              <span className={`flex-1 text-sm leading-snug text-right transition-all ${checked ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                {item.name}
              </span>
              {item.qty && (
                <span className={`shrink-0 text-xs font-mono font-semibold rounded-lg px-2 py-0.5 ${checked ? 'bg-stone-100 text-stone-300' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
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

// ─── Step Row ──────────────────────────────────────────────────────────────
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
          <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold shrink-0">{step.step}</span>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="כותרת שלב (אופציונלי)" dir="rtl"
            className="flex-1 border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:border-amber-400" />
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)}
          autoFocus={!step.body} rows={4} dir="rtl" placeholder="תוכן השלב..."
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-amber-400 resize-none" />
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setEditing(false); setTitle(step.title || ''); setBody(step.body || '') }}
            className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 rounded-lg">ביטול</button>
          <button onClick={save}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 font-medium">שמור שלב</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 p-3 rounded-xl transition-all duration-200 mb-2 group ${checked ? 'bg-stone-50 opacity-50' : 'bg-white border border-stone-100 shadow-sm hover:shadow'}`}>
      <div className="shrink-0 flex flex-col items-center gap-1.5 mt-0.5">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${checked ? 'bg-stone-200 text-stone-400' : 'bg-amber-500 text-white'}`}>{step.step}</span>
        <input type="checkbox" checked={checked} onChange={onChange} className="accent-amber-500 w-4 h-4 touch-manipulation" />
      </div>
      <div className="flex-1 text-right min-w-0">
        {step.title && <div className={`font-semibold text-sm mb-1 ${checked ? 'text-stone-400' : 'text-stone-800'}`}>{step.title}</div>}
        <p className={`text-sm leading-relaxed ${checked ? 'text-stone-400' : 'text-stone-600'}`}>{step.body}</p>
      </div>
      <div className="shrink-0 flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-0.5">
        <button onClick={() => setEditing(true)} className="text-stone-400 hover:text-amber-600 text-sm p-1 touch-manipulation">✏</button>
        <button onClick={onDelete} className="text-stone-300 hover:text-red-400 text-sm font-bold p-1 touch-manipulation">×</button>
      </div>
    </div>
  )
}

// ─── RECIPE DETAIL ─────────────────────────────────────────────────────────
export default function RecipeDetail({ recipe: initialRecipe, onBack, onRecipeUpdate, eventIds, onToggleEvent }) {
  const [recipe, setRecipe]       = useState(initialRecipe)
  const [ingRows, setIngRows]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [checkedIng, setCheckedIng]   = useState({})
  const [checkedStep, setCheckedStep] = useState({})

  // ── Meta edit panel
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ title: '', title_en: '', cook_time: '', texture: '' })

  // ── Bulk steps edit
  const [bulkEdit, setBulkEdit]   = useState(false)
  const [bulkText, setBulkText]   = useState('')

  useEffect(() => {
    setRecipe(initialRecipe)
    setCheckedIng({})
    setCheckedStep({})
    setEditingMeta(false)
    setBulkEdit(false)
    setLoading(true)
    supabase.from('ingredients').select('*').eq('recipe_id', initialRecipe.id).order('sort_order')
      .then(({ data }) => { setIngRows(data || []); setLoading(false) })
  }, [initialRecipe.id])

  const groups = useMemo(() => groupByGroupName(ingRows), [ingRows])
  const steps  = useMemo(() => Array.isArray(recipe.instructions) ? recipe.instructions : [], [recipe.instructions])
  const totalIng = useMemo(() => ingRows.reduce((s, r) => s + splitIngredients(r.raw_text || '').length, 0), [ingRows])
  const doneIng  = Object.values(checkedIng).filter(Boolean).length
  const doneStep = Object.values(checkedStep).filter(Boolean).length
  const inEvent  = eventIds?.includes(recipe.id)

  // ── Meta save ──────────────────────────────────────────────────────────
  function openMeta() {
    setMetaForm({ title: recipe.title || '', title_en: recipe.title_en || '', cook_time: recipe.cook_time || '', texture: recipe.texture || '' })
    setEditingMeta(true)
  }

  async function saveMeta() {
    const updates = {
      title:    metaForm.title.trim()    || recipe.title,
      title_en: metaForm.title_en.trim() || null,
      cook_time: metaForm.cook_time.trim() || null,
      texture:  metaForm.texture.trim()  || null,
    }
    const { data, error } = await supabase.from('recipes').update(updates).eq('id', recipe.id).select().single()
    if (!error && data) { setRecipe(data); onRecipeUpdate?.(data) }
    setEditingMeta(false)
  }

  // ── Bulk steps ────────────────────────────────────────────────────────
  function openBulk() {
    setBulkText(stepsToText(steps))
    setBulkEdit(true)
  }

  async function saveBulk() {
    const newSteps = textToSteps(bulkText)
    const { data, error } = await supabase.from('recipes').update({ instructions: newSteps }).eq('id', recipe.id).select().single()
    if (!error && data) { setRecipe(data); setCheckedStep({}) }
    setBulkEdit(false)
  }

  // ── Ingredient CRUD ───────────────────────────────────────────────────
  async function saveIngRow(ingId, newText) {
    await supabase.from('ingredients').update({ raw_text: newText }).eq('id', ingId)
    setIngRows(rows => rows.map(r => r.id === ingId ? { ...r, raw_text: newText, _isNew: false } : r))
    setCheckedIng(prev => { const n = { ...prev }; Object.keys(n).forEach(k => { if (k.startsWith(`${ingId}-`)) delete n[k] }); return n })
  }

  async function deleteIngRow(ingId) {
    await supabase.from('ingredients').delete().eq('id', ingId)
    setIngRows(rows => rows.filter(r => r.id !== ingId))
  }

  async function addIngRow() {
    const maxSort = ingRows.length > 0 ? Math.max(...ingRows.map(r => r.sort_order || 0)) : 0
    const { data } = await supabase.from('ingredients')
      .insert({ recipe_id: recipe.id, raw_text: '', group_name: 'רכיבים', sort_order: maxSort + 1 })
      .select().single()
    if (data) setIngRows(rows => [...rows, { ...data, _isNew: true }])
  }

  // ── Step CRUD (per-step) ──────────────────────────────────────────────
  async function saveStep(idx, updated) {
    // Auto-split if body contains ". " before a Hebrew/Latin character
    const parts = updated.body
      .split(/\.\s+(?=[א-תA-Za-z0-9])/)
      .map(s => s.trim().replace(/\.$/, '').trim())
      .filter(s => s.length > 0)

    let replacement
    if (parts.length <= 1) {
      replacement = [updated]
    } else {
      // First sub-step keeps the original title; rest have no title
      replacement = parts.map((body, i) => ({
        title: i === 0 ? (updated.title || null) : null,
        body,
      }))
    }

    const before = steps.slice(0, idx)
    const after  = steps.slice(idx + 1)
    const newSteps = [...before, ...replacement, ...after]
      .map((s, i) => ({ ...s, step: i + 1 }))

    const { data } = await supabase.from('recipes').update({ instructions: newSteps }).eq('id', recipe.id).select().single()
    if (data) setRecipe(data)
  }

  async function deleteStep(idx) {
    const newSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }))
    const { data } = await supabase.from('recipes').update({ instructions: newSteps }).eq('id', recipe.id).select().single()
    if (data) { setRecipe(data); setCheckedStep({}) }
  }

  async function addStep() {
    const { data } = await supabase.from('recipes')
      .update({ instructions: [...steps, { step: steps.length + 1, title: '', body: '' }] })
      .eq('id', recipe.id).select().single()
    if (data) setRecipe(data)
  }

  return (
    <div dir="rtl">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-stone-400 hover:text-amber-600 text-sm flex items-center gap-1 transition-colors touch-manipulation">
            → חזרה
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleEvent?.(recipe.id)}
              className={`text-2xl touch-manipulation transition-all leading-none ${inEvent ? 'opacity-100 drop-shadow-sm' : 'opacity-25 hover:opacity-70'}`}
              title={inEvent ? 'הסר מתפריט אירוע' : 'הוסף לתפריט אירוע'}
            >{inEvent ? '⭐' : '☆'}</button>
            <button
              onClick={openMeta}
              className="text-xs bg-stone-100 hover:bg-amber-50 hover:text-amber-700 text-stone-600 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >✏ עריכת פרטים</button>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 font-mono">
            #{String(recipe.recipe_number).padStart(2, '0')}
          </span>
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">{recipe.title}</h1>
          {recipe.title_en && <div className="text-stone-400 text-sm italic mt-0.5">{recipe.title_en}</div>}
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {recipe.cook_time && (
            <span className="text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-600">⏱ {recipe.cook_time}</span>
          )}
          <span className="text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-600">🧂 {totalIng} רכיבים</span>
          <span className="text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-stone-600">👨‍🍳 {steps.length} שלבים</span>
        </div>

        {recipe.texture && (
          <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-right">
            <span className="font-semibold">טקסטורה: </span>{recipe.texture}
          </div>
        )}

        {/* ── Meta edit panel ── */}
        {editingMeta && (
          <div className="mt-4 bg-white border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-stone-700 text-sm text-right">עריכת פרטי המתכון</h3>
            <input value={metaForm.title}
              onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))}
              placeholder="שם המתכון *" className={INPUT} />
            <input value={metaForm.title_en}
              onChange={e => setMetaForm(f => ({ ...f, title_en: e.target.value }))}
              placeholder="English name" className={INPUT} dir="ltr" style={{ textAlign: 'left' }} />
            <input value={metaForm.cook_time}
              onChange={e => setMetaForm(f => ({ ...f, cook_time: e.target.value }))}
              placeholder="זמן הכנה (לדוגמה: 45 דקות)" className={INPUT} />
            <textarea value={metaForm.texture}
              onChange={e => setMetaForm(f => ({ ...f, texture: e.target.value }))}
              placeholder="טקסטורה / תיאור" rows={3}
              className={`${INPUT} resize-none`} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingMeta(false)}
                className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50">ביטול</button>
              <button onClick={saveMeta}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 text-sm font-medium">שמור</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Progress ── */}
      {(totalIng > 0 || steps.length > 0) && (
        <div className="mb-6 bg-white border border-stone-200 rounded-2xl p-4">
          <div className="flex justify-between text-xs text-stone-500 mb-2">
            <span>התקדמות</span>
            <span>{doneIng}/{totalIng} רכיבים · {doneStep}/{steps.length} שלבים</span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${totalIng + steps.length > 0 ? Math.round(((doneIng + doneStep) / (totalIng + steps.length)) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {/* ── Kitchen Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">

        {/* INGREDIENTS */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">{doneIng}/{totalIng} סומנו</span>
            <h2 className="font-bold text-stone-800 text-sm flex items-center gap-2">רכיבים 🧂</h2>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-[3px] border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {groups.length === 0
                  ? <p className="text-stone-400 text-sm text-center py-4">אין רכיבים — לחץ להוסיף.</p>
                  : groups.map(({ group, rows }) => (
                    <div key={group} className="mb-5 last:mb-0">
                      {group !== 'רכיבים' && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px flex-1 bg-amber-100" />
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">{group}</span>
                        </div>
                      )}
                      {rows.map(ing => (
                        <IngredientDBRow key={ing.id} ing={ing} checkedMap={checkedIng}
                          onCheckChange={key => setCheckedIng(p => ({ ...p, [key]: !p[key] }))}
                          onSave={t => saveIngRow(ing.id, t)}
                          onDelete={() => deleteIngRow(ing.id)} />
                      ))}
                    </div>
                  ))
                }
                <button onClick={addIngRow}
                  className="mt-3 w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-xs text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors">
                  + הוסף רכיב
                </button>
              </>
            )}
          </div>
        </div>

        {/* STEPS */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">{doneStep}/{steps.length}</span>
              <button
                onClick={bulkEdit ? () => setBulkEdit(false) : openBulk}
                className="text-xs text-stone-400 hover:text-amber-600 px-2 py-0.5 rounded-lg hover:bg-amber-50 transition-colors"
              >{bulkEdit ? '← ביטול' : '✏ ערוך הכל'}</button>
            </div>
            <h2 className="font-bold text-stone-800 text-sm flex items-center gap-2">הוראות הכנה 👨‍🍳</h2>
          </div>

          {bulkEdit ? (
            <div className="p-4">
              <p className="text-xs text-stone-400 mb-2 text-right">שלבים מופרדים בנקודה. לדוגמה: חמם שמן. הוסף בצל. בשל 10 דקות.</p>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                dir="rtl" rows={12}
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:border-amber-400 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setBulkEdit(false)}
                  className="flex-1 border border-stone-200 rounded-xl py-2 text-xs text-stone-600 hover:bg-stone-50">ביטול</button>
                <button onClick={saveBulk}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 text-xs font-medium">שמור שלבים</button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {steps.length === 0 && <p className="text-stone-400 text-sm text-center py-4">אין שלבים — לחץ להוסיף.</p>}
              {steps.map((step, idx) => (
                <StepRow key={idx} step={step} checked={!!checkedStep[idx]}
                  onChange={() => setCheckedStep(p => ({ ...p, [idx]: !p[idx] }))}
                  onSave={u => saveStep(idx, u)}
                  onDelete={() => deleteStep(idx)} />
              ))}
              <button onClick={addStep}
                className="mt-2 w-full py-2 border-2 border-dashed border-stone-200 rounded-xl text-xs text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors">
                + הוסף שלב
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
