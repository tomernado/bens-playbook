import { createClient } from 'npm:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Two-mode system prompt ─────────────────────────────────────────────────
const SYSTEM_BASE = `You are a Senior Sous-Chef (סו-שף בכיר) in a top-tier kitchen. Professional, patient, precise — no fluff.

LANGUAGE & VOCABULARY:
• Respond in native, natural Israeli Hebrew. Simple, clear sentence structures.
• NEVER translate English literally (e.g., never "בקצה הגמר" or "אפס מלח").
• Use real kitchen terminology: לתקן תיבול, לסגור את הבשר, צמצום, טכניקת קיפול, לקשור את הרוטב, סרוויס.

DATA HIERARCHY:
1. Active Recipe (Sacred): If [ACTIVE RECIPE] is provided, its exact numbers and steps are absolute — never contradict them.
2. Recipe Index: Use the provided index for general menu questions.
3. Expert Knowledge: Apply professional culinary expertise when data is missing.

CHEF MINDSET (Always Active):
• Precision: Think in exact weights/ratios. Scaling/calculating → output ONLY a clean bulleted checklist.
• Elite Standards: Michelin-level solutions only. No cheap home hacks.
• No intro greetings. Bold keywords, bullets for 2-second readability.

FORMATTING:
• Markdown strictly: **bold** key ingredients/actions, bullet points for lists, tables for planning.`

const SYSTEM_SERVICE = `${SYSTEM_BASE}

SERVICE MODE (active):
• Max 3-4 sentences per response. Default to the briefest accurate answer.
• If in doubt, stay brief. Expand ONLY if the user explicitly asks for detail.`

const SYSTEM_PLANNING = `${SYSTEM_BASE}

EVENT PLANNING MODE (active):
• You are now a Menu Planner. Maintain full logical continuity across the entire conversation — remember every dish, constraint, and decision discussed in this session.
• Think in synergy: contrast textures, balance richness, vary temperatures and intensities.
• For multi-dish lineups: output a structured table → | מנה | קטגוריה | זמן הכנה | הערות סינרגיה |
• Flag timing conflicts (two dishes needing the oven simultaneously, etc.).
• Suggest serving order: cold → warm → rich → sweet.
• Longer, structured responses are expected and appropriate in this mode.`

// ── Types ──────────────────────────────────────────────────────────────────
type RecipeRow    = { id: string; recipe_number: number; title: string; title_en: string | null }
type IngRow       = { raw_text: string }
type StepRow      = { step: number; title?: string; body: string }
type BookmarkFull = { id: string; message_text: string; recipe_id: string | null; created_at: string; recipes: { title: string } | null }

function detectNumber(text: string): number | null {
  for (const p of [/מתכון\s*#?\s*(\d+)/i, /recipe\s*#?\s*(\d+)/i, /#(\d+)\b/]) {
    const m = text.match(p)
    if (m) return parseInt(m[1])
  }
  return null
}

function detectName(text: string, index: RecipeRow[]): string | null {
  const low = text.toLowerCase()
  for (const r of index) {
    if (r.title    && low.includes(r.title.toLowerCase()))    return r.id
    if (r.title_en && low.includes(r.title_en.toLowerCase())) return r.id
  }
  return null
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const { action, userId } = body

    // ── Bookmark: save ────────────────────────────────────────────────
    if (action === 'save_bookmark') {
      const { messageText, recipeId } = body
      const { error } = await db.from('chat_bookmarks').insert({
        user_id:      userId,
        message_text: messageText,
        recipe_id:    recipeId ?? null,
      })
      if (error) throw new Error(error.message)
      return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
    }

    // ── Bookmark: delete ──────────────────────────────────────────────
    if (action === 'delete_bookmark') {
      const { bookmarkId, messageText } = body
      const q = db.from('chat_bookmarks').delete().eq('user_id', userId)
      if (bookmarkId) q.eq('id', bookmarkId)
      else            q.eq('message_text', messageText)
      await q
      return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
    }

    // ── Bookmark: fetch all for user ──────────────────────────────────
    if (action === 'get_bookmarks') {
      const { data: bookmarks } = await db
        .from('chat_bookmarks')
        .select('id, message_text, recipe_id, created_at, recipes(title)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      return new Response(
        JSON.stringify({ bookmarks: (bookmarks ?? []) as BookmarkFull[] }),
        { headers: JSON_HEADERS },
      )
    }

    // ── Chat completion ───────────────────────────────────────────────
    const { messages, currentRecipeId, isPlanningMode = false } = body

    // 1. Recipe index
    const { data: idxRaw } = await db
      .from('recipes')
      .select('id, recipe_number, title, title_en')
      .order('recipe_number')
    const index = (idxRaw ?? []) as RecipeRow[]

    // 2. Resolve active recipe (explicit > auto-detect)
    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    let targetId: string | null = currentRecipeId ?? null

    if (!targetId && lastUser) {
      const num = detectNumber(lastUser.content)
      if (num) { const hit = index.find(r => r.recipe_number === num); if (hit) targetId = hit.id }
      if (!targetId) targetId = detectName(lastUser.content, index)
    }

    // 3. Full recipe context
    let recipeBlock = ''
    if (targetId) {
      const [{ data: full, error: recipeErr }, { data: ingRows }] = await Promise.all([
        db.from('recipes')
          .select('recipe_number, title, title_en, texture, cook_time, instructions')
          .eq('id', targetId).single(),
        db.from('ingredients')
          .select('raw_text').eq('recipe_id', targetId).order('sort_order'),
      ])
      if (!recipeErr && full) {
        const ings  = (ingRows ?? []).map((i: IngRow) => i.raw_text).filter(Boolean).join(', ')
        const steps = (full.instructions ?? []).map((s: StepRow) =>
          `${s.step}. ${s.title ? `[${s.title}] ` : ''}${s.body}`
        ).join('\n')
        recipeBlock = `\n\n[ACTIVE RECIPE #${full.recipe_number}: ${full.title}${full.title_en ? ` / ${full.title_en}` : ''}]\nTime: ${full.cook_time ?? '–'} | Notes: ${full.texture ?? '–'}\nIngredients: ${ings || '(none listed)'}\nSteps:\n${steps || '(none listed)'}`
      }
    }

    // 4. Build system + index (no bookmark injection — bookmarks are UI-only)
    const indexLine = index.map(r =>
      `#${r.recipe_number} ${r.title}${r.title_en ? `/${r.title_en}` : ''}`
    ).join(' | ')

    const systemPrompt  = isPlanningMode ? SYSTEM_PLANNING : SYSTEM_SERVICE
    const finalSystem   = `${systemPrompt}\n\nRECIPE INDEX:\n${indexLine}${recipeBlock}`

    // 5. Token routing based on mode
    const maxTokens     = isPlanningMode ? 800 : 300
    const messageSlice  = isPlanningMode ? messages.slice(-100) : messages.slice(-6)

    // 6. Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system:     finalSystem,
        messages:   messageSlice,
      }),
    })

    const result = await anthropicRes.json()
    if (!anthropicRes.ok) throw new Error(`Anthropic ${anthropicRes.status}: ${JSON.stringify(result)}`)

    return new Response(
      JSON.stringify({ content: result.content[0].text }),
      { headers: JSON_HEADERS },
    )
  } catch (err) {
    console.error('[chat] error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
})
