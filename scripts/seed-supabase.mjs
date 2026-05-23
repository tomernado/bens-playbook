/**
 * After Taste — Supabase Seed Script
 * Run: node scripts/seed-supabase.mjs
 * Requires: npm install @supabase/supabase-js dotenv
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
if (!url || !key) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

// ─── 5 CORE CATEGORIES ────────────────────────────────────────────────────────

const CATEGORIES = [
  { sort_order: 1, emoji: '🥩', name: 'צירים, בשרים ובישול ארוך',           description: 'הליבה הבשרית — צירים, נתחים ובישול ארוך' },
  { sort_order: 2, emoji: '🧄', name: 'רטבים ארומטיים, אמולסיות ושמנים',    description: 'תשתיות הנדסת מרקם — רטבים, אמולסיות ושמנים' },
  { sort_order: 3, emoji: '🍄', name: 'רטבי גסטריק, צמצומים ודמי-גלאס',    description: 'צירים מולקולריים — גסטריק, צמצומים ודמי-גלאס' },
  { sort_order: 4, emoji: '🍅', name: 'ממרחים, קרמים ומטבלים מולקולריים',  description: 'מטבח קר וחם — ממרחים, קרמים ומטבלים' },
  { sort_order: 5, emoji: '🌾', name: 'בצקים, ציפויים וקונדיטוריה',         description: 'עמילנים וקראנץ׳ — בצקים, ציפויים וקינוחי בוטיק' },
];

// ─── CATEGORY MAP — every recipe number → category sort_order ────────────────
// Loose recipes (52+) are mapped by semantic context analysis

const CAT = {
  // Cat 1 — Stocks, Meats & Long Cooking
  1:1, 2:1, 3:1, 4:1, 5:1, 6:1, 55:1,
  // Cat 2 — Sauces, Emulsions & Oils
  7:2, 8:2, 9:2, 10:2, 11:2, 12:2, 13:2, 14:2, 15:2, 16:2, 17:2, 18:2,
  57:2, 58:2, 59:2, 61:2, 62:2,
  // Cat 3 — Gastrique, Reductions & Demi-Glace
  19:3, 20:3, 21:3, 22:3, 23:3, 24:3, 25:3, 26:3, 27:3, 28:3, 29:3,
  // Cat 4 — Spreads, Creams & Condiments
  30:4, 31:4, 32:4, 33:4, 34:4, 35:4, 36:4, 37:4, 38:4, 39:4, 40:4, 41:4, 53:4,
  // Cat 5 — Doughs, Coatings & Pastry
  42:5, 43:5, 44:5, 45:5, 46:5, 47:5, 48:5, 49:5, 50:5, 51:5,
  60:5, 63:5, 64:5, 65:5, 66:5,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseTitle(raw) {
  raw = raw.trim().replace(/^ID REC_\d+\s*/, '');
  const m = raw.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (m) return { title: m[1].trim(), title_en: m[2].trim() };
  return { title: raw, title_en: null };
}

function extractTexture(body) {
  const m = body.match(/טקסטורה\s+(.+?)(?:\n|$)/);
  return m ? m[1].trim().substring(0, 200) : null;
}

function extractCookTime(body) {
  const m = body.match(/(?:זמן בישול|cook time)[^\d]*(\d+(?:\.\d+)?\s*שעות?)/i)
           || body.match(/(\d+)\s*שעות/);
  return m ? m[1].trim() : null;
}

function extractVibeTags(body) {
  const tags = new Set();
  if (/קסנטן גאם/.test(body))                    tags.add('מולקולרי');
  if (/טאבון|פחמים|גריל/.test(body))              tags.add('טאבון');
  if (/אמולסיה|אמולסיית/.test(body))              tags.add('אמולסיה');
  if (/קונפי/.test(body))                         tags.add('קונפי');
  if (/סו[ -]וויד|sous.?vide/i.test(body))        tags.add('סו-וויד');
  if (/מעושן|שרוף|חרוך/.test(body))               tags.add('עישון');
  if (/ג'לטין|אגר.אגר|ג'ל /.test(body))          tags.add('ג׳ל');
  if (/פרמז'ן|גבינה/.test(body))                  tags.add('גבינה');
  return [...tags].slice(0, 5);
}

// ─── INGREDIENT PARSER ────────────────────────────────────────────────────────
// Extracts ingredient lines grouped by section headers within the body text.

function parseIngredients(body) {
  const items = [];

  // Locate ingredient block
  const ingIdx = body.search(/(?:📋\s*)?רכיבים|Ingredients/);
  if (ingIdx === -1) return items;

  const stepsIdx = body.search(/(?:🛠️|הוראות הכנה|תהליך ההכנה|שלבי ביצוע|1\.\s+(?:שלב|צלייה|בישול|ערבוב|הכנת))/);
  const ingBlock = stepsIdx > ingIdx
    ? body.slice(ingIdx, stepsIdx)
    : body.slice(ingIdx);

  const lines = ingBlock.split('\n').map(l => l.trim()).filter(Boolean);

  // Patterns that signal a group header (not an ingredient line)
  const headerRE = /^(?:לקבוצה \d+|קבוצה \d+|לבסיס|להרכבת|לסירופ|לציפוי|לבלילה|לרוטב|ל\w{2,15})\s*[\(（]?[^）)]*[\)）]?$/;
  const measureRE = /\d+\s*(?:גרם|מל|קג|כוס|כף|כפית|יחידות|ליטר|סמ)/;

  let group = 'רכיבים';
  let order = 0;

  for (const line of lines) {
    // Skip the section title itself
    if (/^(?:📋\s*)?רכיבים/.test(line) && line.length < 30) continue;
    // Skip decorative/structural lines
    if (/^[📋🛠️⚠️💡🌶️🍃#*]/.test(line)) continue;
    if (line.length < 3) continue;

    // Detect group header: short, no measurement, matches pattern
    if (headerRE.test(line) && !measureRE.test(line) && line.length < 60) {
      group = line.replace(/^ל/, '').trim();
      continue;
    }

    // Ingredient line
    items.push({ group_name: group, raw_text: line, sort_order: order++ });
  }

  return items;
}

// ─── STEPS PARSER ─────────────────────────────────────────────────────────────
// Extracts numbered steps from the preparation section.

function parseSteps(body) {
  const steps = [];

  const stepsIdx = body.search(/(?:🛠️|הוראות הכנה|תהליך ההכנה|שלבי ביצוע)/);
  const section = stepsIdx !== -1 ? body.slice(stepsIdx) : body;

  // Match numbered step openers: "1. Title\n" or "1. Title Body..."
  const RE = /^(\d+)\.\s+(.+)/gm;
  const positions = [];
  let m;
  while ((m = RE.exec(section)) !== null) {
    positions.push({ index: m.index, num: parseInt(m[1]), heading: m[2].trim() });
  }

  for (let i = 0; i < positions.length; i++) {
    const { num, heading, index } = positions[i];
    const nextIdx = i + 1 < positions.length ? positions[i + 1].index : section.length;

    // Everything between this heading line end and the next step start
    const headingLineEnd = index + heading.length + num.toString().length + 2;
    const bodyChunk = section.slice(headingLineEnd, nextIdx).trim();

    // Detect if heading itself is a titled label (e.g. "הכנת הרביכה")
    // vs the full instruction in one line
    const isLabelHeading = /^[֐-׿\s\-–—(]/u.test(heading) && heading.length < 60 && !heading.endsWith('.');

    steps.push({
      step: num,
      title: isLabelHeading ? heading : null,
      body: isLabelHeading ? bodyChunk : (heading + (bodyChunk ? ' ' + bodyChunk : '')),
    });
  }

  return steps;
}

// ─── MAIN RECIPE PARSER ───────────────────────────────────────────────────────

function parseAllRecipes(text) {
  const lines = text.split('\n');
  const recipes = [];
  let currentCatOrder = null;
  let currentRecipe = null;

  const push = () => {
    if (currentRecipe) {
      currentRecipe.body = currentRecipe.body.trim();
      recipes.push(currentRecipe);
      currentRecipe = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Category heading: ## emoji קטגוריה N ...
    const catM = line.match(/^## .+? קטגוריה (\d+)/);
    if (catM) { currentCatOrder = parseInt(catM[1]); continue; }

    // ── Structured recipe: ### N. Title
    const r1 = line.match(/^### (\d+)\. (.+)/);
    if (r1) {
      push();
      const num = parseInt(r1[1]);
      const { title, title_en } = parseTitle(r1[2]);
      currentRecipe = {
        recipe_number: num,
        title,
        title_en,
        category_sort_order: currentCatOrder ?? CAT[num] ?? 1,
        body: '',
      };
      continue;
    }

    // ── Loose recipe: "NN. Title" or "#NN. Title" (numbers 52–66 only)
    const r2 = line.match(/^#?(\d{2,})\. (.+)/);
    if (r2) {
      const num = parseInt(r2[1]);
      if (num >= 52 && num <= 66) {
        push();
        const { title, title_en } = parseTitle(r2[2]);
        currentRecipe = {
          recipe_number: num,
          title,
          title_en,
          category_sort_order: CAT[num] ?? 5,
          body: '',
        };
        continue;
      }
    }

    if (currentRecipe) currentRecipe.body += line + '\n';
  }
  push();

  return recipes.filter(r => r.recipe_number >= 1 && r.recipe_number <= 66);
}

// ─── SEED ─────────────────────────────────────────────────────────────────────

async function seed() {
  const text = readFileSync(join(__dirname, '../66recepies.txt'), 'utf8');

  console.log('\n🌱  After Taste — Supabase Seed\n' + '─'.repeat(50));

  // 1. Clear existing data (order matters due to FK constraints)
  console.log('\n🗑️   Clearing existing data...');
  await supabase.from('ingredients').delete().gte('sort_order', 0);
  await supabase.from('recipes').delete().gte('recipe_number', 0);
  await supabase.from('categories').delete().gte('sort_order', 0);

  // 2. Insert categories
  console.log('📂  Inserting categories...');
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .insert(CATEGORIES)
    .select();
  if (catErr) { console.error('❌  Categories:', catErr.message); process.exit(1); }

  // sort_order → uuid
  const catMap = Object.fromEntries(cats.map(c => [c.sort_order, c.id]));
  cats.forEach(c => console.log(`   ${c.emoji}  ${c.name}`));

  // 3. Parse
  console.log('\n📖  Parsing 66recepies.txt...');
  const parsed = parseAllRecipes(text);
  console.log(`   → ${parsed.length} recipes found\n`);

  // 4. Insert recipes + ingredients
  let recipeOK = 0, recipeErr = 0, ingTotal = 0;

  for (const r of parsed) {
    const instructions = parseSteps(r.body);
    const vibe_tags    = extractVibeTags(r.body);
    const texture      = extractTexture(r.body);
    const cook_time    = extractCookTime(r.body);
    const category_id  = catMap[r.category_sort_order];

    const { data: rec, error: rErr } = await supabase
      .from('recipes')
      .insert({ category_id, recipe_number: r.recipe_number, title: r.title,
                title_en: r.title_en, vibe_tags, instructions, texture, cook_time })
      .select()
      .single();

    if (rErr) {
      console.error(`  ❌  #${r.recipe_number} ${r.title}: ${rErr.message}`);
      recipeErr++;
      continue;
    }

    const ings = parseIngredients(r.body);
    if (ings.length > 0) {
      const { error: iErr } = await supabase
        .from('ingredients')
        .insert(ings.map(i => ({ ...i, recipe_id: rec.id })));
      if (iErr) console.warn(`  ⚠️   Ingredients #${r.recipe_number}: ${iErr.message}`);
      else ingTotal += ings.length;
    }

    const catEmoji = CATEGORIES.find(c => c.sort_order === r.category_sort_order)?.emoji ?? '•';
    console.log(`  ${catEmoji} #${String(r.recipe_number).padStart(2,'0')} ${r.title.padEnd(40,' ')} [${ings.length} ing, ${instructions.length} steps]`);
    recipeOK++;
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅  Done — ${recipeOK} recipes, ${ingTotal} ingredients inserted.`);
  if (recipeErr) console.log(`⚠️   ${recipeErr} recipes had errors — check output above.`);
  console.log('');
}

seed().catch(err => { console.error('Fatal:', err); process.exit(1); });
