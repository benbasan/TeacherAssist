import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import LockPersonRoundedIcon from '@mui/icons-material/LockPersonRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useClassrooms } from '../context/ClassroomContext';
import type { SocialSurveyAnswers, SocialSurveyLevel } from '../types/game.types';
import content from '../data/content/social-mapper-content.json';

/** Shape of one level tier in the externalized content pool. */
interface LevelContent {
  levelLabel: string;
  intro: string;
  questions: Record<'q1' | 'q2' | 'q3', { emoji: string; label: string; prompt: string }>;
}
const CONTENT = content as Record<SocialSurveyLevel, LevelContent>;

type Stage = 'login' | 'survey' | 'done';

/**
 * מרחב הכיתה — the Social Compass student data-collection KIOSK
 * (`/classroom/social-survey/:classId`). Rendered full-screen OUTSIDE `AppLayout`
 * so no teacher navbar leaks to students. The teacher's signed-in device is
 * passed from student to student ("close the tab, rotate to the next friend");
 * each student picks their name, enters the board PIN, and privately chooses
 * three classmates. Reads/writes the active teacher's Clerk `unsafeMetadata`, so
 * it only functions while the teacher stays signed in on this device (§10).
 */
export default function SocialSurveyStudentPage() {
  const { classId } = useParams<{ classId: string }>();
  const { classrooms, submitStudentAnswers } = useClassrooms();

  const classroom = useMemo(
    () => classrooms.find((c) => c.id === classId) ?? null,
    [classrooms, classId],
  );

  const [stage, setStage] = useState<Stage>('login');
  const [myName, setMyName] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [answers, setAnswers] = useState<SocialSurveyAnswers>({ q1: '', q2: '', q3: '' });
  const [submitting, setSubmitting] = useState(false);

  const resetForNext = () => {
    setMyName('');
    setPin('');
    setPinError(false);
    setAnswers({ q1: '', q2: '', q3: '' });
    setStage('login');
  };

  // --- Guards: no class / survey closed ------------------------------------
  if (!classroom || !classroom.socialSurveyActive) {
    return (
      <Shell>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <LockPersonRoundedIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            הסקר סגור כרגע 😌
          </Typography>
          <Typography color="text.secondary">
            אין סקר פעיל למילוי. המתינו שהמורה יפתח סקר חדש על הלוח.
          </Typography>
        </Stack>
      </Shell>
    );
  }

  const level = classroom.socialSurveyLevel ?? 'elementary';
  const levelContent = CONTENT[level];
  const surveyData = classroom.socialSurveyData ?? {};
  const alreadyAnswered = new Set(Object.keys(surveyData));

  // --- login ---------------------------------------------------------------
  if (stage === 'login') {
    const handleEnter = () => {
      if (pin.trim() !== (classroom.socialSurveyPin ?? '')) {
        setPinError(true);
        return;
      }
      setPinError(false);
      setStage('survey');
    };
    return (
      <Shell>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <ExploreRoundedIcon sx={{ fontSize: 56, color: 'primary.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              מצפן חברתי 🧭
            </Typography>
            <Typography color="text.secondary">
              כיתה {classroom.name} · שלום! בואו נמלא יחד את הסקר החברתי.
            </Typography>
          </Stack>

          <TextField
            select
            fullWidth
            label="בחרו את השם שלכם"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
          >
            {classroom.students.map((s) => (
              <MenuItem key={s} value={s} disabled={alreadyAnswered.has(s)}>
                {s}
                {alreadyAnswered.has(s) ? ' ✓ (כבר מולא)' : ''}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="הקוד הסודי מהלוח (4 ספרות)"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              setPinError(false);
            }}
            error={pinError}
            helperText={pinError ? 'הקוד שגוי — בדקו שוב את הלוח 🙂' : ' '}
            slotProps={{ htmlInput: { inputMode: 'numeric', style: { fontSize: 28, letterSpacing: 8, textAlign: 'center' } } }}
          />

          <Button
            fullWidth
            size="large"
            variant="contained"
            disabled={!myName || pin.length !== 4}
            onClick={handleEnter}
            sx={{ fontWeight: 800, py: 1.5, fontSize: 18 }}
          >
            כניסה לסקר ➜
          </Button>
        </Stack>
      </Shell>
    );
  }

  // --- done ----------------------------------------------------------------
  if (stage === 'done') {
    return (
      <Shell>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 72, color: 'success.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            תודה! 💛
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 460 }}>
            תשובותיך נשמרו במערכת באופן חסוי לחלוטין. סגור את הלשונית וסובב את המסך לחבר הבא.
          </Typography>
          <Button variant="outlined" size="large" onClick={resetForNext} sx={{ mt: 1, fontWeight: 700 }}>
            מישהו אחר ממלא ➜
          </Button>
        </Stack>
      </Shell>
    );
  }

  // --- survey --------------------------------------------------------------
  const otherStudents = classroom.students.filter((s) => s !== myName);
  const allAnswered = Boolean(answers.q1 && answers.q2 && answers.q3);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitStudentAnswers(classroom.id, myName, answers);
      setStage('done');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <Stack spacing={2.5}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            שלום {myName}! 👋
          </Typography>
        </Box>
        <Alert severity="info" icon={<LockPersonRoundedIcon fontSize="small" />} sx={{ borderRadius: 3 }}>
          {levelContent.intro}
        </Alert>

        {(['q1', 'q2', 'q3'] as const).map((key) => {
          const q = levelContent.questions[key];
          return (
            <Paper key={key} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                <Box component="span" sx={{ fontSize: 24, marginInlineEnd: 1 }}>
                  {q.emoji}
                </Box>
                {q.prompt}
              </Typography>
              <TextField
                select
                fullWidth
                label={`בחירה — ${q.label}`}
                value={answers[key]}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
              >
                {otherStudents.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Paper>
          );
        })}

        <Button
          fullWidth
          size="large"
          variant="contained"
          disabled={!allAnswered || submitting}
          onClick={handleSubmit}
          sx={{ fontWeight: 800, py: 1.5, fontSize: 18 }}
        >
          {submitting ? 'שולח…' : 'שליחת התשובות 🔒'}
        </Button>
      </Stack>
    </Shell>
  );
}

/** Full-screen, mobile-first kiosk frame (centered card on a soft indigo wash). */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: 'linear-gradient(160deg, #e8eaf6 0%, #e0f2f1 100%)',
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Paper elevation={6} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 5, width: '100%' }}>
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
