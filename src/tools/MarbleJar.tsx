import { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  Alert,
  AlertTitle,
  Collapse,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Paper,
} from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ClassRoundedIcon from '@mui/icons-material/ClassRounded';
import { Link as RouterLink } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useClassrooms } from '../context/ClassroomContext';

const TEAL = '#26a69a';
const INDIGO = '#3f51b5';
const GLASS = '#b2dfdb';
const GOAL_OPTIONS = [20, 30, 50];

// Playful pastels for the marbles, picked deterministically by index.
const PASTELS = ['#f8bbd0', '#b2ebf2', '#c5e1a5', '#ffe0b2', '#d1c4e9', '#fff9c4', '#b3e5fc'];

function celebrate(): void {
  confetti({
    particleCount: 220,
    spread: 100,
    startVelocity: 55,
    origin: { y: 0.6 },
    colors: ['#3f51b5', '#26a69a', '#10b981', '#ffca28', '#ab47bc', '#f8bbd0'],
  });
}

/** Tiny asset-free success arpeggio (best-effort; silently ignored if blocked). */
function playSuccessTone(): void {
  try {
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    /* audio is best-effort */
  }
}

export default function MarbleJar({ toolId: _toolId }: { toolId?: string }) {
  const { activeClassroom, activeClassroomId, updateMarbles, setMarbleGoal, resetMarbleJar } =
    useClassrooms();

  // --- Scenario A — no active class (signed-out guest): no cloud to save to ---
  if (!activeClassroom || !activeClassroomId) {
    return (
      <Stack spacing={3} sx={{ alignItems: 'center', py: 2 }}>
        <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🫙</Typography>
        <Alert severity="info" sx={{ width: '100%', maxWidth: 560, borderRadius: 16 }}>
          <AlertTitle sx={{ fontWeight: 800 }}>צריך כיתה פעילה</AlertTitle>
          צנצנת השיש שומרת את ההתקדמות בענן לכל כיתה בנפרד — לכן צריך לבחור (או ליצור) כיתה פעילה
          כדי להתחיל לצבור גולות.
        </Alert>
        <Button
          component={RouterLink}
          to="/dashboard"
          variant="contained"
          size="large"
          startIcon={<ClassRoundedIcon />}
          sx={{ fontWeight: 800, borderRadius: 16 }}
        >
          בחרו או צרו כיתה
        </Button>
      </Stack>
    );
  }

  return (
    <MarbleJarActive
      key={activeClassroomId}
      classId={activeClassroomId}
      className={activeClassroom.name}
      count={activeClassroom.marblesCount}
      target={activeClassroom.marblesTarget}
      reward={activeClassroom.marblesReward}
      onUpdate={updateMarbles}
      onSetGoal={setMarbleGoal}
      onReset={resetMarbleJar}
    />
  );
}

// ---------------------------------------------------------------------------
// Active jar (Scenario B) — keyed by class id so drafts re-seed per class.
// ---------------------------------------------------------------------------
function MarbleJarActive({
  classId,
  className,
  count,
  target,
  reward,
  onUpdate,
  onSetGoal,
  onReset,
}: {
  classId: string;
  className: string;
  count: number;
  target: number;
  reward: string;
  onUpdate: (id: string, amount: number) => Promise<void>;
  onSetGoal: (id: string, target: number, reward: string) => Promise<void>;
  onReset: (id: string) => Promise<void>;
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [goalDraft, setGoalDraft] = useState(target);
  const [rewardDraft, setRewardDraft] = useState(reward);

  const full = count >= target;

  // Celebrate once whenever the jar reaches its goal.
  useEffect(() => {
    if (full) {
      celebrate();
      playSuccessTone();
    }
  }, [full]);

  // --- Victory view --------------------------------------------------------
  if (full) {
    return (
      <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: 4 }}>
        <Typography sx={{ fontSize: 88, lineHeight: 1 }}>🏆</Typography>
        <Typography variant="h3" color="primary.dark" sx={{ fontWeight: 900 }}>
          כל הכבוד! הצנצנת מלאה!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          כיתה {className} השיגה את היעד 🎉
        </Typography>
        <Paper
          elevation={3}
          sx={{
            px: 4,
            py: 3,
            borderRadius: 16,
            background: 'linear-gradient(160deg, #fffde7 0%, #fff3e0 100%)',
            border: `3px dashed ${INDIGO}`,
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            הפרס שלכם
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            🎁 {reward}
          </Typography>
        </Paper>
        <Button
          variant="contained"
          size="large"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => onReset(classId)}
          sx={{ fontWeight: 800, fontSize: 20, py: 1.4, px: 4, borderRadius: 16 }}
        >
          התחל צנצנת חדשה 🔄
        </Button>
      </Stack>
    );
  }

  // --- Jar + controls ------------------------------------------------------
  const pct = target > 0 ? (count / target) * 100 : 0;

  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      {/* Header row: progress + settings toggle */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ width: '100%', maxWidth: 420, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {count} / {target} גולות
        </Typography>
        <Button
          size="small"
          color="secondary"
          startIcon={<SettingsRoundedIcon />}
          onClick={() => setShowConfig((s) => !s)}
        >
          הגדרות יעד
        </Button>
      </Stack>

      {/* Collapsible config panel */}
      <Collapse in={showConfig} sx={{ width: '100%', maxWidth: 420 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 16 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                כמה גולות צריך כדי למלא את הצנצנת?
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                color="primary"
                value={goalDraft}
                onChange={(_, v: number | null) => v !== null && setGoalDraft(v)}
              >
                {GOAL_OPTIONS.map((g) => (
                  <ToggleButton key={g} value={g} sx={{ fontWeight: 700 }}>
                    {g}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <TextField
              label="הפרס הכיתתי"
              placeholder="למשל: מסיבת פיצה"
              value={rewardDraft}
              onChange={(e) => setRewardDraft(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={() => {
                void onSetGoal(classId, goalDraft, rewardDraft.trim() || "צ'ופר כיתתי");
                setShowConfig(false);
              }}
              sx={{ fontWeight: 800 }}
            >
              שמור יעד
            </Button>
          </Stack>
        </Paper>
      </Collapse>

      {/* The glass jar */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          minHeight: 280,
          p: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-end',
          justifyContent: 'center',
          gap: 0.75,
          border: `4px solid ${GLASS}`,
          borderTop: '4px solid rgba(178,223,219,0.4)',
          borderRadius: '0 0 40px 40px',
          background: 'linear-gradient(180deg, rgba(224,247,250,0.25) 0%, rgba(178,223,219,0.35) 100%)',
          overflow: 'hidden',
          '@keyframes mjDrop': {
            '0%': { transform: 'translateY(-260px)', opacity: 0 },
            '70%': { transform: 'translateY(12px)', opacity: 1 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          },
        }}
      >
        {count === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ alignSelf: 'center', fontWeight: 600, opacity: 0.7 }}
          >
            הצנצנת ריקה — הוסיפו את הגולה הראשונה! 🪄
          </Typography>
        ) : (
          Array.from({ length: count }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: PASTELS[i % PASTELS.length],
                boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.15)',
                animation: 'mjDrop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))
        )}
      </Box>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ width: '100%', maxWidth: 420, height: 12, borderRadius: 16 }}
      />

      {/* Control buttons */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}
      >
        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={() => void onUpdate(classId, 1)}
          sx={{ bgcolor: TEAL, fontWeight: 800, fontSize: 20, py: 1.4, px: 3, borderRadius: 16, '&:hover': { bgcolor: '#1f8e83' } }}
        >
          +1 גולה
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => void onUpdate(classId, 3)}
          sx={{ bgcolor: INDIGO, fontWeight: 800, fontSize: 20, py: 1.4, px: 3, borderRadius: 16, '&:hover': { bgcolor: '#303f9f' } }}
        >
          +3 גולות! (הצטיינות) ⭐
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          size="large"
          startIcon={<RemoveRoundedIcon />}
          disabled={count === 0}
          onClick={() => void onUpdate(classId, -1)}
          sx={{ fontWeight: 700, py: 1.4, px: 3, borderRadius: 16, color: 'text.secondary' }}
        >
          -1 גולה
        </Button>
      </Stack>
    </Stack>
  );
}
