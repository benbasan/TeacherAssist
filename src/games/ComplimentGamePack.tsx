import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Card,
  CardActionArea,
  CardContent,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

// ---------------------------------------------------------------------------
// Shared data & helpers
// ---------------------------------------------------------------------------

/** Single-direction prompts: one student compliments another. */
const PROMPTS: string[] = [
  'על איזו תכונה יפה תרצו לפרגן?',
  'ספרו על רגע שבו הוא/היא גרמו לכם לחייך.',
  'איזה הישג שלו/שלה שווה חגיגה?',
  'על מה תרצו להגיד תודה?',
  'מה הדבר שהכי כיף לעשות איתו/איתה?',
  'איזו מילה טובה הם צריכים לשמוע היום?',
  'במה הם עוזרים לכיתה שלנו?',
];

/** Mutual prompts for two students together. */
const PAIR_PROMPTS: string[] = [
  'שתפו בזיכרון משותף שמשמח אתכם.',
  'ספרו זה לזה תכונה אחת שאתם מעריכים.',
  'מה הדבר הכי כיף שעשיתם יחד השנה?',
  'על מה תרצו להודות זה לזה?',
  'מה למדתם אחד מהשני?',
];

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function celebrate(): void {
  confetti({
    particleCount: 160,
    spread: 80,
    startVelocity: 48,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', '#ffca28', '#ef5350', '#ab47bc'],
  });
}

type Stage = 'names' | 'modeSelect' | 'chain' | 'duo' | 'slot';

// ---------------------------------------------------------------------------
// Root: state machine that switches between the shared input and the 3 modes
// ---------------------------------------------------------------------------

export default function ComplimentGamePack({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();
  // The active class roster, with students marked absent for this session removed.
  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const [stage, setStage] = useState<Stage>('names');
  const [names, setNames] = useState<string[]>(presentRoster);

  const start = (parsed: string[]) => {
    setNames(parsed);
    setStage('modeSelect');
  };

  switch (stage) {
    case 'names':
      return <NamesInput initial={names.length ? names : presentRoster} onStart={start} />;
    case 'modeSelect':
      return (
        <ModeSelect
          count={names.length}
          onPick={(s) => setStage(s)}
          onEditNames={() => setStage('names')}
        />
      );
    case 'chain':
      return <ChainMode names={names} gameId={gameId} onBack={() => setStage('modeSelect')} />;
    case 'duo':
      return <DuoMode names={names} onBack={() => setStage('modeSelect')} />;
    case 'slot':
      return <SlotMode names={names} onBack={() => setStage('modeSelect')} />;
  }
}

// ---------------------------------------------------------------------------
// Phase 1 — Global names input
// ---------------------------------------------------------------------------

function NamesInput({
  initial,
  onStart,
}: {
  initial: string[];
  onStart: (names: string[]) => void;
}) {
  const [raw, setRaw] = useState(initial.join('\n'));
  const parsed = parseNames(raw);
  const tooFew = parsed.length < 2;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 600,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
            🎉
          </Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            ערכת משחקי הפרגונים
          </Typography>
          <Typography variant="body1" color="text.secondary">
            רשימת התלמידים נטענה מהכיתה הפעילה (ללא הנעדרים). אפשר לערוך ידנית — שם
            לכל שורה או מופרד בפסיק — ולבחור אחד משלושת המשחקים.
          </Typography>

          <TextField
            label="שמות התלמידים"
            placeholder={'נועם\nשירה\nיואב\n...'}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText={
              tooFew
                ? 'הזינו לפחות 2 שמות כדי להתחיל (מומלץ כל הכיתה).'
                : `זוהו ${parsed.length} תלמידים 🎈`
            }
          />

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={tooFew}
            onClick={() => onStart(parsed)}
          >
            בואו נתחיל!
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Mode selection
// ---------------------------------------------------------------------------

const MODES: { stage: Stage; title: string; desc: string; icon: typeof LinkRoundedIcon; color: string }[] = [
  {
    stage: 'chain',
    title: 'שרשרת הפרגונים',
    desc: 'כל אחד מפרגן לחבר/ה הבא/ה — עד שכל הכיתה השתתפה.',
    icon: LinkRoundedIcon,
    color: '#3f51b5',
  },
  {
    stage: 'duo',
    title: 'הצמד המנצח',
    desc: 'מזווגים את התלמידים לצמדים שמשתפים רגע משותף.',
    icon: Diversity3RoundedIcon,
    color: '#26a69a',
  },
  {
    stage: 'slot',
    title: 'מכונת המזל של המילים הטובות',
    desc: 'מסובבים את הגלגל ומגלים מי מפרגן, מה, ולמי!',
    icon: CasinoRoundedIcon,
    color: '#ab47bc',
  },
];

function ModeSelect({
  count,
  onPick,
  onEditNames,
}: {
  count: number;
  onPick: (stage: Stage) => void;
  onEditNames: () => void;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          בחרו משחק 🎮
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<AutorenewRoundedIcon />}
          onClick={onEditNames}
        >
          {`ערכו שמות (${count})`}
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <Card
              key={m.stage}
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${m.color}`,
              }}
            >
              <CardActionArea
                onClick={() => onPick(m.stage)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Icon sx={{ fontSize: 56, color: m.color, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {m.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.desc}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

/** Shared "back to mode select" header used by every mode. */
function ModeHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
    >
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<ArrowForwardRoundedIcon />}
        onClick={onBack}
      >
        חזרה לבחירת משחק
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Mode 1 — Compliment Chain (שרשרת הפרגונים)
// ---------------------------------------------------------------------------

interface ChainTurn {
  giver: string;
  receiver: string;
  prompt: string;
}

/**
 * Builds a single cycle covering every student exactly once: a shuffled order
 * where each student compliments the next, and the last closes back to the
 * first. The previous receiver always becomes the next giver.
 */
function buildChain(names: string[]): ChainTurn[] {
  const perm = shuffle(names);
  const n = perm.length;
  return perm.map((receiver, i) => ({
    giver: perm[(i - 1 + n) % n],
    receiver,
    prompt: pick(PROMPTS),
  }));
}

function ChainMode({
  names,
  gameId,
  onBack,
}: {
  names: string[];
  gameId?: string;
  onBack: () => void;
}) {
  const [chain, setChain] = useState<ChainTurn[]>(() => buildChain(names));
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  useMarkGamePlayed(gameId, done);

  const total = chain.length;
  const turn = chain[step];

  const next = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      setDone(true);
      celebrate();
    }
  };

  const restart = () => {
    setChain(buildChain(names));
    setStep(0);
    setDone(false);
  };

  return (
    <Box>
      <ModeHeader title="שרשרת הפרגונים 🔗" onBack={onBack} />

      <Box sx={{ mb: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', mb: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {`${done ? total : step + 1}/${total} ילדים השתתפו`}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={((done ? total : step + 1) / total) * 100}
          sx={{ height: 12, borderRadius: 16 }}
        />
      </Box>

      {done ? (
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="h2" sx={{ fontSize: 56 }}>
              🌟
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              כל הכבוד! השרשרת הושלמה — כל הכיתה פרגנה זה לזה.
            </Typography>
            <Button variant="contained" startIcon={<ReplayRoundedIcon />} onClick={restart}>
              שרשרת חדשה
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Paper
          elevation={4}
          sx={{
            p: { xs: 3, sm: 5 },
            textAlign: 'center',
            background: 'linear-gradient(160deg, #ffffff 0%, #eef0ff 100%)',
          }}
        >
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.4 }}>
              <Box component="span" color="primary.dark">
                {turn.giver}
              </Box>{' '}
              מפרגן/ת ל…{' '}
              <Box component="span" color="secondary.dark">
                {turn.receiver}
              </Box>
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                px: 3,
                py: 2.5,
                bgcolor: 'secondary.light',
                borderColor: 'secondary.main',
                width: '100%',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {turn.prompt}
              </Typography>
            </Paper>

            <Button variant="contained" size="large" onClick={next}>
              {step < total - 1 ? 'הפרגון הבא!' : 'סיימנו את השרשרת 🎉'}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Mode 2 — Dynamic Duo (הצמד המנצח)
// ---------------------------------------------------------------------------

interface Group {
  members: string[];
  prompt: string;
}

/** Pairs students into duos; an odd student joins the last duo as a trio. */
function buildGroups(names: string[]): Group[] {
  const shuffled = shuffle(names);
  const groups: Group[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    groups.push({ members: shuffled.slice(i, i + 2), prompt: pick(PAIR_PROMPTS) });
  }
  // If the last group is a singleton (odd count), merge it into the previous one.
  if (groups.length > 1 && groups[groups.length - 1].members.length === 1) {
    const last = groups.pop()!;
    groups[groups.length - 1].members.push(...last.members);
  }
  return groups;
}

function DuoMode({ names, onBack }: { names: string[]; onBack: () => void }) {
  const [groups, setGroups] = useState<Group[]>(() => buildGroups(names));
  const [index, setIndex] = useState(0);

  const group = groups[index];
  const isLast = index === groups.length - 1;

  const reshuffle = () => {
    setGroups(buildGroups(names));
    setIndex(0);
  };

  return (
    <Box>
      <ModeHeader title="הצמד המנצח 🤝" onBack={onBack} />

      <Stack direction="row" sx={{ mb: 2, justifyContent: 'center' }}>
        <Chip label={`צמד ${index + 1} מתוך ${groups.length}`} color="secondary" />
      </Stack>

      <Paper elevation={4} sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={0}
          sx={{ alignItems: 'stretch', justifyContent: 'center', mb: 3 }}
          divider={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                py: 1,
                fontSize: 32,
              }}
            >
              ＆
            </Box>
          }
        >
          {group.members.map((name) => (
            <Paper
              key={name}
              elevation={2}
              sx={{
                flex: 1,
                py: { xs: 3, sm: 5 },
                textAlign: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {name}
              </Typography>
            </Paper>
          ))}
        </Stack>

        <Paper
          variant="outlined"
          sx={{ px: 3, py: 2.5, bgcolor: 'secondary.light', borderColor: 'secondary.main', textAlign: 'center' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {group.prompt}
          </Typography>
        </Paper>
      </Paper>

      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 3, justifyContent: 'center', flexWrap: 'wrap' }}
        useFlexGap
      >
        {isLast ? (
          <Button variant="contained" startIcon={<ReplayRoundedIcon />} onClick={reshuffle}>
            ערבוב צמדים מחדש
          </Button>
        ) : (
          <Button variant="contained" size="large" onClick={() => setIndex((i) => i + 1)}>
            הצמד הבא!
          </Button>
        )}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Mode 3 — Compliment Slot Machine (מכונת המזל)
// ---------------------------------------------------------------------------

interface SlotResult {
  giver: string;
  prompt: string;
  receiver: string;
}

function SlotMode({ names, onBack }: { names: string[]; onBack: () => void }) {
  const [display, setDisplay] = useState<SlotResult>({ giver: '?', prompt: '?', receiver: '?' });
  const [spinning, setSpinning] = useState(false);
  const [settled, setSettled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Make sure timers never outlive the component.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const randomReceiver = (giver: string) => {
    if (names.length < 2) return giver;
    let r = giver;
    while (r === giver) r = pick(names);
    return r;
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setSettled(false);

    intervalRef.current = setInterval(() => {
      const giver = pick(names);
      setDisplay({ giver, prompt: pick(PROMPTS), receiver: randomReceiver(giver) });
    }, 70);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      const giver = pick(names);
      setDisplay({ giver, prompt: pick(PROMPTS), receiver: randomReceiver(giver) });
      setSpinning(false);
      setSettled(true);
      celebrate();
    }, 1500);
  };

  const slots: { label: string; value: string; color: string }[] = [
    { label: 'המפרגן', value: display.giver, color: '#3f51b5' },
    { label: 'משימת הפרגון', value: display.prompt, color: '#ab47bc' },
    { label: 'המופרגן', value: display.receiver, color: '#26a69a' },
  ];

  return (
    <Box>
      <ModeHeader title="מכונת המזל של המילים הטובות 🎰" onBack={onBack} />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          mb: 3,
        }}
      >
        {slots.map((slot) => (
          <Paper
            key={slot.label}
            elevation={4}
            sx={{
              p: 2,
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              borderTop: `6px solid ${slot.color}`,
              overflow: 'hidden',
            }}
          >
            <Chip label={slot.label} size="small" sx={{ mb: 2 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                transition: spinning ? 'none' : 'transform 0.2s ease',
                opacity: spinning ? 0.55 : 1,
              }}
            >
              {slot.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          color="secondary"
          startIcon={<CasinoRoundedIcon />}
          onClick={spin}
          disabled={spinning}
        >
          {spinning ? 'מסתובב…' : settled ? 'סובבו שוב!' : 'סובבו את הגלגל!'}
        </Button>
      </Stack>
    </Box>
  );
}
