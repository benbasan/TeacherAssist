import { useEffect, useRef, useState } from 'react';
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
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

// ---------------------------------------------------------------------------
// Helpers & riddle generation
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function celebrate(big = false): void {
  confetti({
    particleCount: big ? 200 : 70,
    spread: big ? 90 : 55,
    startVelocity: big ? 50 : 35,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', '#ffca28', '#ef5350', '#ab47bc'],
  });
}

/** A riddle whose answer is always a single digit (0–9) → one vault code digit. */
interface Riddle {
  text: string;
  answer: number;
}

type Difficulty = 'easy' | 'medium' | 'hard';

type Gen = () => Riddle;

const EASY_GENS: Gen[] = [
  () => {
    const a = randInt(1, 8);
    const b = randInt(1, 9 - a);
    return { text: `כמה זה ${a} + ${b}?`, answer: a + b };
  },
  () => {
    const a = randInt(2, 9);
    const b = randInt(1, a);
    return { text: `כמה זה ${a} − ${b}?`, answer: a - b };
  },
  () => {
    const e = pick([2, 4, 6, 8]);
    return { text: `מהו המספר הזוגי שנמצא בין ${e - 1} ל-${e + 1}?`, answer: e };
  },
];

const MEDIUM_GENS: Gen[] = [
  () => {
    const d = randInt(2, 9);
    const v = randInt(2, 9);
    return { text: `כמה זה ${d * v} ÷ ${v}?`, answer: d };
  },
  () => {
    const a = randInt(1, 3);
    const b = randInt(1, Math.floor(9 / a));
    return { text: `כמה זה ${a} × ${b}?`, answer: a * b };
  },
  () => {
    const d = randInt(2, 5);
    const g = randInt(2, 4);
    return {
      text: `${d * g} עפרונות חולקו שווה בשווה ל-${g} תלמידים. כמה קיבל כל אחד?`,
      answer: d,
    };
  },
];

const HARD_GENS: Gen[] = [
  () => {
    const k = randInt(2, 5);
    const d = randInt(1, 6);
    return { text: `כמה זה 1/${k} מתוך ${d * k}?`, answer: d };
  },
  () => {
    const variants = [
      { p: 50, base: (d: number) => 2 * d },
      { p: 10, base: (d: number) => 10 * d },
      { p: 25, base: (d: number) => 4 * d },
      { p: 100, base: (d: number) => d },
    ];
    const v = pick(variants);
    const d = randInt(1, 9);
    return { text: `כמה זה ${v.p}% מתוך ${v.base(d)}?`, answer: d };
  },
  () => {
    const b = randInt(1, 2);
    const c = randInt(2, 3);
    const a = randInt(0, 9 - b * c);
    return { text: `כמה זה ${a} + ${b} × ${c}? (שימו לב לסדר הפעולות)`, answer: a + b * c };
  },
  () => {
    const a = randInt(2, 3);
    const b = randInt(2, 3);
    const c = randInt(0, a * b);
    return { text: `כמה זה ${a} × ${b} − ${c}? (שימו לב לסדר הפעולות)`, answer: a * b - c };
  },
];

const DIFFICULTIES: {
  key: Difficulty;
  label: string;
  grades: string;
  topics: string;
  color: string;
  gens: Gen[];
}[] = [
  {
    key: 'easy',
    label: 'קל',
    grades: 'כיתות א׳–ב׳',
    topics: 'חיבור וחיסור עד 20, זוגי ואי-זוגי',
    color: '#66bb6a',
    gens: EASY_GENS,
  },
  {
    key: 'medium',
    label: 'בינוני',
    grades: 'כיתות ג׳–ד׳',
    topics: 'לוח הכפל, חילוק ובעיות מילוליות',
    color: '#ffa726',
    gens: MEDIUM_GENS,
  },
  {
    key: 'hard',
    label: 'קשה',
    grades: 'כיתות ה׳–ו׳',
    topics: 'שברים, אחוזים וסדר פעולות חשבון',
    color: '#ef5350',
    gens: HARD_GENS,
  },
];

const CODE_LENGTH = 4;

function generateRiddles(gens: Gen[]): Riddle[] {
  return Array.from({ length: CODE_LENGTH }, () => pick(gens)());
}

type Stage = 'difficulty' | 'game' | 'unlocked';

// ---------------------------------------------------------------------------
// Root state machine
// ---------------------------------------------------------------------------

export default function MathCodebreaker() {
  const [stage, setStage] = useState<Stage>('difficulty');
  const [riddles, setRiddles] = useState<Riddle[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, []);

  const startGame = (gens: Gen[]) => {
    setRiddles(generateRiddles(gens));
    setRevealed([]);
    setError(false);
    setStage('game');
  };

  const currentIndex = revealed.length;

  const handleKey = (digit: number) => {
    if (stage !== 'game') return;
    const expected = riddles[currentIndex].answer;
    if (digit === expected) {
      const next = [...revealed, digit];
      setRevealed(next);
      if (next.length === CODE_LENGTH) {
        setStage('unlocked');
        celebrate(true);
      } else {
        celebrate(false);
      }
    } else {
      setError(true);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setError(false), 400);
    }
  };

  const backToDifficulty = () => {
    setStage('difficulty');
    setRevealed([]);
  };

  if (stage === 'difficulty') {
    return <DifficultyScreen onSelect={startGame} />;
  }

  if (stage === 'unlocked') {
    return <UnlockedScreen code={revealed} onReplay={backToDifficulty} />;
  }

  return (
    <GameScreen
      riddle={riddles[currentIndex]}
      revealed={revealed}
      error={error}
      onKey={handleKey}
      onBack={backToDifficulty}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Difficulty selection
// ---------------------------------------------------------------------------

function DifficultyScreen({ onSelect }: { onSelect: (gens: Gen[]) => void }) {
  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          🔐
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          פיצוח הקוד המתמטי
        </Typography>
        <Typography variant="body1" color="text.secondary">
          בחרו רמת קושי המתאימה לכיתה — ופתחו יחד את הכספת!
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {DIFFICULTIES.map((d) => (
          <Card
            key={d.key}
            elevation={3}
            sx={{
              height: '100%',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              borderTop: `6px solid ${d.color}`,
            }}
          >
            <CardActionArea
              onClick={() => onSelect(d.gens)}
              sx={{ height: '100%', alignItems: 'stretch' }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, color: d.color }}>
                  {d.label}
                </Typography>
                <Chip label={d.grades} size="small" sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  {d.topics}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — The vault game
// ---------------------------------------------------------------------------

function VaultDisplay({ revealed }: { revealed: number[] }) {
  return (
    <Paper
      elevation={4}
      sx={{
        p: { xs: 2, sm: 3 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        background: 'linear-gradient(160deg, #303f9f 0%, #1a237e 100%)',
        color: '#fff',
      }}
    >
      <LockRoundedIcon sx={{ fontSize: 40, opacity: 0.85 }} />
      <Typography variant="h6" sx={{ fontWeight: 700, opacity: 0.9 }}>
        קוד הכספת
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const solved = i < revealed.length;
          return (
            <Box
              key={i}
              sx={{
                width: 56,
                height: 72,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 800,
                bgcolor: solved ? '#ffca28' : 'rgba(255,255,255,0.12)',
                color: solved ? '#1a237e' : 'rgba(255,255,255,0.5)',
                border: '2px solid',
                borderColor: solved ? '#ffca28' : 'rgba(255,255,255,0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              {solved ? revealed[i] : '?'}
            </Box>
          );
        })}
      </Stack>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        {`נחשפו ${revealed.length} מתוך ${CODE_LENGTH} ספרות`}
      </Typography>
    </Paper>
  );
}

function GameScreen({
  riddle,
  revealed,
  error,
  onKey,
  onBack,
}: {
  riddle: Riddle;
  revealed: number[];
  error: boolean;
  onKey: (digit: number) => void;
  onBack: () => void;
}) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          פצחו את הקוד 🔢
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<ArrowForwardRoundedIcon />}
          onClick={onBack}
        >
          החלפת רמת קושי
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'stretch',
        }}
      >
        <VaultDisplay revealed={revealed} />

        <Card
          elevation={4}
          sx={{
            p: { xs: 2, sm: 3 },
            border: '2px solid',
            borderColor: error ? 'error.main' : 'transparent',
            '@keyframes shake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '20%, 60%': { transform: 'translateX(-8px)' },
              '40%, 80%': { transform: 'translateX(8px)' },
            },
            animation: error ? 'shake 0.4s ease' : 'none',
          }}
        >
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <Paper
              variant="outlined"
              sx={{
                px: 3,
                py: 3,
                width: '100%',
                textAlign: 'center',
                bgcolor: error ? 'error.light' : 'secondary.light',
                borderColor: error ? 'error.main' : 'secondary.main',
                transition: 'background-color 0.2s ease',
              }}
            >
              <Typography variant="overline" color="text.secondary">
                {`חידה ${revealed.length + 1} מתוך ${CODE_LENGTH}`}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                {riddle.text}
              </Typography>
              {error && (
                <Typography variant="body2" color="error.dark" sx={{ mt: 1, fontWeight: 600 }}>
                  לא מדויק… נסו שוב! 💪
                </Typography>
              )}
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: 'repeat(3, 1fr)',
                width: '100%',
                maxWidth: 320,
              }}
            >
              {keys.map((n) => (
                <Button
                  key={n}
                  variant="contained"
                  color="primary"
                  onClick={() => onKey(n)}
                  sx={{ py: 2, fontSize: 24, fontWeight: 800 }}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="contained"
                color="primary"
                onClick={() => onKey(0)}
                sx={{ py: 2, fontSize: 24, fontWeight: 800, gridColumn: '1 / -1' }}
              >
                0
              </Button>
            </Box>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Vault unlocked
// ---------------------------------------------------------------------------

function UnlockedScreen({ code, onReplay }: { code: number[]; onReplay: () => void }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 620,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #e8f5e9 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <LockOpenRoundedIcon sx={{ fontSize: 72, color: 'success.main' }} />
          <Typography variant="h3" color="success.dark" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
            הכספת נפתחה בהצלחה!
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            כל הכבוד למתמטיקאים הצעירים! 🎉
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
            {code.map((d, i) => (
              <Box
                key={i}
                sx={{
                  width: 56,
                  height: 72,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  fontWeight: 800,
                  bgcolor: '#ffca28',
                  color: '#1a237e',
                }}
              >
                {d}
              </Box>
            ))}
          </Stack>

          <Button variant="contained" size="large" startIcon={<ReplayRoundedIcon />} onClick={onReplay}>
            משחק חדש
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
