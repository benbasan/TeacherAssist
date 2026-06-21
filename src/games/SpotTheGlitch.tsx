import { useEffect, useState } from 'react';
import { useMarkGamePlayed } from '../context/ClassroomContext';
import confetti from 'canvas-confetti';
import {
  Box,
  Paper,
  Card,
  CardActionArea,
  CardContent,
  Button,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Collapse,
} from '@mui/material';
import SpellcheckRoundedIcon from '@mui/icons-material/SpellcheckRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import FrontHandRoundedIcon from '@mui/icons-material/FrontHandRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', '#ffca28', '#ef5350', '#ab47bc'],
  });
}

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

interface Sentence {
  text: string;
  hasGlitch: boolean;
  /** Friendly explanation, shown on the reveal screen when a glitch is caught. */
  correction: string;
}

interface GlitchTopic {
  key: 'grammar' | 'spelling' | 'idioms';
  label: string;
  blurb: string;
  icon: typeof SpellcheckRoundedIcon;
  color: string;
  sentences: Sentence[];
}

// ---------------------------------------------------------------------------
// Content (Hebrew language arts — grades א׳–ג׳)
// ---------------------------------------------------------------------------

const TOPICS: GlitchTopic[] = [
  {
    key: 'grammar',
    label: 'זכר ונקבה ומספרים',
    blurb: 'התאמת מין ומספר — האם המילים מסכימות זו עם זו?',
    icon: SpellcheckRoundedIcon,
    color: '#5c6bc0',
    sentences: [
      {
        text: 'על השולחן שלי מונחים שלושה בננות צהובות וטעימות.',
        hasGlitch: true,
        correction: 'לא נכון! בננה היא נקבה, ולכן צריך לומר: שלוש בננות.',
      },
      {
        text: 'חמשת הילדים רצו מהר לחצר כדי לשחק בכדור.',
        hasGlitch: false,
        correction: '',
      },
    ],
  },
  {
    key: 'spelling',
    label: 'בלשי כתיב — אותיות מבלבלות',
    blurb: 'אותיות שנשמעות דומה — האם הכתיב נכון?',
    icon: MenuBookRoundedIcon,
    color: '#26a69a',
    sentences: [
      {
        text: 'המורה ביקשה מכל תלמיד להוציא את הספר ולקרות את העמוד הבא.',
        hasGlitch: true,
        correction: "טעות כתיב! קוראים בספר באות א' (לקרוא), ולא באות ה' (לקרות).",
      },
    ],
  },
  {
    key: 'idioms',
    label: 'ניבים ופתגמים משובשים',
    blurb: 'ביטויים מהשפה — האם הניב נאמר נכון?',
    icon: AutoStoriesRoundedIcon,
    color: '#ab47bc',
    sentences: [
      {
        text: 'דני ממש רצה להצליח במבחן, ולכן הוא החליט להפוך כל אבן ואבן.',
        hasGlitch: false,
        correction: '',
      },
      {
        text: 'רון לא ידע את התשובה, אז הוא פשוט המציא משהו והכה בלוח פח.',
        hasGlitch: true,
        correction:
          "שיבוש של ניב! אומרים 'הכה גלים' או 'דיבר אל העצים ואל האבנים', הביטוי הנכון להמצאת דברים הוא 'הכה בסנורים' או 'בדה מליבו'.",
      },
    ],
  },
];

type Stage = 'topic' | 'board' | 'reveal' | 'summary';

/** How the class judged the current sentence, set when leaving the board. */
type Verdict = 'correct-stop' | 'wrong-stop' | 'correct-ok';

// ---------------------------------------------------------------------------
// Root state machine: Topic → Board → Reveal → (loop) → Summary
// ---------------------------------------------------------------------------

export default function SpotTheGlitch({ gameId }: { gameId?: string }) {
  const [stage, setStage] = useState<Stage>('topic');
  const [topic, setTopic] = useState<GlitchTopic | null>(null);
  useMarkGamePlayed(gameId, stage === 'summary');
  const [index, setIndex] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const selectTopic = (t: GlitchTopic) => {
    setTopic(t);
    setIndex(0);
    setVerdict(null);
    setCorrectCount(0);
    setStage('board');
  };

  // Reveal with the class verdict; tally a point for a sharp eye.
  const reveal = (v: Verdict) => {
    setVerdict(v);
    if (v === 'correct-stop' || v === 'correct-ok') {
      setCorrectCount((c) => c + 1);
    }
    setStage('reveal');
  };

  const next = () => {
    if (topic && index < topic.sentences.length - 1) {
      setIndex((i) => i + 1);
      setVerdict(null);
      setStage('board');
    } else {
      setStage('summary');
      celebrate();
    }
  };

  const restart = () => {
    setTopic(null);
    setStage('topic');
  };

  if (stage === 'topic' || !topic) {
    return <TopicScreen onSelect={selectTopic} />;
  }

  if (stage === 'summary') {
    return (
      <SummaryScreen
        topic={topic}
        correct={correctCount}
        total={topic.sentences.length}
        onRestart={restart}
      />
    );
  }

  const sentence = topic.sentences[index];

  if (stage === 'reveal' && verdict) {
    return (
      <RevealScreen
        topic={topic}
        sentence={sentence}
        verdict={verdict}
        isLast={index === topic.sentences.length - 1}
        onNext={next}
      />
    );
  }

  return (
    <BoardScreen
      topic={topic}
      sentence={sentence}
      index={index}
      total={topic.sentences.length}
      onReveal={reveal}
      onRestart={restart}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Topic selection
// ---------------------------------------------------------------------------

function TopicScreen({ onSelect }: { onSelect: (t: GlitchTopic) => void }) {
  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          🕵️‍♀️
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          עצור! יש טעות בשפה
        </Typography>
        <Typography variant="body1" color="text.secondary">
          בחרו תחום, קראו את המשפטים בקול — והתלמידים יצעקו "עצור!" כשהם תופסים טעות.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.key}
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${t.color}`,
              }}
            >
              <CardActionArea onClick={() => onSelect(t)} sx={{ height: '100%', alignItems: 'stretch' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Icon sx={{ fontSize: 56, color: t.color, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {t.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.blurb}
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

// ---------------------------------------------------------------------------
// Screen 2 — The reading board
// ---------------------------------------------------------------------------

function BoardScreen({
  topic,
  sentence,
  index,
  total,
  onReveal,
  onRestart,
}: {
  topic: GlitchTopic;
  sentence: Sentence;
  index: number;
  total: number;
  onReveal: (v: Verdict) => void;
  onRestart: () => void;
}) {
  // Ephemeral nudge when the class declares a glitched sentence "correct".
  const [showTip, setShowTip] = useState(false);

  // Reset the tip whenever a new sentence appears.
  useEffect(() => {
    setShowTip(false);
  }, [index]);

  const progress = ((index + 1) / total) * 100;

  const onSayOk = () => {
    if (sentence.hasGlitch) {
      setShowTip(true);
    } else {
      onReveal('correct-ok');
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Chip label={topic.label} sx={{ bgcolor: topic.color, color: '#fff', fontWeight: 700 }} />
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onRestart}
        >
          החלפת תחום
        </Button>
      </Stack>

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {`משפט ${index + 1} מתוך ${total}`}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 12, borderRadius: 16 }}
        />
      </Box>

      <Card
        elevation={4}
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 3,
          minHeight: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderTop: `6px solid ${topic.color}`,
          background: 'linear-gradient(160deg, #ffffff 0%, #f3f0fb 100%)',
        }}
      >
        <Typography
          sx={{ fontSize: { xs: 26, sm: 36 }, fontWeight: 700, lineHeight: 1.5 }}
        >
          {sentence.text}
        </Typography>
      </Card>

      <Collapse in={showTip}>
        <Alert
          severity="info"
          icon={<SearchRoundedIcon />}
          sx={{ mb: 3, borderRadius: 4 }}
          onClose={() => setShowTip(false)}
        >
          בדקו שוב — יש כאן טעות קטנה שמתחבאת היטב. תקשיבו עוד פעם! 🔎
        </Alert>
      </Collapse>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <Button
          variant="contained"
          color="success"
          size="large"
          startIcon={<ThumbUpAltRoundedIcon />}
          onClick={onSayOk}
          sx={{ py: 2, fontSize: 20, fontWeight: 700 }}
        >
          המשפט תקין 👍
        </Button>
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<FrontHandRoundedIcon />}
          onClick={() => onReveal(sentence.hasGlitch ? 'correct-stop' : 'wrong-stop')}
          sx={{ py: 2, fontSize: 20, fontWeight: 700 }}
        >
          עצור! יש טעות 🛑
        </Button>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — The reveal
// ---------------------------------------------------------------------------

function RevealScreen({
  topic,
  sentence,
  verdict,
  isLast,
  onNext,
}: {
  topic: GlitchTopic;
  sentence: Sentence;
  verdict: Verdict;
  isLast: boolean;
  onNext: () => void;
}) {
  const caughtGlitch = verdict === 'correct-stop';

  // Confetti when the class correctly spots a planted error.
  useEffect(() => {
    if (caughtGlitch) {
      celebrate();
    }
  }, [caughtGlitch]);

  const alert =
    verdict === 'correct-stop'
      ? {
          severity: 'success' as const,
          title: 'תפסתם את הטעות! 🎉',
          body: 'בלשים חדי-עין! בדיוק כאן הסתתרה השגיאה.',
        }
      : verdict === 'correct-ok'
        ? {
            severity: 'success' as const,
            title: 'נכון מאוד! המשפט תקין ✅',
            body: 'יפה! לא נפלתם בפח — המשפט הזה כתוב כהלכה.',
          }
        : {
            severity: 'warning' as const,
            title: 'הפעם זו לא טעות 🙂',
            body: 'דווקא המשפט הזה תקין לגמרי. כל הכבוד על הערנות — ממשיכים הלאה!',
          };

  return (
    <Box>
      <Alert severity={alert.severity} sx={{ mb: 3, borderRadius: 4 }}>
        <AlertTitle sx={{ fontWeight: 800 }}>{alert.title}</AlertTitle>
        {alert.body}
      </Alert>

      <Card elevation={4} sx={{ p: { xs: 3, sm: 4 }, mb: 3, borderTop: `6px solid ${topic.color}` }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          המשפט המקורי
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 22, sm: 28 },
            fontWeight: 700,
            lineHeight: 1.5,
            textAlign: 'center',
            ...(caughtGlitch && { textDecoration: 'line-through', color: 'error.main' }),
          }}
        >
          {sentence.text}
        </Typography>

        {caughtGlitch && (
          <Alert severity="info" icon={false} sx={{ mt: 3, borderRadius: 4 }}>
            <AlertTitle sx={{ fontWeight: 800 }}>אז מה התיקון?</AlertTitle>
            <Typography sx={{ fontSize: 18 }}>{sentence.correction}</Typography>
          </Alert>
        )}
      </Card>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button variant="contained" size="large" onClick={onNext} sx={{ px: 4 }}>
          {isLast ? 'לסיכום 🏆' : 'למשפט הבא'}
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 4 — Summary
// ---------------------------------------------------------------------------

function SummaryScreen({
  topic,
  correct,
  total,
  onRestart,
}: {
  topic: GlitchTopic;
  correct: number;
  total: number;
  onRestart: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #f3e5f5 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1 }}>
            🔍
          </Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            כל הכבוד, בלשי השפה העברית! 🏆
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
            הכיתה הקשיבה בריכוז, חשבה בחדות ותפסה את הטעויות על חם. ככה נראית עברית של אלופים!
          </Typography>
          <Chip
            label={`זיהיתם נכון ${correct} מתוך ${total} משפטים`}
            sx={{ bgcolor: topic.color, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {`סיימתם את כל המשפטים בתחום: ${topic.label}`}
          </Typography>
          <Button variant="contained" size="large" startIcon={<ReplayRoundedIcon />} onClick={onRestart}>
            לתחום חדש
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
