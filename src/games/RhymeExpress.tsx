import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  TextField,
  IconButton,
  Fade,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import confetti from 'canvas-confetti';
import contentData from '../data/content/rhyme-express-content.json';

// ── Content ────────────────────────────────────────────────────────────────
// Rhyme rounds live in external JSON (see CLAUDE.md → Game Content & Architecture
// Rules), keyed by age cohort (rhyming is a beginning-literacy skill, so only the
// two elementary cohorts apply). Each play draws ROUNDS_PER_GAME random rounds.

type RoundData = { target: string; correct: string[]; wrong: string[] };

type AgeGroupKey = 'lower_elementary' | 'upper_elementary';

interface CohortRounds {
  label: string;
  rounds: RoundData[];
}

const CONTENT = contentData as Record<AgeGroupKey, CohortRounds>;

const AGE_GROUPS: { key: AgeGroupKey; label: string; desc: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label, desc: 'חרוזים פשוטים: ון, ה, ים' },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label, desc: 'חרוזים מורכבים: ר, ור, ון' },
];

const ROUNDS_PER_GAME = 3;

const TILE_COLORS = ['#fce4ec', '#e8eaf6', '#e8f5e9', '#fff8e1', '#f3e5f5', '#e0f7fa'];
const TILE_BORDERS = ['#e91e63', '#3f51b5', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];

// ── Helpers ────────────────────────────────────────────────────────────────

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function celebrate() {
  confetti({ particleCount: 140, spread: 85, origin: { y: 0.5 } });
}

// ── SFX ───────────────────────────────────────────────────────────────────

class Sfx {
  private ctx: AudioContext | null = null;
  private get(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      return this.ctx;
    } catch {
      return null;
    }
  }
  private tone(freq: number, vol: number, dur: number, type: OscillatorType = 'sine', delay = 0) {
    const c = this.get();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  }
  load() {
    this.tone(659.25, 0.2, 0.15, 'sine', 0);
    this.tone(783.99, 0.22, 0.2, 'sine', 0.1);
  }
  fail() {
    this.tone(280, 0.2, 0.12, 'sawtooth', 0);
    this.tone(180, 0.18, 0.22, 'sawtooth', 0.1);
  }
  depart() {
    // Train whistle: two short + one long
    this.tone(660, 0.22, 0.14, 'triangle', 0);
    this.tone(660, 0.22, 0.14, 'triangle', 0.22);
    this.tone(880, 0.25, 0.35, 'triangle', 0.44);
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.2, 0.38, 'sine', i * 0.1));
  }
}

const sfx = new Sfx();

// ── Component ──────────────────────────────────────────────────────────────

type Stage = 'setup' | 'playing' | 'victory';
type TileState = { text: string; correct: boolean; loaded: boolean; failed: boolean };

export default function RhymeExpress({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const [stage, setStage] = useState<Stage>('setup');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('lower_elementary');
  const [gameRounds, setGameRounds] = useState<RoundData[]>([]);
  const [round, setRound] = useState(0);
  const [platform, setPlatform] = useState<TileState[]>([]);
  const [loadedWords, setLoadedWords] = useState<(string | null)[]>([null, null, null]);
  const [failingTile, setFailingTile] = useState<number | null>(null);
  const [trainDeparting, setTrainDeparting] = useState(false);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  function initRound(r: RoundData) {
    setPlatform(
      shuffleArr([
        ...r.correct.map((text) => ({ text, correct: true, loaded: false, failed: false })),
        ...r.wrong.map((text) => ({ text, correct: false, loaded: false, failed: false })),
      ])
    );
    setLoadedWords([null, null, null]);
    setFailingTile(null);
    setTrainDeparting(false);
  }

  function startGame() {
    const drawn = shuffleArr(CONTENT[ageGroup].rounds).slice(0, ROUNDS_PER_GAME);
    setGameRounds(drawn);
    setRound(0);
    initRound(drawn[0]);
    setStage('playing');
  }

  function handleTileClick(idx: number) {
    const tile = platform[idx];
    if (tile.loaded || tile.failed || failingTile !== null || trainDeparting) return;

    if (tile.correct) {
      sfx.load();
      const newLoaded = [...loadedWords];
      const emptyIdx = newLoaded.findIndex((w) => w === null);
      if (emptyIdx === -1) return;
      newLoaded[emptyIdx] = tile.text;
      setPlatform((prev) => prev.map((t, i) => (i === idx ? { ...t, loaded: true } : t)));
      setLoadedWords(newLoaded);

      if (newLoaded.every((w) => w !== null)) {
        sfx.depart();
        setTrainDeparting(true);
        setTimeout(() => {
          const next = round + 1;
          if (next >= gameRounds.length) {
            sfx.victory();
            celebrate();
            setStage('victory');
          } else {
            setRound(next);
            initRound(gameRounds[next]);
          }
        }, 1400);
      }
    } else {
      sfx.fail();
      setFailingTile(idx);
      setTimeout(() => {
        setPlatform((prev) => prev.map((t, i) => (i === idx ? { ...t, failed: true } : t)));
        setFailingTile(null);
      }, 750);
    }
  }

  function reset() {
    setStage('setup');
    setRound(0);
    setGameRounds([]);
    setPlatform([]);
    setLoadedWords([null, null, null]);
    setFailingTile(null);
    setTrainDeparting(false);
  }

  // ── Setup ──────────────────────────────────────────────────────────────
  if (stage === 'setup') {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', p: 3 }}>
        {activeClassroom ? (
          <Paper sx={{ p: 2.5, mb: 3, bgcolor: '#10b981', borderRadius: 4 }}>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <GroupsRoundedIcon sx={{ color: 'white' }} />
              <Typography sx={{ color: 'white', fontWeight: 700 }}>
                משחקים עם כיתה {activeClassroom.name}
              </Typography>
              <Chip
                label={`${presentRoster.length} נוכחים`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white' }}
              />
            </Stack>
            <Stack sx={{ flexDirection: 'row', gap: 1 }}>
              <TextField
                size="small"
                placeholder="הוסף תלמיד אורח לסיבוב זה"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && guestInput.trim()) {
                    setGuestNames((p) => [...p, guestInput.trim()]);
                    setGuestInput('');
                  }
                }}
                sx={{ flex: 1, bgcolor: 'white', borderRadius: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <IconButton
                size="small"
                onClick={() => {
                  if (guestInput.trim()) {
                    setGuestNames((p) => [...p, guestInput.trim()]);
                    setGuestInput('');
                  }
                }}
                sx={{ bgcolor: 'white', borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.85)' } }}
              >
                <AddRoundedIcon />
              </IconButton>
            </Stack>
            {guestNames.length > 0 && (
              <Stack sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {guestNames.map((n) => (
                  <Chip
                    key={n}
                    label={n}
                    size="small"
                    onDelete={() => setGuestNames((p) => p.filter((g) => g !== n))}
                    sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }}
                  />
                ))}
              </Stack>
            )}
          </Paper>
        ) : (
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 4 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="הקלידו או הדביקו את שמות התלמידים (מופרדים בפסיק או שורה חדשה)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            {presentRoster.length > 0 && (
              <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
                {presentRoster.length} תלמידים
              </Typography>
            )}
          </Paper>
        )}

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          לאיזו שכבת גיל מתאימים החרוזים?
        </Typography>
        <Stack sx={{ gap: 1.5, mb: 4 }}>
          {AGE_GROUPS.map((g) => (
            <Paper
              key={g.key}
              onClick={() => setAgeGroup(g.key)}
              elevation={ageGroup === g.key ? 3 : 1}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                borderRadius: 4,
                border: '2px solid',
                borderColor: ageGroup === g.key ? 'primary.main' : 'transparent',
                bgcolor: ageGroup === g.key ? '#eef0fb' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5">🚂</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{g.label}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{g.desc}</Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={startGame}
          sx={{ py: 2, borderRadius: 4, fontSize: '1.1rem', fontWeight: 700 }}
        >
          🚂 הרכבת מגיעה לתחנה!
        </Button>
      </Box>
    );
  }

  // ── Victory ────────────────────────────────────────────────────────────
  if (stage === 'victory') {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Fade in>
          <Paper sx={{ p: 5, borderRadius: 4, bgcolor: '#eff6ff', border: '3px solid #3b82f6' }}>
            <Typography sx={{ fontSize: '4rem', lineHeight: 1, mb: 1.5 }}>🚂✨</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 900, color: '#1e40af' }}>
              הרכבת יצאה לדרך!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: '#1d4ed8' }}>
              מצאתם את כל החרוזים המושלמים — כיתה מוכשרת!
            </Typography>
            <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1, mb: 3 }}>
              {['🚂', '🚃', '🚃', '🚃'].map((e, i) => (
                <Typography key={i} sx={{ fontSize: '2.2rem' }}>{e}</Typography>
              ))}
            </Stack>
            <Typography sx={{ fontSize: '2.5rem', mb: 3 }}>🎶 ⭐ 🎶</Typography>
            <Button
              variant="outlined"
              onClick={reset}
              sx={{ borderRadius: 3, fontWeight: 700, borderColor: '#3b82f6', color: '#1e40af', '&:hover': { bgcolor: '#eff6ff' } }}
            >
              נסיעה נוספת
            </Button>
          </Paper>
        </Fade>
      </Box>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────
  const currentRound = gameRounds[round];

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Progress chips */}
      <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1.5, mb: 2 }}>
        <Chip
          label={`רכבת ${round + 1} מתוך ${gameRounds.length}`}
          variant="outlined"
          size="small"
        />
        <Chip
          label={`מילת קטר: ${currentRound.target}`}
          size="small"
          sx={{ bgcolor: '#dbeafe', fontWeight: 700, color: '#1e40af' }}
        />
      </Stack>

      {/* Train */}
      <Box
        dir="ltr"
        sx={{
          mb: 2.5,
          animation: trainDeparting ? 'rrDepart 1.4s ease-in forwards' : 'none',
          '@keyframes rrDepart': {
            '0%': { transform: 'translateX(0)', opacity: 1 },
            '15%': { transform: 'translateX(-8px)' },
            '100%': { transform: 'translateX(-110%)', opacity: 0.2 },
          },
        }}
      >
        <Stack sx={{ flexDirection: 'row', gap: 1, alignItems: 'stretch', justifyContent: 'center' }}>
          {/* Locomotive */}
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: '#1e40af',
              textAlign: 'center',
              minWidth: 90,
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>🚂</Typography>
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.2rem', mt: 0.5 }}>
              {currentRound.target}
            </Typography>
          </Paper>

          {/* Wagons */}
          {loadedWords.map((word, i) => (
            <Paper
              key={i}
              sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: word ? '#dcfce7' : '#f8faff',
                border: '2px solid',
                borderColor: word ? '#22c55e' : '#e0e7ff',
                textAlign: 'center',
                minWidth: 90,
                flex: 1,
                transition: 'all 0.3s',
              }}
            >
              <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>{word ? '✅' : '🚃'}</Typography>
              {word ? (
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    mt: 0.5,
                    color: '#15803d',
                    animation: 'rrLoad 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    '@keyframes rrLoad': {
                      '0%': { transform: 'scale(0) translateY(-12px)', opacity: 0 },
                      '100%': { transform: 'scale(1) translateY(0)', opacity: 1 },
                    },
                  }}
                >
                  {word}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  קרון {i + 1}
                </Typography>
              )}
            </Paper>
          ))}
        </Stack>
      </Box>

      {/* Platform */}
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 1 }}>
        ← מצאו את 3 המילים שמתחרזות עם <strong>{currentRound.target}</strong> ולחצו עליהן לטעינה
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
        {platform.map((tile, idx) => {
          const isFailing = failingTile === idx;
          const palette = { bg: TILE_COLORS[idx % TILE_COLORS.length], border: TILE_BORDERS[idx % TILE_BORDERS.length] };

          return (
            <Paper
              key={`${tile.text}-${idx}`}
              onClick={() => handleTileClick(idx)}
              sx={{
                px: 2.5,
                py: 1.8,
                borderRadius: 3,
                cursor: tile.loaded || tile.failed || failingTile !== null || trainDeparting
                  ? 'default'
                  : 'pointer',
                bgcolor: tile.loaded ? '#bbf7d0' : tile.failed ? 'grey.100' : palette.bg,
                border: '2px solid',
                borderColor: tile.loaded ? '#22c55e' : tile.failed ? 'divider' : palette.border,
                opacity: tile.loaded || tile.failed ? 0.45 : 1,
                userSelect: 'none',
                transition: 'transform 0.15s, box-shadow 0.15s',
                animation: isFailing ? 'rrFall 0.75s ease-in forwards' : 'none',
                '@keyframes rrFall': {
                  '0%': { transform: 'translateY(0) rotate(0)', opacity: 1 },
                  '25%': { transform: 'translateY(-8px) rotate(-6deg)' },
                  '100%': { transform: 'translateY(28px) rotate(18deg)', opacity: 0 },
                },
                '&:hover':
                  tile.loaded || tile.failed || failingTile !== null || trainDeparting
                    ? {}
                    : { transform: 'scale(1.06)', boxShadow: 4 },
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: tile.failed ? 'text.disabled' : '#1f2937' }}>
                {tile.text}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
