import { useState, useEffect } from 'react';
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
import contentData from '../data/content/hungry-word-monster-content.json';

// ── Content ────────────────────────────────────────────────────────────────
// Word pools live in external JSON (see CLAUDE.md → Game Content & Architecture
// Rules), keyed by age cohort. This is a beginning-literacy mechanic, so only the
// elementary cohorts apply — junior-high/high is intentionally omitted.

type WordCard = { text: string; correct: boolean };
type RoundData = { cry: string; words: WordCard[] };
type FocusSet = { emoji: string; label: string; rounds: RoundData[] };

type AgeGroupKey = 'lower_elementary' | 'upper_elementary';

interface CohortFocus {
  label: string;
  focusSets: FocusSet[];
}

const CONTENT = contentData as Record<AgeGroupKey, CohortFocus>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
];

const CORRECT_PER_ROUND = 3;

const CARD_COLORS = ['#fce4ec', '#e8eaf6', '#e8f5e9', '#fff8e1', '#f3e5f5'];
const CARD_BORDERS = ['#e91e63', '#3f51b5', '#4caf50', '#ff9800', '#9c27b0'];

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
  crunch() {
    this.tone(440, 0.25, 0.12, 'sine', 0);
    this.tone(330, 0.25, 0.15, 'sine', 0.08);
  }
  reject() {
    this.tone(220, 0.2, 0.1, 'sawtooth', 0);
    this.tone(196, 0.2, 0.15, 'sawtooth', 0.1);
  }
  roundComplete() {
    this.tone(523.25, 0.22, 0.25, 'sine', 0);
    this.tone(659.25, 0.22, 0.25, 'sine', 0.1);
    this.tone(783.99, 0.25, 0.35, 'sine', 0.2);
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.2, 0.4, 'sine', i * 0.1));
  }
}

const sfx = new Sfx();

function celebrate() {
  confetti({ particleCount: 140, spread: 85, origin: { y: 0.5 } });
}

// ── Component ──────────────────────────────────────────────────────────────

type Stage = 'setup' | 'playing' | 'victory';
type MonsterState = 'idle' | 'eating' | 'reject' | 'complete';

export default function HungryWordMonster({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const [stage, setStage] = useState<Stage>('setup');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('lower_elementary');
  const [selectedFocus, setSelectedFocus] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [fedCorrect, setFedCorrect] = useState<Set<number>>(new Set());
  const [fedWrong, setFedWrong] = useState<Set<number>>(new Set());
  const [monsterState, setMonsterState] = useState<MonsterState>('idle');
  const [shakingCard, setShakingCard] = useState<number | null>(null);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  const focusSets = CONTENT[ageGroup].focusSets;
  const currentFocusSet = focusSets[selectedFocus];
  const currentRound = currentFocusSet.rounds[roundIndex];

  // Round completion: fires when all correct words are fed
  useEffect(() => {
    if (stage !== 'playing' || fedCorrect.size < CORRECT_PER_ROUND) return;
    sfx.roundComplete();
    setMonsterState('complete');

    const t = setTimeout(() => {
      const next = roundIndex + 1;
      if (next >= currentFocusSet.rounds.length) {
        sfx.victory();
        celebrate();
        setStage('victory');
      } else {
        setRoundIndex(next);
        setFedCorrect(new Set());
        setFedWrong(new Set());
        setShakingCard(null);
        setMonsterState('idle');
      }
    }, 1600);

    return () => clearTimeout(t);
  }, [fedCorrect.size, stage, roundIndex, selectedFocus, currentFocusSet.rounds.length]);

  function handleFeedWord(idx: number) {
    const word = currentRound.words[idx];
    if (fedCorrect.has(idx) || fedWrong.has(idx) || monsterState !== 'idle') return;

    if (word.correct) {
      sfx.crunch();
      setMonsterState('eating');
      setFedCorrect((prev) => new Set([...prev, idx]));
      // Only reset to idle if this isn't the last correct word (effect handles round complete)
      if (fedCorrect.size + 1 < CORRECT_PER_ROUND) {
        setTimeout(() => setMonsterState('idle'), 500);
      }
    } else {
      sfx.reject();
      setFedWrong((prev) => new Set([...prev, idx]));
      setShakingCard(idx);
      setMonsterState('reject');
      setTimeout(() => {
        setShakingCard(null);
        setMonsterState('idle');
      }, 650);
    }
  }

  function startGame() {
    setRoundIndex(0);
    setFedCorrect(new Set());
    setFedWrong(new Set());
    setShakingCard(null);
    setMonsterState('idle');
    setStage('playing');
  }

  function reset() {
    setStage('setup');
    setRoundIndex(0);
    setFedCorrect(new Set());
    setFedWrong(new Set());
    setShakingCard(null);
    setMonsterState('idle');
  }

  const monsterEmoji: Record<MonsterState, string> = {
    idle: '🤤',
    eating: '😋',
    reject: '🤢',
    complete: '🥳',
  };

  // ── Setup ────────────────────────────────────────────────────────────────
  if (stage === 'setup') {
    return (
      <Box sx={{ maxWidth: 580, mx: 'auto', p: 3 }}>
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

        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
          לאיזו שכבת גיל מתאימות המילים?
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={ageGroup}
          onChange={(_, v) => {
            if (v) {
              setAgeGroup(v as AgeGroupKey);
              setSelectedFocus(0);
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
          מה המפלצת רוצה לאכול היום?
        </Typography>
        <Stack sx={{ gap: 1.5, mb: 4 }}>
          {focusSets.map((fs, i) => (
            <Paper
              key={i}
              onClick={() => setSelectedFocus(i)}
              elevation={selectedFocus === i ? 3 : 1}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 4,
                border: '2px solid',
                borderColor: selectedFocus === i ? 'primary.main' : 'transparent',
                bgcolor: selectedFocus === i ? '#eef0fb' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5">{fs.emoji}</Typography>
                <Typography sx={{ fontWeight: 700 }}>{fs.label}</Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={startGame}
          sx={{ py: 2, borderRadius: 4, fontSize: '1.15rem', fontWeight: 700 }}
        >
          👾 האכילו את המפלצת!
        </Button>
      </Box>
    );
  }

  // ── Victory ──────────────────────────────────────────────────────────────
  if (stage === 'victory') {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Fade in>
          <Paper sx={{ p: 5, borderRadius: 4, bgcolor: '#10b981', color: 'white' }}>
            <Typography sx={{ fontSize: '4rem', lineHeight: 1, mb: 1.5 }}>👾</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: 'white' }}>
              המפלצת שבעה!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.9, color: 'white' }}>
              האכלתם אותה בכל המילים הנכונות — כיתה שלנו!
            </Typography>
            <Typography sx={{ fontSize: '3rem', mb: 4 }}>🎉🍖✨</Typography>
            <Button
              variant="outlined"
              onClick={reset}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.6)',
                borderRadius: 4,
                fontWeight: 700,
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              שחקו שוב
            </Button>
          </Paper>
        </Fade>
      </Box>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Round progress */}
      <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1.5, mb: 2 }}>
        <Chip
          label={`סיבוב ${roundIndex + 1} מתוך ${currentFocusSet.rounds.length}`}
          variant="outlined"
          size="small"
        />
        <Chip label={currentFocusSet.label} size="small" sx={{ bgcolor: '#eef0fb' }} />
      </Stack>

      {/* Monster section */}
      <Stack sx={{ alignItems: 'center', mb: 3 }}>
        {/* Speech bubble */}
        <Paper
          sx={{
            px: 2.5,
            py: 1.5,
            borderRadius: 3,
            mb: 1.5,
            bgcolor: '#f3e8ff',
            maxWidth: 420,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              border: '10px solid transparent',
              borderTopColor: '#f3e8ff',
              borderBottom: 'none',
            },
          }}
        >
          <Typography sx={{ fontWeight: 600, textAlign: 'center', color: '#4c1d95' }}>
            {currentRound.cry}
          </Typography>
        </Paper>

        {/* Monster face */}
        <Box
          sx={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            bgcolor: '#7c3aed',
            border: '4px solid #5b21b6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3.8rem',
            transition: 'transform 0.2s',
            animation:
              monsterState === 'eating'
                ? 'mwmChomp 0.4s ease-in-out'
                : monsterState === 'reject'
                ? 'mwmBounce 0.3s ease'
                : monsterState === 'complete'
                ? 'mwmWiggle 0.6s ease-in-out infinite alternate'
                : 'none',
            '@keyframes mwmChomp': {
              '0%,100%': { transform: 'scale(1)' },
              '40%': { transform: 'scale(1.18) rotate(-5deg)' },
              '70%': { transform: 'scale(0.92) rotate(3deg)' },
            },
            '@keyframes mwmBounce': {
              '0%,100%': { transform: 'translateY(0)' },
              '40%': { transform: 'translateY(-8px)' },
            },
            '@keyframes mwmWiggle': {
              '0%': { transform: 'rotate(-5deg) scale(1.05)' },
              '100%': { transform: 'rotate(5deg) scale(1.1)' },
            },
          }}
        >
          {monsterEmoji[monsterState]}
        </Box>

        {/* Hunger meter */}
        <Stack sx={{ flexDirection: 'row', gap: 1.5, mt: 2 }}>
          {Array.from({ length: CORRECT_PER_ROUND }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                border: '2px solid',
                borderColor: fedCorrect.size > i ? '#d97706' : 'divider',
                bgcolor: fedCorrect.size > i ? '#fef3c7' : 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                transition: 'all 0.3s',
              }}
            >
              {fedCorrect.size > i ? '🍖' : '·'}
            </Box>
          ))}
        </Stack>
      </Stack>

      {/* Word cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 2 }}>
        {currentRound.words.map((word, idx) => {
          const isFed = fedCorrect.has(idx);
          const isWrong = fedWrong.has(idx);
          const isShaking = shakingCard === idx;
          const disabled = isWrong || monsterState !== 'idle';

          if (isFed) return null;

          return (
            <Paper
              key={idx}
              onClick={() => handleFeedWord(idx)}
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                minWidth: 100,
                borderRadius: 3,
                cursor: disabled ? 'default' : 'pointer',
                bgcolor: isWrong ? 'grey.100' : CARD_COLORS[idx],
                border: '2px solid',
                borderColor: isWrong ? 'divider' : CARD_BORDERS[idx],
                opacity: isWrong ? 0.45 : 1,
                userSelect: 'none',
                textAlign: 'center',
                transition: 'transform 0.15s, box-shadow 0.15s',
                animation: isShaking ? 'mwmShake 0.5s ease-in-out' : 'none',
                '@keyframes mwmShake': {
                  '0%,100%': { transform: 'translateX(0)' },
                  '20%': { transform: 'translateX(-8px)' },
                  '40%': { transform: 'translateX(8px)' },
                  '60%': { transform: 'translateX(-6px)' },
                  '80%': { transform: 'translateX(6px)' },
                },
                '&:hover': disabled
                  ? {}
                  : { transform: 'scale(1.06)', boxShadow: 4 },
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: isWrong ? 'text.disabled' : '#1f2937' }}
              >
                {word.text}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Instruction hint */}
      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled' }}>
        לחצו על המילים שמתאימות — המפלצת תאכל רק את הנכונות!
      </Typography>
    </Box>
  );
}
