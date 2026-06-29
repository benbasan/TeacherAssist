import { useEffect, useRef, useState } from 'react';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import contentData from '../data/content/english-word-pop-content.json';

// ---------------------------------------------------------------------------
// Game constants & helpers
// ---------------------------------------------------------------------------

const GAME_SECONDS = 90;
const START_LIVES = 3;
const TICK_MS = 50; // float animation tick
const SPAWN_MIN_MS = 2000;
const SPAWN_MAX_MS = 3000;

/** Vibrant palette for the floating bubbles (hex8 → translucent fill). */
const BUBBLE_COLORS = ['#5c6bc0', '#26a69a', '#ef5350', '#ab47bc', '#42a5f5', '#ff9800', '#ec407a', '#66bb6a'];

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

// ---------------------------------------------------------------------------
// Word dictionary (English → Hebrew) — lives in external JSON (see CLAUDE.md →
// Game Content & Architecture Rules), keyed by age cohort then by category.
// ---------------------------------------------------------------------------

type Category = string;

interface Word {
  en: string;
  he: string;
}

interface CatData {
  en: string;
  he: string;
  emoji: string;
  words: Word[];
}

type AgeGroupKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

interface CohortCategories {
  label: string;
  categories: Record<Category, CatData>;
}

const CONTENT = contentData as unknown as Record<AgeGroupKey, CohortCategories>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
  { key: 'junior_high_high', label: CONTENT.junior_high_high.label },
];

// ---------------------------------------------------------------------------
// Bubble model
// ---------------------------------------------------------------------------

type BubbleStatus = 'floating' | 'popped' | 'rock';

interface Bubble {
  id: string;
  text: string; // English word
  he: string; // Hebrew translation
  x: number; // horizontal position, 5–90 (%)
  speed: number; // vertical progress added per tick
  progress: number; // 0 (bottom) → 100 (top), as bottom %
  isCorrect: boolean; // belongs to the target category
  color: string;
  status: BubbleStatus;
}

type Stage = 'setup' | 'playing' | 'over';

// ---------------------------------------------------------------------------
// Root: setup → playing → over state machine
// ---------------------------------------------------------------------------

export default function WordPop({ gameId }: { gameId?: string }) {
  const { activeClassroomId } = useClassrooms();

  const [stage, setStage] = useState<Stage>('setup');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('lower_elementary');
  const [category, setCategory] = useState<Category | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  // Ref mirror of `bubbles` so the animation tick reads fresh state without
  // re-subscribing the interval on every frame.
  const bubblesRef = useRef<Bubble[]>([]);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Record the play in the active class's history the moment the game ends.
  useMarkGamePlayed(gameId, stage === 'over');

  /** Single writer for bubbles: keeps the ref and the state in sync. */
  const writeBubbles = (updater: (prev: Bubble[]) => Bubble[]) => {
    bubblesRef.current = updater(bubblesRef.current);
    setBubbles(bubblesRef.current);
  };

  const setBubbleStatus = (id: string, status: BubbleStatus) =>
    writeBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));

  const removeBubble = (id: string) =>
    writeBubbles((prev) => prev.filter((b) => b.id !== id));

  // --- Game lifecycle -------------------------------------------------------

  const startGame = (cat: Category) => {
    setCategory(cat);
    setScore(0);
    setLives(START_LIVES);
    setTimeLeft(GAME_SECONDS);
    setFlash(null);
    writeBubbles(() => []);
    setStage('playing');
  };

  const restart = () => {
    setStage('setup');
    setCategory(null);
    writeBubbles(() => []);
  };

  // Drive the three loops (float tick, countdown, spawner) while playing.
  useEffect(() => {
    if (stage !== 'playing' || !category) return;

    const spawnBubble = () => {
      const cats = CONTENT[ageGroup].categories;
      const keys = Object.keys(cats);
      const useCorrect = Math.random() < 0.5;
      let word: Word;
      if (useCorrect) {
        word = pick(cats[category].words);
      } else {
        const otherCat = pick(keys.filter((c) => c !== category));
        word = pick(cats[otherCat].words);
      }
      writeBubbles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: word.en,
          he: word.he,
          x: 5 + Math.random() * 85,
          speed: 0.45 + Math.random() * 0.4,
          progress: 0,
          isCorrect: useCorrect,
          color: pick(BUBBLE_COLORS),
          status: 'floating',
        },
      ]);
    };

    const tick = () => {
      let missed = 0;
      writeBubbles((prev) => {
        const next: Bubble[] = [];
        for (const b of prev) {
          if (b.status !== 'floating') {
            next.push(b); // popped/rock bubbles are removed by their own timers
            continue;
          }
          const progress = b.progress + b.speed;
          if (progress >= 100) {
            if (b.isCorrect) missed += 1; // a target word escaped → missed chance
            continue; // remove: it reached the top
          }
          next.push({ ...b, progress });
        }
        return next;
      });
      if (missed > 0) setLives((l) => Math.max(0, l - missed));
    };

    const scheduleSpawn = () => {
      const delay = SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
      spawnTimeoutRef.current = setTimeout(() => {
        spawnBubble();
        scheduleSpawn();
      }, delay);
    };

    const tickId = setInterval(tick, TICK_MS);
    const countId = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    spawnBubble();
    scheduleSpawn();

    return () => {
      clearInterval(tickId);
      clearInterval(countId);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    };
  }, [stage, category, ageGroup]);

  // End the game when time or lives run out.
  useEffect(() => {
    if (stage === 'playing' && (lives <= 0 || timeLeft <= 0)) {
      setStage('over');
    }
  }, [stage, lives, timeLeft]);

  // Celebrate on the game-over screen.
  useEffect(() => {
    if (stage === 'over') celebrate();
  }, [stage]);

  // Clear any pending flash timeout on unmount.
  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  // --- Interaction ----------------------------------------------------------

  const popBubble = (b: Bubble) => {
    if (b.status !== 'floating') return;
    if (b.isCorrect) {
      setScore((s) => s + 100);
      setFlash(`${b.text} → ${b.he}!`);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlash(null), 1100);
      setBubbleStatus(b.id, 'popped');
      setTimeout(() => removeBubble(b.id), 450);
    } else {
      setLives((l) => Math.max(0, l - 1));
      setBubbleStatus(b.id, 'rock');
      setTimeout(() => removeBubble(b.id), 800);
    }
  };

  // --- Render ---------------------------------------------------------------

  if (stage === 'setup') {
    return (
      <SetupScreen
        hasActiveClass={Boolean(activeClassroomId)}
        categories={CONTENT[ageGroup].categories}
        ageGroup={ageGroup}
        onAgeGroupChange={setAgeGroup}
        onPick={startGame}
      />
    );
  }

  if (stage === 'over') {
    return (
      <OverScreen
        score={score}
        category={category ? CONTENT[ageGroup].categories[category] : null}
        onRestart={restart}
      />
    );
  }

  // stage === 'playing'
  const targetName = category ? CONTENT[ageGroup].categories[category].en : '';
  return (
    <Box>
      {/* Top bar */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Chip icon={<TimerRoundedIcon />} color="primary" label={`${timeLeft} שנ׳`} sx={{ fontWeight: 800, fontSize: 16 }} />
        <Chip icon={<StarRoundedIcon />} color="secondary" label={`${score}`} sx={{ fontWeight: 800, fontSize: 16 }} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {Array.from({ length: START_LIVES }).map((_, i) =>
            i < lives ? (
              <FavoriteIcon key={i} sx={{ color: '#ef5350' }} />
            ) : (
              <FavoriteBorderIcon key={i} sx={{ color: '#ef9a9a' }} />
            ),
          )}
        </Stack>
      </Stack>

      <Typography
        variant="h5"
        sx={{ textAlign: 'center', fontWeight: 800, mb: 1.5, color: 'primary.dark' }}
      >
        🎯 TARGET:{' '}
        <Box component="span" dir="ltr">
          {targetName}
        </Box>
      </Typography>

      {/* Canvas */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          height: '60vh',
          borderRadius: 4,
          background: 'linear-gradient(180deg, #e3f2fd 0%, #ede7f6 100%)',
          border: '2px solid',
          borderColor: 'primary.light',
        }}
      >
        {flash && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5,
              px: 3,
              py: 1,
              borderRadius: 8,
              bgcolor: 'success.main',
              color: '#fff',
              fontWeight: 800,
              fontSize: 22,
              boxShadow: 4,
            }}
            dir="ltr"
          >
            {flash}
          </Box>
        )}

        {bubbles.map((b) => (
          <Box
            key={b.id}
            onClick={() => popBubble(b)}
            sx={{
              position: 'absolute',
              left: `${b.x}%`,
              bottom: `${b.progress}%`,
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'bottom 0.05s linear, transform 0.45s ease, opacity 0.45s ease, background-color 0.3s ease',
              ...(b.status === 'floating' && {
                transform: 'translate(-50%, 50%)',
                borderRadius: '50%',
                backgroundColor: `${b.color}cc`,
                border: '3px solid rgba(255,255,255,0.7)',
                boxShadow: `0 6px 16px ${b.color}66, inset 0 6px 12px rgba(255,255,255,0.45)`,
              }),
              ...(b.status === 'popped' && {
                transform: 'translate(-50%, 50%) scale(1.8)',
                borderRadius: '50%',
                backgroundColor: `${b.color}00`,
                opacity: 0,
              }),
              ...(b.status === 'rock' && {
                transform: 'translate(-50%, 260%)',
                borderRadius: '38% 62% 55% 45% / 55% 48% 52% 45%',
                backgroundColor: '#9e9e9e',
                opacity: 0,
              }),
            }}
          >
            <Typography dir="ltr" sx={{ fontWeight: 800, color: '#fff', fontSize: 18 }}>
              {b.text}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Setup
// ---------------------------------------------------------------------------

function SetupScreen({
  hasActiveClass,
  categories,
  ageGroup,
  onAgeGroupChange,
  onPick,
}: {
  hasActiveClass: boolean;
  categories: Record<Category, CatData>;
  ageGroup: AgeGroupKey;
  onAgeGroupChange: (g: AgeGroupKey) => void;
  onPick: (cat: Category) => void;
}) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800, textAlign: 'center' }}>
        בחרו קטגוריה והתחילו לפצח בועות! 🫧
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
        בועות עם מילים באנגלית יצופו על המסך — פוצצו רק את המילים ששייכות לקטגוריה שבחרתם,
        לפני שייגמרו הזמן או הלבבות!
      </Typography>

      <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          לאיזו שכבת גיל מתאימות המילים?
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={ageGroup}
          onChange={(_, v) => v && onAgeGroupChange(v as AgeGroupKey)}
          color="secondary"
          sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {AGE_GROUPS.map((g) => (
            <ToggleButton key={g.key} value={g.key} sx={{ px: 2.5, py: 1, fontWeight: 700 }}>
              {g.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {!hasActiveClass && (
        <Alert severity="info" sx={{ width: '100%' }}>
          התחברו ובחרו כיתה כדי שהתוצאה תישמר בהיסטוריית הכיתה.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          width: '100%',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        {Object.keys(categories).map((key) => {
          const cat = categories[key];
          return (
            <Card
              key={key}
              elevation={3}
              sx={{
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
              }}
            >
              <CardActionArea onClick={() => onPick(key)} sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ fontSize: 56, lineHeight: 1, mb: 1 }}>{cat.emoji}</Typography>
                  <Typography variant="h5" dir="ltr" sx={{ fontWeight: 800 }}>
                    {cat.en}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {cat.he}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Game over / summary
// ---------------------------------------------------------------------------

function OverScreen({
  score,
  category,
  onRestart,
}: {
  score: number;
  category: CatData | null;
  onRestart: () => void;
}) {
  const message =
    score >= 1000
      ? 'אלופי האנגלית! 🏆'
      : score >= 500
        ? 'כל הכבוד, איזו שליטה! 🌟'
        : 'כיף לתרגל — נסו שוב ותשתפרו! 💪';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 560,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1 }}>
            🎉
          </Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            סיימתם את הסיבוב!
          </Typography>
          <Chip
            icon={<StarRoundedIcon />}
            color="secondary"
            label={`ניקוד סופי: ${score}`}
            sx={{ fontWeight: 800, fontSize: 20, py: 2.5, px: 1 }}
          />
          {category && (
            <Typography variant="body1" color="text.secondary">
              קטגוריה:{' '}
              <Box component="span" dir="ltr">
                {category.en}
              </Box>{' '}
              ({category.he})
            </Typography>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {message}
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={onRestart}
          >
            משחק נוסף
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
