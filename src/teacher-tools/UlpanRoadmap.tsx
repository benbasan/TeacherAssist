import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import chaptersData from '../data/content/ulpan-chapters.json';
import generatorData from '../data/content/ulpan-generator-content.json';
import gamesRegistry from '../data/games-registry.json';
import type { EducationalGame } from '../types/game.types';

// ---------------------------------------------------------------------------
// Types — shapes of the two content JSON files + the profile/lesson contracts
// ---------------------------------------------------------------------------

type CohortKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';
type LevelKey = 'level_1' | 'level_2' | 'level_3';
type NativeLangKey = 'english' | 'russian' | 'french' | 'spanish' | 'other';

interface UlpanProfile {
  ageGroup: CohortKey;
  nativeLanguage: NativeLangKey;
  level: LevelKey;
}

interface TokenItem {
  word: string;
  emoji: string;
}

interface UlpanChapter {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  baseTokens: TokenItem[];
}

interface UlpanPhase {
  key: string;
  label: string;
  blurb: string;
  chapters: UlpanChapter[];
}

interface ContrastiveNote {
  text: string;
  /** Optional chapter filter — a note without it applies to every chapter. */
  chapters?: number[];
}

interface ChapterCorpus {
  warmup: Record<CohortKey, string>;
  expansionTokens: { level_2: string[]; level_3: string[] };
  sentenceFrames: string[];
  game: {
    gameId: string;
    rationale: string;
    launchTip: Record<LevelKey, string>;
  };
  mission: Record<LevelKey, { title: string; challenge: string; success: string }>;
}

interface GeneratorContent {
  intro: { title: string; body: string };
  ageGroups: Record<CohortKey, string>;
  levels: Record<
    LevelKey,
    { label: string; vocabApproach: string; worksheetGuidance: string; closure: string }
  >;
  nativeLanguages: Record<NativeLangKey, { label: string; notes: ContrastiveNote[] }>;
  chapters: Record<string, ChapterCorpus>;
}

interface GeneratedLesson {
  chapter: UlpanChapter;
  profile: UlpanProfile;
  warmup: string;
  /** Full teaching vocabulary: baseTokens + level-appropriate expansion tiers. */
  wordArray: string[];
  vocabApproach: string;
  contrastiveNotes: string[];
  game: { gameId: string; gameTitle: string; rationale: string; launchTip: string };
  /** Input-driven games get these as paste-ready generated sentences. */
  pasteSentences: string[];
  closure: string;
  sentenceFrames: string[];
  worksheetGuidance: string;
  mission: { title: string; challenge: string; success: string };
}

const PHASES = (chaptersData as { phases: UlpanPhase[] }).phases;
const CONTENT = generatorData as unknown as GeneratorContent;
const GAMES = gamesRegistry as EducationalGame[];

/** Games whose mechanics consume teacher-typed input — the generated sentences paste straight in. */
const INPUT_DRIVEN_GAMES = new Set(['two-truths-lie', 'punctuation-orchestra']);

// Accents tuned to read on the dark corporate surface.
const EMERALD = '#34d399';
const SLATE = '#94a3b8';
const CYAN = '#4dd0e1';
const AMBER = '#fbbf24';

// ---------------------------------------------------------------------------
// The generation engine — a pure deterministic composition of the corpus.
// All copy is authored in the veteran-Ulpan/SLA expert voice inside the JSON.
// ---------------------------------------------------------------------------

function buildLessonPlan(chapter: UlpanChapter, profile: UlpanProfile): GeneratedLesson {
  const corpus = CONTENT.chapters[String(chapter.id)];
  const levelMeta = CONTENT.levels[profile.level];

  const baseWords = chapter.baseTokens.map((t) => t.word);
  const expansion =
    profile.level === 'level_1'
      ? []
      : profile.level === 'level_2'
        ? corpus.expansionTokens.level_2
        : [...corpus.expansionTokens.level_2, ...corpus.expansionTokens.level_3];
  const wordArray = [...baseWords, ...expansion];

  const contrastiveNotes = CONTENT.nativeLanguages[profile.nativeLanguage].notes
    .filter((n) => !n.chapters || n.chapters.includes(chapter.id))
    .slice(0, 3)
    .map((n) => n.text);

  const gameTitle = GAMES.find((g) => g.id === corpus.game.gameId)?.title ?? corpus.game.gameId;

  return {
    chapter,
    profile,
    warmup: corpus.warmup[profile.ageGroup],
    wordArray,
    vocabApproach: levelMeta.vocabApproach,
    contrastiveNotes,
    game: {
      gameId: corpus.game.gameId,
      gameTitle,
      rationale: corpus.game.rationale,
      launchTip: corpus.game.launchTip[profile.level],
    },
    pasteSentences: corpus.expansionTokens.level_3,
    closure: levelMeta.closure,
    sentenceFrames: corpus.sentenceFrames,
    worksheetGuidance: levelMeta.worksheetGuidance,
    mission: corpus.mission[profile.level],
  };
}

// ---------------------------------------------------------------------------
// Printable worksheet — a standalone LIGHT document opened in a new window
// (the workspace itself is dark-themed; see ARCHITECTURE.md §10 Decision Log).
// ---------------------------------------------------------------------------

function buildWorksheetHtml(lesson: GeneratedLesson): string {
  const { chapter, profile } = lesson;
  const isLevel1 = profile.level === 'level_1';

  // Matching exercise: emojis rotated by half so the pairs never sit side-by-side.
  const tokens = chapter.baseTokens;
  const half = Math.ceil(tokens.length / 2);
  const shuffledEmojis = [...tokens.slice(half), ...tokens.slice(0, half)].map((t) => t.emoji);

  const wordBank = tokens
    .map(
      (t) =>
        `<div class="bank-item"><span class="bank-emoji">${t.emoji}</span><span class="bank-word">${t.word}</span></div>`,
    )
    .join('');

  // Wide ruled writing lines; level 1 gets a pale traceable word on each line.
  const writingLines = tokens
    .slice(0, 6)
    .map(
      (t) =>
        `<div class="write-line">${isLevel1 ? `<span class="trace">${t.word}</span>` : ''}</div>`,
    )
    .join('');

  const matching = tokens
    .map(
      (t, i) =>
        `<div class="match-row"><span class="match-word">${t.word}</span><span class="match-dots"></span><span class="match-emoji">${shuffledEmojis[i]}</span></div>`,
    )
    .join('');

  const frames =
    profile.level === 'level_1'
      ? ''
      : `<section>
          <h2>✏️ משלימים משפט</h2>
          ${lesson.sentenceFrames.map((f) => `<p class="frame">${f}</p>`).join('')}
        </section>`;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>דף תרגול — ${chapter.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Rubik', 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #111827; padding-bottom: 12px; }
  header .title h1 { font-size: 26px; font-weight: 800; }
  header .title p { font-size: 14px; color: #6b7280; margin-top: 2px; }
  header .meta { font-size: 14px; text-align: left; }
  header .meta div { margin-bottom: 6px; }
  header .meta span { display: inline-block; min-width: 140px; border-bottom: 1.5px dotted #9ca3af; }
  section { margin-top: 26px; }
  h2 { font-size: 18px; font-weight: 700; margin-bottom: 12px; border-inline-start: 5px solid #111827; padding-inline-start: 10px; }
  .bank { display: flex; flex-wrap: wrap; gap: 10px; }
  .bank-item { display: flex; align-items: center; gap: 8px; border: 1.5px solid #d1d5db; border-radius: 12px; padding: 8px 14px; }
  .bank-emoji { font-size: 26px; }
  .bank-word { font-size: 28px; font-weight: 700; }
  .write-line { height: 46px; border-bottom: 2px solid #cbd5e1; display: flex; align-items: flex-end; padding-bottom: 2px; }
  .trace { font-size: 30px; font-weight: 500; color: #d1d5db; letter-spacing: 2px; }
  .match-row { display: flex; align-items: center; gap: 12px; padding: 7px 0; }
  .match-word { font-size: 24px; font-weight: 700; min-width: 130px; }
  .match-dots { flex: 1; border-bottom: 2px dotted #9ca3af; }
  .match-emoji { font-size: 30px; }
  .frame { font-size: 22px; line-height: 2.4; }
  footer { margin-top: 30px; border-top: 1.5px solid #e5e7eb; padding-top: 10px; font-size: 12px; color: #6b7280; }
</style>
</head>
<body onload="window.print()">
  <header>
    <div class="title">
      <h1>${chapter.icon} ${chapter.title}</h1>
      <p>${chapter.subtitle} · ${CONTENT.levels[profile.level].label}</p>
    </div>
    <div class="meta">
      <div>שם: <span></span></div>
      <div>תאריך: <span></span></div>
    </div>
  </header>
  <section>
    <h2>📦 מחסן המילים שלי</h2>
    <div class="bank">${wordBank}</div>
  </section>
  <section>
    <h2>🖊️ מתאמנים בכתיבה</h2>
    ${writingLines}
  </section>
  <section>
    <h2>🔗 מחברים מילה לציור</h2>
    ${matching}
  </section>
  ${frames}
  <footer>💡 למורה: ${lesson.worksheetGuidance}</footer>
</body>
</html>`;
}

function printWorksheet(lesson: GeneratedLesson): void {
  const w = window.open('', '_blank', 'width=850,height=1100');
  if (!w) return; // popup blocked — the on-screen preview still shows everything
  w.document.write(buildWorksheetHtml(lesson));
  w.document.close();
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function TimeBlock({
  time,
  title,
  children,
}: {
  time: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Chip label={time} size="small" sx={{ fontWeight: 800, bgcolor: 'primary.dark', color: '#fff' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

function WordChips({ words }: { words: string[] }) {
  return (
    <Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {words.map((w) => (
        <Chip key={w} label={w} size="small" sx={{ fontWeight: 600 }} />
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UlpanRoadmap() {
  const { classrooms, activeClassroomId, toggleUlpanChapter } = useClassrooms();

  // Local, session-decoupled selection (does NOT call setActiveClassroom). See §10.
  // Class selection here is OPTIONAL — it only enables per-chapter progress tracking.
  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassroomId);
  const [view, setView] = useState<'roadmap' | 'lesson'>('roadmap');
  const [drawerChapter, setDrawerChapter] = useState<UlpanChapter | null>(null);
  const [profile, setProfile] = useState<UlpanProfile>({
    ageGroup: 'upper_elementary',
    nativeLanguage: 'russian',
    level: 'level_1',
  });
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedClass = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId) ?? null,
    [classrooms, selectedClassId],
  );
  const completedChapters = selectedClass?.ulpanCompletedChapters ?? [];

  const generate = () => {
    if (!drawerChapter) return;
    setLesson(buildLessonPlan(drawerChapter, profile));
    setDrawerChapter(null);
    setActiveTab(0);
    setView('lesson');
  };

  const copyForGame = async (l: GeneratedLesson) => {
    const payload = INPUT_DRIVEN_GAMES.has(l.game.gameId)
      ? l.pasteSentences.join('\n')
      : JSON.stringify(l.wordArray, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
    } catch {
      // Clipboard unavailable (permissions) — the chips remain readable on screen.
    }
  };

  // --- Lesson view ----------------------------------------------------------
  if (view === 'lesson' && lesson) {
    const isPasteReady = INPUT_DRIVEN_GAMES.has(lesson.game.gameId);
    return (
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 32 }}>{lesson.chapter.icon}</Typography>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                פרק {lesson.chapter.id}: {lesson.chapter.title}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                <Chip size="small" label={CONTENT.ageGroups[lesson.profile.ageGroup]} sx={{ fontWeight: 700 }} />
                <Chip size="small" label={`שפת אם: ${CONTENT.nativeLanguages[lesson.profile.nativeLanguage].label}`} sx={{ fontWeight: 700 }} />
                <Chip size="small" label={CONTENT.levels[lesson.profile.level].label} sx={{ fontWeight: 700, bgcolor: 'primary.dark', color: '#fff' }} />
              </Stack>
            </Box>
          </Stack>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => setView('roadmap')}>
            חזרה למפת הדרכים
          </Button>
        </Stack>

        <Paper variant="outlined">
          <Tabs
            value={activeTab}
            onChange={(_, v: number) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="🕒 מערך שיעור דינמי (45 דק')" sx={{ fontWeight: 700 }} />
            <Tab label="📄 דף תרגול להדפסה" sx={{ fontWeight: 700 }} />
            <Tab label="🚀 משימת עולם אמיתי" sx={{ fontWeight: 700 }} />
          </Tabs>

          {/* --- Tab 1: the 45-minute lesson plan --------------------------- */}
          {activeTab === 0 && (
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <TimeBlock time="0-10 דק'" title="פתיחה בתנועה — חימום מותאם גיל">
                <Typography variant="body2">{lesson.warmup}</Typography>
              </TimeBlock>

              <TimeBlock time="10-25 דק'" title="אוצר המילים של הפרק — הקניה מפורשת">
                <Stack spacing={1.5}>
                  <WordChips words={lesson.wordArray} />
                  <Typography variant="body2">{lesson.vocabApproach}</Typography>
                  {lesson.contrastiveNotes.map((note) => (
                    <Alert key={note} severity="info" icon={<AutoStoriesRoundedIcon />} sx={{ '& .MuiAlert-message': { fontSize: 14 } }}>
                      <strong>גשר משפת האם:</strong> {note}
                    </Alert>
                  ))}
                </Stack>
              </TimeBlock>

              <TimeBlock time="25-40 דק'" title="שילוב פלטפורמת הכיתה — משחק על הלוח החכם">
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <SportsEsportsRoundedIcon sx={{ color: CYAN }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      המשחק המומלץ: {lesson.game.gameTitle}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      to={`/game/${lesson.game.gameId}`}
                      target="_blank"
                    >
                      פתיחת המשחק ↗
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {lesson.game.rationale}
                  </Typography>
                  <Alert severity="success" sx={{ '& .MuiAlert-message': { fontSize: 14 } }}>
                    <strong>הנחיית הפעלה לפרופיל הזה:</strong> {lesson.game.launchTip}
                  </Alert>
                  <Divider />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {isPasteReady ? 'משפטים מוכנים להזנה למשחק:' : 'מערך המילים המותאם למשחק:'}
                  </Typography>
                  {isPasteReady ? (
                    <Stack spacing={0.5}>
                      {lesson.pasteSentences.map((s) => (
                        <Typography key={s} variant="body2" sx={{ fontWeight: 600 }}>
                          • {s}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <WordChips words={lesson.wordArray} />
                  )}
                  <Button
                    size="small"
                    startIcon={<ContentCopyRoundedIcon />}
                    onClick={() => void copyForGame(lesson)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {isPasteReady ? 'העתקה להדבקה במשחק' : 'העתקת מערך המילים (JSON)'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    ⚠️ עברו למרחב הכיתה כדי להקרין — הקישור נפתח בלשונית חדשה כדי לא להפריע לשולחן העבודה.
                  </Typography>
                </Stack>
              </TimeBlock>

              <TimeBlock time="40-45 דק'" title="סגירה ופרידה — טקס הצלחה">
                <Typography variant="body2">{lesson.closure}</Typography>
              </TimeBlock>
            </Stack>
          )}

          {/* --- Tab 2: printable worksheet preview ------------------------- */}
          {activeTab === 1 && (
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  תצוגה מקדימה — הדף נפתח בחלון חדש, בהיר ומוכן להדפסה על A4.
                </Typography>
                <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={() => printWorksheet(lesson)}>
                  הדפס דף עבודה 🖨️
                </Button>
              </Stack>

              {/* Forced-light preview inside the dark workspace */}
              <Paper elevation={0} sx={{ bgcolor: '#ffffff', color: '#111827', p: { xs: 2, sm: 4 }, border: '1px solid #e5e7eb' }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #111827', pb: 1.5, flexWrap: 'wrap', gap: 1 }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
                      {lesson.chapter.icon} {lesson.chapter.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      {lesson.chapter.subtitle} · {CONTENT.levels[lesson.profile.level].label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#111827' }}>
                    שם: ______________ תאריך: ________
                  </Typography>
                </Stack>

                <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 3, mb: 1, color: '#111827' }}>
                  📦 מחסן המילים שלי
                </Typography>
                <Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {lesson.chapter.baseTokens.map((t) => (
                    <Box key={t.word} sx={{ border: '1.5px solid #d1d5db', borderRadius: 3, px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 22 }}>{t.emoji}</Typography>
                      <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{t.word}</Typography>
                    </Box>
                  ))}
                </Stack>

                <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 3, mb: 1, color: '#111827' }}>
                  🖊️ מתאמנים בכתיבה
                </Typography>
                {lesson.chapter.baseTokens.slice(0, 3).map((t) => (
                  <Box key={t.word} sx={{ height: 40, borderBottom: '2px solid #cbd5e1', display: 'flex', alignItems: 'flex-end' }}>
                    {lesson.profile.level === 'level_1' && (
                      <Typography sx={{ fontSize: 22, color: '#d1d5db', letterSpacing: 2 }}>{t.word}</Typography>
                    )}
                  </Box>
                ))}
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  …ובדף המודפס: שורות רחבות לכל המילים, תרגיל התאמת מילה לציור
                  {lesson.profile.level !== 'level_1' && ' ומסגרות משפט להשלמה'}
                  .
                </Typography>

                <Divider sx={{ my: 2, borderColor: '#e5e7eb' }} />
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  💡 למורה: {lesson.worksheetGuidance}
                </Typography>
              </Paper>
            </Stack>
          )}

          {/* --- Tab 3: real-world mission ticket ---------------------------- */}
          {activeTab === 2 && (
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 }, alignItems: 'center' }}>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2.5, sm: 4 },
                  maxWidth: 560,
                  width: '100%',
                  border: `2px dashed ${AMBER}`,
                  position: 'relative',
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip label="כרטיס משימה" size="small" sx={{ bgcolor: AMBER, color: '#0f172a', fontWeight: 800 }} />
                    <RocketLaunchRoundedIcon sx={{ color: AMBER }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    🚀 {lesson.mission.title}
                  </Typography>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: AMBER }}>
                      המשימה:
                    </Typography>
                    <Typography variant="body1">{lesson.mission.challenge}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: EMERALD }}>
                      איך יודעים שהצלחתם?
                    </Typography>
                    <Typography variant="body1">{lesson.mission.success}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    💡 למורה: תדרכו מראש את "השותפים הסודיים" (מזכירה, ספרנית, מורה תורן) — קבלת פנים חמה
                    למשימה הופכת ניסיון מהוסס להצלחה חקוקה.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}
        </Paper>

        <Snackbar
          open={copied}
          autoHideDuration={2500}
          onClose={() => setCopied(false)}
          message="הועתק! מוכן להדבקה 📋"
        />
      </Stack>
    );
  }

  // --- Roadmap view ---------------------------------------------------------
  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <SchoolRoundedIcon sx={{ fontSize: 40, color: CYAN }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            מחולל האולפן הדינמי לעולים חדשים
          </Typography>
          <Typography variant="body2" color="text.secondary">
            מפת דרכים בת 10 פרקים ללימוד עברית כשפה שנייה — בחרו פרק, כווננו פרופיל תלמיד, וקבלו מערך שלם.
          </Typography>
        </Box>
      </Stack>

      {/* SLA methodology intro banner */}
      <Paper variant="outlined" sx={{ p: 2, borderInlineStart: `4px solid ${CYAN}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: CYAN, mb: 0.5 }}>
          🎓 {CONTENT.intro.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {CONTENT.intro.body}
        </Typography>
      </Paper>

      {/* Optional class selection — enables progress tracking only */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            מעקב התקדמות לכיתה:
          </Typography>
          <TextField
            select
            size="small"
            value={selectedClassId ?? ''}
            onChange={(e) => setSelectedClassId(e.target.value || null)}
            sx={{ minWidth: 220 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">ללא מעקב (מצב חופשי)</MenuItem>
            {classrooms.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} · {c.students.length} תלמידים
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            {selectedClass
              ? `הושלמו ${completedChapters.length} מתוך 10 פרקים`
              : 'בחרו כיתה כדי לסמן פרקים שהושלמו — המחולל עובד גם בלי.'}
          </Typography>
        </Stack>
      </Paper>

      {/* The 10-chapter roadmap, grouped by phase */}
      {PHASES.map((phase, phaseIdx) => (
        <Box key={phase.key}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', mb: 0.5 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: CYAN }}>
              שלב {phaseIdx + 1} · {phase.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {phase.blurb}
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1.5 }} />

          <Stack spacing={1}>
            {phase.chapters.map((chapter) => {
              const done = completedChapters.includes(chapter.id);
              return (
                <Paper
                  key={chapter.id}
                  variant="outlined"
                  onClick={() => setDrawerChapter(chapter)}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    '&:hover': { borderColor: CYAN },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    {/* Number bubble */}
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 16,
                        bgcolor: done ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                        color: done ? EMERALD : SLATE,
                        border: `2px solid ${done ? EMERALD : 'rgba(148, 163, 184, 0.4)'}`,
                      }}
                    >
                      {chapter.id}
                    </Box>
                    <Typography sx={{ fontSize: 26, flexShrink: 0 }}>{chapter.icon}</Typography>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {chapter.title}
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ marginInlineStart: 1 }}>
                          {chapter.subtitle}
                        </Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {chapter.baseTokens.map((t) => t.word).join(' · ')}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={done ? 'הושלם ✓' : 'טרם נלמד'}
                      sx={{
                        fontWeight: 700,
                        flexShrink: 0,
                        bgcolor: done ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                        color: done ? EMERALD : SLATE,
                      }}
                    />
                    <Tooltip title={selectedClass ? (done ? 'סימון כ"טרם נלמד"' : 'סימון כ"הושלם"') : 'בחרו כיתה כדי לעקוב אחר התקדמות'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={!selectedClass}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedClass) void toggleUlpanChapter(selectedClass.id, chapter.id);
                          }}
                        >
                          {done ? (
                            <CheckCircleRoundedIcon sx={{ color: EMERALD }} />
                          ) : (
                            <RadioButtonUncheckedRoundedIcon />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      ))}

      {/* Profile customization drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerChapter)}
        onClose={() => setDrawerChapter(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 }, p: 3 } } }}
      >
        {drawerChapter && (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {drawerChapter.icon} פרק {drawerChapter.id}: {drawerChapter.title}
              </Typography>
              <IconButton onClick={() => setDrawerChapter(null)} aria-label="סגירה">
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              כווננו את פרופיל התלמיד — והמחולל יתפור מערך שיעור, דף תרגול ומשימה בדיוק למידותיו.
            </Typography>
            <WordChips words={drawerChapter.baseTokens.map((t) => t.word)} />
            <Divider />

            <TextField
              select
              label="שכבת גיל"
              value={profile.ageGroup}
              onChange={(e) => setProfile((p) => ({ ...p, ageGroup: e.target.value as CohortKey }))}
              fullWidth
            >
              {(Object.keys(CONTENT.ageGroups) as CohortKey[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {CONTENT.ageGroups[k]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="שפת אם"
              value={profile.nativeLanguage}
              onChange={(e) =>
                setProfile((p) => ({ ...p, nativeLanguage: e.target.value as NativeLangKey }))
              }
              fullWidth
            >
              {(Object.keys(CONTENT.nativeLanguages) as NativeLangKey[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {CONTENT.nativeLanguages[k].label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="רמת שפה"
              value={profile.level}
              onChange={(e) => setProfile((p) => ({ ...p, level: e.target.value as LevelKey }))}
              fullWidth
            >
              {(Object.keys(CONTENT.levels) as LevelKey[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {CONTENT.levels[k].label}
                </MenuItem>
              ))}
            </TextField>

            <Button variant="contained" size="large" onClick={generate} sx={{ fontWeight: 800 }}>
              📝 גנרט מערך שיעור מותאם אישית
            </Button>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
