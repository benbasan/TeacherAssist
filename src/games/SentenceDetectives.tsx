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
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import confetti from 'canvas-confetti';

// ── Content ────────────────────────────────────────────────────────────────

type Sentence = { words: string[]; emoji: string };

// Last word carries a "." so students can identify it visually
const SENTENCES: Record<'easy' | 'hard', Sentence[]> = {
  easy: [
    { words: ['הכלב', 'רץ', 'מהר.'], emoji: '🐕' },
    { words: ['ילדה', 'קוראת', 'ספר.'], emoji: '📚' },
    { words: ['הגשם', 'ירד', 'בחוץ.'], emoji: '🌧️' },
  ],
  hard: [
    { words: ['הכלב', 'הגדול', 'רץ', 'מהר', 'בחצר.'], emoji: '🐕' },
    { words: ['שירה', 'אכלה', 'תפוח', 'אדום', 'ומתוק.'], emoji: '🍎' },
    { words: ['החתול', 'האפור', 'ישן', 'על', 'הכיסא.'], emoji: '😺' },
  ],
};

const CHIP_PALETTE = [
  { bg: '#fce4ec', border: '#e91e63' },
  { bg: '#e8eaf6', border: '#3f51b5' },
  { bg: '#e8f5e9', border: '#4caf50' },
  { bg: '#fff8e1', border: '#ff9800' },
  { bg: '#f3e5f5', border: '#9c27b0' },
  { bg: '#e0f7fa', border: '#00bcd4' },
  { bg: '#fbe9e7', border: '#ff5722' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function shuffle(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scramble(words: string[]): string[] {
  let result = shuffle(words);
  let tries = 0;
  while (result.join('|') === words.join('|') && tries++ < 8) result = shuffle(words);
  return result;
}

function celebrate() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
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
  click() { this.tone(880, 0.12, 0.07); }
  correct() {
    this.tone(523.25, 0.2, 0.22, 'sine', 0);
    this.tone(659.25, 0.2, 0.22, 'sine', 0.1);
    this.tone(783.99, 0.22, 0.3, 'sine', 0.22);
  }
  wrong() {
    this.tone(300, 0.2, 0.12, 'sawtooth', 0);
    this.tone(220, 0.18, 0.2, 'sawtooth', 0.1);
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.18, 0.35, 'sine', i * 0.1));
  }
}

const sfx = new Sfx();

// ── Component ──────────────────────────────────────────────────────────────

type Stage = 'setup' | 'playing' | 'victory';
type CheckState = null | 'correct' | 'wrong';

export default function SentenceDetectives({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const [stage, setStage] = useState<Stage>('setup');
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [roundIndex, setRoundIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtWords, setBuiltWords] = useState<string[]>([]);
  const [checkState, setCheckState] = useState<CheckState>(null);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  const sentence = SENTENCES[difficulty][roundIndex];
  const isComplete = builtWords.length === sentence.words.length;

  function startGame() {
    setRoundIndex(0);
    setAvailableWords(scramble(SENTENCES[difficulty][0].words));
    setBuiltWords([]);
    setCheckState(null);
    setStage('playing');
  }

  function addWord(word: string, idx: number) {
    if (checkState !== null) return;
    sfx.click();
    setAvailableWords((prev) => prev.filter((_, i) => i !== idx));
    setBuiltWords((prev) => [...prev, word]);
  }

  function removeWord(idx: number) {
    if (checkState !== null) return;
    const word = builtWords[idx];
    setBuiltWords((prev) => prev.filter((_, i) => i !== idx));
    setAvailableWords((prev) => [...prev, word]);
  }

  function handleSubmit() {
    if (!isComplete || checkState !== null) return;
    const correct = builtWords.join(' ') === sentence.words.join(' ');
    setCheckState(correct ? 'correct' : 'wrong');

    if (correct) {
      sfx.correct();
      const next = roundIndex + 1;
      const total = SENTENCES[difficulty].length;
      if (next >= total) {
        sfx.victory();
        celebrate();
        setTimeout(() => setStage('victory'), 1400);
      } else {
        setTimeout(() => {
          setRoundIndex(next);
          setAvailableWords(scramble(SENTENCES[difficulty][next].words));
          setBuiltWords([]);
          setCheckState(null);
        }, 1500);
      }
    } else {
      sfx.wrong();
      setTimeout(() => {
        setAvailableWords(scramble(sentence.words));
        setBuiltWords([]);
        setCheckState(null);
      }, 1300);
    }
  }

  function reset() {
    setStage('setup');
    setRoundIndex(0);
    setAvailableWords([]);
    setBuiltWords([]);
    setCheckState(null);
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
          בחרו רמת קושי:
        </Typography>
        <Stack sx={{ gap: 1.5, mb: 4 }}>
          {([['easy', '🟢', 'קל', '3–4 מילים במשפט'], ['hard', '🔴', 'מאתגר', '5–7 מילים במשפט']] as const).map(
            ([key, dot, label, desc]) => (
              <Paper
                key={key}
                onClick={() => setDifficulty(key)}
                elevation={difficulty === key ? 3 : 1}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: '2px solid',
                  borderColor: difficulty === key ? 'primary.main' : 'transparent',
                  bgcolor: difficulty === key ? '#eef0fb' : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.light' },
                }}
              >
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5">{dot}</Typography>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{desc}</Typography>
                  </Box>
                </Stack>
              </Paper>
            )
          )}
        </Stack>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={startGame}
          sx={{ py: 2, borderRadius: 4, fontSize: '1.1rem', fontWeight: 700 }}
        >
          🔍 התחילו לפתור!
        </Button>
      </Box>
    );
  }

  // ── Victory ────────────────────────────────────────────────────────────
  if (stage === 'victory') {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Fade in>
          <Paper
            sx={{
              p: 4,
              borderRadius: 4,
              border: '3px solid #f59e0b',
              bgcolor: '#fffbeb',
            }}
          >
            <Typography sx={{ fontSize: '4rem', lineHeight: 1, mb: 2 }}>🔍</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: '#b45309' }}>
              תעודת בלש שפה מוסמך!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: '#92400e' }}>
              פתרתם {SENTENCES[difficulty].length} משפטים מבולבלים בהצלחה מרשימה
            </Typography>
            {presentRoster.length > 0 && (
              <Typography sx={{ mb: 2, fontWeight: 600, color: '#78350f' }}>
                כיתה מצטיינת:{' '}
                {activeClassroom?.name ?? `${presentRoster.length} בלשים`}
              </Typography>
            )}
            <Typography sx={{ fontSize: '2.8rem', my: 2 }}>🎖️ ⭐ 🎖️</Typography>
            <Button
              variant="outlined"
              onClick={reset}
              sx={{ borderRadius: 3, fontWeight: 700, borderColor: '#d97706', color: '#b45309', '&:hover': { bgcolor: '#fef3c7' } }}
            >
              שחקו שוב
            </Button>
          </Paper>
        </Fade>
      </Box>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Round header */}
      <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1.5, mb: 2 }}>
        <Chip
          label={`משפט ${roundIndex + 1} מתוך ${SENTENCES[difficulty].length}`}
          variant="outlined"
          size="small"
        />
        <Chip
          label={sentence.emoji}
          size="small"
          sx={{ bgcolor: '#eef0fb' }}
        />
      </Stack>

      {/* Instruction */}
      <Typography
        variant="body2"
        sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}
      >
        לחצו על המילים לפי הסדר הנכון כדי לבנות את המשפט • לחצו על מילה בנויה להוצאתה
      </Typography>

      {/* Scrambled word magnets */}
      <Paper
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 4,
          bgcolor: '#f8faff',
          minHeight: 110,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {availableWords.length === 0 ? (
          <Typography sx={{ color: 'text.disabled', fontSize: '0.9rem' }}>
            כל המילים הועברו למשפט ↓
          </Typography>
        ) : (
          availableWords.map((word, idx) => {
            const palette = CHIP_PALETTE[idx % CHIP_PALETTE.length];
            return (
              <Paper
                key={`avail-${word}-${idx}`}
                onClick={() => addWord(word, idx)}
                sx={{
                  px: 2,
                  py: 1.2,
                  borderRadius: 3,
                  cursor: checkState !== null ? 'default' : 'pointer',
                  bgcolor: palette.bg,
                  border: `2px solid ${palette.border}`,
                  userSelect: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': checkState !== null ? {} : { transform: 'scale(1.07)', boxShadow: 3 },
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {word}
                </Typography>
              </Paper>
            );
          })
        )}
      </Paper>

      {/* Built sentence zone */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 4,
          minHeight: 80,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          justifyContent: 'flex-start',
          border: '2px dashed',
          borderColor:
            checkState === 'correct'
              ? '#22c55e'
              : checkState === 'wrong'
              ? '#ef4444'
              : 'divider',
          bgcolor:
            checkState === 'correct'
              ? '#dcfce7'
              : checkState === 'wrong'
              ? '#fee2e2'
              : 'grey.50',
          transition: 'background-color 0.3s, border-color 0.3s',
          animation: checkState === 'wrong' ? 'sdShake 0.45s ease-in-out' : 'none',
          '@keyframes sdShake': {
            '0%,100%': { transform: 'translateX(0)' },
            '20%': { transform: 'translateX(-10px)' },
            '40%': { transform: 'translateX(10px)' },
            '60%': { transform: 'translateX(-7px)' },
            '80%': { transform: 'translateX(7px)' },
          },
        }}
      >
        {builtWords.length === 0 ? (
          <Typography sx={{ color: 'text.disabled', fontSize: '0.9rem', flex: 1 }}>
            לחצו על מילים למעלה כדי לבנות את המשפט כאן...
          </Typography>
        ) : (
          builtWords.map((word, idx) => (
            <Paper
              key={`built-${word}-${idx}`}
              onClick={() => removeWord(idx)}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2.5,
                cursor: checkState !== null ? 'default' : 'pointer',
                bgcolor:
                  checkState === 'correct'
                    ? '#bbf7d0'
                    : checkState === 'wrong'
                    ? '#fecaca'
                    : '#e8eaf6',
                border: '2px solid',
                borderColor:
                  checkState === 'correct'
                    ? '#16a34a'
                    : checkState === 'wrong'
                    ? '#dc2626'
                    : '#9fa8da',
                userSelect: 'none',
                transition: 'background-color 0.3s',
                '&:hover': checkState !== null ? {} : { bgcolor: '#c5cae9' },
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                {word}
              </Typography>
            </Paper>
          ))
        )}
      </Paper>

      {/* Action row */}
      <Stack sx={{ flexDirection: 'row', gap: 1.5, mt: 2, justifyContent: 'center' }}>
        {builtWords.length > 0 && checkState === null && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<UndoRoundedIcon />}
            onClick={() => removeWord(builtWords.length - 1)}
            sx={{ borderRadius: 3 }}
          >
            בטל אחרונה
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={!isComplete || checkState !== null}
          sx={{ borderRadius: 3, fontWeight: 700, px: 4 }}
        >
          {checkState === 'correct'
            ? '✅ מעולה!'
            : checkState === 'wrong'
            ? '❌ נסו שוב'
            : '🔒 בדקו את המשפט'}
        </Button>
      </Stack>
    </Box>
  );
}
