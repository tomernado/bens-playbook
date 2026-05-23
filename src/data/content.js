export const meta = {
  title: "After Taste",
  subtitle: "ספר המתכונים המלא והמאוחד",
  totalRecipes: 66,
  seeded: 2,
  chef: "After Taste Kitchen",
};

export const categories = [
  {
    id: 1,
    name: "צירים, בשרים ובישול ארוך",
    nameEn: "Stocks, Meats & Long Cooking",
    emoji: "🥩",
    tagline: "הליבה הבשרית",
  },
  {
    id: 2,
    name: "רטבים ארומטיים, אמולסיות ושמנים",
    nameEn: "Aromatic Sauces, Emulsions & Oils",
    emoji: "🧄",
    tagline: "תשתיות הנדסת מרקם",
  },
];

export const recipes = [
  {
    id: 1,
    slug: "beef-stock-6h",
    categoryId: 1,
    title: "ציר בקר 6 שעות",
    titleEn: "Beef Stock — 6 Hours",
    subtitle: "בסיס אומאמי מרוכז",
    subtitleEn: "Concentrated Umami Base",
    texture: "נוזל ג'לטיני, עמוק, צלול לחלוטין לאחר קירור וקיפוי שומן",
    operationalNote: "ללא מלח בשום שלב. ההמלחה מתבצעת רק בהכנת המנה הסופית.",
    cookTime: "6h",
    difficulty: "Professional",
    tags: ["ציר", "בקר", "אומאמי", "בסיס"],
    ingredients: [
      { group: "עצמות וירקות", items: [
        { name: "עצמות בקר (ברך ומח מנוסרות)", amount: "2.75 קג" },
        { name: "בצל לבן עם קליפה, קוביות 1×1 סמ", amount: "2 גדולות" },
        { name: "גזר, קוביות 1×1 סמ", amount: "3 יחידות" },
        { name: "שורש סלרי, קוביות 1×1 סמ", amount: "1 יחידה" },
        { name: "רסק עגבניות", amount: "3 כפות" },
      ]},
      { group: "תבלינים ונוזלים", items: [
        { name: "בוקה גארני (טימין, דפנה ×3, פלפל שחור שלם)", amount: "1 צרור" },
        { name: "מים קרים לכיסוי", amount: "2-3 סמ מעל העצמות" },
        { name: "בשר בקר טחון — בוסטר אומאמי (אופציונלי)", amount: "300 גרם" },
      ]},
    ],
    steps: [
      { n: 1, title: "צלייה מדורגת", body: "תנור 230°C. עצמות 25-30 דקות עד השחמה עמוקה. ירקות לשומן הניגר 15-20 דקות. רסק עגבניות 5 דקות אחרונות." },
      { n: 2, title: "דגלסאז' והעברה", body: "מעבירים לסיר ענק. מגרדים פונד מהתבנית עם מים רותחים, שופכים לסיר." },
      { n: 3, title: "בישול וקיפוי", body: "מכסים במים קרים. רתיחה עדינה + קיפוי אגרסיבי בשעה הראשונה." },
      { n: 4, title: "צמצום אקטיבי", body: "Simmer 6 שעות. שעתיים אחרונות — מכסה פתוח, אש גבוהה. אפשרי: בשר טחון מושחם בשעה 5." },
      { n: 5, title: "סינון ואחסון", body: "שינואה + בד חיתול, ללא מעיכה. קירור ולילה במקרר. הסרת שכבת שומן קפואה." },
    ],
  },
  {
    id: 2,
    slug: "brown-chicken-stock",
    categoryId: 1,
    title: "ציר עוף חום עמוק וארומטי",
    titleEn: "Premium Brown Chicken Stock",
    subtitle: "עמוק, ארומטי, בוטיק",
    subtitleEn: "Deep, Aromatic, Boutique",
    texture: null,
    operationalNote: null,
    cookTime: "4h",
    difficulty: "Professional",
    tags: ["ציר", "עוף", "חום", "ארומטי"],
    ingredients: [
      { group: "ראשי", items: [
        { name: "כנפי עוף טריות (מנוקות)", amount: "500 גרם" },
        { name: "גזר לבן/כתום", amount: "1" },
        { name: "גזר צהוב", amount: "1" },
        { name: "שורש פטרוזיליה", amount: "1" },
        { name: "שורש סלרי", amount: "1" },
        { name: "כרישה (חלק לבן)", amount: "1" },
        { name: "צרור פטרוזיליה", amount: "1 קטן" },
        { name: "בצל (חצוי, שרוף על יבש עד שחור פחם)", amount: "1" },
        { name: "פלפל שחור/לבן שלם", amount: "1 כף" },
        { name: "זרעי כוסברה", amount: "1 כף" },
        { name: "גרגרי ג'וניפר (ערער)", amount: "1 כף" },
        { name: "עלי דפנה יבשים", amount: "3" },
        { name: "מים קרים מפולטרים", amount: "~2 ליטר" },
      ]},
    ],
    steps: [
      { n: 1, title: "צלייה", body: "תנור 220°C. כנפיים 30-40 דקות עד חום-שוקולד עמוק. בצל: שריפה על מחבת יבשה עד שחור פחם מוחלט." },
      { n: 2, title: "העמדת הסיר", body: "כנפיים + בצל שרוף + ירקות + תבלינים. מוזגים 2 ליטר מים קרים מאוד." },
      { n: 3, title: "קיפוי ובישול", body: "לאט לסף רתיחה, קיפוי קצף ושומן. Simmer 4 שעות ללא מכסה, לאידוי מבוקר." },
      { n: 4, title: "סינון", body: "שינואה + בד חיתול. קירור ולילה במקרר. הסרת שכבת שומן לבנה." },
    ],
  },
];
