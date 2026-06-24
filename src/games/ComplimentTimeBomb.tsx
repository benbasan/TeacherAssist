import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const EMERALD = '#10b981';
const TIMER_OPTIONS = [60, 90, 120] as const;
const GOAL_OPTIONS = [15, 20, 30] as const;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function celebrate(): void {
  confetti({
    particleCount: 220,
    spread: 100,
    startVelocity: 55,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', EMERALD, '#ffca28', '#ef5350', '#ab47bc'],
  });
}

/**
 * Tiny Web-Audio sound helper — no asset files. Lazily creates a single
 * AudioContext (after the user's "start" gesture) and plays short tones.
 * Everything is wrapped in try/catch so audio is purely "juice": if the
 * browser blocks it, the game keeps working.
 */
class Sfx {
  private ctx: AudioContext | null = null;

  resume(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      void this.ctx?.resume();
    } catch {
      /* ignore — audio is optional */
    }
  }

  private beep(freq: number, duration: number, type: OscillatorType, gain: number): void {
    try {
      const ctx = this.ctx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      vol.gain.value = gain;
      osc.connect(vol);
      vol.connect(ctx.destination);
      const now = ctx.currentTime;
      vol.gain.setValueAtTime(gain, now);
      vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      /* ignore */
    }
  }

  ding(): void {
    this.beep(880, 0.18, 'sine', 0.25);
    this.beep(1320, 0.16, 'sine', 0.15);
  }

  tick(urgent: boolean): void {
    this.beep(urgent ? 440 : 320, 0.05, 'square', urgent ? 0.12 : 0.06);
  }
}

type Stage = 'setup' | 'playing' | 'win' | 'lose';

// ---------------------------------------------------------------------------
// Root state machine
// ---------------------------------------------------------------------------

export default function ComplimentTimeBomb({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  // Active-class roster, minus students marked absent this session.
  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const sfxRef = useRef<Sfx>(new Sfx());

  const [stage, setStage] = useState<Stage>('setup');
  const [players, setPlayers] = useState<string[]>([]);
  const [timer, setTimer] = useState<number>(90);
  const [goal, setGoal] = useState<number>(20);

  // Records the play in the active class's history exactly once, on victory.
  useMarkGamePlayed(gameId, stage === 'win');

  const start = (names: string[], seconds: number, target: number) => {
    sfxRef.current.resume();
    setPlayers(names);
    setTimer(seconds);
    setGoal(target);
    setStage('playing');
  };

  switch (stage) {
    case 'setup':
      return (
        <SetupScreen
          activeClassName={activeClassroom?.name ?? null}
          presentRoster={presentRoster}
          onStart={start}
        />
      );
    case 'playing':
      return (
        <PlayScreen
          players={players}
          totalSeconds={timer}
          goal={goal}
          sfx={sfxRef.current}
          onWin={() => setStage('win')}
          onLose={() => setStage('lose')}
        />
      );
    case 'win':
      return <WinScreen onReplay={() => setStage('setup')} />;
    case 'lose':
      return <LoseScreen onRetry={() => setStage('setup')} />;
  }
}

// ---------------------------------------------------------------------------
// Setup screen — HYBRID NAMES flow + timer/goal selection
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  presentRoster,
  onStart,
}: {
  activeClassName: string | null;
  presentRoster: string[];
  onStart: (names: string[], seconds: number, goal: number) => void;
}) {
  const hasClass = activeClassName !== null;

  // Scenario A — guest students added on the fly for this round.
  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');

  // Scenario B — free-text roster when no class is active.
  const [raw, setRaw] = useState('');

  const [seconds, setSeconds] = useState<number>(90);
  const [goal, setGoal] = useState<number>(20);

  const addGuest = () => {
    const name = guestDraft.trim();
    if (name && !guests.includes(name) && !presentRoster.includes(name)) {
      setGuests((g) => [...g, name]);
    }
    setGuestDraft('');
  };

  const players = hasClass ? [...presentRoster, ...guests] : parseNames(raw);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>💣</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            הפצצה המתקתקת של הפרגונים
          </Typography>
          <Typography variant="body1" color="text.secondary">
            הפצצה מתקתקת! העבירו חפץ רך בכיתה — כל תלמיד זורק מילה טובה על חבר/ה,
            והמורה לוחץ "+1 פרגון!". הגיעו ליעד לפני שהזמן אוזל והצילו את הכיתה באהבה.
          </Typography>

          {/* HYBRID NAMES */}
          {hasClass ? (
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Chip
                icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
                label={`משחקים עם כיתה ${activeClassName}`}
                sx={{
                  bgcolor: EMERALD,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  py: 2.5,
                  px: 1,
                  borderRadius: 16,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {presentRoster.length + guests.length} תלמידים נוכחים בסיבוב הזה 🎈
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ width: '100%', maxWidth: 420, justifyContent: 'center' }}
              >
                <TextField
                  size="small"
                  fullWidth
                  label="הוסף תלמיד אורח לסיבוב זה"
                  value={guestDraft}
                  onChange={(e) => setGuestDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGuest();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={addGuest}
                  startIcon={<PersonAddAlt1RoundedIcon />}
                  sx={{ flexShrink: 0 }}
                >
                  הוסף
                </Button>
              </Stack>

              {guests.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
                >
                  {guests.map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      color="secondary"
                      variant="outlined"
                      onDelete={() => setGuests((arr) => arr.filter((x) => x !== g))}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          ) : (
            <TextField
              label="הקלידו או הדביקו את שמות התלמידים (מופרדים בפסיק או שורה חדשה)"
              placeholder={'נועם\nשירה\nיואב\n...'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              multiline
              minRows={5}
              fullWidth
              helperText={
                players.length
                  ? `זוהו ${players.length} תלמידים — או פשוט התחילו בלי שמות`
                  : 'אפשר לשחק גם בלי שמות — אבל עם שמות נדע למי להעביר את החפץ 🎈'
              }
            />
          )}

          {/* TIMER */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              כמה זמן יש לפצצה?
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={seconds}
              onChange={(_, v) => v !== null && setSeconds(v)}
              color="primary"
              fullWidth
            >
              {TIMER_OPTIONS.map((t) => (
                <ToggleButton key={t} value={t} sx={{ fontWeight: 700, py: 1.2 }}>
                  {t} שניות
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* GOAL */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              יעד הפרגונים
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={goal}
              onChange={(_, v) => v !== null && setGoal(v)}
              color="secondary"
              fullWidth
            >
              {GOAL_OPTIONS.map((g) => (
                <ToggleButton key={g} value={g} sx={{ fontWeight: 700, py: 1.2 }}>
                  {g} פרגונים
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => onStart(players, seconds, goal)}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}
          >
            הפעילו את הפצצה! 💥
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Play screen — countdown bomb + compliment counter
// ---------------------------------------------------------------------------

function PlayScreen({
  players,
  totalSeconds,
  goal,
  sfx,
  onWin,
  onLose,
}: {
  players: string[];
  totalSeconds: number;
  goal: number;
  sfx: Sfx;
  onWin: () => void;
  onLose: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [count, setCount] = useState(0);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // re-triggers the counter bounce

  const urgent = timeLeft <= 10;

  // Single countdown loop — set up / torn down with the playing stage.
  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        sfx.tick(next <= 10);
        if (next <= 0) {
          window.clearInterval(id);
          onLose();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [sfx, onLose]);

  const addCompliment = () => {
    sfx.ding();
    setBump((b) => b + 1);
    if (players.length) setCurrentName(pick(players));
    setCount((c) => {
      const next = c + 1;
      if (next >= goal) onWin();
      return next;
    });
  };

  const undo = () => setCount((c) => Math.max(0, c - 1));

  const ratio = timeLeft / totalSeconds;
  const bombColor = urgent ? '#ef5350' : ratio < 0.4 ? '#ff9800' : '#3f51b5';

  return (
    <Box
      sx={{
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        ...(urgent && {
          animation: 'tbShake 0.4s linear infinite',
          '@keyframes tbShake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-6px)' },
            '75%': { transform: 'translateX(6px)' },
          },
        }),
      }}
    >
      {/* Counter */}
      <Paper
        elevation={3}
        sx={{
          px: 4,
          py: 2,
          borderRadius: 16,
          bgcolor: 'secondary.main',
          color: 'white',
          textAlign: 'center',
          minWidth: 220,
        }}
      >
        <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 700 }}>
          פרגונים שנאספו
        </Typography>
        <Typography
          key={bump}
          sx={{
            fontWeight: 900,
            fontSize: 56,
            lineHeight: 1,
            animation: 'tbPop 0.35s ease',
            '@keyframes tbPop': {
              '0%': { transform: 'scale(1)' },
              '40%': { transform: 'scale(1.4)' },
              '100%': { transform: 'scale(1)' },
            },
          }}
        >
          {count}/{goal}
        </Typography>
      </Paper>

      {/* Bomb */}
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <Typography
          sx={{
            fontSize: { xs: 120, sm: 160 },
            lineHeight: 1,
            filter: urgent ? 'drop-shadow(0 0 18px #ef5350)' : 'none',
            animation: urgent
              ? 'tbPulse 0.5s ease-in-out infinite'
              : 'tbFloat 2.4s ease-in-out infinite',
            '@keyframes tbPulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.12)' },
            },
            '@keyframes tbFloat': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' },
            },
          }}
        >
          💣
        </Typography>
        <Typography
          sx={{
            mt: 1,
            fontWeight: 900,
            fontSize: 64,
            lineHeight: 1,
            color: bombColor,
            transition: 'color 0.4s ease',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTime(timeLeft)}
        </Typography>
      </Box>

      {/* Whose turn */}
      {currentName && (
        <Chip
          label={`עכשיו תורו של: ${currentName}`}
          color="primary"
          sx={{ fontWeight: 800, fontSize: 18, py: 2.5, px: 1, borderRadius: 16 }}
        />
      )}

      {/* Controls */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <IconButton
          onClick={undo}
          color="primary"
          aria-label="ביטול פרגון אחרון"
          sx={{ border: '2px solid', borderColor: 'primary.light' }}
        >
          <RemoveRoundedIcon />
        </IconButton>
        <Button
          variant="contained"
          color="primary"
          onClick={addCompliment}
          startIcon={<FavoriteRoundedIcon />}
          sx={{
            fontWeight: 900,
            fontSize: 26,
            py: 2,
            px: 5,
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(63,81,181,0.4)',
          }}
        >
          ‎+1 פרגון!
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Win / Lose screens
// ---------------------------------------------------------------------------

function WinScreen({ onReplay }: { onReplay: () => void }) {
  useEffect(() => {
    celebrate();
    const id = window.setTimeout(celebrate, 600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 560,
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          borderRadius: 16,
          background: `linear-gradient(160deg, #ffffff 0%, #e6fbf2 100%)`,
          border: `3px solid ${EMERALD}`,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 72, lineHeight: 1 }}>🎆</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: EMERALD }}>
            הצלתם את הכיתה בעזרת אהבה!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            הגעתם ליעד הפרגונים בזמן — הפצצה הפכה לזיקוקים של מילים טובות. כל הכבוד!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={onReplay}
            sx={{ fontWeight: 800 }}
          >
            סיבוב נוסף
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function LoseScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 560,
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          borderRadius: 16,
          background: 'linear-gradient(160deg, #ffffff 0%, #fff4f0 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 72, lineHeight: 1 }}>💨</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }} color="primary.dark">
            כמעט! נסו שוב — אתם מסוגלים!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            הזמן אזל ממש לפני היעד. תנו לזה עוד הזדמנות — הפעם תזרקו פרגונים מהר יותר!
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<RocketLaunchRoundedIcon />}
            onClick={onRetry}
            sx={{ fontWeight: 800 }}
          >
            ניסיון נוסף
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
