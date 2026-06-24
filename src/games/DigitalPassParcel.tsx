import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  TextField,
  IconButton,
  Zoom,
  Fade,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import confetti from 'canvas-confetti';

type Task = { emoji: string; text: string };

const TASKS: Task[] = [
  { emoji: '👕', text: 'מצא ילד בכיתה עם חולצה באותו צבע כמו שלך ותן לו גרובי-פיסט!' },
  { emoji: '😂', text: 'נסה להצחיק את המורה בתוך 20 שניות — ללא מגע!' },
  { emoji: '🙏', text: 'בחר חבר מהכיתה ואמור לו תודה על משהו טוב שעשה השבוע.' },
  { emoji: '🕺', text: 'עשה את הריקוד הכי מביך שאתה יודע — 10 שניות שלמות!' },
  { emoji: '📣', text: 'צעק שלוש פעמים: "הכיתה שלנו היא הכיתה הכי טובה!"' },
  { emoji: '🎭', text: 'עשה פרצוף הכי מצחיק שאתה יכול — הכיתה מחקה אחריך!' },
  { emoji: '🌟', text: 'תן מחמאה אמיתית לאחד שיושב לפניך / לידך.' },
  { emoji: '🤸', text: "קפוץ 5 קפיצות ג'אמפינג ג'ק — הכיתה סופרת בקול!" },
  { emoji: '🧩', text: 'ספר לכיתה דבר מפתיע שאף אחד כנראה לא יודע עליך.' },
  { emoji: '🫂', text: 'תן עידוד לשלושה חברים שונים — כל אחד בצורה אחרת!' },
];

const WRAP_COLORS = [
  { bg: '#e91e63', accent: '#f48fb1' },
  { bg: '#1565c0', accent: '#90caf9' },
  { bg: '#e65100', accent: '#ffcc80' },
  { bg: '#6a1b9a', accent: '#ce93d8' },
  { bg: '#2e7d32', accent: '#a5d6a7' },
];

const MUSIC_STYLES = [
  { key: 'pop', emoji: '🎵', label: 'פופ מקפיץ' },
  { key: 'circus', emoji: '🎪', label: 'מוזיקת קרקס' },
  { key: 'hiphop', emoji: '🎤', label: 'היפ הופ' },
];

const TOTAL_ROUNDS = 5;

type NoteEntry = { freq: number; vol: number; dur: number; type?: OscillatorType };

const NOTE_PATTERNS: Record<string, { interval: number; notes: NoteEntry[] }> = {
  pop: {
    interval: 280,
    notes: [
      { freq: 523.25, vol: 0.18, dur: 0.22 },
      { freq: 659.25, vol: 0.18, dur: 0.22 },
      { freq: 783.99, vol: 0.20, dur: 0.28 },
      { freq: 659.25, vol: 0.15, dur: 0.20 },
      { freq: 523.25, vol: 0.18, dur: 0.22 },
      { freq: 392.00, vol: 0.15, dur: 0.18 },
      { freq: 523.25, vol: 0.20, dur: 0.32 },
      { freq: 0, vol: 0, dur: 0 },
    ],
  },
  circus: {
    interval: 230,
    notes: [
      { freq: 523.25, vol: 0.20, dur: 0.25 },
      { freq: 659.25, vol: 0.17, dur: 0.18 },
      { freq: 783.99, vol: 0.19, dur: 0.22 },
      { freq: 1046.5, vol: 0.20, dur: 0.28 },
      { freq: 783.99, vol: 0.16, dur: 0.18 },
      { freq: 659.25, vol: 0.16, dur: 0.18 },
    ],
  },
  hiphop: {
    interval: 440,
    notes: [
      { freq: 130.81, vol: 0.30, dur: 0.30, type: 'square' },
      { freq: 0, vol: 0, dur: 0 },
      { freq: 130.81, vol: 0.22, dur: 0.18, type: 'square' },
      { freq: 146.83, vol: 0.25, dur: 0.22, type: 'square' },
      { freq: 0, vol: 0, dur: 0 },
      { freq: 196.00, vol: 0.22, dur: 0.25, type: 'square' },
      { freq: 0, vol: 0, dur: 0 },
      { freq: 174.61, vol: 0.30, dur: 0.28, type: 'square' },
    ],
  },
};

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private beat = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === 'closed') this.ctx = new AudioContext();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playNote(note: NoteEntry) {
    if (!note.freq || !this.ctx) return;
    try {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = note.type ?? 'sine';
      o.frequency.value = note.freq;
      const t = c.currentTime;
      g.gain.setValueAtTime(note.vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + note.dur + 0.05);
      o.start(t);
      o.stop(t + note.dur + 0.1);
    } catch {}
  }

  start(style: string) {
    this.stop();
    const c = this.getCtx();
    if (!c) return;
    const pattern = NOTE_PATTERNS[style] ?? NOTE_PATTERNS.pop;
    this.beat = 0;
    this.intervalId = setInterval(() => {
      this.playNote(pattern.notes[this.beat % pattern.notes.length]);
      this.beat++;
    }, pattern.interval);
  }

  rip() {
    const c = this.getCtx();
    if (!c) return;
    try {
      const bufSize = c.sampleRate * 0.3;
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = c.createBufferSource();
      const gn = c.createGain();
      src.buffer = buf;
      src.connect(gn);
      gn.connect(c.destination);
      gn.gain.setValueAtTime(0.4, c.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      src.start();
    } catch {}
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const player = new MusicPlayer();

function celebrate() {
  confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 } });
}

type Stage = 'setup' | 'playing' | 'revealed' | 'victory';

export default function DigitalPassParcel({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [musicStyle, setMusicStyle] = useState('pop');

  const [stage, setStage] = useState<Stage>('setup');
  const [round, setRound] = useState(0);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usedIndicesRef = useRef<number[]>([]);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  function pickTask(): Task {
    const available = TASKS.map((_, i) => i).filter(
      (i) => !usedIndicesRef.current.includes(i),
    );
    if (available.length === 0) {
      usedIndicesRef.current = [];
      return TASKS[0];
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    usedIndicesRef.current = [...usedIndicesRef.current, idx];
    return TASKS[idx];
  }

  function doStop() {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    player.stop();
    player.rip();
    setIsPlaying(false);
    setCurrentTask(pickTask());
    setShowCard(false);
    setStage('revealed');
    setTimeout(() => setShowCard(true), 60);
  }

  function startMusic() {
    player.start(musicStyle);
    setIsPlaying(true);
    const delay = 10000 + Math.random() * 15000;
    autoStopRef.current = setTimeout(() => doStop(), delay);
  }

  function advanceRound() {
    const next = round + 1;
    if (next >= TOTAL_ROUNDS) {
      celebrate();
      setStage('victory');
    } else {
      setRound(next);
      setStage('playing');
    }
  }

  function reset() {
    player.stop();
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    autoStopRef.current = null;
    usedIndicesRef.current = [];
    setStage('setup');
    setRound(0);
    setCurrentTask(null);
    setIsPlaying(false);
    setShowCard(false);
  }

  useEffect(() => {
    return () => {
      player.stop();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  const wrap = WRAP_COLORS[round % WRAP_COLORS.length];

  // ── Setup ──────────────────────────────────────────────────────────────────
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

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          בחרו סגנון מוזיקה:
        </Typography>
        <Stack sx={{ gap: 1.5, mb: 4 }}>
          {MUSIC_STYLES.map((s) => (
            <Paper
              key={s.key}
              onClick={() => setMusicStyle(s.key)}
              elevation={musicStyle === s.key ? 3 : 1}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 4,
                border: '2px solid',
                borderColor: musicStyle === s.key ? 'primary.main' : 'transparent',
                bgcolor: musicStyle === s.key ? '#eef0fb' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5">{s.emoji}</Typography>
                <Typography sx={{ fontWeight: 700 }}>{s.label}</Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => setStage('playing')}
          sx={{ py: 2, borderRadius: 4, fontSize: '1.15rem', fontWeight: 700 }}
        >
          🎁 התחילו לשחק!
        </Button>
      </Box>
    );
  }

  // ── Victory ────────────────────────────────────────────────────────────────
  if (stage === 'victory') {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Fade in>
          <Paper sx={{ p: 5, borderRadius: 4, bgcolor: '#10b981', color: 'white' }}>
            <Typography sx={{ fontSize: '4rem', lineHeight: 1, mb: 1.5 }}>🎊</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: 'white' }}>
              ניצחתם יחד!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, opacity: 0.9, lineHeight: 1.7, color: 'white' }}>
              זכיתם ב-5 דקות הפסקה חופשית<br />
              בגלל שיתוף הפעולה המדהים שלכם!
            </Typography>
            <Typography sx={{ fontSize: '3rem', mb: 4 }}>🎁✨🎉</Typography>
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

  // ── Revealed ───────────────────────────────────────────────────────────────
  if (stage === 'revealed' && currentTask) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Chip
          label={`סיבוב ${round + 1} מתוך ${TOTAL_ROUNDS}`}
          variant="outlined"
          sx={{ mb: 3 }}
        />
        <Zoom in={showCard}>
          <Paper
            sx={{
              p: 4,
              mb: 3,
              borderRadius: 4,
              bgcolor: wrap.bg,
              border: `4px solid ${wrap.accent}`,
            }}
          >
            <Typography sx={{ fontSize: '4rem', mb: 2, lineHeight: 1 }}>
              {currentTask.emoji}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.6, color: 'white' }}>
              {currentTask.text}
            </Typography>
          </Paper>
        </Zoom>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={advanceRound}
          sx={{ py: 2, borderRadius: 4, fontWeight: 700, fontSize: '1.1rem' }}
        >
          {round + 1 >= TOTAL_ROUNDS ? '🎁 פתחו את המתנה הסופית!' : 'המשך לסיבוב הבא ▶'}
        </Button>
      </Box>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', p: 3, textAlign: 'center' }}>
      <Chip
        label={`סיבוב ${round + 1} מתוך ${TOTAL_ROUNDS}`}
        variant="outlined"
        sx={{ mb: 3 }}
      />

      {/* Gift box */}
      <Box
        sx={{
          display: 'inline-block',
          mb: 4,
          animation: isPlaying ? 'dppBounce 0.45s ease-in-out infinite alternate' : 'none',
          '@keyframes dppBounce': {
            '0%': { transform: 'translateY(0) rotate(-1.5deg) scale(1)' },
            '100%': { transform: 'translateY(-14px) rotate(1.5deg) scale(1.04)' },
          },
        }}
      >
        <Box
          sx={{
            width: 180,
            height: 160,
            bgcolor: wrap.bg,
            borderRadius: 4,
            border: `6px solid ${wrap.accent}`,
            mx: 'auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Vertical ribbon */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 22,
              bgcolor: wrap.accent,
              opacity: 0.65,
            }}
          />
          {/* Horizontal ribbon */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '38%',
              height: 22,
              bgcolor: wrap.accent,
              opacity: 0.65,
            }}
          />
          {/* Bow */}
          <Typography sx={{ fontSize: '3.5rem', lineHeight: 1, pt: 0.5, position: 'relative', zIndex: 1 }}>
            🎀
          </Typography>
        </Box>
      </Box>

      {/* Music controls */}
      {isPlaying ? (
        <>
          <Button
            fullWidth
            variant="contained"
            size="large"
            color="error"
            startIcon={<StopRoundedIcon />}
            onClick={doStop}
            sx={{ py: 3, borderRadius: 4, fontSize: '1.2rem', fontWeight: 700, mb: 1.5 }}
          >
            עצור מוזיקה
          </Button>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            המוזיקה תעצור לבד בקרוב — העבירו את הכדור!
          </Typography>
        </>
      ) : (
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<PlayArrowRoundedIcon />}
          onClick={startMusic}
          sx={{ py: 3, borderRadius: 4, fontSize: '1.2rem', fontWeight: 700 }}
        >
          נגן מוזיקה ▶
        </Button>
      )}
    </Box>
  );
}
