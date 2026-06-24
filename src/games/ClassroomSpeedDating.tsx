import { useEffect, useState } from 'react';
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
  Zoom,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import EmojiPeopleRoundedIcon from '@mui/icons-material/EmojiPeopleRounded';
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INDIGO = '#3f51b5';
const TEAL = '#26a69a';
const EMERALD = '#10b981';

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: [INDIGO, TEAL, EMERALD, '#ffca28', '#ab47bc'],
  });
}

/** Fisher–Yates shuffle (returns a new array; never mutates the source). */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Asset-free "round-over" chime via the Web Audio API. Lazily created on first
 * use (needs a user gesture) and wrapped in try/catch so it never breaks play.
 */
function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99]; // C5 – E5 – G5, a gentle major triad
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.55);
    });
    setTimeout(() => void ctx.close(), 900);
  } catch {
    /* audio is a nice-to-have; ignore any failure */
  }
}

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

type PackKey = 'icebreakers' | 'deep_chat' | 'school_life' | 'mature_reflection';

interface ConversationPack {
  key: PackKey;
  label: string;
  blurb: string;
  emoji: string;
  color: string;
  prompts: string[];
}

const PACKS: Record<PackKey, ConversationPack> = {
  icebreakers: {
    key: 'icebreakers',
    label: 'שוברי קרח ומצחיקים',
    blurb: 'שאלות קלילות ומשעשעות לפתיחת שיחה בחיוך.',
    emoji: '😄',
    color: '#3f51b5',
    prompts: [
      'מהו כוח העל שהייתם הכי רוצים שיהיה לכם?',
      'אם הייתם צריכים לאכול רק מאכל אחד במשך שנה שלמה, מה זה היה?',
      'מה הדבר הכי מצחיק או מוזר שקרה לכם השבוע?',
      'איזה סרט או סדרה אתם יכולים לראות מיליון פעם בלי שימאס?',
      "מה מפחיד אתכם יותר: ג'וקים מעופפים או מבחן פתע בחשבון?",
    ],
  },
  deep_chat: {
    key: 'deep_chat',
    label: 'שיח עמוק וערכים',
    blurb: 'שאלות שמזמינות חשיבה, ערכים ושיתוף אישי.',
    emoji: '💭',
    color: '#26a69a',
    prompts: [
      'מה התכונה שאתם הכי מעריכים בחבר הכי טוב שלכם?',
      'מתי היה הפעם האחרונה שהרגשתם ממש גאים בעצמכם?',
      'אם הייתם יכולים לשנות חוק אחד במדינה או בעולם, מה הוא היה?',
      'מה הופך יום רגיל ליום ממש טוב ומאושר בשבילכם?',
      'איזו עצה טובה הייתם נותנים לעצמכם של לפני שנתיים?',
    ],
  },
  school_life: {
    key: 'school_life',
    label: 'חיים בבית הספר ובכיתה',
    blurb: 'שאלות על השגרה, הכיתה והחוויה הבית-ספרית.',
    emoji: '🏫',
    color: '#ab47bc',
    prompts: [
      'מהו המקום האהוב עליכם ביותר בחצר בית הספר בזמן ההפסקה?',
      'איך הייתם משפרים את הכיתה שלנו כדי שיהיה יותר כיף להגיע אליה?',
      'מה המקצוע שאתם מרגישים בו הכי חזקים, ואיזה הכי מאתגר אתכם?',
      'אם הייתם המנהלים של בית הספר ליום אחד, מה הדבר הראשון שהייתם עושים?',
      'מה הכלל הכי חשוב שחייב להיות בקבוצת הווטסאפ הכיתתית?',
    ],
  },
  mature_reflection: {
    key: 'mature_reflection',
    label: 'שיח בוגר ופילוסופי',
    blurb: 'שאלות עומק לחטיבה ולתיכון — זהות, ערכים וחברה.',
    emoji: '🧠',
    color: '#5c6bc0',
    prompts: [
      'מה הייתם רוצים שחברים שלכם יזכרו לגביכם אחרי שתסיימו את בית הספר?',
      'עד כמה הרשתות החברתיות משפיעות על האופן שבו אתם תופסים את עצמכם באמת?',
      'האם לחץ חברתי הוא תמיד דבר שלילי, או שהוא יכול לפעמים לדחוף אותנו למקומות חיוביים?',
      'אם הייתם יכולים לדעת את האמת המוחלטת לגבי שאלה אחת בעולם, מה הייתם שואלים?',
      'מהו הערך שהוא הכי "קו אדום" מבחינתכם — כזה שלא תסכימו שחבר יפגע בו (למשל: נאמנות, כנות, חופש)?',
      'אם הייתם יכולים לחזור לגיל 10 למשך שעה אחת, איזו עצה הייתם נותנים לעצמכם הילדים?',
    ],
  },
};

const WRAPUP_QUESTIONS = [
  'עם מי גיליתם שיש לכם יותר במשותף ממה שחשבתם?',
  'איזו שאלה הכי גרמה לכם לעצור ולחשוב?',
  'מה היה מאתגר יותר עבורכם — לדבר, או דווקא להקשיב?',
];

const TOTAL_ROUNDS = 6;
const DURATIONS = [30, 45, 60] as const;
type Duration = (typeof DURATIONS)[number];

type Stage = 'setup' | 'active' | 'wrapup';
type Phase = 'running' | 'rotating';

// ---------------------------------------------------------------------------
// Root state machine: Setup → Active (×6) → Wrap-up
// ---------------------------------------------------------------------------

export default function ClassroomSpeedDating({ gameId }: { gameId?: string }) {
  const { activeClassroom, activeClassroomId, markGameAsPlayedInClass } = useClassrooms();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('setup');
  const [pack, setPack] = useState<ConversationPack | null>(null);
  const [duration, setDuration] = useState<Duration>(45);
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [phase, setPhase] = useState<Phase>('running');
  const [order, setOrder] = useState<string[]>([]);

  const start = (chosen: ConversationPack) => {
    setPack(chosen);
    setOrder(shuffle(chosen.prompts));
    setRound(1);
    setSecondsLeft(duration);
    setPhase('running');
    setStage('active');
  };

  const nextRound = () => {
    if (round < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
      setSecondsLeft(duration);
      setPhase('running');
    } else {
      setStage('wrapup');
    }
  };

  const finish = () => {
    if (activeClassroomId && gameId) {
      void markGameAsPlayedInClass(activeClassroomId, gameId);
    }
    navigate('/');
  };

  // Countdown for the running phase. One interval per (round) while running;
  // freezes by flipping to the 'rotating' phase when the clock reaches 0.
  useEffect(() => {
    if (stage !== 'active' || phase !== 'running') return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setPhase('rotating');
          playChime();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage, phase, round]);

  if (stage === 'setup' || !pack) {
    return (
      <SetupScreen
        activeClassName={activeClassroom?.name ?? null}
        duration={duration}
        onDurationChange={setDuration}
        onStart={start}
      />
    );
  }

  if (stage === 'wrapup') {
    return <WrapUpScreen onFinish={finish} />;
  }

  // Wrap prompts if a pack has fewer than TOTAL_ROUNDS entries.
  const prompt = order[(round - 1) % order.length];

  return (
    <ActiveScreen
      pack={pack}
      prompt={prompt}
      round={round}
      duration={duration}
      secondsLeft={secondsLeft}
      phase={phase}
      onNextRound={nextRound}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Setup
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  duration,
  onDurationChange,
  onStart,
}: {
  activeClassName: string | null;
  duration: Duration;
  onDurationChange: (d: Duration) => void;
  onStart: (pack: ConversationPack) => void;
}) {
  const [selected, setSelected] = useState<PackKey | null>(null);

  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          💬🪑
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          ספיד דייט כיתתי
        </Typography>
        {activeClassName ? (
          <Chip
            icon={<EmojiPeopleRoundedIcon />}
            label={`משחקים עם כיתה: ${activeClassName}`}
            sx={{ bgcolor: EMERALD, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
        ) : (
          <Typography variant="body1" color="text.secondary">
            שלום מורה! 👋 בחרו חבילת שיחה והזמן לכל סיבוב — ובואו נשבור את הקרח בכיתה.
          </Typography>
        )}
      </Stack>

      {/* Chair-arrangement instruction */}
      <Alert
        icon={<EventSeatRoundedIcon fontSize="inherit" />}
        severity="info"
        sx={{ mb: 4, borderRadius: 4, fontSize: 17, alignItems: 'center' }}
      >
        <AlertTitle sx={{ fontWeight: 800 }}>סידור הכיתה</AlertTitle>
        הנחו את התלמידים לסדר את הכיסאות בשני טורים ארוכים, פנים מול פנים (שורה א' מול שורה ב').
      </Alert>

      {/* Pack selection */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        בחרו חבילת שיחה:
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          mb: 4,
        }}
      >
        {(Object.keys(PACKS) as PackKey[]).map((key) => {
          const p = PACKS[key];
          const isSel = selected === key;
          return (
            <Card
              key={p.key}
              elevation={isSel ? 8 : 3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${p.color}`,
                outline: isSel ? `3px solid ${p.color}` : 'none',
              }}
            >
              <CardActionArea
                onClick={() => setSelected(key)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 1 }}>{p.emoji}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {p.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.blurb}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {/* Round duration */}
      <Stack spacing={2} sx={{ alignItems: 'center', mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          זמן לכל סיבוב:
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={duration}
          onChange={(_, val) => val && onDurationChange(val as Duration)}
          color="primary"
        >
          {DURATIONS.map((d) => (
            <ToggleButton key={d} value={d} sx={{ px: 4, py: 1.5, fontSize: 18, fontWeight: 700 }}>
              {`${d} שניות`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          disabled={!selected}
          onClick={() => selected && onStart(PACKS[selected])}
          sx={{ px: 6, py: 1.75, fontSize: 22, fontWeight: 800 }}
        >
          מתחילים! ⏱️
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — Active dating floor
// ---------------------------------------------------------------------------

function ActiveScreen({
  pack,
  prompt,
  round,
  duration,
  secondsLeft,
  phase,
  onNextRound,
}: {
  pack: ConversationPack;
  prompt: string;
  round: number;
  duration: Duration;
  secondsLeft: number;
  phase: Phase;
  onNextRound: () => void;
}) {
  const progress = (secondsLeft / duration) * 100;
  const isLast = round === TOTAL_ROUNDS;

  if (phase === 'rotating') {
    return (
      <Fade in timeout={400}>
        <Box
          sx={{
            borderRadius: 4,
            p: { xs: 3, sm: 6 },
            textAlign: 'center',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            background: `linear-gradient(160deg, ${TEAL} 0%, #00897b 100%)`,
            color: '#fff',
          }}
        >
          <Zoom in timeout={500}>
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 900 }}>
                🛑 הזמן נגמר!
              </Typography>
              <EastRoundedIcon
                sx={{
                  fontSize: 96,
                  animation: 'sdNudge 1s ease-in-out infinite',
                  '@keyframes sdNudge': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(18px)' },
                  },
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.4 }}>
                שורה ב' - זוזו כיסא אחד ימינה!
              </Typography>
            </Stack>
          </Zoom>

          <Button
            variant="contained"
            size="large"
            onClick={onNextRound}
            sx={{
              mt: 2,
              px: 5,
              py: 1.75,
              fontSize: 20,
              fontWeight: 800,
              bgcolor: '#fff',
              color: TEAL,
              '&:hover': { bgcolor: '#f1f1f1' },
            }}
          >
            {isLast ? 'סיימנו! לסיכום 🏆' : 'כולם התיישבו? התחל סיבוב הבא ⏱️'}
          </Button>
        </Box>
      </Fade>
    );
  }

  return (
    <Box>
      {/* Countdown */}
      <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={150}
            thickness={5}
            sx={{ color: INDIGO }}
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
              flexDirection: 'column',
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: 900, color: 'primary.dark', lineHeight: 1 }}>
              {secondsLeft}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              שניות
            </Typography>
          </Box>
        </Box>
      </Stack>

      {/* Prompt */}
      <Card
        elevation={4}
        sx={{
          p: { xs: 3, sm: 6 },
          mb: 3,
          minHeight: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderTop: `6px solid ${pack.color}`,
          background: 'linear-gradient(160deg, #ffffff 0%, #f3f1fb 100%)',
        }}
      >
        <Typography sx={{ fontSize: { xs: 28, sm: 42 }, fontWeight: 800, lineHeight: 1.45 }}>
          {prompt}
        </Typography>
      </Card>

      {/* Round progress */}
      <Alert
        severity="info"
        icon={false}
        sx={{
          borderRadius: 4,
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 800,
          bgcolor: 'primary.light',
          color: '#fff',
          '& .MuiAlert-message': { textAlign: 'center', width: '100%' },
        }}
      >
        {`סיבוב ${round} מתוך ${TOTAL_ROUNDS}`}
      </Alert>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Wrap-up & feedback
// ---------------------------------------------------------------------------

function WrapUpScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    celebrate();
  }, []);

  return (
    <Fade in timeout={600}>
      <Box>
        <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1 }}>
            🏆
          </Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            אלופי ההקשבה והשיח!
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.6, maxWidth: 600 }}>
            דיברתם, הקשבתם וגיליתם דברים חדשים אחד על השני. ככה נבנית כיתה מגובשת ומקשיבה — כל הכבוד!
          </Typography>
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          נסכם יחד בשיחה קצרה:
        </Typography>
        <Stack spacing={2} sx={{ mb: 4 }}>
          {WRAPUP_QUESTIONS.map((q, i) => (
            <Paper
              key={q}
              elevation={2}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderInlineStart: '6px solid',
                borderColor: 'secondary.main',
                background: 'linear-gradient(160deg, #ffffff 0%, #f3f6fb 100%)',
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Chip
                  label={i + 1}
                  sx={{ bgcolor: 'secondary.main', color: '#fff', fontWeight: 800, fontSize: 18 }}
                />
                <Typography variant="body1" sx={{ fontSize: 19, fontWeight: 600, lineHeight: 1.5 }}>
                  {q}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onFinish}
            sx={{ px: 5, py: 1.5, fontSize: 20, fontWeight: 700 }}
          >
            סיום פעילות
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
}
