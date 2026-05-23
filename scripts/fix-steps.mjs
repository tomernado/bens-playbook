/**
 * After Taste — Fix Steps Script
 * Fixes empty instructions for format-2 recipes (53, 55, 57–64, 66).
 * Also creates recipe 61 (Choron sauce) which had no header in the file.
 * Run: node scripts/fix-steps.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key } = process.env;
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(url, key);

// ─── Improved step parser ─────────────────────────────────────────────────────
// Handles both format 1 (inline "הוראות הכנה 1. ...") and
// format 2 (🛠️ section with numbered steps on their own lines).

function parseSteps(body) {
  // Find steps section — try multiple markers robustly
  let sIdx = -1;
  for (const marker of ['\u{1F6E0}️', '\u{1F6E0}', 'הוראות הכנה', 'תהליך ההכנה', 'שלבי ביצוע']) {
    const i = body.indexOf(marker);
    if (i !== -1) { sIdx = i; break; }
  }
  const section = sIdx !== -1 ? body.slice(sIdx) : body;

  // Match "N. Heading" at start of a line (multiline mode)
  const RE = /^(\d+)\.\s+([^\n]+)/gm;
  const matches = [];
  let m;
  while ((m = RE.exec(section)) !== null) {
    matches.push({ num: parseInt(m[1]), title: m[2].trim(), lineEnd: m.index + m[0].length });
  }

  return matches.map(({ num, title, lineEnd }, i) => {
    const nextStart = i + 1 < matches.length ? matches[i + 1].lineEnd - matches[i + 1].title.length - matches[i + 1].num.toString().length - 2 : section.length;
    // Actually, let's use the position of the next match header
    const nextMatchIdx = i + 1 < matches.length
      ? section.indexOf(`${matches[i+1].num}. `, lineEnd)
      : section.length;
    const actualNext = nextMatchIdx !== -1 ? nextMatchIdx : section.length;

    const bodyText = section.slice(lineEnd, actualNext).trim()
      // Clean up decorative tip lines (💡, ⚠️, etc.) from step body
      .replace(/^[💡⚠️].+(\n|$)/gm, '')
      .trim();

    const hasTitle = title.length < 90 && /[֐-׿(A-Z]/.test(title[0] || '');

    return {
      step: num,
      title: hasTitle ? title : null,
      body: hasTitle ? bodyText : (title + (bodyText ? '\n' + bodyText : '')),
    };
  });
}

// ─── Ingredient parser for format-2 ──────────────────────────────────────────
function parseIngredients(body) {
  const items = [];
  const ingStart = body.search(/(?:📋\s*)?(?:רכיבים|Ingredients)/);
  if (ingStart === -1) return items;

  const stepsStart = (() => {
    for (const m of ['\u{1F6E0}️', '\u{1F6E0}', 'הוראות הכנה', 'תהליך ההכנה']) {
      const i = body.indexOf(m, ingStart);
      if (i !== -1) return i;
    }
    return -1;
  })();

  const block = stepsStart > ingStart ? body.slice(ingStart, stepsStart) : body.slice(ingStart);
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  const skipRE = /^[📋🛠️⚠️💡🌶️🍃#*]/u;
  const measureRE = /\d+\s*(?:גרם|מ"?ל|קג|כוסות?|כפות?|כפיות?|יחידות?|ליטר|סמ|ענפים?)/;
  const headerRE = /^(?:ל(?:בסיס|הכנת|הרכבת|סירופ|ציפוי|בלילה|רוטב)|(?:לקבוצה|קבוצה)\s+\d+)/;
  const countRE = /^\(משקל/;

  let group = 'רכיבים';
  let order = 0;

  for (const line of lines) {
    if (/^(?:📋\s*)?רכיבים/.test(line) && line.length < 60) continue;
    if (skipRE.test(line)) continue;
    if (countRE.test(line)) continue;
    if (headerRE.test(line) && !measureRE.test(line) && line.length < 80) {
      // Extract a clean group name
      group = line
        .replace(/^ל(?:בסיס|הכנת|הרכבת|סירופ|ציפוי|בלילה|רוטב)\s*/, '')
        .replace(/^(?:לקבוצה|קבוצה)\s+\d+\s*[-(]?/, '')
        .replace(/[)（）]/g, '')
        .trim() || 'רכיבים';
      continue;
    }
    items.push({ group_name: group, raw_text: line, sort_order: order++ });
  }
  return items;
}

// ─── Parse format-2 recipe blocks from the file ───────────────────────────────
// Returns [{recipe_number, title, title_en, body}]

function parseFormat2Recipes(text) {
  const lines = text.split('\n');
  const recipes = [];
  let cur = null;

  const flush = () => {
    if (cur) { cur.body = cur.body.trim(); recipes.push(cur); cur = null; }
  };

  for (const line of lines) {
    // Recipe 61 has no header — skip intentionally (handled separately below)
    const r2 = line.match(/^#?(\d{2,})\.\s+(.+)/);
    if (r2) {
      const num = parseInt(r2[1]);
      if (num >= 52 && num <= 66) {
        flush();
        const raw = r2[2].trim().replace(/^ID REC_\d+\s*/, '');
        const tm = raw.match(/^(.+?)\s*\((.+?)\)\s*$/);
        cur = {
          recipe_number: num,
          title: tm ? tm[1].trim() : raw,
          title_en: tm ? tm[2].trim() : null,
          body: '',
        };
        continue;
      }
    }
    if (cur) cur.body += line + '\n';
  }
  flush();

  return recipes;
}

// ─── Recipe 61 (Choron sauce) — hardcoded since it has no header in the file ──
const CHORON_INGREDIENTS = [
  { group_name: 'בסיס השורון', raw_text: 'יין לבן יבש 350 גרם', sort_order: 0 },
  { group_name: 'בסיס השורון', raw_text: 'חומץ סושי (Sushi Vinegar) 150 גרם', sort_order: 1 },
  { group_name: 'בסיס השורון', raw_text: 'טימין לימוני טרי 6 ענפים', sort_order: 2 },
  { group_name: 'בסיס השורון', raw_text: 'עלי טרגון טריים 3 ענפים', sort_order: 3 },
  { group_name: 'בסיס השורון', raw_text: 'זרעי כוסברה שלמים 3 גרם', sort_order: 4 },
  { group_name: 'בסיס השורון', raw_text: 'גרגרי פלפל שחור שלם 2 גרם', sort_order: 5 },
  { group_name: 'הרכבת הרוטב', raw_text: 'בסיס שורון מצומצם ומסונן (חם) 140 גרם', sort_order: 6 },
  { group_name: 'הרכבת הרוטב', raw_text: 'חלמונים (בטמפרטורת החדר) 80 גרם', sort_order: 7 },
  { group_name: 'הרכבת הרוטב', raw_text: 'מלח דק כשר 3 גרם', sort_order: 8 },
  { group_name: 'הרכבת הרוטב', raw_text: 'חמאה ללא מלח (קרה מאוד, חתוכה לקוביות) 60 גרם', sort_order: 9 },
  { group_name: 'הרכבת הרוטב', raw_text: 'רסק עגבניות מרוכז (Mutti) 30 גרם', sort_order: 10 },
];

const CHORON_STEPS = [
  {
    step: 1,
    title: 'זיקוק בסיס הארומה (The Choron Base)',
    body: 'בתוך קלחת קטנה, משלבים את היין הלבן, חומץ הסושי, ענפי הטימין הלימוני, הטרגון, זרעי הכוסברה וגרגרי הפלפל השלמים. מניחים את הקלחת על אש נמוכה ומביאים לסף רתיחה עדינה מאוד. מצמצמים את הנוזל עד שרוב המים מתאדים, וכל השמנים האתריים ננעלים בנוזל — המטרה היא 140 גרם נוזל מרוכז וסירופי. מסננים דרך שינואה דקה, זורקים עשבי התיבול.',
  },
  {
    step: 2,
    title: 'בישול וקשירת החלמונים (The Blender Emulsion)',
    body: 'מוסיפים 3 גרם מלח לבסיס השורון החם ומביאים לרתיחה מלאה. ברגע שרותח, מורידים מהאש ומוזגים לתוך כוס גבוהה וצרה. מכניסים 80 גרם חלמונים. מורידים בלנדר מוט לתחתית ומפעילים על מהירות גבוהה במשך 30–40 שניות. החום יפסטרק את החלמונים ויפעיל את הלציטין שבהם — התערובת תהפוך לנפוחה ובהירה.',
  },
  {
    step: 3,
    title: 'נעילת המבנה התרמי (Monter au Beurre)',
    body: 'תוך כדי שהבלנדר עובד על המהירות הגבוהה ביותר, מוסיפים את 60 גרם קוביות החמאה הקרה בהדרגה — קובייה אחר קובייה. החמאה תתמוסס לתוך החלמונים החמים, והטחינה המכנית תפרק את השומן ותנעל אותו באמולסיה יציבה וסמיכה (כמו הולנדז).',
  },
  {
    step: 4,
    title: 'הפיניש והצבע (The Tomato Paste)',
    body: 'מוסיפים 30 גרם רסק עגבניות מרוכז. מפעילים את הבלנדר לפולס אחרון של 20 שניות עד שהרסק נבלע לחלוטין. הרוטב ישנה צבעו מיד מצהוב שנהב לורדרד-כתום מבריק כמו משי. מסננים דרך שינואה דקה, טועמים ומתקנים. שומרים חם (50°C–55°C) עד לסרוויס.',
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function fix() {
  const text = readFileSync(join(__dirname, '../66recepies.txt'), 'utf8');
  console.log('\n🔧  After Taste — Fix Steps\n' + '─'.repeat(50));

  const format2 = parseFormat2Recipes(text);
  console.log(`\nParsed ${format2.length} format-2 recipes from file`);

  let updated = 0, skipped = 0, errors = 0;

  for (const r of format2) {
    const steps = parseSteps(r.body);
    const ings  = parseIngredients(r.body);

    const { data: existing, error: fetchErr } = await supabase
      .from('recipes')
      .select('id, instructions')
      .eq('recipe_number', r.recipe_number)
      .maybeSingle();

    if (fetchErr) { console.error(`  ❌ Fetch #${r.recipe_number}: ${fetchErr.message}`); errors++; continue; }

    if (!existing) {
      console.log(`  ⚠️  #${r.recipe_number} not in DB — skipping`);
      skipped++;
      continue;
    }

    const currentStepCount = Array.isArray(existing.instructions) ? existing.instructions.length : 0;

    if (currentStepCount > 0 && steps.length === 0) {
      console.log(`  ℹ️  #${r.recipe_number} already has ${currentStepCount} steps, parsed 0 — skipping`);
      skipped++;
      continue;
    }

    // Update instructions
    const { error: updErr } = await supabase
      .from('recipes')
      .update({ instructions: steps })
      .eq('id', existing.id);

    if (updErr) { console.error(`  ❌ Update #${r.recipe_number}: ${updErr.message}`); errors++; continue; }

    // Also update ingredients if the recipe has none yet
    const { count: ingCount } = await supabase
      .from('ingredients')
      .select('id', { count: 'exact', head: true })
      .eq('recipe_id', existing.id);

    if ((ingCount ?? 0) === 0 && ings.length > 0) {
      const { error: ingErr } = await supabase
        .from('ingredients')
        .insert(ings.map(i => ({ ...i, recipe_id: existing.id })));
      if (!ingErr) console.log(`  ✅ #${r.recipe_number} ${r.title} — ${steps.length} steps, ${ings.length} ingredients`);
      else console.log(`  ✅ #${r.recipe_number} ${r.title} — ${steps.length} steps (ingredient insert failed: ${ingErr.message})`);
    } else {
      console.log(`  ✅ #${r.recipe_number} ${r.title} — ${steps.length} steps`);
    }
    updated++;
  }

  // ── Handle recipe 61 (Choron sauce — no header in file) ──
  console.log('\n── Recipe 61 (Choron Sauce) ──');

  const { data: rec61 } = await supabase
    .from('recipes')
    .select('id')
    .eq('recipe_number', 61)
    .maybeSingle();

  if (rec61) {
    // Update instructions only
    const { error } = await supabase
      .from('recipes')
      .update({ instructions: CHORON_STEPS })
      .eq('id', rec61.id);
    console.log(error ? `  ❌ ${error.message}` : `  ✅ Updated recipe 61 instructions`);
    updated++;
  } else {
    // Create recipe 61
    const { data: cat2 } = await supabase
      .from('categories')
      .select('id')
      .eq('sort_order', 2)
      .maybeSingle();

    if (!cat2) { console.error('  ❌ Category 2 not found'); errors++; }
    else {
      const { data: newRec, error: insErr } = await supabase
        .from('recipes')
        .insert({
          category_id: cat2.id,
          recipe_number: 61,
          title: 'רוטב שורון קטלאני',
          title_en: 'Choron Sauce',
          instructions: CHORON_STEPS,
          vibe_tags: ['אמולסיה'],
          texture: 'ורדרד-כתום, קטיפתי ואוורירי, מבריק כמו משי',
        })
        .select()
        .single();

      if (insErr) { console.error(`  ❌ Create recipe 61: ${insErr.message}`); errors++; }
      else {
        await supabase.from('ingredients').insert(CHORON_INGREDIENTS.map(i => ({ ...i, recipe_id: newRec.id })));
        console.log(`  ✅ Created recipe 61 with ${CHORON_STEPS.length} steps and ${CHORON_INGREDIENTS.length} ingredients`);
        updated++;
      }
    }
  }

  // ── Fix recipe 60 instructions (remove Choron content that got mixed in) ──
  console.log('\n── Recipe 60 (Tuile) — stripping Choron content ──');

  const { data: rec60 } = await supabase
    .from('recipes')
    .select('id, instructions')
    .eq('recipe_number', 60)
    .maybeSingle();

  if (rec60) {
    // Re-parse only recipe 60's body which ends before the Choron ingredient list
    const r60 = format2.find(r => r.recipe_number === 60);
    if (r60) {
      // Recipe 60 body should end before "📋 רכיבים" of Choron sauce
      // We crop the body at the first 📋 that follows recipe 60's own 🛠️ section
      const bodyLines = r60.body.split('\n');
      const endMarker = bodyLines.findIndex(l => /^📋\s*רכיבים/.test(l.trim()) && bodyLines.indexOf(l) > 0 && bodyLines.slice(0, bodyLines.indexOf(l)).some(x => /🛠|הוראות הכנה/.test(x)));
      const cleanBody = endMarker > 0 ? bodyLines.slice(0, endMarker).join('\n') : r60.body;
      const stepsFixed = parseSteps(cleanBody);
      const { error } = await supabase
        .from('recipes')
        .update({ instructions: stepsFixed })
        .eq('id', rec60.id);
      console.log(error ? `  ❌ ${error.message}` : `  ✅ Recipe 60 fixed — ${stepsFixed.length} steps`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅  Done — ${updated} updated, ${skipped} skipped, ${errors} errors\n`);
}

fix().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
