// Ulpan Accelerator — the full-screen 5-stage Lesson Player (see ARCHITECTURE.md
// §10). A fixed max-z overlay that nests the BRIGHT classroom theme over the dark
// workspace and covers the navbar + privacy banner (the "hide the shell during
// playback" requirement), with a best-effort browser Fullscreen request. Steps
// through exactly 5 linear slides via a bottom RTL nav + a 1–5 step bar.

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  ThemeProvider,
  ScopedCssBaseline,
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
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import MusicOffRoundedIcon from '@mui/icons-material/MusicOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import confetti from 'canvas-confetti';
import { educationalTheme } from '../theme/educationalTheme';
import { CONTENT } from '../data/ulpanLesson';
import type { GeneratedLesson } from '../data/ulpanLesson';
import { buildUlpanExitTicketDoc, buildUlpanWorksheetDoc } from '../data/ulpanPrint';
import MemoryMatch from './MemoryMatch';
import PrintDocDialog from './PrintDocDialog';

const DEEP_WORK_SECONDS = 13 * 60; // 13:00

const STAGES = [
  { title: 'הַקֶּרֶס', time: '0–5 דק׳' },
  { title: 'הַקְנָיָה וְקִרְאָה', time: '5–17 דק׳' },
  { title: 'תִּרְגּוּל מִשְׂחָקִי', time: '17–27 דק׳' },
  { title: 'עֲבוֹדָה עַצְמִאִית', time: '27–40 דק׳' },
  { title: 'מְשִׂימַת אֱמֶת וְסִכּוּם', time: '40–45 דק׳' },
];

/** Speak Hebrew text via the Web Speech API (graceful no-op if unavailable). */
function speak(text: string): void {
  try {
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ', '));
    utter.lang = 'he-IL';
    utter.rate = 0.85;
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

interface LessonPlayerProps {
  lesson: GeneratedLesson;
  onExit: () => void;
}

export default function LessonPlayer({ lesson, onExit }: LessonPlayerProps) {
  const [step, setStep] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);

  // Deep-work timer state (lifted so it survives slide navigation).
  const [secondsLeft, setSecondsLeft] = useState(DEEP_WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const ambientRef = useRef<Ambient>(new Ambient());

  // Best-effort true fullscreen on mount; release on unmount.
  useEffect(() => {
    const el = document.documentElement;
    void el.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
      window.speechSynthesis?.cancel();
      ambientRef.current.stop();
    };
  }, []);

  // Countdown loop — gated by `running`; ref-cleaned each tick window.
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

  // Ambient sound follows its toggle.
  useEffect(() => {
    if (ambientOn) ambientRef.current.start();
    else ambientRef.current.stop();
  }, [ambientOn]);

  // Celebrate on the final slide.
  useEffect(() => {
    if (step !== 4) return;
    void confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 } });
  }, [step]);

  const goNext = () => {
    if (step >= STAGES.length - 1) {
      onExit();
      return;
    }
    setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

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
          {/* Top strip: chapter + close */}
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
              <Typography sx={{ fontSize: 30 }}>{lesson.chapter.icon}</Typography>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                  פרק {lesson.chapter.id}: {lesson.chapter.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {CONTENT.ageGroups[lesson.profile.ageGroup]} ·{' '}
                  {CONTENT.levels[lesson.profile.level].label}
                </Typography>
              </Box>
            </Stack>
            <Tooltip title="סיום והחזרה לשולחן העבודה">
              <IconButton onClick={onExit} aria-label="סגירת הנגן" size="large">
                <CloseRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Slide body */}
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

            <Box sx={{ width: '100%', maxWidth: 1000 }}>
              {step === 0 && <HookSlide lesson={lesson} />}
              {step === 1 && <ContentSlide lesson={lesson} />}
              {step === 2 && (
                <Stack spacing={2} sx={{ alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    🎮 מוצאים את הזוגות!
                  </Typography>
                  <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                    הפכו שני קלפים — מילה והתמונה שלה. כל התאמה נשארת גלויה.
                  </Typography>
                  <MemoryMatch pairs={lesson.chapter.baseTokens} />
                </Stack>
              )}
              {step === 3 && (
                <DeepWorkSlide
                  lesson={lesson}
                  secondsLeft={secondsLeft}
                  running={running}
                  timerProgress={timerProgress}
                  ambientOn={ambientOn}
                  onToggleRun={() => setRunning((r) => !r)}
                  onToggleAmbient={() => setAmbientOn((a) => !a)}
                  onReset={() => {
                    setRunning(false);
                    setSecondsLeft(DEEP_WORK_SECONDS);
                  }}
                  onPrint={() => setPrintOpen(true)}
                />
              )}
              {step === 4 && <ExitSlide lesson={lesson} />}
            </Box>
          </Box>

          {/* Bottom RTL nav */}
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
              חזור
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
              endIcon={step >= STAGES.length - 1 ? <CheckCircleRoundedIcon /> : <ArrowBackRoundedIcon />}
              onClick={goNext}
            >
              {step >= STAGES.length - 1 ? 'סיום' : 'הבא'}
            </Button>
          </Stack>
        </Box>

        <PrintDocDialog
          docs={[buildUlpanWorksheetDoc(lesson), buildUlpanExitTicketDoc(lesson)]}
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          title={`🖨️ חומרי הלימוד — ${lesson.chapter.title}`}
        />
      </ScopedCssBaseline>
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Slide 1 — The Hook
// ---------------------------------------------------------------------------

function HookSlide({ lesson }: { lesson: GeneratedLesson }) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 2, sm: 4 } }}>
      <Typography sx={{ fontSize: { xs: 90, sm: 140 }, lineHeight: 1 }}>
        {lesson.chapter.icon}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 900 }}>
        {lesson.chapter.title}
      </Typography>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
          borderRadius: 4,
          maxWidth: 820,
        }}
      >
        <Typography sx={{ fontSize: { xs: 20, sm: 26 }, fontWeight: 600, lineHeight: 1.5 }}>
          {lesson.warmup}
        </Typography>
      </Paper>
      <Typography variant="h6" color="text.secondary">
        💬 מתחילים בשיחה — מה אתם רואים? מה זה מזכיר לכם?
      </Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Slide 2 — Content input (vocab grid + TTS + SLA alerts)
// ---------------------------------------------------------------------------

function ContentSlide({ lesson }: { lesson: GeneratedLesson }) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        📖 אוצר המילים של השיעור
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2.5 },
          width: '100%',
        }}
      >
        {lesson.chapter.baseTokens.map((token) => (
          <Paper
            key={token.word}
            elevation={2}
            sx={{
              p: { xs: 1.5, sm: 2.5 },
              borderRadius: 4,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: { xs: 44, sm: 60 }, lineHeight: 1 }}>
              {token.emoji}
            </Typography>
            <Typography sx={{ fontSize: { xs: 22, sm: 30 }, fontWeight: 800, lineHeight: 1.2 }}>
              {token.word}
            </Typography>
            <Tooltip title="השמעה">
              <IconButton
                color="primary"
                onClick={() => speak(token.word)}
                aria-label={`השמעת המילה ${token.word}`}
              >
                <VolumeUpRoundedIcon sx={{ fontSize: 30 }} />
              </IconButton>
            </Tooltip>
          </Paper>
        ))}
      </Box>

      {lesson.contrastiveNotes.length > 0 && (
        <Stack spacing={1} sx={{ width: '100%', maxWidth: 900 }}>
          {lesson.contrastiveNotes.slice(0, 2).map((note) => (
            <Alert key={note} severity="info" sx={{ '& .MuiAlert-message': { fontSize: 15 } }}>
              <strong>גשר משפת האם:</strong> {note}
            </Alert>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Slide 4 — Deep work timer
// ---------------------------------------------------------------------------

function DeepWorkSlide({
  lesson,
  secondsLeft,
  running,
  timerProgress,
  ambientOn,
  onToggleRun,
  onToggleAmbient,
  onReset,
  onPrint,
}: {
  lesson: GeneratedLesson;
  secondsLeft: number;
  running: boolean;
  timerProgress: number;
  ambientOn: boolean;
  onToggleRun: () => void;
  onToggleAmbient: () => void;
  onReset: () => void;
  onPrint: () => void;
}) {
  const done = secondsLeft === 0;
  return (
    <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        ✍️ עבודה עצמית בדפי העבודה
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 720 }}>
        {lesson.worksheetGuidance}
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
            <Typography sx={{ fontWeight: 800, color: 'success.main' }}>הזמן נגמר! 🎉</Typography>
          )}
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center', gap: 1.5 }}>
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
        <Button size="large" variant="outlined" startIcon={<PrintRoundedIcon />} onClick={onPrint}>
          הדפסת דפי עבודה
        </Button>
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Slide 5 — Exit ticket / mission
// ---------------------------------------------------------------------------

function ExitSlide({ lesson }: { lesson: GeneratedLesson }) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: { xs: 1, sm: 3 } }}>
      <Typography variant="h3" sx={{ fontWeight: 900 }}>
        🚀 משימת אמת
      </Typography>
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 5,
          maxWidth: 760,
          border: '3px dashed',
          borderColor: 'secondary.main',
        }}
      >
        <Stack spacing={2.5}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {lesson.mission.title}
          </Typography>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main' }}>
              המשימה שלכם ברגע שתצאו מהדלת:
            </Typography>
            <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 600 }}>
              {lesson.mission.challenge}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'success.main' }}>
              איך יודעים שהצלחתם?
            </Typography>
            <Typography sx={{ fontSize: { xs: 18, sm: 22 } }}>{lesson.mission.success}</Typography>
          </Box>
        </Stack>
      </Paper>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
        {lesson.closure}
      </Typography>
    </Stack>
  );
}
