import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import contentData from '../data/content/two-truths-lie-content.json';

// ---------------------------------------------------------------------------
// Example "inspiration bank" — lives in external JSON (see CLAUDE.md → Game
// Content & Architecture Rules), keyed by age cohort. The teacher enters their
// own facts; these example sets seed the field placeholders + a "fill" button.
// ---------------------------------------------------------------------------

interface ExampleSet {
  facts: [string, string, string];
  lieIndex: 0 | 1 | 2;
}

type AgeGroupKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

interface CohortExamples {
  label: string;
  examples: ExampleSet[];
}

const CONTENT = contentData as unknown as Record<AgeGroupKey, CohortExamples>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
  { key: 'junior_high_high', label: CONTENT.junior_high_high.label },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMERALD = '#10b981';
const CONSULT_SECONDS = 60;
const CARD_LABELS = ['א\'', 'ב\'', 'ג\''];

function celebrate(): void {
  confetti({
    particleCount: 220,
    spread: 100,
    startVelocity: 55,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', EMERALD, '#ef5350', '#ffca28', '#ab47bc'],
  });
}

type Stage = 'setup' | 'timer' | 'reveal' | 'victory';

interface Round {
  facts: [string, string, string];
  lieIndex: 0 | 1 | 2;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function TwoTruthsLie({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const [stage, setStage] = useState<Stage>('setup');
  const [round, setRound] = useState<Round | null>(null);
  const [roundCount, setRoundCount] = useState(0);

  useMarkGamePlayed(gameId, stage === 'victory');

  const startRound = (r: Round) => {
    setRound(r);
    setRoundCount((c) => c + 1);
    setStage('timer');
  };

  switch (stage) {
    case 'setup':
      return (
        <SetupScreen
          activeClassName={activeClassroom?.name ?? null}
          presentRoster={presentRoster}
          onStart={startRound}
        />
      );
    case 'timer':
      return (
        <TimerScreen
          round={round!}
          onReveal={() => setStage('reveal')}
        />
      );
    case 'reveal':
      return (
        <RevealScreen
          round={round!}
          onAnother={() => setStage('setup')}
          onEnd={() => setStage('victory')}
        />
      );
    case 'victory':
      return (
        <VictoryScreen
          roundCount={roundCount}
          onReplay={() => {
            setRoundCount(0);
            setStage('setup');
          }}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Setup — HYBRID NAMES + fact entry
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  presentRoster,
  onStart,
}: {
  activeClassName: string | null;
  presentRoster: string[];
  onStart: (r: Round) => void;
}) {
  const hasClass = activeClassName !== null;

  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');
  const [raw, setRaw] = useState('');

  const [facts, setFacts] = useState<[string, string, string]>(['', '', '']);
  const [lieIndex, setLieIndex] = useState<0 | 1 | 2>(2);

  // Age-tiered inspiration bank: drives the field placeholders + a "fill" button.
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('upper_elementary');
  const [exampleIdx, setExampleIdx] = useState(0);
  const examples = CONTENT[ageGroup].examples;
  const currentExample = examples[exampleIdx % examples.length];

  const fillExample = () => {
    setFacts([...currentExample.facts] as [string, string, string]);
    setLieIndex(currentExample.lieIndex);
    setExampleIdx((i) => (i + 1) % examples.length); // next click offers a fresh idea
  };

  const addGuest = () => {
    const name = guestDraft.trim();
    if (name && !guests.includes(name) && !presentRoster.includes(name)) {
      setGuests((g) => [...g, name]);
    }
    setGuestDraft('');
  };

  const parsedNames = hasClass ? [...presentRoster, ...guests] : parseNames(raw);
  const allFilled = facts.every((f) => f.trim().length > 0);

  const setFact = (i: number, val: string) => {
    setFacts((prev) => {
      const next: [string, string, string] = [...prev] as [string, string, string];
      next[i] = val;
      return next;
    });
  };

  const handleStart = () => {
    if (!allFilled) return;
    onStart({ facts, lieIndex });
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 680,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🕵️</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            בלש השקרים של המורה
          </Typography>
          <Typography variant="body1" color="text.secondary">
            הזינו שתי עובדות אמיתיות ושקר אחד. הקבוצות מתייעצות ומצביעות — מי יצליח לתפוס
            אתכם?
          </Typography>

          {/* HYBRID NAMES */}
          {hasClass ? (
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Chip
                icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
                label={`משחקים עם כיתה ${activeClassName} — ${presentRoster.length + guests.length} תלמידים`}
                sx={{
                  bgcolor: EMERALD,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  py: 2.5,
                  px: 1,
                  borderRadius: 16,
                }}
              />
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
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
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
              minRows={3}
              fullWidth
              helperText={
                parsedNames.length
                  ? `זוהו ${parsedNames.length} תלמידים`
                  : 'אפשר לשחק גם ללא רשימת שמות 🎈'
              }
            />
          )}

          {/* AGE COHORT + INSPIRATION */}
          <Stack spacing={1.25} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              בנק רעיונות לפי שכבת גיל:
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={ageGroup}
              onChange={(_, v) => {
                if (v) {
                  setAgeGroup(v as AgeGroupKey);
                  setExampleIdx(0);
                }
              }}
              color="secondary"
              size="small"
              sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {AGE_GROUPS.map((g) => (
                <ToggleButton key={g.key} value={g.key} sx={{ px: 2, py: 0.75, fontWeight: 700 }}>
                  {g.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<LightbulbRoundedIcon />}
              onClick={fillExample}
              sx={{ fontWeight: 700, borderRadius: 16 }}
            >
              מלאו דוגמה להשראה 💡
            </Button>
          </Stack>

          {/* FACTS INPUT */}
          <Box sx={{ width: '100%', textAlign: 'right' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              הזינו 3 עובדות — 2 אמיתיות ואחת שקר:
            </Typography>
            <RadioGroup
              value={String(lieIndex)}
              onChange={(e) => setLieIndex(Number(e.target.value) as 0 | 1 | 2)}
            >
              <Stack spacing={2}>
                {([0, 1, 2] as const).map((i) => (
                  <Paper
                    key={i}
                    elevation={lieIndex === i ? 3 : 1}
                    sx={{
                      p: 2,
                      borderRadius: 4,
                      border: lieIndex === i ? '2px solid #ef5350' : '1.5px solid',
                      borderColor: lieIndex === i ? '#ef5350' : 'divider',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                      <FormControlLabel
                        value={String(i)}
                        control={<Radio color="error" />}
                        label=""
                        sx={{ m: 0, alignSelf: 'center' }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: lieIndex === i ? 'error.main' : 'text.secondary' }}>
                          {CARD_LABELS[i]} {lieIndex === i ? '— זהו השקר 🚨' : ''}
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={`לדוגמה: ${currentExample.facts[i]}`}
                          value={facts[i]}
                          onChange={(e) => setFact(i, e.target.value)}
                          multiline
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </RadioGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              סמנו עם הרדיו איזו עובדה היא השקר (לא יוצג לתלמידים עד החשיפה).
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={!allFilled}
            onClick={handleStart}
            startIcon={<TimerRoundedIcon />}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}
          >
            הציגו לכיתה — מתחיל טיימר!
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Timer — 3 cards + consultation countdown
// ---------------------------------------------------------------------------

function TimerScreen({
  round,
  onReveal,
}: {
  round: Round;
  onReveal: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(CONSULT_SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const pct = (timeLeft / CONSULT_SECONDS) * 100;
  const urgent = timeLeft <= 10;

  return (
    <Stack spacing={3}>
      {/* Timer bar */}
      <Paper elevation={2} sx={{ p: 2, borderRadius: 4 }}>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
              זמן התייעצות
            </Typography>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: 28,
                color: urgent ? 'error.main' : 'primary.main',
                animation: urgent ? 'timerPulse 0.6s ease-in-out infinite' : 'none',
                '@keyframes timerPulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.15)' },
                },
              }}
            >
              {timeLeft}s
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={urgent ? 'error' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Stack>
      </Paper>

      {/* 3 fact cards */}
      <Stack spacing={2}>
        {round.facts.map((fact, i) => (
          <Paper
            key={i}
            elevation={3}
            sx={{
              p: 3,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #f8f9ff 0%, #eef1ff 100%)',
              border: '1.5px solid',
              borderColor: 'primary.light',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Chip
                label={CARD_LABELS[i]}
                color="primary"
                sx={{ fontWeight: 900, fontSize: 20, py: 2.5, px: 0.5, minWidth: 48 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.5, flex: 1 }}>
                {fact}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Button
        variant="contained"
        color="error"
        size="large"
        onClick={onReveal}
        startIcon={<LockOpenRoundedIcon />}
        sx={{ fontWeight: 800, fontSize: 18, py: 1.5 }}
      >
        חשפו את השקר!
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Reveal — truths go green, lie gets stamp animation
// ---------------------------------------------------------------------------

function RevealScreen({
  round,
  onAnother,
  onEnd,
}: {
  round: Round;
  onAnother: () => void;
  onEnd: () => void;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 800, textAlign: 'center' }}>
        🔍 חשיפה!
      </Typography>

      <Stack spacing={2}>
        {round.facts.map((fact, i) => {
          const isLie = i === round.lieIndex;
          return (
            <Paper
              key={i}
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: isLie ? '#fff5f5' : '#f0fdf4',
                border: '2px solid',
                borderColor: isLie ? 'error.main' : 'success.main',
                animation: 'revealPop 0.4s ease',
                animationDelay: `${i * 0.15}s`,
                animationFillMode: 'both',
                '@keyframes revealPop': {
                  '0%': { opacity: 0, transform: 'scale(0.92)' },
                  '100%': { opacity: 1, transform: 'scale(1)' },
                },
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Chip
                  label={CARD_LABELS[i]}
                  sx={{
                    fontWeight: 900,
                    fontSize: 20,
                    py: 2.5,
                    px: 0.5,
                    minWidth: 48,
                    bgcolor: isLie ? 'error.main' : 'success.main',
                    color: 'white',
                  }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.5, flex: 1 }}>
                  {fact}
                </Typography>
              </Stack>

              {/* Stamp overlay for the lie */}
              {isLie && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 16,
                    transform: 'rotate(-18deg)',
                    animation: 'stampDrop 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) 0.3s both',
                    '@keyframes stampDrop': {
                      '0%': { opacity: 0, transform: 'rotate(-18deg) scale(2.2)' },
                      '60%': { transform: 'rotate(-18deg) scale(0.88)' },
                      '100%': { opacity: 1, transform: 'rotate(-18deg) scale(1)' },
                    },
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      border: '3px solid',
                      borderColor: 'error.main',
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.5,
                      bgcolor: 'transparent',
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, fontSize: 22, color: 'error.main', letterSpacing: 3 }}>
                      שֶׁקֶר!
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Paper>
          );
        })}
      </Stack>

      <Paper
        elevation={2}
        sx={{ p: 2.5, borderRadius: 4, bgcolor: 'primary.main', textAlign: 'center' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>
          אי אפשר לעבוד עליכם! 🎉
        </Typography>
      </Paper>

      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          color="primary"
          fullWidth
          startIcon={<AddCircleOutlineRoundedIcon />}
          onClick={onAnother}
          sx={{ fontWeight: 700 }}
        >
          סיבוב נוסף
        </Button>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<LockOpenRoundedIcon />}
          onClick={onEnd}
          sx={{ fontWeight: 700 }}
        >
          סיום וחגיגה!
        </Button>
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Victory
// ---------------------------------------------------------------------------

function VictoryScreen({
  roundCount,
  onReplay,
}: {
  roundCount: number;
  onReplay: () => void;
}) {
  useEffect(() => {
    celebrate();
    const id = window.setTimeout(celebrate, 700);
    return () => window.clearTimeout(id);
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
          background: `linear-gradient(160deg, #ffffff 0%, #e6fbf2 100%)`,
          border: `3px solid ${EMERALD}`,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 72, lineHeight: 1 }}>🏆</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: EMERALD }}>
            אי אפשר לעבוד עליכם!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            שיחקתם {roundCount} {roundCount === 1 ? 'סיבוב' : 'סיבובים'} של שתי אמיתות ושקר.
            הכיתה הוכיחה שהיא בלשים מעולים — לא ניתן לרמות אותה!
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={onReplay}
            sx={{ fontWeight: 800 }}
          >
            שחקו שוב
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
