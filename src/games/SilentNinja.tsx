import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  TextField,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import SelfImprovementRoundedIcon from '@mui/icons-material/SelfImprovementRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const EMERALD = '#10b981';
const MAX_ROUNDS = 6; // safety cap when playing the elimination variant
const FIXED_ROUNDS = 5; // no-names variant: just count brain-break rounds

/** Loud action commands that get the class moving before the freeze. */
const ACTIONS: string[] = [
  'לרוץ במקום הכי מהר שאפשר! 🏃',
  'לעשות פרצופים מצחיקים אחד לשני! 😜',
  'למחוא כפיים לפי קצב מהיר! 👏',
  'לרקוד כאילו אף אחד לא רואה! 💃',
  'לקפוץ על רגל אחת! 🦵',
  'לנופף בידיים כמו תמנון! 🐙',
  'לחקות חיה שאתם אוהבים! 🦁',
  'להסתובב סביב עצמכם לאט! 🌀',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 95,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', EMERALD, '#ffca28', '#ab47bc'],
  });
}

/**
 * Tiny asset-free Web-Audio helper for the martial-arts juice (gong on freeze,
 * snap on transitions). Lazily creates one AudioContext after the start gesture;
 * everything is wrapped in try/catch so audio is optional.
 */
class Sfx {
  private ctx: AudioContext | null = null;

  resume(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      void this.ctx?.resume();
    } catch {
      /* ignore — audio is optional */
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain: number): void {
    try {
      const ctx = this.ctx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(vol);
      vol.connect(ctx.destination);
      const now = ctx.currentTime;
      vol.gain.setValueAtTime(gain, now);
      vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      /* ignore */
    }
  }

  gong(): void {
    this.tone(160, 0.9, 'sine', 0.35);
    this.tone(80, 1.1, 'triangle', 0.25);
  }

  snap(): void {
    this.tone(640, 0.07, 'square', 0.12);
  }
}

type Stage = 'setup' | 'action' | 'freeze' | 'victory';

// ---------------------------------------------------------------------------
// Root state machine
// ---------------------------------------------------------------------------

export default function SilentNinja({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const sfxRef = useRef<Sfx>(new Sfx());

  const [stage, setStage] = useState<Stage>('setup');
  const [players, setPlayers] = useState<string[]>([]); // full roster for this round
  const [ninjas, setNinjas] = useState<string[]>([]); // still standing
  const [round, setRound] = useState(0);
  const [action, setAction] = useState<string>(ACTIONS[0]);

  const usesNames = players.length > 0;

  useMarkGamePlayed(gameId, stage === 'victory');

  const begin = (names: string[]) => {
    sfxRef.current.resume();
    setPlayers(names);
    setNinjas(names);
    setRound(0);
    nextAction();
  };

  const nextAction = () => {
    setAction(pick(ACTIONS));
    setStage('action');
  };

  // Hidden random delay (3–7s) during the "action" stage, then snap to freeze.
  useEffect(() => {
    if (stage !== 'action') return;
    const delay = 3000 + Math.floor(Math.random() * 4000);
    const id = window.setTimeout(() => {
      sfxRef.current.gong();
      setStage('freeze');
    }, delay);
    return () => window.clearTimeout(id);
  }, [stage]);

  const continueAfterFreeze = (survivors: string[]) => {
    const nextRound = round + 1;
    setRound(nextRound);
    sfxRef.current.snap();

    if (usesNames) {
      setNinjas(survivors);
      if (survivors.length <= 3 || nextRound >= MAX_ROUNDS) {
        setStage('victory');
        return;
      }
    } else if (nextRound >= FIXED_ROUNDS) {
      setStage('victory');
      return;
    }
    nextAction();
  };

  switch (stage) {
    case 'setup':
      return (
        <SetupScreen
          activeClassName={activeClassroom?.name ?? null}
          presentRoster={presentRoster}
          onStart={begin}
        />
      );
    case 'action':
      return <ActionScreen action={action} round={round + 1} />;
    case 'freeze':
      return (
        <FreezeScreen
          ninjas={ninjas}
          usesNames={usesNames}
          onContinue={continueAfterFreeze}
        />
      );
    case 'victory':
      return (
        <VictoryScreen
          champions={usesNames ? ninjas.slice(0, 3) : []}
          onReplay={() => setStage('setup')}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Setup — HYBRID NAMES flow
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  presentRoster,
  onStart,
}: {
  activeClassName: string | null;
  presentRoster: string[];
  onStart: (names: string[]) => void;
}) {
  const hasClass = activeClassName !== null;

  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');
  const [raw, setRaw] = useState('');

  const addGuest = () => {
    const name = guestDraft.trim();
    if (name && !guests.includes(name) && !presentRoster.includes(name)) {
      setGuests((g) => [...g, name]);
    }
    setGuestDraft('');
  };

  const players = hasClass ? [...presentRoster, ...guests] : parseNames(raw);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #eef1ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🥷</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            הנינג'ה השקט
          </Typography>
          <Typography variant="body1" color="text.secondary">
            פורקים אנרגיה עם פקודות תנועה — וברגע שמופיע הנינג'ה, כולם קופאים בדממה!
            מי שזז מתיישב. נמשיך עד שיישארו אלופי הנינג'ה של הכיתה.
          </Typography>

          {/* HYBRID NAMES */}
          {hasClass ? (
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Chip
                icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
                label={`משחקים עם כיתה ${activeClassName}`}
                sx={{
                  bgcolor: EMERALD,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  py: 2.5,
                  px: 1,
                  borderRadius: 16,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {presentRoster.length + guests.length} נינג'ות נכנסים לאימון 🥷
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ width: '100%', maxWidth: 420, justifyContent: 'center' }}
              >
                <TextField
                  size="small"
                  fullWidth
                  label="הוסף תלמיד אורח לסיבוב זה"
                  value={guestDraft}
                  onChange={(e) => setGuestDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGuest();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={addGuest}
                  startIcon={<PersonAddAlt1RoundedIcon />}
                  sx={{ flexShrink: 0 }}
                >
                  הוסף
                </Button>
              </Stack>

              {guests.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
                >
                  {guests.map((g) => (
                    <Chip
                      key={g}
                      label={g}
                      color="secondary"
                      variant="outlined"
                      onDelete={() => setGuests((arr) => arr.filter((x) => x !== g))}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          ) : (
            <TextField
              label="הקלידו או הדביקו את שמות התלמידים (מופרדים בפסיק או שורה חדשה)"
              placeholder={'נועם\nשירה\nיואב\n...'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              multiline
              minRows={5}
              fullWidth
              helperText={
                players.length
                  ? `זוהו ${players.length} נינג'ות — או פשוט שחקו בלי שמות (5 סיבובים)`
                  : 'אפשר לשחק גם בלי שמות (5 סיבובי אימון) — עם שמות נחגוג את האלופים 🥷'
              }
            />
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => onStart(players)}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}
          >
            התחל אימון נינג'ה!
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Action stage — loud movement command, hidden timer ticking behind the scenes
// ---------------------------------------------------------------------------

function ActionScreen({ action, round }: { action: string; round: number }) {
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        borderRadius: 16,
        textAlign: 'center',
        color: 'white',
        background: 'linear-gradient(160deg, #26a69a 0%, #3f51b5 100%)',
        animation: 'snapIn 0.18s ease',
        '@keyframes snapIn': {
          '0%': { opacity: 0, transform: 'scale(0.92)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      }}
    >
      <Stack spacing={4} sx={{ alignItems: 'center' }}>
        <Chip
          label={`סיבוב ${round}`}
          sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700 }}
        />
        <Typography sx={{ fontSize: 48, lineHeight: 1 }}>🎵</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 36, sm: 52 }, lineHeight: 1.2 }}>
          {action}
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 600 }}>
          תזוזו עד שהנינג'ה יופיע...
        </Typography>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Freeze stage — flashing red, gong, eliminate movers
// ---------------------------------------------------------------------------

function FreezeScreen({
  ninjas,
  usesNames,
  onContinue,
}: {
  ninjas: string[];
  usesNames: boolean;
  onContinue: (survivors: string[]) => void;
}) {
  const [survivors, setSurvivors] = useState<string[]>(ninjas);

  const eliminate = (name: string) =>
    setSurvivors((s) => s.filter((n) => n !== name));

  return (
    <Box
      sx={{
        py: 5,
        px: 3,
        borderRadius: 16,
        textAlign: 'center',
        color: 'white',
        background: 'linear-gradient(160deg, #ef5350 0%, #b71c1c 100%)',
        animation: 'freezeFlash 0.6s ease-in-out 2',
        '@keyframes freezeFlash': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.6)' },
        },
      }}
    >
      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: 80, lineHeight: 1 }}>🥷</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 48, sm: 72 }, lineHeight: 1 }}>
          קפא!!!
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          דממה מוחלטת — אל תזוזו כמו נינג'ות אמיתיים!
        </Typography>

        {usesNames && (
          <>
            <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 700 }}>
              מי שזז? הקישו על שמו כדי שיתיישב ({survivors.length} נשארו)
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1, maxWidth: 560 }}
            >
              {survivors.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  onClick={() => eliminate(name)}
                  sx={{
                    bgcolor: 'white',
                    color: '#b71c1c',
                    fontWeight: 700,
                    fontSize: 16,
                    py: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#ffebee' },
                  }}
                />
              ))}
              {survivors.length === 0 && (
                <Typography sx={{ opacity: 0.9 }}>כולם זזו! 😅</Typography>
              )}
            </Stack>
          </>
        )}

        <Button
          variant="contained"
          onClick={() => onContinue(survivors)}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{
            mt: 1,
            bgcolor: 'white',
            color: 'primary.dark',
            fontWeight: 800,
            fontSize: 18,
            py: 1.4,
            px: 4,
            '&:hover': { bgcolor: '#f1f0ff' },
          }}
        >
          המשך לסיבוב הבא
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Victory — calm down, crown the champions
// ---------------------------------------------------------------------------

function VictoryScreen({
  champions,
  onReplay,
}: {
  champions: string[];
  onReplay: () => void;
}) {
  useEffect(() => {
    celebrate();
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 560,
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          borderRadius: 16,
          background: 'linear-gradient(160deg, #ffffff 0%, #e6fbf2 100%)',
          border: `3px solid ${EMERALD}`,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <SelfImprovementRoundedIcon sx={{ fontSize: 72, color: EMERALD }} />
          <Typography variant="h4" sx={{ fontWeight: 900, color: EMERALD }}>
            הכיתה מוכנה ללמידה!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            פרקנו את כל האנרגיה ואספנו את הקשב — נושמים עמוק ומתחילים את השיעור ברוגע. 🧘
          </Typography>

          {champions.length > 0 && (
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                אלופי הנינג'ה של הכיתה 🏆
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}
              >
                {champions.map((name) => (
                  <Chip
                    key={name}
                    label={`🥷 ${name}`}
                    sx={{ bgcolor: EMERALD, color: 'white', fontWeight: 700, py: 2, px: 1 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={onReplay}
            sx={{ fontWeight: 800 }}
          >
            אימון נוסף
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
