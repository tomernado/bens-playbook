import { createClient } from 'npm:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Ingest-mode system prompt ──────────────────────────────────────────────
const SYSTEM_INGEST = `You are a recipe data extraction tool. Extract structured recipe data from the provided text or image.

OUTPUT FORMAT (mandatory — output NOTHING else):
1. One short Hebrew success line: "✅ מתכון חולץ בהצלחה: [title]"
2. Immediately followed by a JSON block wrapped in <insert_recipe_stream> tags.

JSON schema (use null for unknown fields):
{
  "title": "Hebrew recipe name",
  "title_en": "English recipe name or null",
  "cook_time": "e.g. 45 דקות or null",
  "texture": "Short one-line description/notes or null",
  "ingredients": ["ingredient with quantity", "..."],
  "steps": ["Step 1 text", "Step 2 text", "..."]
}

RULES:
- ingredients: array of strings, one per ingredient including its quantity.
- steps: array of strings, one per instruction step, no numbering prefix.
- Output only the success line + the <insert_recipe_stream>...</insert_recipe_stream> block. No other text.`

// ── Two-mode system prompt ─────────────────────────────────────────────────
const SYSTEM_BASE = `You are a Senior Sous-Chef (סו-שף בכיר) in a top-tier kitchen. Professional, patient, precise — no fluff.

LANGUAGE & VOCABULARY:
• Think and write in natural Israeli Hebrew — not translated English. Write as a native Hebrew speaker who works in a professional kitchen.
• Short, punchy sentence structures. No filler words. Right-to-left reading must feel natural and effortless.
• Real kitchen Hebrew: לתקן תיבול, לסגור את הבשר, צמצום, טכניקת קיפול, לקשור את הרוטב, סרוויס, לנוח, להגיש, לתבל, לחתוך לאורך, לפרוס דק.
• Proper nouns, dish names, and ingredient brands that are universally known in English/French stay in their original language: Carpaccio, Beurre Blanc, Comté, Parmigiano-Reggiano, Sous-vide. No need to translate or transliterate these.

CRITICAL — NEVER DO THIS:
- Do NOT translate English phrases word-for-word into Hebrew (e.g., NEVER "ניקוד לימון מראש" for "pre-scoring with lemon", NEVER "קרוצ'ד מקום" for "crusted in place", NEVER "שמן פלורלי" for "floral oil").
- Do NOT invent Hebrew words that don't exist in a real Israeli kitchen.
- If you don't know the exact Hebrew term — write the English/French term as-is, or use a simple plain Hebrew description. Gibberish is worse than English.

DATA HIERARCHY:
1. Active Recipe (Sacred): If [ACTIVE RECIPE] is provided, its exact numbers and steps are absolute — never contradict them.
2. Recipe Index: Use the provided index for general menu questions.
3. Expert Knowledge: Apply professional culinary expertise when data is missing.

CHEF MINDSET (Always Active):
• Precision: Think in exact weights/ratios. Scaling/calculating → output ONLY a clean bulleted checklist.
• Elite Standards: Michelin-level solutions only. No cheap home hacks.
• No intro greetings. Bold keywords, bullets for 2-second readability.

FORMATTING:
• Markdown strictly: **bold** key ingredients/actions, bullet points for lists, tables for planning.

LENGTH MANAGEMENT & COMPLETION:
• You MUST ensure your response is fully completed and never truncated mid-sentence or mid-table.
• Pace your output: if generating a long menu table or multi-dish lineup, limit detail per row and reduce the number of items if needed to guarantee the final markdown is properly closed within the token limit.
• Always finish your last sentence and close any open table or list before stopping.`

const SYSTEM_SERVICE = `${SYSTEM_BASE}

SERVICE MODE (active):
• Keep answers extremely brief (2-4 sentences max) to save generation time, UNLESS the user asks a complex question requiring detail.
• CRITICAL: NEVER cut off mid-sentence. You must finish your final sentence with a period.`

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

    // ── Recipe: delete ────────────────────────────────────────────────
    if (action === 'delete_recipe') {
      const { recipeId } = body
      await db.from('ingredients').delete().eq('recipe_id', recipeId)
      await db.from('event_menu').delete().eq('recipe_id', recipeId)
      await db.from('chat_bookmarks').delete().eq('recipe_id', recipeId)
      const { error } = await db.from('recipes').delete().eq('id', recipeId)
      if (error) throw new Error(error.message)
      return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
    }

    // ── Recipe: update number ─────────────────────────────────────────
    if (action === 'update_recipe_number') {
      const { recipeId, newNumber } = body
      const { error } = await db.from('recipes').update({ recipe_number: Number(newNumber) }).eq('id', recipeId)
      if (error) throw new Error(error.message)
      return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS })
    }

    // ── Chat completion ───────────────────────────────────────────────
    const {
      messages, currentRecipeId,
      isPlanningMode = false, isIngestMode = false,
      imageBase64 = null, imageMime = 'image/jpeg',
      selectedCategoryId = null,
      recipeNumber = null,
    } = body

    type AnthropicMessage = { role: string; content: string | unknown[] }

    // ── INGEST MODE: isolated single-turn extraction + auto-commit ────
    if (isIngestMode) {
      // 1. Single-turn slice — only the current user message matters (no index needed; category is user-selected)
      const msgSlice: AnthropicMessage[] = messages.slice(-2).map((m: AnthropicMessage) => ({ ...m }))

      // 3. Attach image if provided
      if (imageBase64 && msgSlice.length > 0) {
        const li = msgSlice.length - 1
        if (msgSlice[li].role === 'user') {
          const txt = typeof msgSlice[li].content === 'string' ? msgSlice[li].content as string : String(msgSlice[li].content)
          msgSlice[li] = {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
              { type: 'text', text: txt },
            ],
          }
        }
      }

      const ingestRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_INGEST,
          messages: msgSlice,
        }),
      })
      const ingestResult = await ingestRes.json()
      if (!ingestRes.ok) throw new Error(`Anthropic ${ingestRes.status}: ${JSON.stringify(ingestResult)}`)

      let responseText: string = ingestResult.content[0].text

      // 4. Extract JSON and auto-commit to DB
      const tagMatch = responseText.match(/<insert_recipe_stream>([\s\S]*?)<\/insert_recipe_stream>/)
      if (tagMatch) {
        try {
          const parsed = JSON.parse(tagMatch[1].trim())

          // Insert recipe — number only if user provided one
          const recipeInsert: Record<string, unknown> = {
            title:        parsed.title,
            title_en:     parsed.title_en ?? null,
            category_id:  selectedCategoryId ?? null,
            cook_time:    parsed.cook_time ?? null,
            texture:      parsed.texture ?? null,
            instructions: (parsed.steps ?? []).map((body: string, i: number) => ({ step: i + 1, body })),
            vibe_tags:    [],
          }
          if (recipeNumber != null) recipeInsert.recipe_number = Number(recipeNumber)

          const { data: newRecipe, error: recipeErr } = await db.from('recipes').insert(recipeInsert).select('id').single()

          if (!recipeErr && newRecipe) {
            const ingRows = (parsed.ingredients ?? []).map((raw_text: string, i: number) => ({
              recipe_id: newRecipe.id, raw_text, sort_order: i,
            }))
            if (ingRows.length > 0) await db.from('ingredients').insert(ingRows)
          }
        } catch (parseErr) {
          console.error('[ingest] parse/insert error:', parseErr)
        }

        // Strip the XML/JSON block — user only sees the success confirmation line
        responseText = responseText.replace(/<insert_recipe_stream>[\s\S]*?<\/insert_recipe_stream>/g, '').trim()
      }

      return new Response(JSON.stringify({ content: responseText }), { headers: JSON_HEADERS })
    }

    // ── NORMAL CHAT MODE ──────────────────────────────────────────────

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

    // 4. Build system + index
    const indexLine = index.map(r =>
      `#${r.recipe_number} ${r.title}${r.title_en ? `/${r.title_en}` : ''}`
    ).join(' | ')

    const systemPrompt = isPlanningMode ? SYSTEM_PLANNING : SYSTEM_SERVICE
    const finalSystem  = `${systemPrompt}\n\nRECIPE INDEX:\n${indexLine}${recipeBlock}`

    // 5. Token routing
    const maxTokens    = 4096
    const messageSlice = isPlanningMode ? messages.slice(-100) : messages.slice(-6)

    // 6. Attach image to last user message if provided
    const apiMessages: AnthropicMessage[] = messageSlice.map((m: AnthropicMessage) => ({ ...m }))
    if (imageBase64 && apiMessages.length > 0) {
      const lastIdx = apiMessages.length - 1
      const last = apiMessages[lastIdx]
      if (last.role === 'user') {
        const textContent = typeof last.content === 'string' ? last.content : String(last.content)
        apiMessages[lastIdx] = {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageBase64 } },
            { type: 'text', text: textContent },
          ],
        }
      }
    }

    // 7. Call Anthropic
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
        messages:   apiMessages,
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
