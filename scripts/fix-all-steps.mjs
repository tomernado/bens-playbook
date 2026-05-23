/**
 * After Taste — Fix ALL recipe steps
 *
 * Fixes two format-1 bugs:
 *   1. Recipes with no numbered steps (single paragraph) → creates 1 step
 *   2. Recipes where step 1 is inline after "הוראות הכנה" → step 1 was missed
 *
 * Run: node scripts/fix-all-steps.mjs
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

// ─── Step parser — handles BOTH format-1 and format-2 ────────────────────────
//
//  Format-1 (recipes 1–51):
//    " הוראות הכנה 1. שלב ראשון body text.\n\n2. שלב שני body..."
//    Step 1 is INLINE on the same line as הוראות הכנה.
//    Some recipes have NO numbered steps — just a plain paragraph.
//
//  Format-2 (recipes 53+):
//    "🛠️ תהליך ההכנה ...\n1. Title\n\nBody block...\n\n2. ..."
//    Steps always start on their own line after the 🛠️ header line.

function parseSteps(body) {
  // ── Locate the steps section ──────────────────────────────────────────────
  let afterHeader = '';
  let isFormat2 = false;

  // Format-2: look for 🛠️ (with or without variation selector U+FE0F)
  for (const em of ['\u{1F6E0}️', '\u{1F6E0}']) {
    const idx = body.indexOf(em);
    if (idx !== -1) {
      // Skip the entire 🛠️ header line; keep everything from the next line
      const lineEnd = body.indexOf('\n', idx);
      afterHeader = lineEnd !== -1 ? body.slice(lineEnd + 1) : '';
      isFormat2 = true;
      break;
    }
  }

  if (!isFormat2) {
    // Format-1: find הוראות הכנה / שלבי ביצוע
    const idx = body.search(/הוראות הכנה|שלבי ביצוע/);
    if (idx === -1) return [];
    // Remove the keyword itself but keep inline content (step 1 may follow immediately)
    afterHeader = body
      .slice(idx)
      .replace(/^(?:הוראות הכנה|שלבי ביצוע)\s*/u, '');
  }

  if (!afterHeader.trim()) return [];

  // ── Split into step chunks ────────────────────────────────────────────────
  // Prepend \n so a leading "1. " also matches the pattern \n(?=\d+\.\s)
  const text = '\n' + afterHeader;
  const parts = text.split(/\n(?=\d+\.\s)/);

  // ── No numbered steps → split by sentence-ending periods ────────────────
  const hasNumbers = parts.some(p => /^\d+\.\s/.test(p.trim()));
  if (!hasNumbers) {
    const bodyText = afterHeader
      // Drop decorative / tip lines (💡, ⚠️, 🌶️, etc.)
      .replace(/^[^א-׿\s\d"'(].+\n?/gmu, '')
      .trim();
    if (!bodyText) return [];

    // Split at period+whitespace before a Hebrew letter (avoids decimals like 1.5)
    const rawSentences = bodyText.split(/\.\s+(?=[א-ת])/);
    if (rawSentences.length <= 1) {
      return [{ step: 1, title: null, body: bodyText }];
    }
    // Restore the period consumed by the split (last chunk already ends with its period)
    return rawSentences
      .map((s, i) => ({
        step: i + 1,
        title: null,
        body: (i < rawSentences.length - 1 ? s.trim() + '.' : s.trim()),
      }))
      .filter(s => s.body.length > 3);
  }

  // ── Parse each numbered chunk ─────────────────────────────────────────────
  const steps = [];

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;

    const m = part.match(/^(\d+)\.\s+([^\n]+)([\s\S]*)/);
    if (!m) continue;

    const num       = parseInt(m[1]);
    const firstLine = m[2].trim();
    const rest      = m[3]
      // Drop decorative lines (emoji starters) from the body
      .replace(/^[^א-׿\s\d"'(].+\n?/gmu, '')
      .trim();

    // Title heuristic:
    //  Format-2 → firstLine is a short title, rest holds the body (multi-line)
    //  Format-1 → firstLine contains both title + body merged on one line; rest is empty
    const hasSeperateBody = rest.length > 10;
    const isTitle = isFormat2
      ? (firstLine.length < 100 && hasSeperateBody)   // format-2: always a title
      : (firstLine.length < 60  && hasSeperateBody);  // format-1: only if short AND has separate body

    steps.push({
      step: num,
      title: isTitle ? firstLine : null,
      body:  isTitle ? rest : (firstLine + (rest ? '\n' + rest : '')),
    });
  }

  return steps.sort((a, b) => a.step - b.step);
}

// ─── Format-1 recipe body parser ─────────────────────────────────────────────
function parseAllFormat1(text) {
  const lines  = text.split('\n');
  const result = [];
  let cur      = null;

  const flush = () => {
    if (cur) { cur.body = cur.body.trim(); result.push(cur); cur = null; }
  };

  for (const line of lines) {
    const r1 = line.match(/^### (\d+)\. (.+)/);
    if (r1) {
      flush();
      const num = parseInt(r1[1]);
      if (num >= 1 && num <= 51) {
        const raw = r1[2].trim();
        const tm  = raw.match(/^(.+?)\s*\((.+?)\)\s*$/);
        cur = {
          recipe_number: num,
          title:    tm ? tm[1].trim() : raw,
          title_en: tm ? tm[2].trim() : null,
          body: '',
        };
      }
      continue;
    }
    // Stop at the --- separator that precedes the format-2 section
    if (cur && /^---\s*$/.test(line)) { flush(); continue; }
    if (cur) cur.body += line + '\n';
  }
  flush();

  return result;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function fix() {
  const text = readFileSync(join(__dirname, '../66recepies.txt'), 'utf8');
  console.log('\n🔧  After Taste — Fix ALL Steps\n' + '─'.repeat(60));

  const format1 = parseAllFormat1(text);
  console.log(`Parsed ${format1.length} format-1 recipes (1–51)\n`);

  let updated = 0, skipped = 0, errors = 0;

  for (const r of format1) {
    const steps = parseSteps(r.body);

    // Fetch current state from DB
    const { data: existing, error: fetchErr } = await supabase
      .from('recipes')
      .select('id, instructions')
      .eq('recipe_number', r.recipe_number)
      .maybeSingle();

    if (fetchErr) {
      console.error(`  ❌ Fetch #${r.recipe_number}: ${fetchErr.message}`);
      errors++;
      continue;
    }
    if (!existing) {
      console.warn(`  ⚠️  #${r.recipe_number} not found in DB`);
      skipped++;
      continue;
    }

    const current = Array.isArray(existing.instructions) ? existing.instructions.length : 0;

    // Update instructions
    const { error: updErr } = await supabase
      .from('recipes')
      .update({ instructions: steps })
      .eq('id', existing.id);

    if (updErr) {
      console.error(`  ❌ Update #${r.recipe_number}: ${updErr.message}`);
      errors++;
    } else {
      const icon = steps.length === 0 ? '⚠️ ' : '✅';
      console.log(`  ${icon} #${String(r.recipe_number).padStart(2)} ${r.title.padEnd(42)} ${current} → ${steps.length} steps`);
      updated++;
    }
  }

  // Also re-run format-2 recipes with the improved parser
  // (format-2 was already fixed, but we unify the logic)
  console.log('\n── Format-2 recipes (already fixed, verifying) ──');
  const { data: f2recs } = await supabase
    .from('recipes')
    .select('id, recipe_number, title, instructions')
    .gte('recipe_number', 52)
    .lte('recipe_number', 66)
    .order('recipe_number');

  if (f2recs) {
    for (const rec of f2recs) {
      const count = Array.isArray(rec.instructions) ? rec.instructions.length : 0;
      const mark  = count > 0 ? '✅' : '⚠️ ';
      console.log(`  ${mark} #${rec.recipe_number} ${rec.title} — ${count} steps`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅  Done — ${updated} updated, ${skipped} skipped, ${errors} errors\n`);
}

fix().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
