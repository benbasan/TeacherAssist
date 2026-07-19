// Ulpan Pilot — hardcoded, fully-vowelized (מנוקד) content for the Chapter-1
// prototype "תעודת הזהות שלי (היכרות)". See ARCHITECTURE.md §10.
//
// Deliberately NOT derived from the data-driven generator: the pilot's whole
// purpose is to prove 100% niqqud accuracy and pedagogical depth on a single
// lesson before scaling. All copy is in the veteran-Ulpan / SLA-expert voice —
// warm, authoritative, encouraging. Shared by the player, the games, the inline
// editor, and the print sheet so there is one source of truth.

import type { TokenItem } from './ulpanLesson';

/** One line of the situational dialogue (Stage 2). `id` keeps React state stable across edits. */
export interface DialogueLine {
  id: string;
  speaker: string;
  emoji: string;
  /** Fully vowelized; editable live via the teacher safety-net editor. */
  text: string;
}

/** Profile dropdown options — display-only context for the pilot. */
export const PILOT_AGE_GROUPS = [
  { key: 'elementary', label: 'יסודי (א׳–ו׳)' },
  { key: 'high', label: 'חטיבה ותיכון (ז׳–י״ב)' },
] as const;

export const PILOT_NATIVE_LANGUAGES = [
  { key: 'english', label: 'אנגלית' },
  { key: 'russian', label: 'רוסית' },
  { key: 'french', label: 'צרפתית' },
  { key: 'spanish', label: 'ספרדית' },
] as const;

export const PILOT_LEVELS = [{ key: 'level_1', label: 'רמה 1 — אפס עברית' }] as const;

export const PILOT_META = {
  chapterId: 1,
  icon: '🪪',
  title: 'תעודת הזהות שלי',
  subtitle: 'היכרות',
  introTitle: 'שיעור פיילוט: פרק 1 - תעודת הזהות שלי (היכרות)',
  introBody:
    'זהו שיעור אולפן מלא בן 45 דקות, בנוי בגישת רכישת שפה שנייה (SLA): התלמיד יוצא מהדלת עם היכולת להציג את עצמו בעברית — בביטחון, לא בשלמות. חמישה שלבים ברורים, כל מילה מנוקדת, וכל הכלים מוכנים ללוח החכם.',
} as const;

// --- Stage 1: הַקֶּרֶס (The Hook) -------------------------------------------
export const PILOT_HOOK = {
  prompt: 'הַי, מָה הַמַּצָּב? אֵיךְ מַתְחִילִים הַכֹּל כְּשֶׁפּוֹגְשִׁים חָבֵר חָדָשׁ בַּכִּתָּה?',
  teacherTip:
    'בקשו מהתלמיד לומר "שלום" קודם בשפת האם שלו — זהו רגע של כבוד וביטחון. רק אז הציגו את הכוח של המילה "שָׁלוֹם" בישראל: היא פותחת שיחה, מבקשת שלום, ואפילו נפרדת. מילה אחת, שלושה שערים.',
} as const;

// --- Stage 2.1: הַדִּיאָלוֹג הַמֻּרְחָב (Extended Dialogue) ------------------
export const PILOT_DIALOGUE: DialogueLine[] = [
  {
    id: 'daniel-1',
    speaker: 'דָּנִיֵּאל',
    emoji: '👦',
    text: 'שָׁלוֹם! מָה הַקֶּשֶׁר? אֲנִי דָּנִיֵּאל. מֵאֵיפֹה אַתָּה בָּעוֹלָם?',
  },
  {
    id: 'lina-1',
    speaker: 'לִינָא',
    emoji: '👧',
    text: 'הַי! קוֹרְאִים לִי לִינָא. אֲנִי מִצָּרְפַת. אֲנִי בַּת חֲמֵשׁ-עֶשְׂרֵה, וְאַתָּה?',
  },
  {
    id: 'daniel-2',
    speaker: 'דָּנִיֵּאל',
    emoji: '👦',
    text: 'אֲנִי מֵאַרְהָ״בּ. אֲנִי בֶּן שֵׁשׁ-עֶשְׂרֵה. יָאלְלָה, בּוֹאִי לַכִּתָּה! בְּרוּכָה הַבָּאָה!',
  },
];

// --- Stage 2.2: כַּרְטִיסִיּוֹת אוֹצַר מִלִּים (Vocabulary Flip Cards) --------
export interface VocabCard {
  word: string;
  emoji: string;
  en: string;
  ru: string;
  example: string;
}

export const PILOT_VOCAB_CARDS: VocabCard[] = [
  {
    word: 'שָׁלוֹם',
    emoji: '👋',
    en: 'Hello / Peace',
    ru: 'Привет / Мир',
    example: 'שָׁלוֹם! נָעִים מְאוֹד לְהַכִּיר.',
  },
  {
    word: 'קוֹרְאִים לִי',
    emoji: '🏷️',
    en: 'My name is (lit. "they call me")',
    ru: 'Меня зовут',
    example: 'קוֹרְאִים לִי דָּנִיֵּאל, וְלָךְ?',
  },
  {
    word: 'אֲנִי מִ...',
    emoji: '🌍',
    en: 'I am from...',
    ru: 'Я из...',
    example: 'אֲנִי מִצָּרְפַת, וְאַתָּה מֵאֵיפֹה?',
  },
  {
    word: 'בֶּן',
    emoji: '👦',
    en: 'aged (masculine) / son',
    ru: 'ему ... лет / сын',
    example: 'אֲנִי בֶּן שֵׁשׁ-עֶשְׂרֵה.',
  },
  {
    word: 'בַּת',
    emoji: '👧',
    en: 'aged (feminine) / daughter',
    ru: 'ей ... лет / дочь',
    example: 'אֲנִי בַּת חֲמֵשׁ-עֶשְׂרֵה.',
  },
  {
    word: 'חָבֵר',
    emoji: '🧑‍🤝‍🧑',
    en: 'friend',
    ru: 'друг',
    example: 'זֶה חָבֵר חָדָשׁ מֵהַכִּתָּה.',
  },
];

// --- Stage 2.3: מַלְכֹּדֶת הַדִּקְדּוּק (Gender Grid) ------------------------
export const PILOT_GENDER_GRID = {
  masculine: { label: 'אֲנִי בֶּן ___ 👦', frame: 'הוּא אוֹמֵר: "אֲנִי בֶּן..."' },
  feminine: { label: 'אֲנִי בַּת ___ 👧', frame: 'הִיא אוֹמֶרֶת: "אֲנִי בַּת..."' },
  instruction:
    'בְּעִבְרִית הַמִּסְפָּר מִשְׁתַּנֶּה לְפִי מִין: בָּנִים אוֹמְרִים "בֶּן", בָּנוֹת אוֹמְרוֹת "בַּת". שַׁבְּצוּ כָּל שֵׁם בַּכַּרְטִיס הַנָּכוֹן.',
  /** Seed names — each pre-tagged so the teacher can demo the sort instantly. */
  seedNames: [
    { name: 'דָּנִיֵּאל', gender: 'masculine' as const },
    { name: 'לִינָא', gender: 'feminine' as const },
    { name: 'יוֹסֵף', gender: 'masculine' as const },
    { name: 'מַיָּה', gender: 'feminine' as const },
  ],
} as const;

// --- Stage 3: זְמַן דִּבּוּר — Passport / ID builder ------------------------
export const PILOT_PASSPORT = {
  title: 'תְּעוּדַת הַזֶּהוּת שֶׁלִּי',
  fields: {
    name: { label: 'קוֹרְאִים לִי', placeholder: 'הַשֵּׁם שֶׁלִּי...' },
    from: { label: 'אֲנִי מִ', placeholder: 'אֶרֶץ / עִיר...' },
    age: { label: 'אֲנִי בֶּן / בַּת', placeholder: 'הַגִּיל שֶׁלִּי...' },
  },
  instruction:
    'מַלְּאוּ אֶת הַתְּעוּדָה יַחַד, וְאָז אִמְרוּ אֶת הַמִּשְׁפָּט הַשָּׁלֵם בְּקוֹל רָם, פָּנִים אֶל פָּנִים. אֵין טָעֻיּוֹת — יֵשׁ רַק נִסְיוֹנוֹת אַמִּיצִים.',
} as const;

// --- Stage 4, Game 1: MemoryMatch — target matrix (word ↔ picture) ----------
// Ordered so the 6 core ID words show first (MemoryMatch caps at 6 pairs for a
// clean 12-card grid); "חָבֵר" is the intentional 7th, dropped by that cap.
export const PILOT_TARGET_MATRIX: TokenItem[] = [
  { word: 'שָׁלוֹם', emoji: '👋' },
  { word: 'קוֹרְאִים לִי', emoji: '🏷️' },
  { word: 'אֲנִי מִ...', emoji: '🌍' },
  { word: 'בֶּן', emoji: '👦' },
  { word: 'בַּת', emoji: '👧' },
  { word: 'כִּתָּה', emoji: '🏫' },
  { word: 'חָבֵר', emoji: '🧑‍🤝‍🧑' },
];

// --- Stage 4, Game 2: OddOneOut — gender-syntax rounds ----------------------
export interface OddRound {
  frames: string[];
  oddIndex: number;
  explanation: string;
}

export const PILOT_ODD_ROUNDS: OddRound[] = [
  {
    frames: ['אֲנִי בַּת עֶשֶׂר', 'הִיא בַּת שְׁתֵּים-עֶשְׂרֵה', 'אֲנִי בֶּן תֵּשַׁע', 'הַיַּלְדָּה בַּת שֶׁבַע'],
    oddIndex: 2,
    explanation: 'שְׁלוֹשָׁה מִשְׁפָּטִים בִּלְשׁוֹן נְקֵבָה ("בַּת"). "אֲנִי בֶּן תֵּשַׁע" הוּא לְשׁוֹן זָכָר — הוּא הַיּוֹצֵא מִן הַכְּלָל.',
  },
  {
    frames: ['הוּא בֶּן אַחַת-עֶשְׂרֵה', 'אֲנִי בֶּן שְׁמוֹנֶה', 'הַיֶּלֶד בֶּן שֵׁשׁ', 'אֲנִי בַּת אַרְבַּע'],
    oddIndex: 3,
    explanation: 'שְׁלוֹשָׁה מִשְׁפָּטִים בִּלְשׁוֹן זָכָר ("בֶּן"). "אֲנִי בַּת אַרְבַּע" הוּא לְשׁוֹן נְקֵבָה — הוּא הַיּוֹצֵא מִן הַכְּלָל.',
  },
  {
    frames: ['לִינָא בַּת חָמֵשׁ-עֶשְׂרֵה', 'מַיָּה בַּת שָׁלוֹשׁ', 'דָּנִיֵּאל בֶּן שֵׁשׁ-עֶשְׂרֵה', 'הַאִמָּא בַּת אַרְבָּעִים'],
    oddIndex: 2,
    explanation: 'שְׁלוֹשָׁה שֵׁמוֹת שֶׁל בָּנוֹת עִם "בַּת". "דָּנִיֵּאל בֶּן שֵׁשׁ-עֶשְׂרֵה" הוּא שֵׁם שֶׁל בֶּן — הַיּוֹצֵא מִן הַכְּלָל.',
  },
];

// ===========================================================================
// PRINT — the 4-part "Premium Edition" worksheet content
// ===========================================================================

/** Part 1a: connect a vowelized sentence to its icon. */
export const PILOT_MATCH_PAIRS: { sentence: string; emoji: string }[] = [
  { sentence: 'שָׁלוֹם, נָעִים מְאוֹד!', emoji: '👋' },
  { sentence: 'אֲנִי מִצָּרְפַת.', emoji: '🌍' },
  { sentence: 'אֲנִי בַּת חָמֵשׁ-עֶשְׂרֵה.', emoji: '👧' },
  { sentence: 'זֶה חָבֵר חָדָשׁ.', emoji: '🧑‍🤝‍🧑' },
  { sentence: 'אֲנִי הוֹלֵךְ לַכִּתָּה.', emoji: '🏫' },
];

/** Part 1b: a word-level hunt grid (every cell a vowelized word — see plan). */
export const PILOT_WORD_HUNT = {
  targets: ['שָׁלוֹם', 'חָבֵר', 'כִּתָּה', 'בֶּן', 'בַּת', 'תּוֹדָה'],
  /** A 5×5 grid of vowelized words; the targets are hidden among distractors. */
  grid: [
    ['שֻׁלְחָן', 'שָׁלוֹם', 'סֵפֶר', 'חַלּוֹן', 'דֶּלֶת'],
    ['חָבֵר', 'עִפָּרוֹן', 'מַיִם', 'כִּתָּה', 'יֶלֶד'],
    ['מוֹרֶה', 'תַּפּוּחַ', 'בֶּן', 'שֶׁמֶשׁ', 'כַּדּוּר'],
    ['בַּת', 'חָתוּל', 'תּוֹדָה', 'סֵפֶל', 'אֹכֶל'],
    ['בַּיִת', 'שָׁעוֹן', 'פֶּרַח', 'מַחְבֶּרֶת', 'רֶגֶל'],
  ],
} as const;

/** Part 2: three scrambled-sentence syntax puzzles. */
export const PILOT_SCRAMBLES: { scrambled: string[]; answer: string }[] = [
  { scrambled: ['לִי', 'שָׁלוֹם', 'קוֹרְאִים', 'דָּנִיֵּאל'], answer: 'שָׁלוֹם, קוֹרְאִים לִי דָּנִיֵּאל.' },
  { scrambled: ['מִצָּרְפַת', 'אֲנִי', 'בַּת', 'עֶשֶׂר'], answer: 'אֲנִי בַּת עֶשֶׂר מִצָּרְפַת.' },
  { scrambled: ['חָדָשׁ', 'אֲנִי', 'בַּכִּתָּה', 'חָבֵר'], answer: 'אֲנִי חָבֵר חָדָשׁ בַּכִּתָּה.' },
];

/** Part 3: cloze version of the dialogue + the word bank the student picks from. */
export const PILOT_CLOZE = {
  wordBank: ['שָׁלוֹם', 'קוֹרְאִים', 'מִצָּרְפַת', 'בַּת', 'בֶּן', 'בְּרוּכָה'],
  lines: [
    { speaker: 'דָּנִיֵּאל', segments: ['', '! מָה הַקֶּשֶׁר? אֲנִי דָּנִיֵּאל. מֵאֵיפֹה אַתָּה?'], answers: ['שָׁלוֹם'] },
    {
      speaker: 'לִינָא',
      segments: ['הַי! ', ' לִי לִינָא. אֲנִי ', '. אֲנִי ', ' חֲמֵשׁ-עֶשְׂרֵה.'],
      answers: ['קוֹרְאִים', 'מִצָּרְפַת', 'בַּת'],
    },
    {
      speaker: 'דָּנִיֵּאל',
      segments: ['אֲנִי ', ' שֵׁשׁ-עֶשְׂרֵה. יָאלְלָה, ', ' הַבָּאָה!'],
      answers: ['בֶּן', 'בְּרוּכָה'],
    },
  ],
} as const;

/** Part 4: the blank creative-production passport box. */
export const PILOT_CREATIVE_PASSPORT = {
  title: 'תְּעוּדַת הַזֶּהוּת שֶׁלִּי',
  rows: ['קוֹרְאִים לִי', 'אֲנִי מִ', 'אֲנִי בֶּן / בַּת', 'חָבֵר / חֲבֵרָה שֶׁלִּי'],
  instruction: 'כִּתְבוּ בְּעַצְמְכֶם אֶת תְּעוּדַת הַזֶּהוּת שֶׁלָּכֶם בְּעִבְרִית. אַתֶּם הַכּוֹכָבִים!',
} as const;

// --- Footer exit ticket (screen Stage 5 + print) ---------------------------
export const PILOT_EXIT_QUESTIONS: { prompt: string; kind: 'mood' | 'lines'; lines?: number }[] = [
  { prompt: 'אֵיךְ הִרְגַּשְׁתִּי בַּשִּׁעוּר הַיּוֹם?', kind: 'mood' },
  { prompt: 'מִלָּה אַחַת חֲדָשָׁה שֶׁאֲנִי לוֹקֵחַ/לוֹקַחַת אִתִּי הַבַּיְתָה...', kind: 'lines', lines: 1 },
  { prompt: 'לְמִי אֹמַר "שָׁלוֹם" בְּעִבְרִית הַיּוֹם?', kind: 'lines', lines: 1 },
] as const;
