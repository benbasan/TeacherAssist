import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  Card,
  CardContent,
  Chip,
  Collapse,
  TextField,
  Alert,
  Paper,
} from '@mui/material';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import confetti from 'canvas-confetti';
import { useClassrooms } from '../context/ClassroomContext';
import { DEFAULT_CHORES } from '../types/game.types';
import { parseNames } from '../utils/parseNames';

const EMERALD = '#10b981';
const CARD_COLORS = ['#3f51b5', '#26a69a', '#ab47bc', '#ff9800', '#ef5350', '#10b981', '#5c6bc0'];
const FALLBACK_EMOJI = ['⭐', '🎯', '🌟', '🔔', '🧩', '🎨'];

type Assignments = Record<string, string[]>;

/** In-place-safe Fisher-Yates shuffle returning a new array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deterministic emoji for a chore, by keyword then cycled fallback. */
function choreEmoji(name: string, i: number): string {
  if (name.includes('לוח')) return '🧹';
  if (name.includes('דפ')) return '📄';
  if (name.includes('אור') || name.includes('מזגן')) return '💡';
  if (name.includes('ספרי')) return '📚';
  if (name.includes('ניק') || name.includes('נק')) return '🧽';
  if (name.includes('צמח') || name.includes('גינ')) return '🪴';
  if (name.includes('חלון')) return '🪟';
  if (name.includes('אוכל') || name.includes('מטבח')) return '🍎';
  return FALLBACK_EMOJI[i % FALLBACK_EMOJI.length];
}

function sparkle(): void {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 38,
    origin: { y: 0.55 },
    colors: ['#3f51b5', '#26a69a', '#10b981', '#ffca28', '#ab47bc'],
  });
}

export default function ChoreBoard({ toolId: _toolId }: { toolId?: string }) {
  const {
    activeClassroom,
    activeClassroomId,
    absentStudents,
    saveChoresConfig,
    updateChoreAssignments,
    clearChoreAssignments,
  } = useClassrooms();

  // --- Class mode (cloud-persisted) ----------------------------------------
  if (activeClassroom && activeClassroomId) {
    const presentRoster = activeClassroom.students.filter((n) => !absentStudents.includes(n));
    return (
      <Board
        names={presentRoster}
        chores={activeClassroom.customChoresList}
        assignments={activeClassroom.currentChoreAssignments}
        classBadge={`כיתה ${activeClassroom.name} · ${presentRoster.length} נוכחים`}
        onSetChores={(list) => void saveChoresConfig(activeClassroomId, list)}
        onSetAssignments={(a) => void updateChoreAssignments(activeClassroomId, a)}
        onClear={() => void clearChoreAssignments(activeClassroomId)}
      />
    );
  }

  // --- Guest mode (local state, no cloud) ----------------------------------
  return <GuestChoreBoard />;
}

// ---------------------------------------------------------------------------
// Guest mode: split setup → local-state board
// ---------------------------------------------------------------------------
function GuestChoreBoard() {
  const [configured, setConfigured] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [chores, setChores] = useState<string[]>(DEFAULT_CHORES);
  const [assignments, setAssignments] = useState<Assignments>({});

  const [rawNames, setRawNames] = useState('');
  const [rawChores, setRawChores] = useState(DEFAULT_CHORES.join('\n'));

  if (!configured) {
    const parsedNames = parseNames(rawNames);
    const parsedChores = Array.from(
      new Set(
        rawChores
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    );
    const ready = parsedNames.length > 0 && parsedChores.length > 0;

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Paper
          elevation={4}
          sx={{
            width: '100%',
            maxWidth: 720,
            p: { xs: 3, sm: 4 },
            background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
          }}
        >
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 56, lineHeight: 1 }}>🧹</Typography>
              <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
                לוח תורנויות כיתה חכם
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                הזינו את שמות התלמידים ואת רשימת התפקידים, ונגריל תורנים בצורה הוגנת ואקראית.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <TextField
                label="שמות התלמידים (פסיק או שורה חדשה)"
                placeholder={'נועם\nשירה\nיואב\n...'}
                value={rawNames}
                onChange={(e) => setRawNames(e.target.value)}
                multiline
                minRows={7}
                fullWidth
                helperText={`${parsedNames.length} תלמידים`}
              />
              <TextField
                label="תפקידים / תורנויות (שורה לכל תפקיד)"
                value={rawChores}
                onChange={(e) => setRawChores(e.target.value)}
                multiline
                minRows={7}
                fullWidth
                helperText={`${parsedChores.length} תפקידים`}
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              disabled={!ready}
              onClick={() => {
                setNames(parsedNames);
                setChores(parsedChores);
                setAssignments({});
                setConfigured(true);
              }}
              sx={{ fontWeight: 800, fontSize: 20, py: 1.4, borderRadius: 16 }}
            >
              {ready ? 'המשך ללוח 🚀' : 'הזינו שמות ותפקידים'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Board
      names={names}
      chores={chores}
      assignments={assignments}
      onSetChores={setChores}
      onSetAssignments={setAssignments}
      onClear={() => setAssignments({})}
      onEditNames={() => setConfigured(false)}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared board (presentational; mode-agnostic via handlers)
// ---------------------------------------------------------------------------
function Board({
  names,
  chores,
  assignments,
  classBadge,
  onSetChores,
  onSetAssignments,
  onClear,
  onEditNames,
}: {
  names: string[];
  chores: string[];
  assignments: Assignments;
  classBadge?: string;
  onSetChores: (list: string[]) => void;
  onSetAssignments: (a: Assignments) => void;
  onClear: () => void;
  onEditNames?: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [preview, setPreview] = useState<Assignments | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings draft, re-seeded whenever the saved chores change.
  const [choreDraft, setChoreDraft] = useState<string[]>(chores);
  const [newChore, setNewChore] = useState('');
  useEffect(() => setChoreDraft(chores), [chores]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const assignedCount = useMemo(
    () => Object.values(assignments).reduce((sum, arr) => sum + arr.length, 0),
    [assignments],
  );

  const spin = () => {
    if (spinning) return;
    if (chores.length === 0) {
      setError('הוסיפו לפחות תפקיד אחד בהגדרות.');
      return;
    }
    if (names.length < chores.length) {
      setError(
        `צריך לפחות ${chores.length} תלמידים נוכחים כדי לשבץ את כל התפקידים (כרגע ${names.length}).`,
      );
      return;
    }
    setError(null);
    setSpinning(true);

    // 2s suspense: flicker a random name per chore.
    intervalRef.current = setInterval(() => {
      const flick: Assignments = {};
      chores.forEach((ch) => {
        flick[ch] = [names[Math.floor(Math.random() * names.length)]];
      });
      setPreview(flick);
    }, 80);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;

      // Fair round-robin: each present student assigned exactly once, evenly.
      const shuffled = shuffle(names);
      const result: Assignments = {};
      chores.forEach((ch) => (result[ch] = []));
      shuffled.forEach((student, i) => {
        result[chores[i % chores.length]].push(student);
      });

      setPreview(null);
      setSpinning(false);
      onSetAssignments(result);
      sparkle();
    }, 2000);
  };

  const addChore = () => {
    const c = newChore.trim();
    if (c && !choreDraft.includes(c)) setChoreDraft((d) => [...d, c]);
    setNewChore('');
  };

  return (
    <Stack spacing={3}>
      {/* Header: badge + spin + clear */}
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        {classBadge ? (
          <Chip
            icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
            label={classBadge}
            sx={{ bgcolor: EMERALD, color: 'white', fontWeight: 700, py: 2, borderRadius: 16 }}
          />
        ) : (
          <Chip label={`${names.length} תלמידים · ${chores.length} תפקידים`} color="primary" sx={{ fontWeight: 700 }} />
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<AutorenewRoundedIcon />}
          disabled={spinning}
          onClick={spin}
          sx={{ fontWeight: 800, fontSize: 22, py: 1.5, px: 5, borderRadius: 16 }}
        >
          {spinning ? 'מגריל תורנים…' : 'סובב תורנויות! 🔄'}
        </Button>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
          <Button
            size="small"
            color="secondary"
            startIcon={<SettingsRoundedIcon />}
            onClick={() => setShowSettings((s) => !s)}
            disabled={spinning}
          >
            הגדרת תפקידים
          </Button>
          <Button
            size="small"
            color="inherit"
            startIcon={<DeleteSweepRoundedIcon />}
            onClick={onClear}
            disabled={spinning || assignedCount === 0}
            sx={{ color: 'text.secondary' }}
          >
            נקה לוח 🗑️
          </Button>
          {onEditNames && (
            <Button
              size="small"
              color="inherit"
              startIcon={<EditRoundedIcon />}
              onClick={onEditNames}
              disabled={spinning}
              sx={{ color: 'text.secondary' }}
            >
              ערוך שמות/תפקידים
            </Button>
          )}
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ width: '100%', maxWidth: 520, borderRadius: 16 }}>
            {error}
          </Alert>
        )}
      </Stack>

      {/* Settings panel */}
      <Collapse in={showSettings}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 16 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              עריכת תפקידי התורנות
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {choreDraft.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  onDelete={() => setChoreDraft((d) => d.filter((x) => x !== c))}
                  color="primary"
                  variant="outlined"
                />
              ))}
              {choreDraft.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  אין תפקידים — הוסיפו אחד למטה.
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="תפקיד חדש"
                value={newChore}
                onChange={(e) => setNewChore(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChore();
                  }
                }}
              />
              <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={addChore} sx={{ flexShrink: 0 }}>
                הוסף
              </Button>
            </Stack>
            <Button
              variant="contained"
              disabled={choreDraft.length === 0}
              onClick={() => {
                onSetChores(choreDraft);
                setShowSettings(false);
              }}
              sx={{ fontWeight: 800 }}
            >
              שמור תפקידים
            </Button>
          </Stack>
        </Paper>
      </Collapse>

      {/* Main board */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {chores.map((chore, i) => {
          const color = CARD_COLORS[i % CARD_COLORS.length];
          const shown = (preview ? preview[chore] : assignments[chore]) ?? [];
          const isPreview = Boolean(preview);
          return (
            <Card key={chore} elevation={3} sx={{ height: '100%', borderTop: `6px solid ${color}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                  <span style={{ marginInlineEnd: 6 }}>{choreEmoji(chore, i)}</span>
                  {chore}
                </Typography>
                {shown.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontStyle: 'italic', opacity: 0.8 }}
                  >
                    טרם שובצו תורנים ❓
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {shown.map((name, idx) => (
                      <Chip
                        key={`${name}-${idx}`}
                        label={name}
                        sx={{
                          bgcolor: color,
                          color: '#fff',
                          fontWeight: 700,
                          opacity: isPreview ? 0.6 : 1,
                          transition: 'opacity 0.1s',
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
