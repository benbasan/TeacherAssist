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
  LinearProgress,
  Fade,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import confetti from 'canvas-confetti';
import contentData from '../data/content/punctuation-orchestra-content.json';

// ── Content ────────────────────────────────────────────────────────────────
// The readable sentence pool lives in external JSON (see CLAUDE.md → Game Content
// & Architecture Rules), keyed by age cohort. The 3 punctuation SIGNS are the core
// mechanic and stay in-component.

type Sign = {
  char: string;
  emoji: string;
  color: string;
  label: string;
  instruction: string;
};

const SIGNS: Sign[] = [
  {
    char: '.',
    emoji: '😐',
    color: '#3b82f6',
    label: 'נקודה',
    instruction: 'קראו בטון רגיל, שקט ורצוף',
  },
  {
    char: '?',
    emoji: '🤔',
    color: '#f59e0b',
    label: 'סימן שאלה',
    instruction: 'קראו בתמיהה — הקול עולה בסוף המשפט',
  },
  {
    char: '!',
    emoji: '🤩',
    color: '#ef4444',
    label: 'סימן קריאה',
    instruction: 'קראו בצעקה שמחה — הרימו ידיים!',
  },
];

type AgeGroupKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

interface CohortSentences {
  label: string;
  sentences: string[];
}

const CONTENT = contentData as Record<AgeGroupKey, CohortSentences>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
  { key: 'junior_high_high', label: CONTENT.junior_high_high.label },
];

const TOTAL_ROUNDS = 9; // 3 cycles through all 3 signs

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
  swish() {
    const c = this.get();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      const t = c.currentTime;
      o.frequency.setValueAtTime(180, t);
      o.frequency.linearRampToValueAtTime(900, t + 0.22);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t); o.stop(t + 0.35);
    } catch {}
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.2, 0.38, 'sine', i * 0.11)
    );
  }
}

const sfx = new Sfx();

function celebrate() {
  confetti({ particleCount: 150, spread: 90, origin: { y: 0.45 } });
}

function pickNextSign(current: number): number {
  const others = [0, 1, 2].filter((i) => i !== current);
  return others[Math.floor(Math.random() * others.length)];
}

// ── Component ──────────────────────────────────────────────────────────────

type Stage = 'setup' | 'playing' | 'victory';

export default function PunctuationOrchestra({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');

  const [stage, setStage] = useState<Stage>('setup');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('lower_elementary');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customSentence, setCustomSentence] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [signIndex, setSignIndex] = useState(0);
  const [roundCount, setRoundCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  const presetSentences = CONTENT[ageGroup].sentences;
  const activeSentence = useCustom && customSentence.trim()
    ? customSentence.trim()
    : presetSentences[selectedPreset];

  const currentSign = SIGNS[signIndex];
  const dramaPercent = Math.round((roundCount / TOTAL_ROUNDS) * 100);

  function startGame() {
    setSignIndex(0);
    setRoundCount(0);
    setTransitioning(false);
    setStage('playing');
  }

  function changeSign() {
    if (transitioning) return;

    sfx.swish();
    const next = pickNextSign(signIndex);
    const newCount = roundCount + 1;

    setSignIndex(next);
    setRoundCount(newCount);
    setTransitioning(true);
    setTimeout(() => setTransitioning(false), 450);

    if (newCount >= TOTAL_ROUNDS) {
      setTimeout(() => {
        sfx.victory();
        celebrate();
        setStage('victory');
      }, 700);
    }
  }

  function reset() {
    setStage('setup');
    setSignIndex(0);
    setRoundCount(0);
    setTransitioning(false);
  }

  // ── Setup ──────────────────────────────────────────────────────────────
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
          לאיזו שכבת גיל מתאימים המשפטים?
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={ageGroup}
          onChange={(_, v) => {
            if (v) {
              setAgeGroup(v as AgeGroupKey);
              setSelectedPreset(0);
              setUseCustom(false);
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

        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
          בחרו משפט לתזמורת:
        </Typography>

        {/* Preset sentences */}
        <Stack sx={{ gap: 1, mb: 2 }}>
          {presetSentences.map((s, i) => (
            <Paper
              key={i}
              onClick={() => { setSelectedPreset(i); setUseCustom(false); }}
              elevation={!useCustom && selectedPreset === i ? 3 : 1}
              sx={{
                px: 2.5,
                py: 1.5,
                cursor: 'pointer',
                borderRadius: 3,
                border: '2px solid',
                borderColor: !useCustom && selectedPreset === i ? 'primary.main' : 'transparent',
                bgcolor: !useCustom && selectedPreset === i ? '#eef0fb' : 'background.paper',
                transition: 'all 0.18s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Typography sx={{ fontWeight: 600 }}>{s}</Typography>
            </Paper>
          ))}
        </Stack>

        {/* Custom sentence */}
        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            border: '2px solid',
            borderColor: useCustom ? 'primary.main' : 'transparent',
            mb: 3,
          }}
          onClick={() => setUseCustom(true)}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            או הקלידו משפט מותאם אישית:
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="כתבו כאן את המשפט שלכם..."
            value={customSentence}
            onChange={(e) => { setCustomSentence(e.target.value); setUseCustom(true); }}
            onClick={(e) => { e.stopPropagation(); setUseCustom(true); }}
          />
        </Paper>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={startGame}
          sx={{ py: 2, borderRadius: 4, fontSize: '1.1rem', fontWeight: 700 }}
        >
          🎼 פתחו את ההופעה!
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
              p: 5,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '3px solid #f59e0b',
            }}
          >
            <Typography sx={{ fontSize: '4rem', lineHeight: 1, mb: 1.5 }}>🏆</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 900, color: '#92400e' }}>
              התזמורת המנצחת של השפה!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: '#78350f' }}>
              הופעה מרשימה! הכיתה שלנו יודעת לקרוא עם רגש אמיתי
            </Typography>
            <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1.5, mb: 3 }}>
              {SIGNS.map((s) => (
                <Box
                  key={s.char}
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: s.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    color: 'white',
                    fontWeight: 900,
                  }}
                >
                  {s.char}
                </Box>
              ))}
            </Stack>
            <Typography sx={{ fontSize: '2.5rem', mb: 3 }}>⭐ 🎶 ⭐</Typography>
            <Button
              variant="outlined"
              onClick={reset}
              sx={{
                borderRadius: 3,
                fontWeight: 700,
                borderColor: '#d97706',
                color: '#92400e',
                '&:hover': { bgcolor: '#fef3c7' },
              }}
            >
              הופעה נוספת
            </Button>
          </Paper>
        </Fade>
      </Box>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Drama meter */}
      <Stack sx={{ mb: 3, gap: 0.5 }}>
        <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            🎭 מד הדרמה הכיתתית
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {dramaPercent}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={dramaPercent}
          sx={{
            height: 14,
            borderRadius: 7,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              bgcolor: currentSign.color,
              borderRadius: 7,
              transition: 'background-color 0.5s, transform 0.4s',
            },
          }}
        />
      </Stack>

      {/* Sentence */}
      <Paper
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
          borderRadius: 4,
          textAlign: 'center',
          bgcolor: '#f8faff',
          border: `2px solid ${currentSign.color}44`,
          transition: 'border-color 0.4s',
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, letterSpacing: 1, color: '#1e3a5f', lineHeight: 1.4 }}
        >
          {activeSentence}
          <Box
            component="span"
            sx={{
              color: currentSign.color,
              fontWeight: 900,
              ml: 0.5,
              transition: 'color 0.4s',
              fontSize: 'inherit',
            }}
          >
            {currentSign.char}
          </Box>
        </Typography>
      </Paper>

      {/* Sign circle + reading guide */}
      <Stack
        sx={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          mb: 3,
        }}
      >
        {/* Giant punctuation circle */}
        <Box
          sx={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            bgcolor: currentSign.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '4.5rem',
            fontWeight: 900,
            color: 'white',
            flexShrink: 0,
            transition: 'background-color 0.4s',
            animation: transitioning
              ? 'poSwish 0.45s cubic-bezier(0.34,1.56,0.64,1)'
              : 'poPulse 2.5s ease-in-out infinite',
            '@keyframes poSwish': {
              '0%': { transform: 'scale(0.4) rotate(-20deg)', opacity: 0.6 },
              '70%': { transform: 'scale(1.12) rotate(6deg)' },
              '100%': { transform: 'scale(1) rotate(0)', opacity: 1 },
            },
            '@keyframes poPulse': {
              '0%,100%': { boxShadow: `0 0 0 0 ${currentSign.color}50` },
              '50%': { boxShadow: `0 0 0 16px ${currentSign.color}00` },
            },
          }}
        >
          {currentSign.char}
        </Box>

        {/* Label + instruction */}
        <Box>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontSize: '2.5rem', lineHeight: 1 }}>{currentSign.emoji}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: currentSign.color }}>
              {currentSign.label}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 220 }}>
            {currentSign.instruction}
          </Typography>
        </Box>
      </Stack>

      {/* Change sign button */}
      <Stack sx={{ alignItems: 'center', gap: 1.5 }}>
        <Button
          variant="contained"
          size="large"
          onClick={changeSign}
          disabled={transitioning || roundCount >= TOTAL_ROUNDS}
          sx={{
            px: 5,
            py: 1.8,
            fontSize: '1.15rem',
            fontWeight: 700,
            borderRadius: 4,
            bgcolor: currentSign.color,
            '&:hover': { filter: 'brightness(0.9)' },
            '&:disabled': { opacity: 0.45 },
            transition: 'background-color 0.4s',
          }}
        >
          {roundCount >= TOTAL_ROUNDS ? 'כמעט שם! 🎉' : `החלף סימן ${currentSign.emoji}`}
        </Button>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          לחצו אחרי שהכיתה סיימה לקרוא
        </Typography>
      </Stack>
    </Box>
  );
}
