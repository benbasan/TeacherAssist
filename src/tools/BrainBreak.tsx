import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Card,
  CardActionArea,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { SvgIconComponent } from '@mui/icons-material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
// Exercise icons (resolved from the content JSON `icon` string via ICON_MAP).
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import FrontHandRoundedIcon from '@mui/icons-material/FrontHandRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import EmojiPeopleRoundedIcon from '@mui/icons-material/EmojiPeopleRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import SportsKabaddiRoundedIcon from '@mui/icons-material/SportsKabaddiRounded';
import CycloneRoundedIcon from '@mui/icons-material/CycloneRounded';
import SportsGymnasticsRoundedIcon from '@mui/icons-material/SportsGymnasticsRounded';
import AccessibilityNewRoundedIcon from '@mui/icons-material/AccessibilityNewRounded';
import SportsHandballRoundedIcon from '@mui/icons-material/SportsHandballRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import SportsMartialArtsRoundedIcon from '@mui/icons-material/SportsMartialArtsRounded';
import DirectionsRunRoundedIcon from '@mui/icons-material/DirectionsRunRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import WavesRoundedIcon from '@mui/icons-material/WavesRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import SelfImprovementRoundedIcon from '@mui/icons-material/SelfImprovementRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import HearingRoundedIcon from '@mui/icons-material/HearingRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import NightlightRoundedIcon from '@mui/icons-material/NightlightRounded';
import confetti from 'canvas-confetti';
import rawContent from '../data/content/brain-break-content.json';

// ---------------------------------------------------------------------------
// Content contract — a flat pool of exercises keyed by energy CATEGORY (not age
// cohort): this tool is chosen by the class's current state, not by grade. See
// ARCHITECTURE.md §9/§11.
// ---------------------------------------------------------------------------
type BrainBreakCategory = 'energize' | 'calm';

interface BrainBreakExercise {
  id: string;
  title: string;
  category: BrainBreakCategory;
  duration: number;
  instructions: string[];
  icon: string;
}

const EXERCISES = rawContent as BrainBreakExercise[];

/** Exercise icon-name string → component (the §11 in-component resolver pattern). */
const ICON_MAP: Record<string, SvgIconComponent> = {
  sync_alt: SyncAltRoundedIcon,
  front_hand: FrontHandRoundedIcon,
  local_fire_department: LocalFireDepartmentRoundedIcon,
  emoji_people: EmojiPeopleRoundedIcon,
  music_note: MusicNoteRoundedIcon,
  fitness_center: FitnessCenterRoundedIcon,
  sports_kabaddi: SportsKabaddiRoundedIcon,
  cyclone: CycloneRoundedIcon,
  sports_gymnastics: SportsGymnasticsRoundedIcon,
  accessibility_new: AccessibilityNewRoundedIcon,
  sports_handball: SportsHandballRoundedIcon,
  psychology: PsychologyRoundedIcon,
  sports_martial_arts: SportsMartialArtsRoundedIcon,
  directions_run: DirectionsRunRoundedIcon,
  celebration: CelebrationRoundedIcon,
  bolt: BoltRoundedIcon,
  waves: WavesRoundedIcon,
  air: AirRoundedIcon,
  visibility: VisibilityRoundedIcon,
  spa: SpaRoundedIcon,
  self_improvement: SelfImprovementRoundedIcon,
  touch_app: TouchAppRoundedIcon,
  hearing: HearingRoundedIcon,
  favorite: FavoriteRoundedIcon,
  nightlight: NightlightRoundedIcon,
};

function exerciseIcon(name: string): SvgIconComponent {
  return ICON_MAP[name] ?? BuildRoundedIcon;
}

/** Per-category palette — amber for energize, lavender/purple for calm. */
const CATEGORY_THEME: Record<BrainBreakCategory, { main: string; soft: string; label: string; emoji: string }> = {
  energize: { main: '#f57c00', soft: '#fff3e0', label: 'מעלים אנרגיה!', emoji: '⚡' },
  calm: { main: '#7e57c2', soft: '#ede7f6', label: 'מרגיעים ומאפסים!', emoji: '🧘' },
};

// ---------------------------------------------------------------------------
// Asset-free Web-Audio SFX (mirrors ComplimentTimeBomb / SilentNinja). Lazily
// created on the teacher's first gesture; every call is best-effort.
// ---------------------------------------------------------------------------
class Sfx {
  private ctx: AudioContext | null = null;

  resume(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      void this.ctx?.resume();
    } catch {
      /* audio is optional */
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
    try {
      const ctx = this.ctx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(vol);
      vol.connect(ctx.destination);
      const now = ctx.currentTime + delay;
      vol.gain.setValueAtTime(gain, now);
      vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      /* ignore */
    }
  }

  /** Soft per-second cue. */
  tick(): void {
    this.tone(320, 0.05, 'sine', 0.05);
  }

  /** Gentle major-triad chime on completion. */
  chime(): void {
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.18, i * 0.12));
  }
}

function celebrate(): void {
  confetti({
    particleCount: 160,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: ['#f57c00', '#7e57c2', '#26a69a', '#10b981', '#ffca28'],
  });
}

type Stage = 'setup' | 'roulette' | 'active' | 'finish';

/**
 * מחולל הפגות תנועה וקשב — the 2-Minute Brain Break Generator (Classroom Utility
 * #5). An emergency "context-reset" for the class: pick ⚡ energize or 🧘 calm, a
 * 2s roulette lands on a random 60–90s exercise, then a radial countdown with
 * pause/resume runs it. `onClose` (set only in the Playlist Player modal) swaps
 * navigation for a "back to lesson" action so the running game is never reset.
 */
export default function BrainBreak({ onClose }: { toolId?: string; onClose?: () => void }) {
  const [stage, setStage] = useState<Stage>('setup');
  const [category, setCategory] = useState<BrainBreakCategory>('energize');
  const [flicker, setFlicker] = useState<BrainBreakExercise | null>(null);
  const [exercise, setExercise] = useState<BrainBreakExercise | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(true);

  const sfxRef = useRef<Sfx>(new Sfx());
  const rouletteTimers = useRef<{ flick: number | null; stop: number | null }>({ flick: null, stop: null });

  const pool = useMemo(() => EXERCISES.filter((e) => e.category === category), [category]);
  const theme = CATEGORY_THEME[category];

  const clearRouletteTimers = useCallback(() => {
    if (rouletteTimers.current.flick !== null) window.clearInterval(rouletteTimers.current.flick);
    if (rouletteTimers.current.stop !== null) window.clearTimeout(rouletteTimers.current.stop);
    rouletteTimers.current = { flick: null, stop: null };
  }, []);

  // Roulette: flicker random faces ~2s, then lock a final random pick.
  useEffect(() => {
    if (stage !== 'roulette' || pool.length === 0) return;
    const flick = window.setInterval(() => {
      setFlicker(pool[Math.floor(Math.random() * pool.length)]);
    }, 80);
    const stop = window.setTimeout(() => {
      window.clearInterval(flick);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      setExercise(chosen);
      setSecondsLeft(chosen.duration);
      setRunning(true);
      setStage('active');
    }, 2000);
    rouletteTimers.current = { flick, stop };
    return () => {
      window.clearInterval(flick);
      window.clearTimeout(stop);
    };
  }, [stage, pool]);

  // Countdown — gated by `running` so pause/resume just flips the flag.
  useEffect(() => {
    if (stage !== 'active' || !running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setStage('finish');
          return 0;
        }
        sfxRef.current.tick();
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage, running]);

  // Celebrate on finish.
  useEffect(() => {
    if (stage === 'finish') {
      sfxRef.current.chime();
      celebrate();
    }
  }, [stage]);

  // Clean up any stray timers on unmount.
  useEffect(() => () => clearRouletteTimers(), [clearRouletteTimers]);

  const startCategory = (cat: BrainBreakCategory) => {
    sfxRef.current.resume();
    setCategory(cat);
    setFlicker(null);
    setStage('roulette');
  };

  const reset = () => {
    clearRouletteTimers();
    setExercise(null);
    setStage('setup');
  };

  // Optional "abort" affordance shown only in modal mode (over a running game).
  const closeBar = onClose ? (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
      <Button onClick={onClose} startIcon={<CloseRoundedIcon />} color="inherit" sx={{ fontWeight: 700 }}>
        סגירה וחזרה לשיעור
      </Button>
    </Box>
  ) : null;

  // ---- Setup: two giant category cards -----------------------------------
  if (stage === 'setup') {
    return (
      <Box>
        {closeBar}
        <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>
          איך מרגישה הכיתה כרגע?
        </Typography>
        <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          בוחרים כיוון — ומקבלים תרגיל הפגה קצר של 60–90 שניות.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          {(['energize', 'calm'] as BrainBreakCategory[]).map((cat) => {
            const t = CATEGORY_THEME[cat];
            const title =
              cat === 'energize'
                ? '⚡ מעלים אנרגיה!'
                : '🧘 מרגיעים ומאפסים!';
            const sub =
              cat === 'energize'
                ? 'לכיתה עייפה ורדומה'
                : 'לכיתה רועשת וסוערת';
            return (
              <Card
                key={cat}
                elevation={4}
                sx={{
                  borderRadius: 5,
                  border: `3px solid ${t.main}`,
                  bgcolor: t.soft,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
                }}
              >
                <CardActionArea onClick={() => startCategory(cat)} sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: { xs: 56, sm: 76 }, lineHeight: 1 }}>
                    {t.emoji}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: t.main, mt: 1, fontSize: { xs: 26, sm: 34 } }}>
                    {title}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.secondary', mt: 0.5 }}>
                    {sub}
                  </Typography>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Box>
    );
  }

  // ---- Roulette: flickering anticipation ---------------------------------
  if (stage === 'roulette') {
    const FlickIcon = flicker ? exerciseIcon(flicker.icon) : BuildRoundedIcon;
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', py: { xs: 4, sm: 6 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: theme.main }}>
          {theme.emoji} בוחרים הפגה…
        </Typography>
        <Card
          elevation={6}
          sx={{
            width: '100%',
            maxWidth: 460,
            borderRadius: 5,
            border: `3px solid ${theme.main}`,
            bgcolor: theme.soft,
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
            transition: 'opacity 0.05s linear',
          }}
        >
          <FlickIcon sx={{ fontSize: 72, color: theme.main }} />
          <Typography variant="h4" sx={{ fontWeight: 900, mt: 1, fontSize: { xs: 24, sm: 32 } }}>
            {flicker?.title ?? '…'}
          </Typography>
        </Card>
      </Stack>
    );
  }

  // ---- Finish: chime + confetti + focus prompt ---------------------------
  if (stage === 'finish') {
    return (
      <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 5 } }}>
        <Typography sx={{ fontSize: { xs: 64, sm: 88 }, lineHeight: 1 }}>🌟</Typography>
        <Typography variant="h3" sx={{ fontWeight: 900, color: theme.main, mt: 1, fontSize: { xs: 30, sm: 44 } }}>
          מצוין! מאופסים ומרוכזים.
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 500, mt: 1, mb: 4 }}>
          חוזרים ללמידה! 📚
        </Typography>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={reset}
            sx={{ fontWeight: 800 }}
          >
            עוד הפגה 🔄
          </Button>
          {onClose ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={onClose}
              sx={{ fontWeight: 800 }}
            >
              חזרה לשיעור ▶️
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to="/classroom"
              variant="contained"
              size="large"
              startIcon={<ArrowForwardRoundedIcon />}
              sx={{ fontWeight: 800 }}
            >
              חזרה לקטלוג
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  // ---- Active: radial countdown + instructions ---------------------------
  if (!exercise) return null;
  const ActiveIcon = exerciseIcon(exercise.icon);
  const progress = (secondsLeft / exercise.duration) * 100;

  return (
    <Box sx={{ '@keyframes bbTick': { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } } }}>
      {closeBar}
      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <ActiveIcon sx={{ fontSize: 40, color: theme.main }} />
          <Typography variant="h3" sx={{ fontWeight: 900, textAlign: 'center', fontSize: { xs: 28, sm: 40 } }}>
            {exercise.title}
          </Typography>
        </Stack>

        {/* Radial countdown */}
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={220}
            thickness={4.5}
            sx={{ color: theme.main }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              key={secondsLeft}
              sx={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: theme.main, animation: running ? 'bbTick 0.4s ease' : 'none' }}
            >
              {secondsLeft}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
              שניות
            </Typography>
          </Box>
        </Box>

        {/* Instructions as large scannable bullets */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 620,
            bgcolor: theme.soft,
            borderRadius: 4,
            p: { xs: 2, sm: 3 },
          }}
        >
          <Stack spacing={1.5}>
            {exercise.instructions.map((step, i) => (
              <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: theme.main,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 500, fontSize: { xs: 18, sm: 22 } }}>
                  {step}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Teacher controls */}
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            color={running ? 'secondary' : 'primary'}
            startIcon={running ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
            onClick={() => setRunning((r) => !r)}
            sx={{ fontWeight: 800, px: 4 }}
          >
            {running ? 'השהיה' : 'המשך'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SkipNextRoundedIcon />}
            onClick={() => setStage('finish')}
            sx={{ fontWeight: 800 }}
          >
            דלג / סיים
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
