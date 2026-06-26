import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Card,
  CardActionArea,
  CardContent,
  Button,
  Typography,
  Stack,
  Chip,
  Alert,
  AlertTitle,
  Fade,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import EmojiPeopleRoundedIcon from '@mui/icons-material/EmojiPeopleRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import ForwardToInboxRoundedIcon from '@mui/icons-material/ForwardToInboxRounded';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INDIGO = '#3f51b5';
const TEAL = '#26a69a';
const EMERALD = '#10b981';
const LAVENDER_BG = 'linear-gradient(160deg, #ede7f6 0%, #e8eaf6 100%)';

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: [INDIGO, TEAL, EMERALD, '#ffca28', '#ab47bc'],
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Render `text`, wrapping every occurrence of a fact keyword in a bold,
 * indigo-tinted span so the class can track the "key facts" visually.
 * Pure React nodes (no dangerouslySetInnerHTML). Facts are matched longest-first
 * so a fact that is a substring of another doesn't split it.
 */
function highlightFacts(text: string, facts: string[]): ReactNode[] {
  const ordered = [...facts].sort((a, b) => b.length - a.length);
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;

  while (rest.length > 0) {
    // Find the earliest-occurring fact in the remaining text.
    let bestIdx = -1;
    let bestFact = '';
    for (const f of ordered) {
      const idx = rest.indexOf(f);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestFact = f;
      }
    }
    if (bestIdx === -1) {
      nodes.push(rest);
      break;
    }
    if (bestIdx > 0) nodes.push(rest.slice(0, bestIdx));
    nodes.push(
      <Box
        key={`f-${key++}`}
        component="span"
        sx={{
          fontWeight: 900,
          color: INDIGO,
          bgcolor: 'rgba(63,81,181,0.12)',
          borderRadius: 1,
          px: 0.5,
        }}
      >
        {bestFact}
      </Box>,
    );
    rest = rest.slice(bestIdx + bestFact.length);
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

type TierKey = 'elementary' | 'pre_teen' | 'junior_high';

interface Story {
  text: string;
  /** Key facts — each MUST be a verbatim substring of `text`. */
  facts: string[];
}

interface Tier {
  key: TierKey;
  label: string;
  blurb: string;
  emoji: string;
  color: string;
  stories: Story[];
}

const TIERS: Record<TierKey, Tier> = {
  elementary: {
    key: 'elementary',
    label: 'יסודי — מילים פשוטות וצבעים',
    blurb: 'סיפורים קצרים עם פרטים מוחשיים: צבעים, מספרים וחפצים.',
    emoji: '🧸',
    color: '#26a69a',
    stories: [
      {
        text: 'נועה הלכה לגינה ביום שלישי עם כלב חום. היא מצאה כדור ירוק מתחת לספסל ופגשה חבר שנתן לה ופל שוקולד.',
        facts: ['נועה', 'יום שלישי', 'כלב חום', 'כדור ירוק', 'ופל שוקולד'],
      },
      {
        text: 'סבתא הכינה עוגה עם 5 נרות ליום ההולדת. החתול הכחול קפץ על השולחן בשעה שש בדיוק ואכל את כל הקצפת.',
        facts: ['עוגה', '5 נרות', 'החתול הכחול', 'שעה שש', 'הקצפת'],
      },
      {
        text: 'דני רכב על אופניים אדומים אל הים ביום שני. הוא בנה ארמון חול עם 3 מגדלים ומצא צדף ורוד ענק.',
        facts: ['דני', 'אופניים אדומים', 'יום שני', '3 מגדלים', 'צדף ורוד'],
      },
      {
        text: 'מאיה קנתה בלון צהוב ושתי סוכריות בקיוסק. בדרך הביתה היא ראתה ציפור כחולה על העץ ונתנה לה פירור עוגייה.',
        facts: ['מאיה', 'בלון צהוב', 'שתי סוכריות', 'ציפור כחולה', 'פירור עוגייה'],
      },
    ],
  },
  pre_teen: {
    key: 'pre_teen',
    label: "ד'-ו' — אירועים חברתיים ופרטים טכניים",
    blurb: 'הזמנות, מפגשים ופרטים שקל לבלבל: שעות, סכומים ושמות.',
    emoji: '🎒',
    color: '#5c6bc0',
    stories: [
      {
        text: 'יש מפגש כיתתי ביום שישי בגינה הציבורית ב-17:00. כל אחד מביא 10 שקלים לפיצה וחטיף אחד מלוח. מי שבא חייב להודיע לרוני עד מחר בצהריים.',
        facts: ['יום שישי', '17:00', '10 שקלים', 'פיצה', 'חטיף אחד מלוח', 'להודיע לרוני'],
      },
      {
        text: 'אומרים שעומר מצא בבית הספר ארנק עם 50 שקלים וכרטיס נסיעה. הוא מחכה ליד המזכירות כדי להחזיר אותו למורה שירה שלבשה מעיל צהוב.',
        facts: ['עומר', '50 שקלים', 'כרטיס נסיעה', 'המזכירות', 'המורה שירה', 'מעיל צהוב'],
      },
      {
        text: 'המורה לספורט הודיעה שהטיול לפארק יוצא ביום רביעי ב-08:30 מהשער האחורי. צריך להביא כובע, בקבוק מים גדול וכריך, והאוטובוס חוזר בדיוק ב-14:00.',
        facts: ['ביום רביעי', '08:30', 'מהשער האחורי', 'כובע', 'בקבוק מים גדול', '14:00'],
      },
      {
        text: 'בחנות החדשה ליד בית הספר יש מבצע: קונים שני ספרים ומקבלים מחברת בחינם. המבצע נגמר ביום חמישי, והחנות פתוחה רק עד 19:00 בערב.',
        facts: ['שני ספרים', 'מחברת בחינם', 'ביום חמישי', '19:00'],
      },
    ],
  },
  junior_high: {
    key: 'junior_high',
    label: 'חטיבה ותיכון — שמועות מורכבות ודילמות',
    blurb: 'מסרים ארוכים עם תנאים, שמות וזמנים — בדיוק כמו שמועה אמיתית.',
    emoji: '📱',
    color: '#ab47bc',
    stories: [
      {
        text: 'השמועה אומרת שביטלו את המבחן במתמטיקה ביום ראשון כי המורה איתן חולה, אבל רכזת השכבה אמרה שצריך להגיע ב-08:00 לספרייה למרתון תרגול במקום זה, ומי שלא יבוא יקבל הערת משמעת בתיק האישי.',
        facts: ['המבחן במתמטיקה', 'ביום ראשון', 'המורה איתן חולה', '08:00', 'לספרייה', 'הערת משמעת'],
      },
      {
        text: 'מסתובב סיפור שמסיבת סוף השנה הועברה מאולם הספורט לגג בית הספר ביום חמישי ב-20:00, שכל אחד צריך לשלם 30 שקלים לדיג׳יי, ושהמנהלת אישרה זאת רק בתנאי שכולם יחתמו על טופס הסכמה מההורים.',
        facts: ['מסיבת סוף השנה', 'לגג בית הספר', 'ביום חמישי', '20:00', '30 שקלים', 'טופס הסכמה'],
      },
      {
        text: 'אומרים שנבחרת הכדורסל עלתה לגמר שמתקיים בעיר אחרת ביום שלישי, שהאוטובוס יוצא מהחניה ב-15:30, שצריך להביא חולצה כחולה אחידה, ושמי שמאחר יותר מעשר דקות מאבד את מקומו בנבחרת.',
        facts: ['נבחרת הכדורסל', 'בעיר אחרת', 'ביום שלישי', '15:30', 'חולצה כחולה', 'עשר דקות'],
      },
      {
        text: 'יש שמועה שהמורה לאנגלית מחליפה את הבוחן הכתוב במצגת בזוגות שצריך להגיש עד יום ראשון הבא, שכל זוג מקבל נושא אחר בהגרלה, ושהציון נספר כמו מבחן רגיל וגם מי שנעדר חייב להשלים תוך שבוע.',
        facts: ['המורה לאנגלית', 'מצגת בזוגות', 'עד יום ראשון הבא', 'בהגרלה', 'כמו מבחן רגיל', 'תוך שבוע'],
      },
    ],
  },
};

const REPS = 3;
const HANDOFF_SECONDS = 45;

const REFLECTION_CARDS = [
  {
    emoji: '🔄',
    color: INDIGO,
    body: 'למה לדעתכם המידע השתנה בדרך? מי הוסיף פרטים ומי השמיט?',
  },
  {
    emoji: '💔',
    color: TEAL,
    body: 'איך זה מרגיש להיות זה שמספרים עליו סיפור לא מדויק בווטסאפ?',
  },
  {
    emoji: '📲',
    color: '#7e57c2',
    body: "מה האחריות שלנו לפני שאנחנו לוחצים על 'העבר' (Forward) להודעה שקיבלנו?",
  },
];

type Stage = 'setup' | 'origin' | 'chain' | 'factcheck' | 'reflection';

// ---------------------------------------------------------------------------
// Root state machine: Setup → Origin → Chain → Fact-check → Reflection
// ---------------------------------------------------------------------------

export default function RumorExpress({ gameId }: { gameId?: string }) {
  const { activeClassroom, activeClassroomId, markGameAsPlayedInClass } = useClassrooms();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('setup');
  const [tier, setTier] = useState<Tier | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [peek, setPeek] = useState(false);
  const [chainStep, setChainStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(HANDOFF_SECONDS);
  const [keptFacts, setKeptFacts] = useState<Record<string, boolean>>({});

  const startGame = (chosen: Tier) => {
    setTier(chosen);
    setStory(pickRandom(chosen.stories));
    setStage('origin');
  };

  const enterChain = () => {
    setChainStep(0);
    setSecondsLeft(HANDOFF_SECONDS);
    setPeek(false);
    setStage('chain');
  };

  const advanceChain = () => {
    if (chainStep < REPS - 2) {
      setChainStep((s) => s + 1);
      setSecondsLeft(HANDOFF_SECONDS);
      setPeek(false);
    } else if (story) {
      // Final hand-off done → seed all facts as "kept" (meter starts at 100%).
      const seed: Record<string, boolean> = {};
      story.facts.forEach((f) => (seed[f] = true));
      setKeptFacts(seed);
      setStage('factcheck');
    }
  };

  const finish = () => {
    if (activeClassroomId && gameId) {
      void markGameAsPlayedInClass(activeClassroomId, gameId);
    }
    celebrate();
    navigate('/');
  };

  // 45s pressure timer per hand-off; freezes at 0 (teacher stays in control).
  useEffect(() => {
    if (stage !== 'chain') return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage, chainStep]);

  if (stage === 'setup' || !tier || !story) {
    return <SetupScreen activeClassName={activeClassroom?.name ?? null} onStart={startGame} />;
  }

  if (stage === 'origin') {
    return <OriginScreen story={story} onNext={enterChain} />;
  }

  if (stage === 'chain') {
    return (
      <ChainScreen
        story={story}
        chainStep={chainStep}
        secondsLeft={secondsLeft}
        peek={peek}
        onTogglePeek={() => setPeek((p) => !p)}
        onAdvance={advanceChain}
      />
    );
  }

  if (stage === 'factcheck') {
    return (
      <FactCheckScreen
        story={story}
        keptFacts={keptFacts}
        onToggleFact={(f) => setKeptFacts((prev) => ({ ...prev, [f]: !prev[f] }))}
        onNext={() => setStage('reflection')}
      />
    );
  }

  return <ReflectionScreen onFinish={finish} />;
}

// ---------------------------------------------------------------------------
// Screen 1 — Setup & instructions
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  onStart,
}: {
  activeClassName: string | null;
  onStart: (tier: Tier) => void;
}) {
  const [selected, setSelected] = useState<TierKey | null>(null);

  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          🚂💬
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          ניסוי חברתי: איך סיפור קטן הופך לשמועה גדולה?
        </Typography>
        {activeClassName ? (
          <Chip
            icon={<EmojiPeopleRoundedIcon />}
            label={`משחקים עם כיתה: ${activeClassName}`}
            sx={{ bgcolor: EMERALD, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
        ) : (
          <Typography variant="body1" color="text.secondary">
            שלום מורה! 👋 בחרו רמת קושי וצאו לניסוי חברתי על שמועות ופייק ניוז.
          </Typography>
        )}
      </Stack>

      <Alert
        icon={<RecordVoiceOverRoundedIcon fontSize="inherit" />}
        severity="info"
        sx={{ mb: 4, borderRadius: 4, fontSize: 17 }}
      >
        <AlertTitle sx={{ fontWeight: 800 }}>איך מתכוננים?</AlertTitle>
        בחרו 3 נציגים שיצאו אל מחוץ לכיתה. הם יהיו "רכבת המידע" שלנו.
      </Alert>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        בחרו קטגוריה ורמת קושי:
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          mb: 4,
        }}
      >
        {(Object.keys(TIERS) as TierKey[]).map((key) => {
          const t = TIERS[key];
          const isSel = selected === key;
          return (
            <Card
              key={t.key}
              elevation={isSel ? 8 : 3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${t.color}`,
                outline: isSel ? `3px solid ${t.color}` : 'none',
              }}
            >
              <CardActionArea
                onClick={() => setSelected(key)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3.5 }}>
                  <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 1 }}>{t.emoji}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {t.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.blurb}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          disabled={!selected}
          onClick={() => selected && onStart(TIERS[selected])}
          sx={{ px: 5, py: 1.75, fontSize: 20, fontWeight: 800 }}
        >
          התחל משחק וחשוף את המקור
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — The origin story
// ---------------------------------------------------------------------------

function OriginScreen({ story, onNext }: { story: Story; onNext: () => void }) {
  return (
    <Box>
      <Stack spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Chip label="המקור 📜" sx={{ bgcolor: INDIGO, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }} />
        <Typography variant="body1" color="text.secondary">
          הקריאו את הסיפור לכיתה. שימו לב לעובדות המודגשות — אלו ה"פרטים החשובים" שצריך לעקוב אחריהם.
        </Typography>
      </Stack>

      <Card
        elevation={4}
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 4,
          minHeight: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderTop: `8px solid ${INDIGO}`,
          background: 'linear-gradient(160deg, #ffffff 0%, #f3f1fb 100%)',
        }}
      >
        <Typography sx={{ fontSize: { xs: 24, sm: 32 }, fontWeight: 600, lineHeight: 1.7 }}>
          {highlightFacts(story.text, story.facts)}
        </Typography>
      </Card>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onNext}
          sx={{ px: 5, py: 1.75, fontSize: 20, fontWeight: 800 }}
        >
          הכנס נציג 1 והקרא לו את הסיפור
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — The transmission chain
// ---------------------------------------------------------------------------

function ChainScreen({
  story,
  chainStep,
  secondsLeft,
  peek,
  onTogglePeek,
  onAdvance,
}: {
  story: Story;
  chainStep: number;
  secondsLeft: number;
  peek: boolean;
  onTogglePeek: () => void;
  onAdvance: () => void;
}) {
  const progress = (secondsLeft / HANDOFF_SECONDS) * 100;
  const isLast = chainStep >= REPS - 2;
  const fromRep = chainStep + 1;
  const toRep = chainStep + 2;

  return (
    <Box>
      {/* Timer */}
      <Stack spacing={0.5} sx={{ alignItems: 'center', mb: 3 }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={120}
            thickness={5}
            sx={{ color: secondsLeft <= 10 ? '#f43f5e' : INDIGO }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.dark' }}>
              {secondsLeft}
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">
          שניות להעברה
        </Typography>
      </Stack>

      <Card
        elevation={4}
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 3,
          textAlign: 'center',
          borderTop: `8px solid ${TEAL}`,
          background: 'linear-gradient(160deg, #ffffff 0%, #e6f7f0 100%)',
        }}
      >
        <Typography sx={{ fontSize: { xs: 28, sm: 40 }, fontWeight: 900, lineHeight: 1.4, mb: 1 }}>
          🤫 נציג {fromRep} מספר לנציג {toRep}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: TEAL }}>
          כיתה - לשמור על דממה מוחלטת!
        </Typography>
      </Card>

      {/* Teacher-only peek */}
      <Stack spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={peek ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
          onClick={onTogglePeek}
        >
          {peek ? 'הסתר את המקור' : 'הצצה למורה 👁️'}
        </Button>
        <Fade in={peek} unmountOnExit>
          <Paper
            elevation={1}
            sx={{ p: 2.5, maxWidth: 680, borderInlineStart: `5px solid ${INDIGO}`, bgcolor: '#f7f6fc' }}
          >
            <Typography sx={{ fontSize: 18, lineHeight: 1.7 }}>
              {highlightFacts(story.text, story.facts)}
            </Typography>
          </Paper>
        </Fade>
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onAdvance}
          sx={{ px: 5, py: 1.75, fontSize: 20, fontWeight: 800 }}
        >
          {isLast ? 'חשיפה סופית! 🔍' : `הנציג הבא (${toRep} → ${toRep + 1})`}
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 4 — The Fact-Checker Lab
// ---------------------------------------------------------------------------

function FactCheckScreen({
  story,
  keptFacts,
  onToggleFact,
  onNext,
}: {
  story: Story;
  keptFacts: Record<string, boolean>;
  onToggleFact: (fact: string) => void;
  onNext: () => void;
}) {
  const total = story.facts.length;
  const kept = useMemo(() => story.facts.filter((f) => keptFacts[f]).length, [story.facts, keptFacts]);
  const integrity = total === 0 ? 100 : Math.round((kept / total) * 100);
  const meterColor: 'success' | 'warning' | 'error' =
    integrity >= 70 ? 'success' : integrity >= 40 ? 'warning' : 'error';

  return (
    <Box>
      <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <Chip
          icon={<FactCheckRoundedIcon />}
          label="מעבדת חשיפת האמת"
          sx={{ bgcolor: INDIGO, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
        />
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
          שאלו את הנציג האחרון מה הוא זוכר. סמנו ✔️ עובדה ששרדה, והסירו סימון מעובדה שאבדה בדרך.
        </Typography>
      </Stack>

      {/* Integrity meter */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>מד שלמות המידע</Typography>
          <Typography sx={{ fontWeight: 900, color: `${meterColor}.main` }}>{integrity}%</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={integrity}
          color={meterColor}
          sx={{ height: 16, borderRadius: 16 }}
        />
      </Paper>

      {/* Split layout */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          mb: 4,
        }}
      >
        {/* Left — original story */}
        <Paper elevation={2} sx={{ p: 3, borderTop: `6px solid ${INDIGO}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            📜 הסיפור המקורי
          </Typography>
          <Typography sx={{ fontSize: 18, lineHeight: 1.8 }}>
            {highlightFacts(story.text, story.facts)}
          </Typography>
        </Paper>

        {/* Right — fact checkboxes */}
        <Paper elevation={2} sx={{ p: 3, borderTop: `6px solid ${TEAL}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
            ✅ הפרטים החשובים — מה שרד?
          </Typography>
          <Stack spacing={0.5}>
            {story.facts.map((f) => (
              <FormControlLabel
                key={f}
                control={
                  <Checkbox
                    checked={Boolean(keptFacts[f])}
                    onChange={() => onToggleFact(f)}
                    sx={{ '&.Mui-checked': { color: EMERALD } }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 600,
                      textDecoration: keptFacts[f] ? 'none' : 'line-through',
                      color: keptFacts[f] ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {f}
                  </Typography>
                }
              />
            ))}
          </Stack>
        </Paper>
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onNext}
          sx={{ px: 5, py: 1.75, fontSize: 20, fontWeight: 800 }}
        >
          סיים ניתוח ועבור למוסר השכל
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 5 — Pedagogical reflection
// ---------------------------------------------------------------------------

function ReflectionScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <Fade in timeout={700}>
      <Box sx={{ borderRadius: 4, p: { xs: 2, sm: 3 }, background: LAVENDER_BG }}>
        <Stack spacing={1.5} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 52, lineHeight: 1 }}>
            🧠💜
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#4527a0' }}>
            איך שמועה נולדת?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
            ראינו איך סיפור קטן השתנה בדרך. עכשיו נעצור לרגע ונדבר על מה זה אומר עלינו ועל הרשת.
          </Typography>
        </Stack>

        <Stack spacing={2.5} sx={{ mb: 4 }}>
          {REFLECTION_CARDS.map((c, i) => (
            <Paper
              key={i}
              elevation={2}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderInlineStart: `6px solid ${c.color}`,
                background: 'rgba(255,255,255,0.85)',
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 36, lineHeight: 1 }}>{c.emoji}</Typography>
                <Typography variant="body1" sx={{ fontSize: 19, fontWeight: 500, lineHeight: 1.6 }}>
                  {c.body}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<ForwardToInboxRoundedIcon />}
            onClick={onFinish}
            sx={{ px: 5, py: 1.5, fontSize: 20, fontWeight: 700, bgcolor: '#5e35b1', '&:hover': { bgcolor: '#4527a0' } }}
          >
            סיום פעילות
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
}
