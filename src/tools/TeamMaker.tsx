import { useState } from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  Card,
  CardContent,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
} from '@mui/material';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import confetti from 'canvas-confetti';
import RosterPanel from './RosterPanel';

type Mode = 'count' | 'size'; // A: number of teams | B: students per team

// Playful, palette-colored team identities, cycled across the generated teams.
const TEAM_NAMES = [
  { name: 'צוות האריות', emoji: '🦁', color: '#ff9800' },
  { name: 'צוות הנשרים', emoji: '🦅', color: '#5c6bc0' },
  { name: 'צוות הדולפינים', emoji: '🐬', color: '#26a69a' },
  { name: 'צוות הנמרים', emoji: '🐯', color: '#ef5350' },
  { name: 'צוות הינשופים', emoji: '🦉', color: '#ab47bc' },
  { name: 'צוות השועלים', emoji: '🦊', color: '#ff7043' },
  { name: 'צוות הפנדות', emoji: '🐼', color: '#10b981' },
  { name: 'צוות הזאבים', emoji: '🐺', color: '#78909c' },
];

function teamIdentity(i: number) {
  return TEAM_NAMES[i % TEAM_NAMES.length] ?? { name: `קבוצה ${i + 1}`, emoji: '⭐', color: '#3f51b5' };
}

/** In-place-safe Fisher-Yates shuffle returning a new array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTeams(names: string[], mode: Mode, value: number): string[][] {
  const shuffled = shuffle(names);
  if (mode === 'count') {
    // Exactly `value` teams, sizes balanced (differ by at most one) via round-robin.
    const teams: string[][] = Array.from({ length: value }, () => []);
    shuffled.forEach((name, i) => teams[i % value].push(name));
    return teams;
  }
  // `value` students per team — sequential chunks; the last team takes the remainder.
  const teams: string[][] = [];
  for (let i = 0; i < shuffled.length; i += value) {
    teams.push(shuffled.slice(i, i + value));
  }
  return teams;
}

function celebrate(): void {
  confetti({
    particleCount: 120,
    spread: 75,
    startVelocity: 40,
    origin: { y: 0.6 },
    colors: ['#3f51b5', '#26a69a', '#10b981', '#ffca28', '#ab47bc'],
  });
}

export default function TeamMaker({ toolId: _toolId }: { toolId?: string }) {
  const [stage, setStage] = useState<'setup' | 'play'>('setup');
  const [names, setNames] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('count');
  const [value, setValue] = useState<number>(2);
  const [teams, setTeams] = useState<string[][] | null>(null);

  const max = Math.max(2, names.length);

  const generate = (m: Mode = mode, v: number = value) => {
    setTeams(buildTeams(names, m, v));
    celebrate();
  };

  const changeMode = (m: Mode) => {
    setMode(m);
    setValue(2); // sensible default for both axes
    setTeams(null);
  };

  // --- Setup screen --------------------------------------------------------
  if (stage === 'setup') {
    return (
      <RosterPanel
        emoji="🎲"
        title="מכונת הצוותים והקבוצות"
        intro="טוענים את רשימת התלמידים, בוחרים כמה קבוצות (או כמה תלמידים בכל קבוצה) — ולוחצים ערבב."
        cta="המשך להגדרות ⚙️"
        min={2}
        onReady={(roster) => {
          setNames(roster);
          setMode('count');
          setValue(2);
          setTeams(null);
          setStage('play');
        }}
      />
    );
  }

  // --- Config + output screen ---------------------------------------------
  return (
    <Stack spacing={3}>
      <Box sx={{ textAlign: 'center' }}>
        <Chip label={`${names.length} תלמידים ברשימה`} color="primary" sx={{ fontWeight: 700 }} />
      </Box>

      {/* Mode */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          איך לחלק את הכיתה?
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={mode}
          onChange={(_, m: Mode | null) => m !== null && changeMode(m)}
          color="primary"
          fullWidth
        >
          <ToggleButton value="count" sx={{ fontWeight: 700, py: 1.2 }}>
            חלק לפי מספר קבוצות רצוי
          </ToggleButton>
          <ToggleButton value="size" sx={{ fontWeight: 700, py: 1.2 }}>
            חלק לפי מספר תלמידים בקבוצה
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Value slider */}
      <Box sx={{ px: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          {mode === 'count' ? `מספר קבוצות: ${value}` : `תלמידים בכל קבוצה: ${value}`}
        </Typography>
        <Slider
          value={Math.min(value, max)}
          onChange={(_, v) => setValue(v as number)}
          min={2}
          max={max}
          step={1}
          marks
          valueLabelDisplay="auto"
          color="secondary"
        />
      </Box>

      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<CasinoRoundedIcon />}
        onClick={() => generate()}
        sx={{ fontWeight: 800, fontSize: 20, py: 1.4, borderRadius: 16 }}
      >
        ערבב וצור קבוצות! 🎲
      </Button>

      {/* Output grid */}
      {teams && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
            }}
          >
            {teams.map((members, i) => {
              const team = teamIdentity(i);
              return (
                <Card
                  key={i}
                  elevation={3}
                  sx={{ height: '100%', borderTop: `6px solid ${team.color}` }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        <span style={{ marginInlineEnd: 6 }}>{team.emoji}</span>
                        {team.name}
                      </Typography>
                      <Chip
                        label={members.length}
                        size="small"
                        sx={{ bgcolor: team.color, color: '#fff', fontWeight: 700 }}
                      />
                    </Stack>
                    <Stack spacing={0.5}>
                      {members.map((m) => (
                        <Typography key={m} variant="body1" sx={{ fontWeight: 500 }}>
                          • {m}
                        </Typography>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <Button
            variant="outlined"
            color="secondary"
            size="large"
            startIcon={<AutorenewRoundedIcon />}
            onClick={() => generate()}
            sx={{ fontWeight: 800, borderRadius: 16 }}
          >
            ערבב מחדש 🔄
          </Button>
        </>
      )}

      <Button
        variant="text"
        startIcon={<EditRoundedIcon />}
        onClick={() => setStage('setup')}
        sx={{ alignSelf: 'center' }}
      >
        רשימה חדשה
      </Button>
    </Stack>
  );
}
