import { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  TextField,
  Card,
  CardActionArea,
  CardContent,
  LinearProgress,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import HowToVoteRoundedIcon from '@mui/icons-material/HowToVoteRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';
import contentData from '../data/content/would-you-rather-content.json';

// ---------------------------------------------------------------------------
// Dilemma data — pools live in external JSON (see CLAUDE.md → Game Content &
// Architecture Rules), keyed by age cohort then by pack.
// ---------------------------------------------------------------------------

interface Dilemma {
  a: string;
  b: string;
}

interface PackData {
  label: string;
  icon: string;
  dilemmas: Dilemma[];
}

type AgeGroupKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

interface CohortPacks {
  label: string;
  packs: Record<string, PackData>;
}

const CONTENT = contentData as unknown as Record<AgeGroupKey, CohortPacks>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
  { key: 'junior_high_high', label: CONTENT.junior_high_high.label },
];

function celebrate(): void {
  confetti({
    particleCount: 180,
    spread: 90,
    startVelocity: 48,
    origin: { y: 0.7 },
    colors: ['#ef6c00', '#7b1fa2', '#26a69a', '#3f51b5', '#ffca28'],
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoteResult {
  dilemma: Dilemma;
  countA: number;
  countB: number;
}

type Stage = 'setup' | 'question' | 'reveal' | 'summary';

const EMERALD = '#10b981';
const ORANGE = '#ef6c00';
const PURPLE = '#7b1fa2';

// ---------------------------------------------------------------------------
// Root state machine
// ---------------------------------------------------------------------------

export default function WouldYouRather({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const [stage, setStage] = useState<Stage>('setup');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('upper_elementary');
  const [players, setPlayers] = useState<string[]>([]);
  const [packKey, setPackKey] = useState<string>('superpower');
  const [dilemmas, setDilemmas] = useState<Dilemma[]>([]);
  const [dilemmaIdx, setDilemmaIdx] = useState(0);
  const [countA, setCountA] = useState(0);
  const [countB, setCountB] = useState(0);
  const [results, setResults] = useState<VoteResult[]>([]);

  useMarkGamePlayed(gameId, stage === 'summary');

  const start = (names: string[], key: string) => {
    setPlayers(names);
    setPackKey(key);
    const shuffled = [...CONTENT[ageGroup].packs[key].dilemmas].sort(() => Math.random() - 0.5);
    setDilemmas(shuffled);
    setDilemmaIdx(0);
    setCountA(0);
    setCountB(0);
    setResults([]);
    setStage('question');
  };

  const reveal = () => {
    setResults((r) => [
      ...r,
      { dilemma: dilemmas[dilemmaIdx], countA, countB },
    ]);
    setStage('reveal');
  };

  const nextDilemma = () => {
    const next = dilemmaIdx + 1;
    if (next >= dilemmas.length) {
      celebrate();
      setStage('summary');
    } else {
      setDilemmaIdx(next);
      setCountA(0);
      setCountB(0);
      setStage('question');
    }
  };

  const currentDilemma = dilemmas[dilemmaIdx] ?? dilemmas[0];
  const totalExpected = players.length;

  switch (stage) {
    case 'setup':
      return (
        <SetupScreen
          activeClassName={activeClassroom?.name ?? null}
          presentRoster={presentRoster}
          packs={CONTENT[ageGroup].packs}
          ageGroup={ageGroup}
          onAgeGroupChange={setAgeGroup}
          onStart={start}
        />
      );
    case 'question':
      return (
        <QuestionScreen
          dilemma={currentDilemma}
          round={dilemmaIdx + 1}
          total={dilemmas.length}
          totalExpected={totalExpected}
          countA={countA}
          countB={countB}
          setCountA={setCountA}
          setCountB={setCountB}
          onReveal={reveal}
        />
      );
    case 'reveal':
      return (
        <RevealScreen
          dilemma={currentDilemma}
          countA={countA}
          countB={countB}
          isLast={dilemmaIdx + 1 >= dilemmas.length}
          onNext={nextDilemma}
        />
      );
    case 'summary':
      return (
        <SummaryScreen
          pack={CONTENT[ageGroup].packs[packKey]}
          results={results}
          onReplay={() => setStage('setup')}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Setup — HYBRID NAMES + pack selection
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  presentRoster,
  packs,
  ageGroup,
  onAgeGroupChange,
  onStart,
}: {
  activeClassName: string | null;
  presentRoster: string[];
  packs: Record<string, PackData>;
  ageGroup: AgeGroupKey;
  onAgeGroupChange: (g: AgeGroupKey) => void;
  onStart: (names: string[], packKey: string) => void;
}) {
  const hasClass = activeClassName !== null;

  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');
  const [raw, setRaw] = useState('');
  const packKeys = Object.keys(packs);
  const [packKey, setPackKey] = useState(packKeys[0]);
  // Keep the selected pack valid when the cohort (and thus its packs) changes.
  const activePackKey = packKeys.includes(packKey) ? packKey : packKeys[0];

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
          maxWidth: 680,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f3f0ff 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🤔</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            זה או זה? — משפט הכיתה
          </Typography>
          <Typography variant="body1" color="text.secondary">
            שאלת "זה או זה?" מוצגת על הלוח — התלמידים עוברים לצד ימין (A) או שמאל (B).
            המורה מזין את הספירה ורואה את "פרופיל הכיתה" מתגבש בזמן אמת.
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
                {presentRoster.length + guests.length} תלמידים נוכחים (ישמש כסה"כ לחישוב אחוזים)
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
              minRows={4}
              fullWidth
              helperText={
                players.length
                  ? `זוהו ${players.length} תלמידים — ישמש כסה"כ לאחוזים`
                  : 'אפשר גם ללא שמות — הזינו ספירה ידנית בכל שאלה 🎈'
              }
            />
          )}

          {/* AGE COHORT */}
          <Stack spacing={1.25} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              לאיזו שכבת גיל מתאימות הדילמות?
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={ageGroup}
              onChange={(_, v) => v && onAgeGroupChange(v as AgeGroupKey)}
              color="secondary"
              sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {AGE_GROUPS.map((g) => (
                <ToggleButton key={g.key} value={g.key} sx={{ px: 2.5, py: 1, fontWeight: 700 }}>
                  {g.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          {/* PACK SELECTION */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              בחרו חבילת נושאים
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                width: '100%',
              }}
            >
              {packKeys.map((key) => {
                const pack = packs[key];
                const selected = activePackKey === key;
                return (
                  <Card
                    key={key}
                    elevation={selected ? 4 : 1}
                    sx={{
                      border: selected ? '2.5px solid' : '1.5px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderRadius: 4,
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPackKey(key)}
                  >
                    <CardActionArea>
                      <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 32, lineHeight: 1.2 }}>{pack.icon}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: selected ? 800 : 600 }}>
                          {pack.label}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => onStart(players, activePackKey)}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}
          >
            מתחילים! {packs[activePackKey].icon}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Question — split-screen dilemma, teacher enters vote counts
// ---------------------------------------------------------------------------

function CountStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
      <IconButton
        onClick={() => onChange(Math.max(0, value - 1))}
        sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' } }}
      >
        <RemoveRoundedIcon />
      </IconButton>
      <Typography sx={{ fontWeight: 900, fontSize: 52, color: 'white', minWidth: 64, textAlign: 'center' }}>
        {value}
      </Typography>
      <IconButton
        onClick={() => onChange(value + 1)}
        sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.4)' } }}
      >
        <AddRoundedIcon />
      </IconButton>
    </Stack>
  );
}

function QuestionScreen({
  dilemma,
  round,
  total,
  totalExpected,
  countA,
  countB,
  setCountA,
  setCountB,
  onReveal,
}: {
  dilemma: Dilemma;
  round: number;
  total: number;
  totalExpected: number;
  countA: number;
  countB: number;
  setCountA: (v: number) => void;
  setCountB: (v: number) => void;
  onReveal: () => void;
}) {
  const totalVotes = countA + countB;
  const ready = totalVotes > 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
        <Chip label={`שאלה ${round} מתוך ${total}`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
        {totalExpected > 0 && (
          <Chip
            label={`${totalVotes} / ${totalExpected} הצביעו`}
            sx={{ fontWeight: 700, bgcolor: totalVotes === totalExpected ? EMERALD : undefined, color: totalVotes === totalExpected ? 'white' : undefined }}
          />
        )}
      </Stack>

      {/* Split screen */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          animation: 'wyrSnap 0.2s ease',
          '@keyframes wyrSnap': {
            '0%': { opacity: 0, transform: 'scale(0.95)' },
            '100%': { opacity: 1, transform: 'scale(1)' },
          },
        }}
      >
        {/* Option A — orange (right in RTL) */}
        <Paper
          elevation={4}
          sx={{
            bgcolor: ORANGE,
            borderRadius: 6,
            p: 3,
            textAlign: 'center',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1 }}>א'</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 18 }, lineHeight: 1.4 }}>
            {dilemma.a}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            לצד ימין! ←
          </Typography>
          <CountStepper value={countA} onChange={setCountA} />
        </Paper>

        {/* Option B — purple (left in RTL) */}
        <Paper
          elevation={4}
          sx={{
            bgcolor: PURPLE,
            borderRadius: 6,
            p: 3,
            textAlign: 'center',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1 }}>ב'</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 18 }, lineHeight: 1.4 }}>
            {dilemma.b}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            → לצד שמאל!
          </Typography>
          <CountStepper value={countB} onChange={setCountB} />
        </Paper>
      </Box>

      <Button
        variant="contained"
        color="secondary"
        size="large"
        disabled={!ready}
        onClick={onReveal}
        startIcon={<BarChartRoundedIcon />}
        sx={{ fontWeight: 800, fontSize: 18, py: 1.5 }}
      >
        חשפו תוצאות!
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Reveal — animated result bars
// ---------------------------------------------------------------------------

function RevealScreen({
  dilemma,
  countA,
  countB,
  isLast,
  onNext,
}: {
  dilemma: Dilemma;
  countA: number;
  countB: number;
  isLast: boolean;
  onNext: () => void;
}) {
  const total = countA + countB || 1;
  const pctA = Math.round((countA / total) * 100);
  const pctB = 100 - pctA;
  const winnerA = countA >= countB;

  return (
    <Stack spacing={3}>
      <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 800, textAlign: 'center' }}>
        📊 תוצאות הסיבוב
      </Typography>

      {/* Bar A */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 4, border: winnerA ? `2.5px solid ${ORANGE}` : undefined }}>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: ORANGE }}>א' — {countA} תלמידים</Typography>
            <Typography sx={{ fontWeight: 900, color: ORANGE, fontSize: 24 }}>{pctA}%</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pctA}
            sx={{
              height: 18,
              borderRadius: 9,
              bgcolor: '#ffe0cc',
              '& .MuiLinearProgress-bar': { bgcolor: ORANGE, borderRadius: 9, transition: 'transform 1s ease' },
            }}
          />
          <Typography variant="body2" color="text.secondary">{dilemma.a}</Typography>
          {winnerA && <Chip label="🏆 הצד הגדול יותר!" sx={{ bgcolor: ORANGE, color: 'white', fontWeight: 700, alignSelf: 'flex-start' }} />}
        </Stack>
      </Paper>

      {/* Bar B */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 4, border: !winnerA ? `2.5px solid ${PURPLE}` : undefined }}>
        <Stack spacing={1}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: PURPLE }}>ב' — {countB} תלמידים</Typography>
            <Typography sx={{ fontWeight: 900, color: PURPLE, fontSize: 24 }}>{pctB}%</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pctB}
            sx={{
              height: 18,
              borderRadius: 9,
              bgcolor: '#f3e5f5',
              '& .MuiLinearProgress-bar': { bgcolor: PURPLE, borderRadius: 9, transition: 'transform 1s ease' },
            }}
          />
          <Typography variant="body2" color="text.secondary">{dilemma.b}</Typography>
          {!winnerA && <Chip label="🏆 הצד הגדול יותר!" sx={{ bgcolor: PURPLE, color: 'white', fontWeight: 700, alignSelf: 'flex-start' }} />}
        </Stack>
      </Paper>

      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={onNext}
        startIcon={isLast ? <HowToVoteRoundedIcon /> : <ArrowForwardRoundedIcon />}
        sx={{ fontWeight: 800, fontSize: 18, py: 1.5 }}
      >
        {isLast ? 'לפרופיל הכיתה!' : 'הדילמה הבאה'}
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Summary — class profile
// ---------------------------------------------------------------------------

const CLASS_PROFILES: { minPctA: number; label: string }[] = [
  { minPctA: 70, label: 'כיתה של חלומות ועל-על! כולם בצד א\' 😄' },
  { minPctA: 55, label: 'כיתה עם נטייה ברורה — אבל עם דעות שונות ומעניינות!' },
  { minPctA: 45, label: 'כיתה מאוזנת שאוהבת לחשוב בכל הכיוונים! ⚖️' },
  { minPctA: 30, label: 'כיתה של אנשים שחושבים מחוץ לקופסה — רוב בצד ב\'!' },
  { minPctA: 0, label: 'כיתה עם אישיות ייחודית לגמרי — כולם אוהבים ב\' 🎯' },
];

function SummaryScreen({
  pack,
  results,
  onReplay,
}: {
  pack: PackData;
  results: VoteResult[];
  onReplay: () => void;
}) {
  const totalA = results.reduce((s, r) => s + r.countA, 0);
  const totalB = results.reduce((s, r) => s + r.countB, 0);
  const grandTotal = totalA + totalB || 1;
  const overallPctA = Math.round((totalA / grandTotal) * 100);
  const profile =
    CLASS_PROFILES.find((p) => overallPctA >= p.minPctA) ??
    CLASS_PROFILES[CLASS_PROFILES.length - 1];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 620,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderRadius: 16,
          background: 'linear-gradient(160deg, #ffffff 0%, #f3e5f5 100%)',
          border: `3px solid ${PURPLE}`,
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>{pack.icon}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: PURPLE }}>
            פרופיל הכיתה
          </Typography>
          <Chip
            label={profile.label}
            sx={{
              bgcolor: PURPLE,
              color: 'white',
              fontWeight: 700,
              fontSize: 15,
              py: 3,
              px: 2,
              height: 'auto',
              borderRadius: 16,
              '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' },
            }}
          />

          {/* Per-question mini bars */}
          <Stack spacing={1.5} sx={{ width: '100%', textAlign: 'right' }}>
            {results.map((r, i) => {
              const t = r.countA + r.countB || 1;
              const pA = Math.round((r.countA / t) * 100);
              return (
                <Box key={i} sx={{ width: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    שאלה {i + 1}: {r.countA} א' · {r.countB} ב'
                  </Typography>
                  <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mt: 0.5 }}>
                    <Box sx={{ width: `${pA}%`, bgcolor: ORANGE, transition: 'width 0.8s ease' }} />
                    <Box sx={{ width: `${100 - pA}%`, bgcolor: PURPLE, transition: 'width 0.8s ease' }} />
                  </Box>
                </Box>
              );
            })}
          </Stack>

          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<ReplayRoundedIcon />}
            onClick={onReplay}
            sx={{ fontWeight: 800 }}
          >
            סיבוב נוסף
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
