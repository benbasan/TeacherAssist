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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import confetti from 'canvas-confetti';

const FLOOR_TARGETS: Record<number, number[]> = {
  3: [3, 6, 2],
  5: [4, 7, 2, 5, 3],
  7: [3, 6, 2, 5, 8, 1, 4],
};

const FLOOR_OPTIONS = [
  { value: 3, emoji: '🏠', label: 'קצר', sub: '3 קומות' },
  { value: 5, emoji: '🏢', label: 'בינוני', sub: '5 קומות' },
  { value: 7, emoji: '🏙️', label: 'ארוך', sub: '7 קומות' },
];

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
  success() {
    const c = this.get();
    if (!c) return;
    try {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(c.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        const t = c.currentTime + i * 0.1;
        g.gain.setValueAtTime(0.01, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t);
        o.stop(t + 0.5);
      });
    } catch {}
  }
  collapse() {
    const c = this.get();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = 'sawtooth';
      const t = c.currentTime;
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.7);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.start(t);
      o.stop(t + 0.7);
    } catch {}
  }
  victory() {
    const c = this.get();
    if (!c) return;
    try {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(c.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        const t = c.currentTime + i * 0.1;
        g.gain.setValueAtTime(0.01, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.start(t);
        o.stop(t + 0.6);
      });
    } catch {}
  }
}

const sfx = new Sfx();

function celebrate() {
  confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
}

type Stage = 'setup' | 'playing' | 'victory';

export default function SilentSyncTower({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const [guestInput, setGuestInput] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [floorCount, setFloorCount] = useState(5);

  const [stage, setStage] = useState<Stage>('setup');
  const [targets, setTargets] = useState<number[]>([]);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [completedFloors, setCompletedFloors] = useState<Set<number>>(new Set());
  const [collapses, setCollapses] = useState(0);
  const [shaking, setShaking] = useState(false);

  useMarkGamePlayed(gameId, stage === 'victory');

  const presentRoster = activeClassroom
    ? (activeClassroom.students ?? []).filter((n) => !absentStudents.includes(n))
    : parseNames(manualInput);

  function startGame() {
    const tgts = FLOOR_TARGETS[floorCount] ?? FLOOR_TARGETS[5];
    setTargets(tgts);
    setCurrentFloor(0);
    setCompletedFloors(new Set());
    setCollapses(0);
    setShaking(false);
    setStage('playing');
  }

  function handleSuccess() {
    const next = currentFloor + 1;
    setCompletedFloors((prev) => new Set([...prev, currentFloor]));
    if (next >= targets.length) {
      sfx.victory();
      celebrate();
      setStage('victory');
    } else {
      sfx.success();
      setCurrentFloor(next);
    }
  }

  function handleCollapse() {
    if (shaking) return;
    sfx.collapse();
    setCollapses((c) => c + 1);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setCurrentFloor(0);
      setCompletedFloors(new Set());
    }, 1000);
  }

  function reset() {
    setStage('setup');
    setTargets([]);
    setCurrentFloor(0);
    setCompletedFloors(new Set());
    setCollapses(0);
    setShaking(false);
  }

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
                sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 600 }}
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
                sx={{
                  bgcolor: 'white',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.85)' },
                }}
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {presentRoster.length} תלמידים
              </Typography>
            )}
          </Paper>
        )}

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          כמה קומות יהיו במגדל?
        </Typography>
        <Stack sx={{ gap: 1.5, mb: 4 }}>
          {FLOOR_OPTIONS.map((opt) => (
            <Paper
              key={opt.value}
              onClick={() => setFloorCount(opt.value)}
              elevation={floorCount === opt.value ? 3 : 1}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderRadius: 4,
                border: '2px solid',
                borderColor: floorCount === opt.value ? 'primary.main' : 'transparent',
                bgcolor: floorCount === opt.value ? '#eef0fb' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5">{opt.emoji}</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {opt.label} — {opt.sub}
                </Typography>
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
          🏗️ בנו את מגדל הסינכרון!
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
            <Typography sx={{ fontSize: '4rem', lineHeight: 1, mb: 1.5 }}>🏙️</Typography>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>
              סינכרון מוחי מוחלט!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.9, lineHeight: 1.7 }}>
              הכיתה שלכם עובדת כמו גוף אחד
            </Typography>
            <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 2, mb: 4 }}>
              <Paper sx={{ px: 3, py: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                <Typography sx={{ fontWeight: 700 }}>🏢 {targets.length} קומות</Typography>
              </Paper>
              <Paper sx={{ px: 3, py: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                <Typography sx={{ fontWeight: 700 }}>💥 {collapses} קריסות</Typography>
              </Paper>
            </Stack>
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

  // ── Playing ────────────────────────────────────────────────────────────────
  const targetNum = targets[currentFloor] ?? 0;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Tower visual */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 3,
          animation: shaking ? 'sstShake 0.8s ease-in-out' : 'none',
          '@keyframes sstShake': {
            '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
            '15%': { transform: 'translateX(-10px) rotate(-1.5deg)' },
            '30%': { transform: 'translateX(10px) rotate(1.5deg)' },
            '45%': { transform: 'translateX(-8px) rotate(-1deg)' },
            '60%': { transform: 'translateX(8px) rotate(1deg)' },
            '75%': { transform: 'translateX(-5px) rotate(-0.5deg)' },
            '90%': { transform: 'translateX(5px) rotate(0.5deg)' },
          },
        }}
      >
        <Stack sx={{ gap: 0.75, alignItems: 'center' }}>
          {targets.map((tgt, i) => {
            const idx = targets.length - 1 - i;
            const isDone = completedFloors.has(idx);
            const isCurrent = idx === currentFloor;

            return (
              <Box
                key={idx}
                sx={{
                  width: isCurrent || isDone ? 280 : Math.max(180, 280 - (idx - currentFloor) * 14),
                  height: isCurrent ? 72 : 50,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  border: '2px solid',
                  borderColor: isDone ? '#d97706' : isCurrent ? 'primary.main' : 'divider',
                  bgcolor: isDone ? '#fef3c7' : isCurrent ? 'primary.main' : 'grey.100',
                  transition: 'all 0.35s ease',
                }}
              >
                {isDone ? (
                  <>
                    <CheckCircleRoundedIcon sx={{ color: '#d97706', fontSize: 18 }} />
                    <Typography sx={{ fontWeight: 700, color: '#92400e' }}>
                      {tgt}
                    </Typography>
                  </>
                ) : isCurrent ? (
                  <Typography
                    sx={{
                      fontSize: '2.5rem',
                      fontWeight: 900,
                      color: 'white',
                      lineHeight: 1,
                      animation: 'sstPulse 2s ease-in-out infinite',
                      '@keyframes sstPulse': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.1)' },
                      },
                    }}
                  >
                    {tgt}
                  </Typography>
                ) : (
                  <Typography sx={{ color: 'text.disabled', fontWeight: 500 }}>
                    {tgt}
                  </Typography>
                )}
              </Box>
            );
          })}
          {/* Foundation */}
          <Box sx={{ width: 320, height: 14, bgcolor: 'grey.400', borderRadius: 2, mt: 0.25 }} />
        </Stack>
      </Box>

      {/* Instruction card */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          textAlign: 'center',
          borderRadius: 4,
          bgcolor: shaking ? '#fef2f2' : '#eef0fb',
          transition: 'background-color 0.3s',
        }}
      >
        {shaking ? (
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
            💥 המגדל קרס! חוזרים מהתחלה...
          </Typography>
        ) : (
          <>
            <Typography variant="h2" sx={{ lineHeight: 1, mb: 0.5, fontWeight: 900, color: 'primary.main' }}>
              {targetNum}
            </Typography>
            <Typography variant="h6" sx={{ mb: 0.5, color: 'text.secondary' }}>
              תלמידים צריכים לקום בו-זמנית
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              ללא דיבור • ללא תיאום • רק סינכרון מחשבתי
            </Typography>
          </>
        )}
      </Paper>

      {/* Action buttons */}
      <Stack sx={{ flexDirection: 'row', gap: 2, mb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<CheckCircleRoundedIcon />}
          onClick={handleSuccess}
          disabled={shaking}
          sx={{
            py: 2.5,
            borderRadius: 4,
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
            fontSize: '1.05rem',
            fontWeight: 700,
          }}
        >
          הצלחנו! 🎉
        </Button>
        <Button
          fullWidth
          variant="contained"
          size="large"
          color="error"
          startIcon={<CancelRoundedIcon />}
          onClick={handleCollapse}
          disabled={shaking}
          sx={{ py: 2.5, borderRadius: 4, fontSize: '1.05rem', fontWeight: 700 }}
        >
          נפסלנו 💥
        </Button>
      </Stack>

      {/* Progress info */}
      <Stack sx={{ flexDirection: 'row', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Chip
          label={`קומה ${currentFloor + 1} מתוך ${targets.length}`}
          variant="outlined"
          size="small"
        />
        {collapses > 0 && (
          <Chip
            label={`${collapses} ${collapses === 1 ? 'קריסה' : 'קריסות'}`}
            color="error"
            variant="outlined"
            size="small"
          />
        )}
      </Stack>
    </Box>
  );
}
