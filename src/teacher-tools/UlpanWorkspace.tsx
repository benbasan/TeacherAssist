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
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import {
  buildLessonPlan,
  CONTENT,
  INPUT_DRIVEN_GAMES,
  PHASES,
} from '../data/ulpanLesson';
import type {
  CohortKey,
  GeneratedLesson,
  LevelKey,
  NativeLangKey,
  UlpanChapter,
  UlpanProfile,
} from '../data/ulpanLesson';
import { buildUlpanExitTicketDoc, buildUlpanWorksheetDoc } from '../data/ulpanPrint';
import LessonPlayer from '../components/LessonPlayer';
import PrintDocDialog from '../components/PrintDocDialog';

// Accents tuned to read on the dark corporate surface.
const EMERALD = '#34d399';
const SLATE = '#94a3b8';
const CYAN = '#4dd0e1';
const AMBER = '#fbbf24';

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function TimeBlock({ time, title, children }: { time: string; title: string; children: ReactNode }) {
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
// Main component — the "Brain": roadmap + profile + generated lesson dashboard
// ---------------------------------------------------------------------------

export default function UlpanWorkspace() {
  const { classrooms, activeClassroomId, toggleUlpanChapter } = useClassrooms();

  // Local, session-decoupled selection (does NOT call setActiveClassroom). See §10.
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
  const [playerOpen, setPlayerOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

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

        {/* Primary launch + print actions */}
        <Paper variant="outlined" sx={{ p: 2, borderInlineStart: `4px solid ${CYAN}` }}>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayCircleFilledRoundedIcon />}
              onClick={() => setPlayerOpen(true)}
              sx={{ fontWeight: 800 }}
            >
              🚀 הפעל שיעור על הלוח החכם
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<PrintRoundedIcon />}
              onClick={() => setPrintOpen(true)}
            >
              🖨️ הדפס דף עבודה + כרטיס יציאה
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ flexBasis: '100%' }}>
              הנגן נפתח במסך מלא ובהיר — מוכן להקרנה מול הכיתה. שולחן העבודה נשאר פתוח מאחוריו.
            </Typography>
          </Stack>
        </Paper>

        <Paper variant="outlined">
          <Tabs
            value={activeTab}
            onChange={(_, v: number) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Tab label="🕒 מערך שיעור דינמי (45 דק')" sx={{ fontWeight: 700 }} />
            <Tab label="📄 דפי עבודה להדפסה" sx={{ fontWeight: 700 }} />
            <Tab label="🚀 משימת עולם אמיתי" sx={{ fontWeight: 700 }} />
          </Tabs>

          {/* --- Tab 1: the 45-minute lesson plan --------------------------- */}
          {activeTab === 0 && (
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <TimeBlock time="0-5 דק'" title="הקרס — פתיחה מסקרנת מותאמת גיל">
                <Typography variant="body2">{lesson.warmup}</Typography>
              </TimeBlock>

              <TimeBlock time="5-17 דק'" title="הקניה וקריאה — אוצר המילים של הפרק">
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

              <TimeBlock time="17-27 דק'" title="תרגול משחקי — התאמת זוגות על הלוח">
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    בנגן: משחק זיכרון והתאמה שנטען אוטומטית עם מילות הפרק — התלמידים מתאימים מילה לתמונה.
                  </Typography>
                  <Divider />
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <SportsEsportsRoundedIcon sx={{ color: CYAN }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      חלופה מהקטלוג: {lesson.game.gameTitle}
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
                </Stack>
              </TimeBlock>

              <TimeBlock time="27-40 דק'" title="עבודה עצמית — טיימר 13 דקות ודפי עבודה">
                <Typography variant="body2">{lesson.worksheetGuidance}</Typography>
              </TimeBlock>

              <TimeBlock time="40-45 דק'" title="סגירה ומשימת אמת — טקס הצלחה">
                <Typography variant="body2">{lesson.closure}</Typography>
              </TimeBlock>
            </Stack>
          )}

          {/* --- Tab 2: printable materials --------------------------------- */}
          {activeTab === 1 && (
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="body2" color="text.secondary">
                חבילת ההדפסה שחור-לבן (חסכונית בדיו) כוללת:
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pr: 2.5 }}>
                <li>
                  <Typography variant="body2">
                    <strong>דף עבודה לתלמיד/ה</strong> — התאמת מילה לתמונה, שורות כתיבה
                    {lesson.profile.level !== 'level_1' && ' ומסגרות משפט להשלמה'}.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>🔑 דף תשובות למורה (חסוי)</strong> — בעמוד נפרד, עם הפתרונות מודגשים.
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>כרטיס יציאה רגשי</strong> — פעמיים בעמוד עם קו גזירה ✂️ (חיסכון בנייר).
                  </Typography>
                </li>
              </Stack>
              <Button
                variant="contained"
                startIcon={<PrintRoundedIcon />}
                onClick={() => setPrintOpen(true)}
                sx={{ alignSelf: 'flex-start' }}
              >
                פתח תצוגת הדפסה 🖨️
              </Button>
            </Stack>
          )}

          {/* --- Tab 3: real-world mission ---------------------------------- */}
          {activeTab === 2 && (
            <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 }, alignItems: 'center' }}>
              <Paper
                variant="outlined"
                sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 560, width: '100%', border: `2px dashed ${AMBER}` }}
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

        {playerOpen && <LessonPlayer lesson={lesson} onExit={() => setPlayerOpen(false)} />}
        <PrintDocDialog
          docs={[buildUlpanWorksheetDoc(lesson), buildUlpanExitTicketDoc(lesson)]}
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          title={`🖨️ חומרי הלימוד — ${lesson.chapter.title}`}
        />

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
            מחולל האולפן הדינמי ונגן השיעורים
          </Typography>
          <Typography variant="body2" color="text.secondary">
            מפת דרכים בת 10 פרקים ללימוד עברית כשפה שנייה — בחרו פרק, כווננו פרופיל תלמיד, וקבלו מערך שלם + נגן שיעורים ללוח החכם.
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
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
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

      {/* The 10-chapter roadmap, grouped by phase — a vertical timeline */}
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
              כווננו את פרופיל התלמיד — והמחולל יתפור מערך שיעור, נגן ללוח וחומרי הדפסה בדיוק למידותיו.
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
              onChange={(e) => setProfile((p) => ({ ...p, nativeLanguage: e.target.value as NativeLangKey }))}
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
              🪄 גנרט שיעור והדפס חומרים
            </Button>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
