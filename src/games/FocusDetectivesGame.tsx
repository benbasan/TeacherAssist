import { useEffect, useRef, useState } from 'react';
import { useMarkGamePlayed } from '../context/ClassroomContext';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Button,
  Typography,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SelfImprovementRoundedIcon from '@mui/icons-material/SelfImprovementRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', '#10b981', '#ffca28', '#ef5350'],
  });
}

// Soft card backgrounds; the "color change" alteration swaps one to a different shade.
const CARD_COLORS = [
  '#e8eaf6',
  '#e0f2f1',
  '#fff3e0',
  '#fce4ec',
  '#e3f2fd',
  '#f3e5f5',
  '#e8f5e9',
  '#fff8e1',
  '#ede7f6',
];

interface GridItem {
  emoji: string;
  color: string;
}

interface Round {
  theme: string;
  emojis: string[]; // 9 items shown in the grid
  pool: string[]; // alternates used for an "emoji change"
}

const ROUNDS: Round[] = [
  {
    theme: 'אימוג׳ים',
    emojis: ['😀', '🐶', '🌟', '🍎', '🚀', '🎈', '🐱', '🌈', '⚽'],
    pool: ['🦄', '🍕', '🐢', '🎸', '🦋', '🍩', '🐸', '🎁', '🌙'],
  },
  {
    theme: 'צורות הנדסיות',
    emojis: ['🔺', '🔵', '🟩', '🟥', '⬛', '🔶', '⭐', '🔷', '🟪'],
    pool: ['🔻', '🟠', '🟦', '🟨', '⚪', '🟫', '✴️', '🔘', '🟢'],
  },
  {
    theme: 'כלי בית ספר',
    emojis: ['✏️', '📕', '📐', '✂️', '📌', '🖍️', '📎', '📒', '🖊️'],
    pool: ['📏', '📗', '🧮', '🖌️', '📍', '🖇️', '📓', '🗒️', '🔖'],
  },
];

interface RoundGrid {
  base: GridItem[];
  altered: GridItem[];
  alteredIndex: number;
}

/** Builds a round's grid and a single-cell alteration (emoji OR color). */
function buildRound(roundIndex: number): RoundGrid {
  const round = ROUNDS[roundIndex];
  const base: GridItem[] = round.emojis.map((emoji, i) => ({
    emoji,
    color: CARD_COLORS[i % CARD_COLORS.length],
  }));
  const altered = base.map((it) => ({ ...it }));

  const idx = randInt(0, base.length - 1);
  const mode = pick<'emoji' | 'color'>(['emoji', 'color']);

  if (mode === 'emoji') {
    let next = pick(round.pool);
    while (next === base[idx].emoji) next = pick(round.pool);
    altered[idx] = { ...altered[idx], emoji: next };
  } else {
    let next = pick(CARD_COLORS);
    while (next === base[idx].color) next = pick(CARD_COLORS);
    altered[idx] = { ...altered[idx], color: next };
  }

  return { base, altered, alteredIndex: idx };
}

type Phase = 'INTRO' | 'PLAYING' | 'SUMMARY';

// ---------------------------------------------------------------------------
// Root phase machine
// ---------------------------------------------------------------------------

export default function FocusDetectivesGame({ gameId }: { gameId?: string }) {
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [score, setScore] = useState(0);
  useMarkGamePlayed(gameId, phase === 'SUMMARY');

  const finishGame = (finalScore: number) => {
    setScore(finalScore);
    setPhase('SUMMARY');
  };

  const restart = () => {
    setScore(0);
    setPhase('INTRO');
  };

  if (phase === 'INTRO') return <IntroScreen onStart={() => setPhase('PLAYING')} />;
  if (phase === 'SUMMARY') return <SummaryScreen score={score} onRestart={restart} />;
  return <PlayingScreen onFinish={finishGame} />;
}

// ---------------------------------------------------------------------------
// INTRO — rules + optional 15s silence countdown
// ---------------------------------------------------------------------------

const SILENCE_SECONDS = 15;

function IntroScreen({ onStart }: { onStart: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const beginCountdown = () => {
    setCountdown(SILENCE_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return c;
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onStart();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  if (countdown !== null) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
          מתכוננים… שקט בכיתה 🤫
        </Typography>
        <Box
          sx={{
            mx: 'auto',
            width: 200,
            height: 200,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 6,
          }}
        >
          <Typography sx={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>
            {countdown}
          </Typography>
        </Box>
        <Button onClick={onStart} sx={{ mt: 4 }} size="large" variant="text" color="secondary">
          דלגו והתחילו עכשיו
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderRadius: '16px',
          background: 'linear-gradient(160deg, #ffffff 0%, #eef0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1 }}>
            🕵️
          </Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            בלשי הקשב: אתגר ה-3 דקות
          </Typography>

          <Stack spacing={1.5} sx={{ textAlign: 'start', width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              איך משחקים?
            </Typography>
            <Typography variant="body1" sx={{ fontSize: 18 }}>
              1. מתבוננים יחד בלוח הכרטיסים בשקט מוחלט וזוכרים אותו.
            </Typography>
            <Typography variant="body1" sx={{ fontSize: 18 }}>
              2. הלוח נעלם לרגע… ומופיע שוב — אבל כרטיס אחד השתנה!
            </Typography>
            <Typography variant="body1" sx={{ fontSize: 18 }}>
              3. מצביעים יחד, והמורה לוחצ/ת על הכרטיס שהשתנה. שלושה סיבובים — וסיום מרגיע.
            </Typography>
          </Stack>

          <Button
            onClick={beginCountdown}
            size="large"
            variant="contained"
            color="primary"
            startIcon={<PlayArrowRoundedIcon />}
            sx={{ py: 2, px: 5, fontSize: 22, fontWeight: 800 }}
          >
            מתחילים!
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// PLAYING — 3 rounds, each: memorize → blink → recall → feedback
// ---------------------------------------------------------------------------

type Step = 'MEMORIZE' | 'BLINK' | 'RECALL' | 'FEEDBACK';

const MEMORIZE_MS = 5000;
const BLINK_MS = 1000;

function PlayingScreen({ onFinish }: { onFinish: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [step, setStep] = useState<Step>('MEMORIZE');
  const [grid, setGrid] = useState<RoundGrid>(() => buildRound(0));
  const [clicked, setClicked] = useState<number | null>(null);
  const [progress, setProgress] = useState(100);
  const [score, setScore] = useState(0);

  // Drive the timed steps; cleans up on every step/round change and on unmount.
  useEffect(() => {
    if (step === 'MEMORIZE') {
      setProgress(100);
      let pct = 100;
      const tick = setInterval(() => {
        pct = Math.max(0, pct - 2);
        setProgress(pct);
      }, MEMORIZE_MS / 50);
      const advance = setTimeout(() => setStep('BLINK'), MEMORIZE_MS);
      return () => {
        clearInterval(tick);
        clearTimeout(advance);
      };
    }
    if (step === 'BLINK') {
      const advance = setTimeout(() => setStep('RECALL'), BLINK_MS);
      return () => clearTimeout(advance);
    }
  }, [step, round]);

  const handleCardClick = (i: number) => {
    if (step !== 'RECALL') return;
    setClicked(i);
    if (i === grid.alteredIndex) setScore((s) => s + 1);
    setStep('FEEDBACK');
  };

  const handleNext = () => {
    if (round < ROUNDS.length - 1) {
      const nextRound = round + 1;
      setRound(nextRound);
      setGrid(buildRound(nextRound));
      setClicked(null);
      setStep('MEMORIZE');
    } else {
      onFinish(score);
    }
  };

  const showingAltered = step === 'RECALL' || step === 'FEEDBACK';
  const items = showingAltered ? grid.altered : grid.base;
  const correct = clicked === grid.alteredIndex;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Chip
          label={`סיבוב ${round + 1} מתוך ${ROUNDS.length} · ${ROUNDS[round].theme}`}
          color="primary"
        />
        <Chip label={`ניקוד: ${score}`} color="secondary" variant="outlined" />
      </Stack>

      {/* Caption + memorize progress bar */}
      <Box sx={{ minHeight: 64, mb: 2 }}>
        {step === 'MEMORIZE' && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
              התבוננו בשקט וזכרו 👀
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              color="error"
              sx={{ height: 14, borderRadius: '16px' }}
            />
          </>
        )}
        {step === 'RECALL' && (
          <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center' }} color="primary.dark">
            מה השתנה? לחצו על הכרטיס! 🔍
          </Typography>
        )}
        {step === 'FEEDBACK' && (
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, textAlign: 'center' }}
            color={correct ? 'success.main' : 'error.main'}
          >
            {correct ? 'יישר כוח! בלשים אמיתיים! 🎯' : 'כמעט! זה הכרטיס שהשתנה 👇'}
          </Typography>
        )}
      </Box>

      {step === 'BLINK' ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            height: 360,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
            gap: 2,
          }}
        >
          <VisibilityRoundedIcon sx={{ fontSize: 64 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            👁️ המערכת ממצמצת…
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {items.map((item, i) => {
            const isAltered = i === grid.alteredIndex;
            const isWrongPick = step === 'FEEDBACK' && clicked === i && !isAltered;
            let outline = '4px solid transparent';
            if (step === 'FEEDBACK' && isAltered) outline = '4px solid #10b981';
            else if (isWrongPick) outline = '4px solid #ef5350';

            return (
              <Paper
                key={i}
                elevation={3}
                onClick={() => handleCardClick(i)}
                sx={{
                  borderRadius: '16px',
                  bgcolor: item.color,
                  border: outline,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: '1 / 1',
                  py: 3,
                  fontSize: { xs: 44, sm: 64 },
                  cursor: step === 'RECALL' ? 'pointer' : 'default',
                  userSelect: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <span role="img" aria-label="card">
                  {item.emoji}
                </span>
              </Paper>
            );
          })}
        </Box>
      )}

      {step === 'FEEDBACK' && (
        <Stack direction="row" sx={{ justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleNext}
            sx={{ py: 1.8, px: 5, fontSize: 20, fontWeight: 800 }}
          >
            {round < ROUNDS.length - 1 ? 'לסיבוב הבא' : 'לסיכום 🎉'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// SUMMARY — celebration + 30s guided breathing cool-down
// ---------------------------------------------------------------------------

const BREATHING_SECONDS = 30;

function SummaryScreen({ score, onRestart }: { score: number; onRestart: () => void }) {
  const [inhale, setInhale] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(BREATHING_SECONDS);

  useEffect(() => {
    celebrate();
  }, []);

  useEffect(() => {
    // Toggle inhale/exhale text every 4s (matches the 8s breathe cycle).
    const breath = setInterval(() => setInhale((v) => !v), 4000);
    const countdown = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => {
      clearInterval(breath);
      clearInterval(countdown);
    };
  }, []);

  const message =
    score === 3
      ? 'ריכוז מושלם! הכיתה הזו ערנית, רגועה וממוקדת לגמרי.'
      : score === 2
        ? 'ריכוז מצוין! עוד נשימה עמוקה — ואנחנו מוכנים לשיעור.'
        : 'כל הכבוד על המאמץ! העיקר שהתרכזנו והרגענו יחד.';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderRadius: '16px',
          background: 'linear-gradient(160deg, #ffffff 0%, #e8f5e9 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 64, color: '#10b981' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f9d58' }}>
            המשימה הושלמה!
          </Typography>
          <Chip
            label={`פיצחתם ${score} מתוך ${ROUNDS.length} סיבובים`}
            color="success"
            sx={{ fontWeight: 700 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
            {message}
          </Typography>

          {/* Breathing cool-down */}
          <Box sx={{ pt: 2 }}>
            <Stack spacing={0.5} sx={{ alignItems: 'center', mb: 2 }}>
              <SelfImprovementRoundedIcon color="secondary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                רגע של נשימה משותפת
              </Typography>
            </Stack>

            <Box
              sx={{
                position: 'relative',
                width: 220,
                height: 220,
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #80cbc4 0%, #26a69a 70%)',
                  '@keyframes breathe': {
                    '0%, 100%': { transform: 'scale(0.65)', opacity: 0.7 },
                    '50%': { transform: 'scale(1)', opacity: 1 },
                  },
                  animation: 'breathe 8s ease-in-out infinite',
                }}
              />
              <Typography sx={{ position: 'relative', fontSize: 26, fontWeight: 800, color: '#fff' }}>
                {inhale ? 'שואפים…' : 'נושפים…'}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {secondsLeft > 0 ? `נושמים יחד עוד ${secondsLeft} שניות…` : 'מוכנים ורגועים לשיעור 🌿'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={onRestart}
            sx={{ py: 1.6, px: 4, fontSize: 18, fontWeight: 800 }}
          >
            סיימנו, מתחילים שיעור
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
