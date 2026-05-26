import { createClient } from 'npm:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY       = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SYSTEM = `You are a highly experienced Senior Sous-Chef (סו-שף בכיר) in a top-tier kitchen. Your tone is professional, patient, and highly practical. You speak directly, without fluff, but with a respectful, mentoring attitude.

LANGUAGE & VOCABULARY:
• Respond in native, natural Israeli Hebrew. Use simple, clear sentence structures.
• NEVER translate English phrasing literally (e.g., never say "בקצה הגמר" or "אפס מלח").
• Use real culinary kitchen terminology naturally (e.g., לתקן תיבול, לסגור את הבשר, צמצום, טכניקת קיפול, לקשור את הרוטב, סרוויס).

CRITICAL OPERATIONAL RULES:
1. Max 3-4 sentences. Get straight to the point. Absolutely no intro greetings ("בשמחה", "שלום").
2. SACRED DATA RULE: When an [ACTIVE RECIPE] block is provided, its 'Ingredients' and 'Steps' are the absolute truth. If the recipe lists 175g salt, state it exactly. NEVER override specific recipe data with general culinary theory.
3. Troubleshooting/Scaling: If asked for substitutes, ratios, or math, provide the exact numbers instantly in a clean list.

FORMATTING:
• Use Markdown strictly to make the answer scannable for a working chef (**bold** key ingredients/actions, use bullet points for lists).`

type RecipeRow = { id: string; recipe_number: number; title: string; title_en: string | null }
type IngRow    = { raw_text: string }
type StepRow   = { step: number; title?: string; body: string }

function detectNumber(text: string): number | null {
  const pats = [
    /מתכון\s*#?\s*(\d+)/i,
    /recipe\s*#?\s*(\d+)/i,
    /#(\d+)\b/,
  ]
  for (const p of pats) {
    const m = text.match(p)
    if (m) return parseInt(m[1])
  }
  return null
}

function detectName(text: string, index: RecipeRow[]): string | null {
  const low = text.toLowerCase()
  for (const r of index) {
    if (r.title     && low.includes(r.title.toLowerCase()))    return r.id
    if (r.title_en  && low.includes(r.title_en.toLowerCase())) return r.id
  }
  return null
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { messages, currentRecipeId } = await req.json()

    // ── 1. Fetch lightweight recipe index ────────────────────────────
    const { data: idxRaw } = await db
      .from('recipes')
      .select('id, recipe_number, title, title_en')
      .order('recipe_number')
    const index = (idxRaw ?? []) as RecipeRow[]

    // ── 2. Resolve which recipe (if any) to inject as full context ────
    // Explicit toggle selection always wins. Auto-detect only when no ID provided.
    const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    let targetId: string | null = currentRecipeId ?? null

    if (!targetId && lastUser) {
      const num = detectNumber(lastUser.content)
      if (num) {
        const hit = index.find(r => r.recipe_number === num)
        if (hit) targetId = hit.id
      }
      if (!targetId) targetId = detectName(lastUser.content, index)
    }

    let recipeBlock = ''
    if (targetId) {
      const [{ data: full, error: recipeErr }, { data: ingRows }] = await Promise.all([
        db.from('recipes')
          .select('recipe_number, title, title_en, texture, cook_time, instructions')
          .eq('id', targetId)
          .single(),
        db.from('ingredients')
          .select('raw_text')
          .eq('recipe_id', targetId)
          .order('sort_order'),
      ])

      if (recipeErr) {
        console.log('[chat] recipe fetch error:', recipeErr.message, 'id:', targetId)
      } else if (full) {
        const ings = (ingRows ?? []).map((i: IngRow) => i.raw_text).filter(Boolean).join(', ')

        const steps = (full.instructions ?? []).map((s: StepRow) =>
          `${s.step}. ${s.title ? `[${s.title}] ` : ''}${s.body}`
        ).join('\n')

        recipeBlock = `

[ACTIVE RECIPE #${full.recipe_number}: ${full.title}${full.title_en ? ` / ${full.title_en}` : ''}]
Time: ${full.cook_time ?? '–'} | Notes: ${full.texture ?? '–'}
Ingredients: ${ings || '(none listed)'}
Steps:
${steps || '(none listed)'}`

        console.log('[chat] injected recipe:', full.recipe_number, full.title)
      }
    }

    // ── 3. Compact index for general awareness ────────────────────────
    const indexLine = index.map(r =>
      `#${r.recipe_number} ${r.title}${r.title_en ? `/${r.title_en}` : ''}`
    ).join(' | ')

    const finalSystem = `${SYSTEM}

RECIPE INDEX:
${indexLine}${recipeBlock}`

    // ── 4. Call Anthropic ─────────────────────────────────────────────
    console.log('[chat] key prefix:', ANTHROPIC_API_KEY?.slice(0, 20))
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          ANTHROPIC_API_KEY,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 280,
        system:     finalSystem,
        messages:   messages.slice(-6),
      }),
    })

    const result = await anthropicRes.json()
    console.log('[chat] anthropic status:', anthropicRes.status, JSON.stringify(result).slice(0, 300))
    if (!anthropicRes.ok) throw new Error(`Anthropic ${anthropicRes.status}: ${JSON.stringify(result)}`)

    return new Response(
      JSON.stringify({ content: result.content[0].text }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
