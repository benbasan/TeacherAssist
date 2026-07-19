// Ulpan Pilot — the standalone full-screen 5-stage Chapter-1 player (see
// ARCHITECTURE.md §10). Same fixed-overlay + nested bright theme + fullscreen +
// TTS + timer patterns as LessonPlayer, but with 5 bespoke, fully-vowelized
// Chapter-1 stage views packed with pedagogical depth: a hook, a 3-tab deep
// instruction stage (dialogue+editor / vocab flip-cards / gender grid), a
// passport-builder speaking drill, a dual game rotation (MemoryMatch + Odd One
// Out), and a deep-work timer + ambient sound + premium print sheet.

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  ScopedCssBaseline,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import MusicOffRoundedIcon from '@mui/icons-material/MusicOffRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { educationalTheme } from '../theme/educationalTheme';
import {
  PILOT_DIALOGUE,
  PILOT_GENDER_GRID,
  PILOT_HOOK,
  PILOT_META,
  PILOT_ODD_ROUNDS,
  PILOT_PASSPORT,
  PILOT_TARGET_MATRIX,
  PILOT_VOCAB_CARDS,
} from '../data/ulpanPilotContent';
import type { DialogueLine, VocabCard } from '../data/ulpanPilotContent';
import MemoryMatch from './MemoryMatch';
import OddOneOut from './OddOneOut';
import UlpanPilotPrintDialog from './UlpanPilotPrintDialog';

const DEEP_WORK_SECONDS = 13 * 60; // 13:00

const STAGES = [
  { title: 'הַקֶּרֶס', time: '0–5 דק׳' },
  { title: 'הַקְנָיָה, הֶקְשֵׁר וְדִקְדּוּק', time: '5–20 דק׳' },
  { title: 'זְמַן דִּבּוּר וּמִשְׂחַק תַּפְקִידִים', time: '20–27 דק׳' },
  { title: 'רֶצֶף תִּרְגּוּל מִשְׂחָקִי כָּפוּל', time: '27–35 דק׳' },
  { title: 'עֲבוֹדָה עַצְמִאִית עֲמֻקָּה', time: '35–45 דק׳' },
];

/** Speak Hebrew via the Web Speech API (graceful no-op if unavailable). */
function speak(text: string): void {
  try {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ', '));
    utter.lang = 'he-IL';
    utter.rate = 0.8;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {
    /* TTS is optional */
  }
}

/** A soft asset-free ambient pad (root + fifth) for the deep-work timer. */
class Ambient {
  private ctx: AudioContext | null = null;
  private oscs: OscillatorNode[] = [];

  start(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      void this.ctx.resume();
      if (this.oscs.length) return;
      const master = this.ctx.createGain();
      master.gain.value = 0.05;
      master.connect(this.ctx.destination);
      [146.83, 220].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(master);
        osc.start();
        this.oscs.push(osc);
      });
    } catch {
      /* ambient audio is optional */
    }
  }

  stop(): void {
    this.oscs.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.oscs = [];
  }
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface UlpanPilotPlayerProps {
  onExit: () => void;
}

export default function UlpanPilotPlayer({ onExit }: UlpanPilotPlayerProps) {
  const [step, setStep] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);

  // Stage 1 teacher tip
  const [tipOpen, setTipOpen] = useState(false);

  // Stage 2 tabs + dialogue editable state (the teacher safety-net)
  const [tab, setTab] = useState(0);
  const [lines, setLines] = useState<DialogueLine[]>(PILOT_DIALOGUE);
  const [editing, setEditing] = useState(false);

  // Stage 4 dual-game rotation
  const [gameIndex, setGameIndex] = useState(0);

  // Stage 5 timer + ambient
  const [secondsLeft, setSecondsLeft] = useState(DEEP_WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const ambientRef = useMemo(() => new Ambient(), []);

  useEffect(() => {
    const el = document.documentElement;
    void el.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
      window.speechSynthesis?.cancel();
      ambientRef.stop();
    };
  }, [ambientRef]);

  useEffect(() => {
    if (!running || secondsLeft <= 0) return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (ambientOn) ambientRef.start();
    else ambientRef.stop();
  }, [ambientOn, ambientRef]);

  const goNext = () => {
    if (step >= STAGES.length - 1) {
      onExit();
      return;
    }
    setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const done = secondsLeft === 0;
  const timerProgress = (secondsLeft / DEEP_WORK_SECONDS) * 100;

  return (
    <ThemeProvider theme={educationalTheme}>
      <ScopedCssBaseline>
        <Box
          dir="rtl"
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 1,
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top strip */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, sm: 4 },
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 30 }}>{PILOT_META.icon}</Typography>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  שיעור פיילוט · פרק {PILOT_META.chapterId}: {PILOT_META.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {PILOT_META.subtitle} · רמה 1
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="סיום והחזרה">
              <IconButton onClick={onExit} aria-label="סגירת הנגן" size="large">
                <CloseRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Stage body */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              px: { xs: 2, sm: 5 },
              py: { xs: 2, sm: 4 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Chip
              label={`שלב ${step + 1} · ${STAGES[step].title} · ${STAGES[step].time}`}
              color="primary"
              sx={{ fontWeight: 800, fontSize: 16, py: 2, px: 1, mb: 3 }}
            />

            <Box sx={{ width: '100%', maxWidth: 1040 }}>
              {step === 0 && (
                <HookStage tipOpen={tipOpen} onToggleTip={() => setTipOpen((v) => !v)} />
              )}
              {step === 1 && (
                <InstructionStage
                  tab={tab}
                  onTab={setTab}
                  lines={lines}
                  editing={editing}
                  onToggleEdit={() => setEditing((v) => !v)}
                  onEditLine={(id, text) =>
                    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)))
                  }
                />
              )}
              {step === 2 && <PassportBuilder />}
              {step === 3 && (
                <DualGameStage gameIndex={gameIndex} onSwitch={() => setGameIndex((g) => (g === 0 ? 1 : 0))} />
              )}
              {step === 4 && (
                <DeepWorkStage
                  secondsLeft={secondsLeft}
                  running={running}
                  timerProgress={timerProgress}
                  done={done}
                  ambientOn={ambientOn}
                  onToggleRun={() => setRunning((r) => !r)}
                  onReset={() => {
                    setRunning(false);
                    setSecondsLeft(DEEP_WORK_SECONDS);
                  }}
                  onToggleAmbient={() => setAmbientOn((a) => !a)}
                  onPrint={() => setPrintOpen(true)}
                />
              )}
            </Box>
          </Box>

          {/* Bottom RTL control dock */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, sm: 4 },
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Button
              size="large"
              variant="outlined"
              startIcon={<ArrowForwardRoundedIcon />}
              onClick={goBack}
              disabled={step === 0}
            >
              ⬅️ חזור
            </Button>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {STAGES.map((stage, i) => (
                <Box
                  key={stage.title}
                  onClick={() => setStep(i)}
                  sx={{
                    width: i === step ? 34 : 14,
                    height: 14,
                    borderRadius: 7,
                    cursor: 'pointer',
                    transition: 'width 0.2s, background-color 0.2s',
                    bgcolor: i === step ? 'primary.main' : i < step ? 'primary.light' : 'grey.300',
                  }}
                />
              ))}
            </Stack>

            <Button
              size="large"
              variant="contained"
              endIcon={
                step >= STAGES.length - 1 ? <CheckCircleRoundedIcon /> : <ArrowBackRoundedIcon />
              }
              onClick={goNext}
            >
              {step >= STAGES.length - 1 ? 'סיום' : '➡️ הכלים הבאים'}
            </Button>
          </Stack>
        </Box>

        <UlpanPilotPrintDialog open={printOpen} onClose={() => setPrintOpen(false)} />
      </ScopedCssBaseline>
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Stage 1 — The Hook (with a CSP-safe layered "hallway" composition)
// ---------------------------------------------------------------------------

function HookStage({ tipOpen, onToggleTip }: { tipOpen: boolean; onToggleTip: () => void }) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 1, sm: 2 } }}>
      {/* Layered school-hallway scene — pure styled boxes + emoji, no assets. */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 900,
          height: { xs: 140, sm: 200 },
          borderRadius: 5,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #e8eaf6 0%, #c5cae9 100%)',
          border: '2px solid',
          borderColor: 'primary.light',
        }}
      >
        {/* row of lockers */}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', pb: 1, opacity: 0.5 }}>
          {['🚪', '🚪', '🚪', '🚪', '🚪', '🚪'].map((d, i) => (
            <Typography key={i} sx={{ fontSize: { xs: 30, sm: 46 } }}>{d}</Typography>
          ))}
        </Box>
        {/* two students meeting in the hallway */}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1, sm: 3 } }}>
          <Typography sx={{ fontSize: { xs: 56, sm: 90 } }}>🧑‍🎓</Typography>
          <Typography sx={{ fontSize: { xs: 36, sm: 56 } }}>💬</Typography>
          <Typography sx={{ fontSize: { xs: 56, sm: 90 } }}>👩‍🎓</Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          borderRadius: 5,
          maxWidth: 900,
        }}
      >
        <Typography sx={{ fontSize: { xs: 26, sm: 42 }, fontWeight: 800, lineHeight: 1.5 }}>
          {PILOT_HOOK.prompt}
        </Typography>
      </Paper>

      <Box sx={{ width: '100%', maxWidth: 700 }}>
        <Button
          variant="outlined"
          startIcon={<LightbulbRoundedIcon />}
          endIcon={tipOpen ? <span>▲</span> : <span>▼</span>}
          onClick={onToggleTip}
        >
          💡 טיפ פדגוגי למורה
        </Button>
        <Collapse in={tipOpen}>
          <Paper variant="outlined" sx={{ p: 2, mt: 1.5, textAlign: 'start', borderStyle: 'dashed' }}>
            <Typography sx={{ fontSize: 17, lineHeight: 1.6 }}>{PILOT_HOOK.teacherTip}</Typography>
          </Paper>
        </Collapse>
      </Box>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Stage 2 — Deep instruction: 3 tabs
// ---------------------------------------------------------------------------

function InstructionStage({
  tab,
  onTab,
  lines,
  editing,
  onToggleEdit,
  onEditLine,
}: {
  tab: number;
  onTab: (v: number) => void;
  lines: DialogueLine[];
  editing: boolean;
  onToggleEdit: () => void;
  onEditLine: (id: string, text: string) => void;
}) {
  return (
    <Stack spacing={2.5}>
      <Tabs value={tab} onChange={(_, v: number) => onTab(v)} variant="fullWidth">
        <Tab label="💬 הַדִּיאָלוֹג הַמֻּרְחָב" sx={{ fontWeight: 700, fontSize: 15 }} />
        <Tab label="🃏 כַּרְטִיסִיּוֹת אוֹצַר מִלִּים" sx={{ fontWeight: 700, fontSize: 15 }} />
        <Tab label="⚖️ מַלְכֹּדֶת הַדִּקְדּוּק" sx={{ fontWeight: 700, fontSize: 15 }} />
      </Tabs>

      {tab === 0 && (
        <DialogueTab
          lines={lines}
          editing={editing}
          onToggleEdit={onToggleEdit}
          onEditLine={onEditLine}
        />
      )}
      {tab === 1 && <VocabFlipCards />}
      {tab === 2 && <GenderGrid />}
    </Stack>
  );
}

function DialogueTab({
  lines,
  editing,
  onToggleEdit,
  onEditLine,
}: {
  lines: DialogueLine[];
  editing: boolean;
  onToggleEdit: () => void;
  onEditLine: (id: string, text: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant={editing ? 'contained' : 'outlined'}
          color={editing ? 'success' : 'primary'}
          startIcon={editing ? <CheckRoundedIcon /> : <EditRoundedIcon />}
          onClick={onToggleEdit}
        >
          {editing ? 'סיום עריכה ✓' : 'ערוך טקסט ✍️'}
        </Button>
      </Stack>

      {lines.map((line, i) => (
        <Paper
          key={line.id}
          elevation={2}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 4,
            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
            maxWidth: { xs: '100%', sm: '85%' },
            width: '100%',
            bgcolor: i % 2 === 0 ? 'background.paper' : 'secondary.light',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontSize: 34 }}>{line.emoji}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {line.speaker}
            </Typography>
            <Tooltip title="השמעה">
              <IconButton
                color="primary"
                onClick={() => speak(line.text)}
                aria-label={`השמעת השורה של ${line.speaker}`}
              >
                <VolumeUpRoundedIcon sx={{ fontSize: 28 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          {editing ? (
            <TextField
              value={line.text}
              onChange={(e) => onEditLine(line.id, e.target.value)}
              fullWidth
              multiline
              dir="rtl"
              slotProps={{ htmlInput: { style: { fontSize: 26, fontWeight: 700, lineHeight: 1.5 } } }}
            />
          ) : (
            <Typography sx={{ fontSize: { xs: 24, sm: 32 }, fontWeight: 700, lineHeight: 1.5 }}>
              {line.text}
            </Typography>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

function VocabFlipCards() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }}>
      <Typography color="text.secondary">לַחֲצוּ עַל כַּרְטִיס כְּדֵי לְהָפֹךְ אוֹתוֹ ולִרְאוֹת תַּרְגּוּם וְדֻגְמָה.</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: 2,
          width: '100%',
        }}
      >
        {PILOT_VOCAB_CARDS.map((card, i) => (
          <FlipCard key={card.word} card={card} flipped={flipped.has(i)} onFlip={() => toggle(i)} />
        ))}
      </Box>
    </Stack>
  );
}

function FlipCard({ card, flipped, onFlip }: { card: VocabCard; flipped: boolean; onFlip: () => void }) {
  return (
    <Box
      onClick={onFlip}
      role="button"
      aria-label={`כרטיס ${card.word}`}
      sx={{ perspective: '1000px', cursor: 'pointer', minHeight: { xs: 170, sm: 200 } }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: { xs: 170, sm: 200 },
          transition: 'transform 0.5s',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}
      >
        {/* front */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 2,
          }}
        >
          <Typography sx={{ fontSize: { xs: 44, sm: 56 } }}>{card.emoji}</Typography>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 800, textAlign: 'center' }}>
            {card.word}
          </Typography>
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              speak(card.word);
            }}
            aria-label={`השמעת ${card.word}`}
          >
            <VolumeUpRoundedIcon />
          </IconButton>
        </Paper>
        {/* back */}
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 4,
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700 }} dir="ltr">
            🇬🇧 {card.en}
          </Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }} dir="ltr">
            🇷🇺 {card.ru}
          </Typography>
          <Box sx={{ height: '1px', width: '60%', bgcolor: 'primary.contrastText', opacity: 0.4, my: 0.5 }} />
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{card.example}</Typography>
        </Paper>
      </Box>
    </Box>
  );
}

type Gender = 'masculine' | 'feminine';
interface NameChip {
  id: number;
  name: string;
  bucket: Gender | 'unassigned';
}

function GenderGrid() {
  const [names, setNames] = useState<NameChip[]>(() =>
    PILOT_GENDER_GRID.seedNames.map((n, i) => ({ id: i, name: n.name, bucket: 'unassigned' as const })),
  );
  const [draft, setDraft] = useState('');
  const nextId = useMemo(() => ({ v: PILOT_GENDER_GRID.seedNames.length }), []);

  const addName = () => {
    const clean = draft.trim();
    if (!clean) return;
    setNames((prev) => [...prev, { id: nextId.v++, name: clean, bucket: 'unassigned' }]);
    setDraft('');
  };
  const assign = (id: number, bucket: Gender) =>
    setNames((prev) => prev.map((n) => (n.id === id ? { ...n, bucket } : n)));
  const unassigned = names.filter((n) => n.bucket === 'unassigned');

  const Column = ({ gender, label }: { gender: Gender; label: string }) => (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        flex: 1,
        minHeight: 200,
        borderWidth: 2,
        borderColor: gender === 'masculine' ? 'primary.main' : 'secondary.main',
        borderRadius: 4,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, textAlign: 'center', mb: 1.5 }}>
        {label}
      </Typography>
      <Stack spacing={1} sx={{ alignItems: 'center' }}>
        {names
          .filter((n) => n.bucket === gender)
          .map((n) => (
            <Chip key={n.id} label={n.name} color={gender === 'masculine' ? 'primary' : 'secondary'} sx={{ fontWeight: 700, fontSize: 18, py: 2.2 }} />
          ))}
      </Stack>
    </Paper>
  );

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
        {PILOT_GENDER_GRID.instruction}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'stretch' }}>
        <Column gender="masculine" label={PILOT_GENDER_GRID.masculine.label} />
        <Column gender="feminine" label={PILOT_GENDER_GRID.feminine.label} />
      </Stack>

      {/* Unassigned pool + add name */}
      <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          שֵׁמוֹת לְשִׁבּוּץ (לַחֲצוּ 👦 אוֹ 👧):
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {unassigned.length === 0 && (
            <Typography color="text.secondary">כָּל הַשֵּׁמוֹת שֻׁבְּצוּ! 🎉</Typography>
          )}
          {unassigned.map((n) => (
            <Chip
              key={n.id}
              label={n.name}
              onClick={() => {}}
              sx={{ fontWeight: 700, fontSize: 16 }}
              onDelete={() => assign(n.id, 'feminine')}
              deleteIcon={<span style={{ fontSize: 18 }}>👧</span>}
              avatar={
                <Box
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    assign(n.id, 'masculine');
                  }}
                  sx={{ cursor: 'pointer', fontSize: 18 }}
                >
                  👦
                </Box>
              }
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="הוֹסִיפוּ שֵׁם תַּלְמִיד..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addName();
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={addName}>
            הוֹסָפָה
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Stage 3 — Passport / ID builder
// ---------------------------------------------------------------------------

function PassportBuilder() {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'בֶּן' | 'בַּת'>('בֶּן');

  const readBack = `שָׁלוֹם! קוֹרְאִים לִי ${name || '...'}. אֲנִי מִ${from || '...'}. אֲנִי ${gender} ${age || '...'}.`;

  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        🗣️ בּוֹנִים תְּעוּדַת זֶהוּת — וּמְדַבְּרִים!
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 4,
          borderWidth: 3,
          borderColor: 'primary.main',
          maxWidth: 760,
          width: '100%',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <BadgeRoundedIcon color="primary" sx={{ fontSize: 34 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {PILOT_PASSPORT.title}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: { xs: 84, sm: 110 },
              height: { xs: 104, sm: 140 },
              flexShrink: 0,
              border: '2px dashed',
              borderColor: 'text.disabled',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
            }}
          >
            {gender === 'בֶּן' ? '👦' : '👧'}
          </Box>
          <Stack spacing={1.5} sx={{ flexGrow: 1, width: '100%' }}>
            <PassportField label={PILOT_PASSPORT.fields.name.label} value={name} onChange={setName} placeholder={PILOT_PASSPORT.fields.name.placeholder} />
            <PassportField label={PILOT_PASSPORT.fields.from.label} value={from} onChange={setFrom} placeholder={PILOT_PASSPORT.fields.from.placeholder} />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <ToggleButtonGroup
                exclusive
                value={gender}
                onChange={(_, v) => v && setGender(v)}
                size="small"
              >
                <ToggleButton value="בֶּן" sx={{ fontWeight: 800, fontSize: 18 }}>בֶּן 👦</ToggleButton>
                <ToggleButton value="בַּת" sx={{ fontWeight: 800, fontSize: 18 }}>בַּת 👧</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                variant="standard"
                placeholder={PILOT_PASSPORT.fields.age.placeholder}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                sx={{ minWidth: 120 }}
                slotProps={{ htmlInput: { style: { fontSize: 22, fontWeight: 700 } } }}
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Live read-back */}
      <Paper
        elevation={0}
        sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 4, maxWidth: 760, width: '100%' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: { xs: 20, sm: 26 }, fontWeight: 700, textAlign: 'center' }}>
            {readBack}
          </Typography>
          <Tooltip title="השמעה">
            <IconButton onClick={() => speak(readBack)} aria-label="השמעת המשפט" sx={{ color: 'inherit' }}>
              <VolumeUpRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, maxWidth: 760, borderStyle: 'dashed' }}>
        <Typography sx={{ fontSize: 17, lineHeight: 1.6 }}>{PILOT_PASSPORT.instruction}</Typography>
      </Paper>
    </Stack>
  );
}

function PassportField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
      <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <TextField
        variant="standard"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ flexGrow: 1, minWidth: 140 }}
        slotProps={{ htmlInput: { style: { fontSize: 22, fontWeight: 700 } } }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Stage 4 — Dual game rotation
// ---------------------------------------------------------------------------

function DualGameStage({ gameIndex, onSwitch }: { gameIndex: number; onSwitch: () => void }) {
  return (
    <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}
      >
        <Chip
          label={gameIndex === 0 ? 'מִשְׂחָק 1 · אוֹצַר מִלִּים' : 'מִשְׂחָק 2 · דִּקְדּוּק'}
          color={gameIndex === 0 ? 'primary' : 'secondary'}
          sx={{ fontWeight: 800, fontSize: 15, py: 2 }}
        />
        <Button variant="outlined" onClick={onSwitch}>
          {gameIndex === 0 ? 'עֲבֹר לְמִשְׂחַק הַדִּקְדּוּק ➡️' : '⬅️ חֲזֹר לְאוֹצַר הַמִּלִּים'}
        </Button>
      </Stack>

      {gameIndex === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            🎮 מִשְׂחַק זִכָּרוֹן — מוֹצְאִים אֶת הַזּוּגוֹת!
          </Typography>
          <MemoryMatch pairs={PILOT_TARGET_MATRIX} />
        </Stack>
      ) : (
        <Stack spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            ⚖️ אֶחָד בַּחוּץ — זָכָר אוֹ נְקֵבָה?
          </Typography>
          <OddOneOut rounds={PILOT_ODD_ROUNDS} />
        </Stack>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Stage 5 — Deep work timer + ambient + print
// ---------------------------------------------------------------------------

function DeepWorkStage({
  secondsLeft,
  running,
  timerProgress,
  done,
  ambientOn,
  onToggleRun,
  onReset,
  onToggleAmbient,
  onPrint,
}: {
  secondsLeft: number;
  running: boolean;
  timerProgress: number;
  done: boolean;
  ambientOn: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onToggleAmbient: () => void;
  onPrint: () => void;
}) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        ✍️ עֲבוֹדָה עַצְמִית עֲמֻקָּה
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760 }}>
        מְמַלְּאִים אֶת חוֹבֶרֶת הָעֲבוֹדָה הַמִּקְצוֹעִית וּמְבַצְּעִים מְשִׂימַת אֱמֶת.
      </Typography>

      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={done ? 100 : timerProgress}
          size={260}
          thickness={4}
          color={done ? 'success' : 'primary'}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>
            {fmt(secondsLeft)}
          </Typography>
          {done && (
            <Typography sx={{ fontWeight: 800, color: 'success.main' }}>הַזְּמַן נִגְמַר! 🎉</Typography>
          )}
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}
      >
        <Button
          size="large"
          variant="contained"
          startIcon={running ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          onClick={onToggleRun}
          disabled={done}
        >
          {running ? 'השהיה' : 'התחלה'}
        </Button>
        <Button size="large" variant="outlined" onClick={onReset}>
          איפוס
        </Button>
        <Button
          size="large"
          variant="outlined"
          color={ambientOn ? 'secondary' : 'primary'}
          startIcon={ambientOn ? <MusicNoteRoundedIcon /> : <MusicOffRoundedIcon />}
          onClick={onToggleAmbient}
        >
          {ambientOn ? 'צליל רקע פועל' : 'צליל רקע'}
        </Button>
      </Stack>

      <Button
        size="large"
        variant="contained"
        color="secondary"
        startIcon={<PrintRoundedIcon />}
        onClick={onPrint}
        sx={{ fontWeight: 800, py: 1.25, px: 3 }}
      >
        🖨️ הדפס חוברת תרגול מקיפה (Premium Edition)
      </Button>
    </Stack>
  );
}
