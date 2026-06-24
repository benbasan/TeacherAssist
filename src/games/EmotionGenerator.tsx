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
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import TheaterComedyRoundedIcon from '@mui/icons-material/TheaterComedyRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useClassrooms, useMarkGamePlayed } from '../context/ClassroomContext';
import { parseNames } from '../utils/parseNames';

// ---------------------------------------------------------------------------
// Slot data
// ---------------------------------------------------------------------------

const EMOTIONS = [
  { label: 'שמחה', emoji: '😄' },
  { label: 'עצב', emoji: '😢' },
  { label: 'כעס', emoji: '😠' },
  { label: 'בהלה', emoji: '😱' },
  { label: 'התרגשות', emoji: '🤩' },
  { label: 'קנאה', emoji: '😒' },
  { label: 'גאווה', emoji: '😤' },
  { label: 'שעמום', emoji: '🥱' },
];

const ACTIONS = [
  { label: 'רוכב על אופניים', emoji: '🚴' },
  { label: 'מדבר בטלפון', emoji: '📞' },
  { label: 'שוטף כלים', emoji: '🍽️' },
  { label: 'בורח מדינוזאור', emoji: '🦕' },
  { label: 'מנסה לתפוס זבוב', emoji: '🪰' },
  { label: 'מנצח במשחק מחשב', emoji: '🎮' },
  { label: 'מנסה לקרוא ספר', emoji: '📖' },
  { label: 'מבשל ארוחה', emoji: '🍳' },
  { label: 'שר בקול רם', emoji: '🎤' },
  { label: 'מחפש את המפתחות', emoji: '🔑' },
];

const EMERALD = '#10b981';
const ROUNDS = 4;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function celebrate() {
  confetti({ particleCount: 180, spread: 90, startVelocity: 50, origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', EMERALD, '#ffca28', '#ef5350', '#ab47bc'] });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Combo {
  emotion: (typeof EMOTIONS)[number];
  action: (typeof ACTIONS)[number];
}

type Stage = 'names' | 'pick_actor' | 'spin' | 'peek' | 'acting' | 'reveal' | 'summary';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function EmotionGenerator({ gameId }: { gameId?: string }) {
  const { activeClassroom, absentStudents } = useClassrooms();

  const presentRoster = useMemo(
    () => (activeClassroom?.students ?? []).filter((n) => !absentStudents.includes(n)),
    [activeClassroom, absentStudents],
  );

  const [stage, setStage] = useState<Stage>(
    presentRoster.length >= 1 ? 'pick_actor' : 'names',
  );
  const [players, setPlayers] = useState<string[]>(presentRoster);
  const [actor, setActor] = useState('');
  const [combo, setCombo] = useState<Combo>({ emotion: EMOTIONS[0], action: ACTIONS[0] });
  const [round, setRound] = useState(0);

  useMarkGamePlayed(gameId, stage === 'summary');

  const spinCombo = (): Combo => ({ emotion: pick(EMOTIONS), action: pick(ACTIONS) });

  const confirmNames = (n: string[]) => {
    setPlayers(n);
    setStage('pick_actor');
  };

  const pickActor = (name: string) => {
    setActor(name);
    setCombo(spinCombo());
    setStage('spin');
  };

  const afterReveal = () => {
    const next = round + 1;
    setRound(next);
    if (next >= ROUNDS) {
      celebrate();
      setStage('summary');
    } else {
      setStage('pick_actor');
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
    case 'pick_actor':
      return (
        <PickActorScreen
          players={players}
          round={round + 1}
          onPick={pickActor}
        />
      );
    case 'spin':
      return (
        <SpinScreen
          combo={combo}
          actor={actor}
          onDone={() => setStage('peek')}
        />
      );
    case 'peek':
      return (
        <PeekScreen
          combo={combo}
          actor={actor}
          onReady={() => setStage('acting')}
        />
      );
    case 'acting':
      return (
        <ActingScreen
          actor={actor}
          onReveal={() => setStage('reveal')}
        />
      );
    case 'reveal':
      return <RevealScreen combo={combo} actor={actor} onNext={afterReveal} />;
    case 'summary':
      return <SummaryScreen round={round} onReplay={() => { setRound(0); setStage('names'); }} />;
  }
}

// ---------------------------------------------------------------------------
// Names — HYBRID
// ---------------------------------------------------------------------------

function NamesScreen({
  activeClassName,
  presentRoster,
  onConfirm,
}: {
  activeClassName: string | null;
  presentRoster: string[];
  onConfirm: (n: string[]) => void;
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

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper elevation={4} sx={{
        width: '100%', maxWidth: 640, p: { xs: 3, sm: 5 }, textAlign: 'center',
        background: 'linear-gradient(160deg, #ffffff 0%, #fce4ec 100%)',
      }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🎰</Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            מכונת הרגשות המשוגעת
          </Typography>
          <Typography variant="body1" color="text.secondary">
            גלגל הגורל שולף רגש ופעולה — השחקן מציג בפנטומימה, הכיתה מנחשת!
          </Typography>

          {hasClass ? (
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Chip icon={<GroupsRoundedIcon sx={{ color: 'white !important' }} />}
                label={`משחקים עם כיתה ${activeClassName} — ${presentRoster.length + guests.length} שחקנים`}
                sx={{ bgcolor: EMERALD, color: 'white', fontWeight: 700, fontSize: 15, py: 2.5, px: 1, borderRadius: 16 }} />
              <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: 420, justifyContent: 'center' }}>
                <TextField size="small" fullWidth label="הוסף תלמיד אורח לסיבוב זה"
                  value={guestDraft} onChange={(e) => setGuestDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuest(); } }} />
                <Button variant="outlined" color="secondary" onClick={addGuest}
                  startIcon={<PersonAddAlt1RoundedIcon />} sx={{ flexShrink: 0 }}>הוסף</Button>
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
              placeholder={'נועם\nשירה\nיואב\n...'} value={raw}
              onChange={(e) => setRaw(e.target.value)} multiline minRows={4} fullWidth
              helperText={players.length ? `זוהו ${players.length} שחקנים 🎈` : 'אפשר לשחק גם ללא שמות — המורה בוחר שחקן ידנית'} />
          )}

          <Button variant="contained" color="primary" size="large" fullWidth
            onClick={() => onConfirm(players)}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.5 }}>
            הפעילו את המכונה! 🎰
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Pick actor
// ---------------------------------------------------------------------------

function PickActorScreen({
  players,
  round,
  onPick,
}: {
  players: string[];
  round: number;
  onPick: (name: string) => void;
}) {
  const [manual, setManual] = useState('');

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper elevation={4} sx={{
        width: '100%', maxWidth: 580, p: { xs: 3, sm: 5 }, textAlign: 'center',
        background: 'linear-gradient(160deg, #ffffff 0%, #fce4ec 100%)',
      }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Chip label={`סיבוב ${round} מתוך ${ROUNDS}`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
          <Typography sx={{ fontSize: 48, lineHeight: 1 }}>🎭</Typography>
          <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 800 }}>
            מי יעלה על הבמה?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            לחצו על שם התלמיד שיגש ללוח ויראה את המשימה הסודית
          </Typography>

          {players.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
              {players.map((name) => (
                <Chip key={name} label={name} onClick={() => onPick(name)}
                  sx={{
                    fontWeight: 700, fontSize: 16, py: 3, px: 1.5, cursor: 'pointer',
                    bgcolor: 'secondary.main', color: 'white',
                    '&:hover': { bgcolor: 'secondary.dark', transform: 'scale(1.05)' },
                    transition: 'all 0.15s ease',
                  }} />
              ))}
            </Box>
          ) : (
            <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 360 }}>
              <TextField size="small" fullWidth label="שם השחקן" value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) onPick(manual.trim()); }} />
              <Button variant="contained" color="secondary" disabled={!manual.trim()}
                onClick={() => onPick(manual.trim())} sx={{ fontWeight: 700 }}>
                זה השחקן!
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Spin — animated slot machine, then land on the combo
// ---------------------------------------------------------------------------

const SPIN_DURATION = 2200; // ms

function SlotReel({
  items,
  finalIdx,
  spinning,
}: {
  items: { label: string; emoji: string }[];
  finalIdx: number;
  spinning: boolean;
}) {
  const tickRef = useRef(0);
  const [displayIdx, setDisplayIdx] = useState(0);

  useEffect(() => {
    if (!spinning) { setDisplayIdx(finalIdx); return; }
    const id = window.setInterval(() => {
      tickRef.current += 1;
      setDisplayIdx((i) => (i + 1) % items.length);
    }, 90);
    return () => window.clearInterval(id);
  }, [spinning, finalIdx, items.length]);

  const item = items[displayIdx];

  return (
    <Paper elevation={4} sx={{
      flex: 1, py: 3, borderRadius: 4, textAlign: 'center',
      border: '3px solid',
      borderColor: spinning ? 'secondary.main' : 'primary.main',
      bgcolor: spinning ? '#f3e5f5' : '#eef1ff',
      overflow: 'hidden',
      transition: 'border-color 0.3s, background-color 0.3s',
    }}>
      <Typography sx={{
        fontSize: 56, lineHeight: 1,
        animation: spinning ? 'reelSpin 0.09s linear infinite' : 'none',
        '@keyframes reelSpin': {
          '0%': { transform: 'translateY(-8px)', opacity: 0.6 },
          '50%': { transform: 'translateY(0)', opacity: 1 },
          '100%': { transform: 'translateY(8px)', opacity: 0.6 },
        },
      }}>
        {item.emoji}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 15, mt: 0.5, color: 'text.secondary' }}>
        {item.label}
      </Typography>
    </Paper>
  );
}

function SpinScreen({
  combo,
  actor,
  onDone,
}: {
  combo: Combo;
  actor: string;
  onDone: () => void;
}) {
  const [spinning, setSpinning] = useState(true);
  const emotionFinalIdx = EMOTIONS.findIndex((e) => e.label === combo.emotion.label);
  const actionFinalIdx = ACTIONS.findIndex((a) => a.label === combo.action.label);

  useEffect(() => {
    const id = setTimeout(() => setSpinning(false), SPIN_DURATION);
    return () => clearTimeout(id);
  }, []);

  return (
    <Stack spacing={3}>
      <Paper elevation={2} sx={{ p: 2, borderRadius: 4, bgcolor: 'secondary.main', textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 800, color: 'white', fontSize: 18 }}>
          🎰 גלגל הגורל מחליט עבור {actor}...
        </Typography>
      </Paper>

      <Stack direction="row" spacing={2}>
        <SlotReel items={EMOTIONS} finalIdx={emotionFinalIdx} spinning={spinning} />
        <SlotReel items={ACTIONS} finalIdx={actionFinalIdx} spinning={spinning} />
      </Stack>

      {!spinning && (
        <Button variant="contained" color="primary" size="large" onClick={onDone}
          startIcon={<VisibilityRoundedIcon />}
          sx={{
            fontWeight: 800, fontSize: 18, py: 1.5,
            animation: 'peekIn 0.4s ease',
            '@keyframes peekIn': { '0%': { opacity: 0, transform: 'scale(0.9)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
          }}>
          {actor} — רק אתה תראה את המשימה!
        </Button>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Peek — actor-only reveal before class sees
// ---------------------------------------------------------------------------

function PeekScreen({
  combo,
  actor,
  onReady,
}: {
  combo: Combo;
  actor: string;
  onReady: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'primary.main', textAlign: 'center', width: '100%' }}>
        <Typography sx={{ fontWeight: 800, color: 'white', fontSize: 18 }}>
          🤫 רק {actor} יכול לראות את זה — הכיתה עוצמת עיניים!
        </Typography>
      </Paper>

      {!revealed ? (
        <Button variant="contained" color="secondary" size="large"
          onClick={() => setRevealed(true)}
          sx={{ fontWeight: 800, fontSize: 18, py: 2, px: 6 }}>
          {actor} — לחץ/י לראות את המשימה
        </Button>
      ) : (
        <Paper elevation={6} sx={{
          p: 4, borderRadius: 4, textAlign: 'center', width: '100%',
          background: 'linear-gradient(135deg, #f3e5f5 0%, #e8eaf6 100%)',
          border: '3px solid', borderColor: 'secondary.main',
          animation: 'missionReveal 0.5s ease',
          '@keyframes missionReveal': {
            '0%': { transform: 'scale(0.8)', opacity: 0 },
            '100%': { transform: 'scale(1)', opacity: 1 },
          },
        }}>
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 14 }}>
              המשימה הסודית שלך:
            </Typography>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 72, lineHeight: 1 }}>{combo.emotion.emoji}</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 22, color: 'secondary.dark' }}>
                  {combo.emotion.label}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 36, color: 'text.secondary' }}>+</Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 72, lineHeight: 1 }}>{combo.action.emoji}</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 22, color: 'primary.dark' }}>
                  {combo.action.label}
                </Typography>
              </Box>
            </Stack>
            <Button variant="contained" color="primary" size="large" onClick={onReady}
              startIcon={<TheaterComedyRoundedIcon />}
              sx={{ fontWeight: 800, fontSize: 18, py: 1.5, mt: 1 }}>
              הבנתי — מתחיל את הפנטומימה!
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Acting — class watches, teacher triggers reveal
// ---------------------------------------------------------------------------

function ActingScreen({ actor, onReveal }: { actor: string; onReveal: () => void }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Paper elevation={4} sx={{
        width: '100%', maxWidth: 540, p: { xs: 4, sm: 6 }, textAlign: 'center',
        borderRadius: 16,
        background: 'linear-gradient(160deg, #ffffff 0%, #fce4ec 100%)',
        border: '3px dashed', borderColor: 'secondary.main',
      }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 80, lineHeight: 1,
            animation: 'actorBounce 1s ease-in-out infinite',
            '@keyframes actorBounce': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' },
            },
          }}>🎭</Typography>
          <Typography variant="h4" color="secondary.dark" sx={{ fontWeight: 900 }}>
            {actor} מציג!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            הכיתה — נסו לנחש את הרגש ואת הפעולה! כשהמורה מוכן, לוחצים לחשיפה.
          </Typography>
          <Button variant="contained" color="secondary" size="large" onClick={onReveal}
            startIcon={<CasinoRoundedIcon />}
            sx={{ fontWeight: 800, fontSize: 20, py: 1.8, px: 6, mt: 1 }}>
            חשפו את התשובה!
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------

function RevealScreen({ combo, actor, onNext }: { combo: Combo; actor: string; onNext: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 },
      colors: ['#ab47bc', '#3f51b5', '#ffca28', '#ef5350', EMERALD] });
  }, []);

  return (
    <Stack spacing={3}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, bgcolor: 'secondary.main', textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 900, color: 'white', fontSize: 20 }}>
          ✨ המשימה הסודית של {actor} הייתה...
        </Typography>
      </Paper>

      <Paper elevation={4} sx={{
        p: 4, borderRadius: 4, textAlign: 'center',
        background: 'linear-gradient(135deg, #f3e5f5 0%, #e8eaf6 100%)',
        border: '3px solid', borderColor: 'secondary.main',
        animation: 'bigReveal 0.5s cubic-bezier(0.36,0.07,0.19,0.97)',
        '@keyframes bigReveal': {
          '0%': { transform: 'scale(0.85)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      }}>
        <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 80, lineHeight: 1 }}>{combo.emotion.emoji}</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 24, color: 'secondary.dark', mt: 0.5 }}>
              {combo.emotion.label}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 40, color: 'text.secondary' }}>+</Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 80, lineHeight: 1 }}>{combo.action.emoji}</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 24, color: 'primary.dark', mt: 0.5 }}>
              {combo.action.label}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Button variant="contained" color="primary" size="large" onClick={onNext}
        startIcon={<ArrowForwardRoundedIcon />} sx={{ fontWeight: 800, py: 1.5 }}>
        שחקן הבא!
      </Button>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function SummaryScreen({ round, onReplay }: { round: number; onReplay: () => void }) {
  useEffect(() => {
    celebrate();
    const id = setTimeout(celebrate, 600);
    return () => clearTimeout(id);
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <Paper elevation={4} sx={{
        width: '100%', maxWidth: 520, p: { xs: 4, sm: 6 }, textAlign: 'center',
        borderRadius: 16,
        background: 'linear-gradient(160deg, #ffffff 0%, #fce4ec 100%)',
        border: `3px solid ${EMERALD}`,
      }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 72, lineHeight: 1 }}>🏆</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: EMERALD }}>
            מצטיינים בפנטומימה!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {round} שחקנים הציגו רגשות ופעולות — הכיתה הוכיחה שהיא מבינה שפת גוף!
          </Typography>
          <Chip label="מדד הבינה הרגשית הכיתתית: גבוה 🌟"
            sx={{ bgcolor: EMERALD, color: 'white', fontWeight: 700, fontSize: 15, py: 2.5, px: 2, borderRadius: 16 }} />
          <Button variant="contained" color="primary" size="large"
            startIcon={<ReplayRoundedIcon />} onClick={onReplay} sx={{ fontWeight: 800 }}>
            משחק חדש
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
