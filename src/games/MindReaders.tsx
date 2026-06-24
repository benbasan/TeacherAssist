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
  LinearProgress,
  Fade,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

interface Question {
  text: string;
  options: [string, string, string];
}

const QUESTIONS: Question[] = [
  {
    text: 'אם הייתי מקבל מיליון שקל, הדבר הראשון שהייתי קונה זה...',
    options: ['מחשב גיימינג מטורף', 'כרטיס טיסה סביב העולם', 'תורם הכל לצדקה'],
  },
  {
    text: 'הסיוט הכי גדול שלי בבית הספר זה...',
    options: ['ששכחתי את האוכל בבית', 'מבחן פתע בחשבון', 'להישאר לבד בהפסקה'],
  },
  {
    text: 'כשאני אהיה גדול, הכי סביר שתמצאו אותי עובד בתור...',
    options: ['מפתח אפליקציות', 'וטרינר בגן חיות', 'שחקן ספורט מפורסם'],
  },
  {
    text: 'אם הייתי יכול לקבל סופר-כוח אחד, הייתי בוחר...',
    options: ['לטוס', 'להיות בלתי נראה', 'לנסוע בזמן'],
  },
  {
    text: 'הדבר שהכי מעצבן אותי בכיתה זה...',
    options: ['רעש כשאני מנסה להתרכז', 'כשמישהו לוקח את הדברים שלי', 'שיעורי בית בסוף יום ארוך'],
  },
  {
    text: 'בסוף שבוע מושלם אני הכי אוהב...',
    options: ['לשחק עם חברים בחוץ', 'לשחק משחקי מחשב/מובייל', 'לשכב ולצפות בסדרות'],
  },
  {
    text: 'אם הייתי יכול לבחור את ארוחת הצהריים בבית הספר, הייתי בוחר...',
    options: ['פיצה בכל יום', 'שניצל עם צ\'יפס', 'שוורמה ענקית'],
  },
  {
    text: 'הדבר שהכי גאה בו השנה זה...',
    options: ['שיפרתי בלימודים', 'עזרתי לחבר בזמן קשה', 'למדתי משהו חדש לגמרי'],
  },
];

const ROUNDS = 3;
const EMERALD = '#10b981';
const INDIGO = '#3f51b5';

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 52,
    origin: { y: 0.7 },
    colors: [INDIGO, '#26a69a', EMERALD, '#ffca28', '#ab47bc'],
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Types / stage machine
// ---------------------------------------------------------------------------

type Stage = 'names' | 'pick_transmitter' | 'transmit' | 'class_vote' | 'reveal' | 'summary';

interface RoundResult {
  transmitter: string;
  question: Question;
  secretIdx: number;   // what the transmitter picked
  classIdx: number;    // what the class voted
  match: boolean;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function MindReaders({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const [stage, setStage] = useState<Stage>(
    presentRoster.length >= 2 ? 'pick_transmitter' : 'names',
  );
  const [names, setNames] = useState<string[]>(presentRoster);
  const [questions] = useState<Question[]>(() => shuffle(QUESTIONS).slice(0, ROUNDS * 2));
  const [qIdx, setQIdx] = useState(0);
  const [transmitter, setTransmitter] = useState<string>('');
  const [secretIdx, setSecretIdx] = useState<number | null>(null);
  const [classIdx, setClassIdx] = useState<number | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);

  useMarkGamePlayed(gameId, stage === 'summary');

  const currentQ = questions[qIdx] ?? questions[0];
  const roundNum = results.length + 1;

  const confirmNames = (n: string[]) => {
    setNames(n);
    setStage('pick_transmitter');
  };

  const pickTransmitter = (name: string) => {
    setTransmitter(name);
    setSecretIdx(null);
    setClassIdx(null);
    setStage('transmit');
  };

  const confirmSecret = (idx: number) => {
    setSecretIdx(idx);
    setStage('class_vote');
  };

  const confirmClassVote = (idx: number) => {
    setClassIdx(idx);
    setStage('reveal');
  };

  const nextRound = () => {
    const match = secretIdx === classIdx;
    setResults((r) => [
      ...r,
      { transmitter, question: currentQ, secretIdx: secretIdx!, classIdx: classIdx!, match },
    ]);
    const nextQ = qIdx + 1;
    setQIdx(nextQ);

    if (results.length + 1 >= ROUNDS) {
      if (match) celebrate();
      setStage('summary');
    } else {
      setStage('pick_transmitter');
    }
  };

  switch (stage) {
    case 'names':
      return (
        <NamesScreen
          activeClassName={activeClassroom?.name ?? null}
          presentRoster={presentRoster}
          onConfirm={confirmNames}
        />
      );
    case 'pick_transmitter':
      return (
        <PickTransmitterScreen
          names={names}
          round={roundNum}
          onPick={pickTransmitter}
        />
      );
    case 'transmit':
      return (
        <TransmitScreen
          transmitter={transmitter}
          question={currentQ}
          onConfirm={confirmSecret}
        />
      );
    case 'class_vote':
      return (
        <ClassVoteScreen
          transmitter={transmitter}
          question={currentQ}
          onConfirm={confirmClassVote}
        />
      );
    case 'reveal':
      return (
        <RevealScreen
          transmitter={transmitter}
          question={currentQ}
          secretIdx={secretIdx!}
          classIdx={classIdx!}
          round={roundNum}
          total={ROUNDS}
          onNext={nextRound}
        />
      );
    case 'summary':
      return (
        <SummaryScreen
          results={results}
          onReplay={() => {
            setResults([]);
            setQIdx(0);
            setStage('names');
          }}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Names — HYBRID: Scenario A (class badge + guests) / B (paste-in)
// ---------------------------------------------------------------------------

function NamesScreen({
  activeClassName,
  presentRoster,
  onConfirm,
}: {
  activeClassName: string | null;
  presentRoster: string[];
  onConfirm: (names: string[]) => void;
}) {
  const hasClass = activeClassName !== null;
  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');
  const [raw, setRaw] = useState('');

  const addGuest = () => {
    const n = guestDraft.trim();
    if (n && !guests.includes(n) && !presentRoster.includes(n)) setGuests((g) => [...g, n]);
    setGuestDraft('');
  };

  const players = hasClass ? [...presentRoster, ...guests] : parseNames(raw);
  const canStart = players.length >= 2;

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
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🧠</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            קריאת מחשבות כיתתית
          </Typography>
          <Typography variant="body1" color="text.secondary">
            תלמיד אחד בוחר תשובה בחשאי — האם הכיתה תצליח לקרוא את מחשבותיו?
            כל התאמה מעלה את מד הטלפתיה הכיתתי!
          </Typography>

          {hasClass ? (
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Chip
                icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
                label={`משחקים עם כיתה ${activeClassName} — ${presentRoster.length + guests.length} תלמידים`}
                sx={{ bgcolor: EMERALD, color: 'white', fontWeight: 700, fontSize: 15, py: 2.5, px: 1, borderRadius: 16 }}
              />
              <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: 420, justifyContent: 'center' }}>
                <TextField
                  size="small" fullWidth
                  label="הוסף תלמיד אורח לסיבוב זה"
                  value={guestDraft}
                  onChange={(e) => setGuestDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }}
                />
                <Button variant="outlined" color="secondary" onClick={addGuest}
                  startIcon={<PersonAddAlt1RoundedIcon />} sx={{ flexShrink: 0 }}>
                  הוסף
                </Button>
              </Stack>
              {guests.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
                  {guests.map((g) => (
                    <Chip key={g} label={g} color="secondary" variant="outlined"
                      onDelete={() => setGuests((a) => a.filter((x) => x !== g))} />
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
              multiline minRows={5} fullWidth
              helperText={canStart ? `זוהו ${players.length} תלמידים 🎈` : 'הזינו לפחות 2 שמות כדי להתחיל'}
            />
          )}

          <Button variant="contained" color="primary" size="large" fullWidth
            disabled={!canStart} onClick={() => onConfirm(players)}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}>
            מוכנים לקרוא מחשבות! 🧠
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Pick transmitter
// ---------------------------------------------------------------------------

function PickTransmitterScreen({
  names,
  round,
  onPick,
}: {
  names: string[];
  round: number;
  onPick: (name: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper elevation={4} sx={{
        width: '100%', maxWidth: 580, p: { xs: 3, sm: 5 }, textAlign: 'center',
        background: 'linear-gradient(160deg, #ffffff 0%, #eef1ff 100%)',
      }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Chip label={`סיבוב ${round} מתוך ${ROUNDS}`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
          <Typography sx={{ fontSize: 48, lineHeight: 1 }}>📡</Typography>
          <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 800 }}>
            מי יהיה המשדר הסודי?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            לחצו על שם התלמיד שיגש ללוח ויבחר את תשובתו בחשאי
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
            {names.map((name) => (
              <Chip
                key={name} label={name} onClick={() => onPick(name)}
                sx={{
                  fontWeight: 700, fontSize: 16, py: 3, px: 1.5, cursor: 'pointer',
                  bgcolor: 'primary.main', color: 'white',
                  '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.05)' },
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Transmit — secret selection, hidden after tap
// ---------------------------------------------------------------------------

function TransmitScreen({
  transmitter,
  question,
  onConfirm,
}: {
  transmitter: string;
  question: Question;
  onConfirm: (idx: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePick = (idx: number) => {
    if (picked !== null) return; // already picked
    setPicked(idx);
    timerRef.current = setTimeout(() => {
      setHidden(true);
      setTimeout(() => onConfirm(idx), 600);
    }, 900);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <Stack spacing={3}>
      <Paper elevation={2} sx={{ p: 2, borderRadius: 4, bgcolor: 'primary.main', textAlign: 'center' }}>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center' }}>
          <PsychologyRoundedIcon sx={{ color: 'white', fontSize: 28 }} />
          <Typography sx={{ fontWeight: 800, color: 'white', fontSize: 18 }}>
            {transmitter} — בחר/י בחשאי, ואז הכיתה תנסה לנחש!
          </Typography>
        </Stack>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: '#f8f9ff' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', mb: 2 }}>
          {question.text}
        </Typography>
        <Stack spacing={1.5}>
          {question.options.map((opt, i) => (
            <Fade key={i} in={!(hidden && picked === i)} timeout={500}>
              <Button
                fullWidth variant={picked === i ? 'contained' : 'outlined'}
                color="primary" onClick={() => handlePick(i)}
                disabled={picked !== null && picked !== i}
                sx={{
                  fontWeight: 700, fontSize: 16, py: 1.5, borderRadius: 3,
                  textAlign: 'right', justifyContent: 'flex-start', px: 2.5,
                  ...(picked === i && {
                    animation: 'secretPulse 0.4s ease',
                    '@keyframes secretPulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.04)' },
                      '100%': { transform: 'scale(1)' },
                    },
                  }),
                }}
              >
                {picked === i && !hidden ? '✓ ' : ''}{opt}
              </Button>
            </Fade>
          ))}
        </Stack>
      </Paper>

      {picked === null && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          לחצו על אחת האפשרויות — הבחירה תוסתר מיד מהכיתה 🤫
        </Typography>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Class vote — same 3 options, class picks what THEY think the transmitter chose
// ---------------------------------------------------------------------------

function ClassVoteScreen({
  transmitter,
  question,
  onConfirm,
}: {
  transmitter: string;
  question: Question;
  onConfirm: (idx: number) => void;
}) {
  const [voted, setVoted] = useState<number | null>(null);

  return (
    <Stack spacing={3}>
      <Paper elevation={2} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'secondary.main', textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 800, color: 'white', fontSize: 18 }}>
          🤔 הכיתה מתייעצת — מה בחר/ה {transmitter}?
        </Typography>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: '#f8f9ff' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', mb: 2 }}>
          {question.text}
        </Typography>
        <Stack spacing={1.5}>
          {question.options.map((opt, i) => (
            <Button
              key={i} fullWidth
              variant={voted === i ? 'contained' : 'outlined'}
              color="secondary" onClick={() => setVoted(i)}
              sx={{
                fontWeight: 700, fontSize: 16, py: 1.5, borderRadius: 3,
                textAlign: 'right', justifyContent: 'flex-start', px: 2.5,
              }}
            >
              {opt}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Button
        variant="contained" color="primary" size="large"
        disabled={voted === null} onClick={() => onConfirm(voted!)}
        startIcon={<ArrowForwardRoundedIcon />}
        sx={{ fontWeight: 800, fontSize: 18, py: 1.5 }}
      >
        חשפו את התשובה!
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------

function RevealScreen({
  transmitter,
  question,
  secretIdx,
  classIdx,
  round,
  total,
  onNext,
}: {
  transmitter: string;
  question: Question;
  secretIdx: number;
  classIdx: number;
  round: number;
  total: number;
  onNext: () => void;
}) {
  const match = secretIdx === classIdx;

  useEffect(() => {
    if (match) {
      const id = setTimeout(() => {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: [INDIGO, EMERALD, '#ffca28'] });
      }, 300);
      return () => clearTimeout(id);
    }
  }, [match]);

  return (
    <Stack spacing={3}>
      <Paper elevation={2} sx={{ p: 2, borderRadius: 4, textAlign: 'center',
        bgcolor: match ? EMERALD : 'error.main' }}>
        <Typography sx={{ fontWeight: 900, color: 'white', fontSize: 22 }}>
          {match ? `✨ התאמה מוחית! הכיתה קראה את מחשבות ${transmitter}!` : `❌ הפעם לא צלחה — אין התאמה`}
        </Typography>
      </Paper>

      <Stack spacing={1.5}>
        {question.options.map((opt, i) => {
          const isSecret = i === secretIdx;
          const isClass = i === classIdx;
          const bothHere = isSecret && isClass;
          return (
            <Paper key={i} elevation={2} sx={{
              p: 2, borderRadius: 3,
              border: '2px solid',
              borderColor: isSecret ? EMERALD : isClass ? 'primary.main' : 'divider',
              bgcolor: bothHere ? '#e6fbf2' : isSecret ? '#f0fff8' : isClass ? '#eef1ff' : 'white',
              animation: (isSecret || isClass) ? 'revealBounce 0.4s ease' : 'none',
              '@keyframes revealBounce': {
                '0%': { transform: 'scale(0.94)' },
                '60%': { transform: 'scale(1.03)' },
                '100%': { transform: 'scale(1)' },
              },
            }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 700, flex: 1, fontSize: 16 }}>{opt}</Typography>
                <Stack direction="row" spacing={0.5}>
                  {isSecret && <Chip label={`${transmitter} 🧠`} size="small" sx={{ bgcolor: EMERALD, color: 'white', fontWeight: 700 }} />}
                  {isClass && !isSecret && <Chip label="הכיתה" size="small" color="primary" sx={{ fontWeight: 700 }} />}
                  {bothHere && <Chip label="✨ שניהם!" size="small" sx={{ bgcolor: INDIGO, color: 'white', fontWeight: 700 }} />}
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Button variant="contained" color="primary" size="large" onClick={onNext}
        startIcon={round < total ? <ArrowForwardRoundedIcon /> : <PsychologyRoundedIcon />}
        sx={{ fontWeight: 800, fontSize: 18, py: 1.5 }}>
        {round < total ? `סיבוב ${round + 1}` : 'לתוצאות הטלפתיה!'}
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Summary — telepathy meter
// ---------------------------------------------------------------------------

function SummaryScreen({
  results,
  onReplay,
}: {
  results: RoundResult[];
  onReplay: () => void;
}) {
  const correct = results.filter((r) => r.match).length;
  const pct = Math.round((correct / ROUNDS) * 100);

  const label =
    pct === 100 ? 'סינכרון מוחי מוחלט — הכיתה הזאת קוראת מחשבות!' :
    pct >= 66 ? 'טלפתיה ברמה גבוהה — אתם מכירים אחד את השני!' :
    pct >= 33 ? 'מתחילים לחוש את המחשבות — המשיכו לתרגל!' :
    'הפעם המוחות לא סונכרנו — אבל הכיתה למדה היכרות חדשה!';

  useEffect(() => {
    if (pct >= 66) {
      celebrate();
      const id = setTimeout(celebrate, 700);
      return () => clearTimeout(id);
    }
  }, [pct]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
      <Paper elevation={4} sx={{
        width: '100%', maxWidth: 560, p: { xs: 3, sm: 5 }, textAlign: 'center',
        borderRadius: 16,
        background: `linear-gradient(160deg, #ffffff 0%, #eef1ff 100%)`,
        border: `3px solid ${INDIGO}`,
      }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <PsychologyRoundedIcon sx={{ fontSize: 72, color: 'primary.main' }} />
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 900 }}>
            דוח הטלפתיה הכיתתי
          </Typography>

          {/* Telepathy meter */}
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>מד הטלפתיה</Typography>
              <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: 22 }}>{pct}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={pct} sx={{
              height: 18, borderRadius: 9,
              bgcolor: '#c5cae9',
              '& .MuiLinearProgress-bar': { bgcolor: INDIGO, borderRadius: 9, transition: 'transform 1.2s ease' },
            }} />
          </Box>

          <Chip label={label} sx={{
            bgcolor: pct >= 66 ? EMERALD : 'primary.main',
            color: 'white', fontWeight: 700, fontSize: 14,
            py: 3, px: 2, height: 'auto', borderRadius: 16,
            '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' },
          }} />

          {/* Per-round breakdown */}
          <Stack spacing={1} sx={{ width: '100%' }}>
            {results.map((r, i) => (
              <Paper key={i} elevation={1} sx={{
                p: 1.5, borderRadius: 3,
                border: '1.5px solid', borderColor: r.match ? EMERALD : 'error.light',
                bgcolor: r.match ? '#f0fff8' : '#fff5f5',
              }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 18 }}>{r.match ? '✅' : '❌'}</Typography>
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                    סיבוב {i + 1}: {r.transmitter} — {r.question.options[r.secretIdx]}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Button variant="contained" color="primary" size="large"
            startIcon={<ReplayRoundedIcon />} onClick={onReplay}
            sx={{ fontWeight: 800 }}>
            משחק חדש
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
