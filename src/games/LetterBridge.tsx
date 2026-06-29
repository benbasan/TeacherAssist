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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import confetti from 'canvas-confetti';
import contentData from '../data/content/letter-bridge-content.json';

// ── Content ────────────────────────────────────────────────────────────────
// Letter-pair word pools live in external JSON (see CLAUDE.md → Game Content &
// Architecture Rules), keyed by age cohort. Homophone-spelling discrimination
// stays relevant through high school, so all three cohorts apply.

type PlankData = {
  template: string; // word with '?' marking the missing letter, e.g. '?רנב'
  answer: 0 | 1;   // index into the pair's letters array
  full: string;     // complete word, revealed after answering
};

type LetterPair = {
  letters: [string, string];
  label: string;
  emoji: string;
  planks: PlankData[];
};

type AgeGroupKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

interface CohortPairs {
  label: string;
  letterPairs: LetterPair[];
}

const CONTENT = contentData as Record<AgeGroupKey, CohortPairs>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
  { key: 'junior_high_high', label: CONTENT.junior_high_high.label },
];

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
  correct() {
    this.tone(659.25, 0.22, 0.18, 'sine', 0);
    this.tone(783.99, 0.25, 0.3, 'sine', 0.12);
  }
  wrong() {
    // Descending "splash"
    this.tone(320, 0.2, 0.08, 'sawtooth', 0);
    this.tone(200, 0.18, 0.18, 'sawtooth', 0.07);
    this.tone(120, 0.15, 0.25, 'sawtooth', 0.2);
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.2, 0.35, 'sine', i * 0.11)
    );
  }
}

const sfx = new Sfx();

function celebrate() {
  confetti({ particleCount: 130, spread: 85, origin: { y: 0.5 } });
}

// ── Component ──────────────────────────────────────────────────────────────

type Stage = 'setup' | 'playing' | 'victory';
type AnswerState = null | 'correct' | 'wrong';

// Render word template: highlights the '?' in an indigo chip
function WordDisplay({ template, pair }: { template: string; pair: LetterPair }) {
  const parts = template.split('?');
  return (
    <Box
      component="span"
      dir="rtl"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, flexWrap: 'nowrap' }}
    >
      {parts[0] && (
        <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 800 }}>
          {parts[0]}
        </Typography>
      )}
      <Box
        component="span"
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          px: 1,
          py: 0.2,
          borderRadius: 1.5,
          fontWeight: 900,
          fontSize: 'inherit',
          lineHeight: 1.3,
          display: 'inline-block',
        }}
      >
        {pair.letters[0]}/{pair.letters[1]}
      </Box>
      {parts[1] && (
        <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 800 }}>
          {parts[1]}
        </Typography>
      )}
    </Box>
  );
}

export default function LetterBridge({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const [stage, setStage] = useState<Stage>('setup');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('lower_elementary');
  const [selectedPair, setSelectedPair] = useState(0);
  const [plankIndex, setPlankIndex] = useState(0); // 0–4
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [shakingPlank, setShakingPlank] = useState(false);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  const letterPairs = CONTENT[ageGroup].letterPairs;
  const currentPair = letterPairs[selectedPair];
  const currentPlank = currentPair.planks[plankIndex];

  function startGame() {
    setPlankIndex(0);
    setAnswerState(null);
    setShakingPlank(false);
    setRevealedWord(null);
    setStage('playing');
  }

  function handleAnswer(choice: 0 | 1) {
    if (answerState !== null) return;
    const correct = choice === currentPlank.answer;
    setAnswerState(correct ? 'correct' : 'wrong');
    setRevealedWord(currentPlank.full);

    if (correct) {
      sfx.correct();
      setTimeout(() => {
        const next = plankIndex + 1;
        if (next >= currentPair.planks.length) {
          sfx.victory();
          celebrate();
          setStage('victory');
        } else {
          setPlankIndex(next);
          setAnswerState(null);
          setRevealedWord(null);
        }
      }, 900);
    } else {
      sfx.wrong();
      setShakingPlank(true);
      setTimeout(() => {
        setShakingPlank(false);
        setAnswerState(null);
        setRevealedWord(null);
      }, 1000);
    }
  }

  function reset() {
    setStage('setup');
    setPlankIndex(0);
    setAnswerState(null);
    setShakingPlank(false);
    setRevealedWord(null);
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
                sx={{
                  flex: 1,
                  bgcolor: 'white',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
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

        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
          לאיזו שכבת גיל מתאימות המילים?
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={ageGroup}
          onChange={(_, v) => {
            if (v) {
              setAgeGroup(v as AgeGroupKey);
              setSelectedPair(0);
            }
          }}
          color="secondary"
          fullWidth
          sx={{ mb: 3, flexWrap: 'wrap' }}
        >
          {AGE_GROUPS.map((g) => (
            <ToggleButton key={g.key} value={g.key} sx={{ fontWeight: 700, py: 1.2 }}>
              {g.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          איזה זוג אותיות נתרגל היום?
        </Typography>
        <Stack sx={{ gap: 1.5, mb: 4 }}>
          {letterPairs.map((pair, i) => (
            <Paper
              key={i}
              onClick={() => setSelectedPair(i)}
              elevation={selectedPair === i ? 3 : 1}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 4,
                border: '2px solid',
                borderColor: selectedPair === i ? 'primary.main' : 'transparent',
                bgcolor: selectedPair === i ? '#eef0fb' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5">{pair.emoji}</Typography>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{pair.label}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {pair.planks.map((p) => p.full).join(' · ')}
                  </Typography>
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
          🌉 בנו את הגשר!
        </Button>
      </Box>
    );
  }

  // ── Victory ────────────────────────────────────────────────────────────
  if (stage === 'victory') {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Fade in>
          <Paper sx={{ p: 4, borderRadius: 4, bgcolor: '#f0fdf4', border: '3px solid #22c55e' }}>
            <Typography sx={{ fontSize: '4.5rem', lineHeight: 1, mb: 2 }}>🐨🎉</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: '#15803d' }}>
              הקואלה הגיע לגדה השנייה!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: '#166534' }}>
              כיתה מדהימה — גשרתם על כל {currentPair.planks.length} האותיות הסודיות!
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#166534', mb: 3 }}>
              תרגלתם: {currentPair.label}
            </Typography>
            <Typography sx={{ fontSize: '3rem', mb: 3 }}>🎁 🌟 🎁</Typography>
            <Button
              variant="outlined"
              onClick={reset}
              sx={{ borderRadius: 3, fontWeight: 700, borderColor: '#22c55e', color: '#15803d', '&:hover': { bgcolor: '#dcfce7' } }}
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
    <Box sx={{ maxWidth: 640, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Header chips */}
      <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1.5, mb: 3 }}>
        <Chip label={currentPair.label} size="small" sx={{ fontWeight: 700, bgcolor: '#eef0fb' }} />
        <Chip label={`קרש ${plankIndex + 1} מתוך ${currentPair.planks.length}`} variant="outlined" size="small" />
      </Stack>

      {/* Bridge visual */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 4, bgcolor: '#bfdbfe', border: '2px solid #93c5fd' }}>
        <Box dir="ltr" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          {/* Start bank */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
            <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>🌿</Typography>
            <Typography variant="caption" sx={{ color: '#1e40af' }}>הגדה</Typography>
          </Box>

          {/* Planks */}
          {currentPair.planks.map((_, i) => {
            const isDone = i < plankIndex;
            const isCurrent = i === plankIndex;
            const isShaking = isCurrent && shakingPlank;
            const isCorrectFlash = isCurrent && answerState === 'correct';
            const isWrongFlash = isCurrent && answerState === 'wrong';

            return (
              <Box
                key={i}
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  border: '3px solid',
                  bgcolor: isDone
                    ? '#bbf7d0'
                    : isCorrectFlash
                    ? '#22c55e'
                    : isWrongFlash
                    ? '#ef4444'
                    : isCurrent
                    ? 'primary.main'
                    : '#d97706',
                  borderColor: isDone
                    ? '#34d399'
                    : isCorrectFlash
                    ? '#16a34a'
                    : isWrongFlash
                    ? '#dc2626'
                    : isCurrent
                    ? 'primary.dark'
                    : '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  transition: 'all 0.35s',
                  animation: isShaking ? 'lbShake 0.45s ease-in-out' : 'none',
                  '@keyframes lbShake': {
                    '0%,100%': { transform: 'translateY(0) rotate(0)' },
                    '20%': { transform: 'translateY(-6px) rotate(-4deg)' },
                    '40%': { transform: 'translateY(8px) rotate(3deg)' },
                    '60%': { transform: 'translateY(-5px) rotate(-3deg)' },
                    '80%': { transform: 'translateY(5px) rotate(2deg)' },
                  },
                }}
              >
                {isDone ? '✅' : isCurrent ? '🐨' : '🪵'}
              </Box>
            );
          })}

          {/* End bank / treasure */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
            <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>🎁</Typography>
            <Typography variant="caption" sx={{ color: '#1e40af' }}>אוצר</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Word puzzle */}
      <Paper
        sx={{
          p: 3,
          mb: 2.5,
          borderRadius: 4,
          textAlign: 'center',
          bgcolor:
            answerState === 'correct'
              ? '#dcfce7'
              : answerState === 'wrong'
              ? '#fee2e2'
              : '#f8faff',
          border: '2px solid',
          borderColor:
            answerState === 'correct'
              ? '#22c55e'
              : answerState === 'wrong'
              ? '#ef4444'
              : 'divider',
          transition: 'all 0.3s',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          באיזו אות מתחילה (או נמצאת) במילה?
        </Typography>
        <Typography
          component="div"
          sx={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: 2, lineHeight: 1.3 }}
        >
          <WordDisplay template={currentPlank.template} pair={currentPair} />
        </Typography>
        {revealedWord && (
          <Fade in>
            <Typography
              sx={{
                mt: 1,
                fontWeight: 700,
                color: answerState === 'correct' ? '#16a34a' : '#dc2626',
                fontSize: '1.1rem',
              }}
            >
              {answerState === 'correct' ? `✅ נכון! המילה היא: ${revealedWord}` : `❌ לא בדיוק... המילה היא: ${revealedWord}`}
            </Typography>
          </Fade>
        )}
      </Paper>

      {/* Letter buttons */}
      <Stack sx={{ flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
        {currentPair.letters.map((letter, i) => (
          <Button
            key={i}
            variant="contained"
            size="large"
            disabled={answerState !== null}
            onClick={() => handleAnswer(i as 0 | 1)}
            sx={{
              width: 110,
              height: 90,
              fontSize: '2.4rem',
              fontWeight: 900,
              borderRadius: 4,
              bgcolor: i === 0 ? '#f59e0b' : '#8b5cf6',
              '&:hover': { bgcolor: i === 0 ? '#d97706' : '#7c3aed' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {letter}
          </Button>
        ))}
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.disabled' }}>
        לחצו על האות הנכונה כדי לעזור לקואלה לחצות את הגשר
      </Typography>
    </Box>
  );
}
