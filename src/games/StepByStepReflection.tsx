import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
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
  Fade,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EmojiPeopleRoundedIcon from '@mui/icons-material/EmojiPeopleRounded';

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

type TopicKey = 'family' | 'learning' | 'social';

interface ReflectionTopic {
  key: TopicKey;
  label: string;
  blurb: string;
  emoji: string;
  color: string;
  /** "Strengths" statements — those they fit step forward. */
  forward: string[];
  /** "Challenges" statements — those who experienced it step backward. */
  backward: string[];
}

// ---------------------------------------------------------------------------
// Content (SEL — value statements for a Privilege-Walk style activity)
//   `family` / `learning` are verbatim from the brief.
//   `social` was authored here (no pool in the brief) — age-appropriate Hebrew
//   matching the tone of the other two topics.
// ---------------------------------------------------------------------------

const TOPICS: Record<TopicKey, ReflectionTopic> = {
  family: {
    key: 'family',
    label: 'משפחה וכיבוד הורים',
    blurb: 'על הקשר עם ההורים, האחים והבית.',
    emoji: '👨‍👩‍👧‍👦',
    color: '#5c6bc0',
    forward: [
      "אמרתי השבוע מרצוני 'תודה' להורים.",
      'עזרתי לפנות את השולחן או לסדר את הבית בלי שביקשו ממני.',
      'ויתרתי על משהו שרציתי בשביל אח או אחות.',
    ],
    backward: [
      'השבוע צעקתי או דיברתי לא יפה בבית כי הייתי בעצבים.',
      'הרגשתי לפעמים שההורים שלי לא מבינים אותי.',
      'הבטחתי להורים שאעשה משהו ולא קיימתי.',
    ],
  },
  learning: {
    key: 'learning',
    label: 'לימודים וצמיחה',
    blurb: 'על מאמץ, התמדה והאומץ לנסות.',
    emoji: '📚',
    color: '#26a69a',
    forward: [
      'היה לי השבוע רגע שבו באמת התאמצתי ולא ויתרתי על תרגיל קשה.',
      'עזרתי לחבר או חברה בכיתה להבין חומר לימודי.',
      'השתתפתי בשיעור והרגשתי גאה בתשובה שעניתי.',
    ],
    backward: [
      'הרגשתי השבוע תסכול או לחץ גדול בגלל לימודים או מבחן.',
      'ויתרתי לעצמי והרמתי ידיים במשימה מסוימת.',
      'פחדתי להצביע בשיעור כי חששתי שיצחקו עליי.',
    ],
  },
  social: {
    key: 'social',
    label: 'חברים וחברה',
    blurb: 'על חברות, השתייכות והדרך שבה אנחנו מתייחסים זה לזה.',
    emoji: '🤝',
    color: '#ab47bc',
    forward: [
      'עזרתי השבוע לחבר או חברה שהיו עצובים או הרגישו לבד.',
      'צירפתי מישהו למשחק או לקבוצה כדי שלא יישאר בחוץ.',
      "אמרתי 'סליחה' אחרי ריב, או סלחתי למישהו שפגע בי.",
    ],
    backward: [
      'השבוע השארתי מישהו בחוץ או לא נתתי לו להצטרף אליי.',
      'צחקתי על מישהו או דיברתי עליו מאחורי הגב.',
      'הרגשתי השבוע בודד/ה או שלא היה לי עם מי לשחק.',
    ],
  },
};

const DEBRIEF_QUESTIONS = [
  {
    emoji: '👀',
    title: 'מה הרגשנו?',
    body: 'איך זה הרגיש לראות חברים זזים קדימה או אחורה? והאם הופתעתם ממשהו?',
  },
  {
    emoji: '🔎',
    title: 'מה גילינו?',
    body: 'מה גילינו על הכיתה שלנו היום? איפה אנחנו דומים, ואיפה כל אחד מתמודד עם דברים אחרים?',
  },
  {
    emoji: '🤝',
    title: 'מה הלאה?',
    body: 'איך נוכל להמשיך לתמוך אחד בשני, גם כשמישהו נמצא צעד אחורה?',
  },
];

const EMERALD = '#10b981';
const AMBER = '#ff9800';

type Stage = 'setup' | 'forward' | 'backward' | 'debrief';

// ---------------------------------------------------------------------------
// Root state machine: Setup → Forward → Backward → Debrief
// ---------------------------------------------------------------------------

export default function StepByStepReflection({ gameId }: { gameId?: string }) {
  const { activeClassroom, activeClassroomId, markGameAsPlayedInClass } = useClassrooms();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('setup');
  const [topicKey, setTopicKey] = useState<TopicKey | null>(null);
  const [index, setIndex] = useState(0);

  const topic = topicKey ? TOPICS[topicKey] : null;

  const selectTopic = (key: TopicKey) => {
    setTopicKey(key);
    setIndex(0);
    setStage('forward');
  };

  // Advance within a phase; cross into the next phase / debrief at the end.
  const next = () => {
    if (!topic) return;
    if (stage === 'forward') {
      if (index < topic.forward.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setIndex(0);
        setStage('backward');
      }
    } else if (stage === 'backward') {
      if (index < topic.backward.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setStage('debrief');
      }
    }
  };

  const finish = () => {
    if (activeClassroomId && gameId) {
      void markGameAsPlayedInClass(activeClassroomId, gameId);
    }
    navigate('/');
  };

  if (stage === 'setup' || !topic) {
    return <SetupScreen activeClassName={activeClassroom?.name ?? null} onSelect={selectTopic} />;
  }

  if (stage === 'debrief') {
    return <DebriefScreen onFinish={finish} />;
  }

  const isForward = stage === 'forward';
  const statements = isForward ? topic.forward : topic.backward;
  const total = topic.forward.length + topic.backward.length;
  // Continuing global count: forward 1..N, backward N+1..total.
  const globalNumber = isForward ? index + 1 : topic.forward.length + index + 1;

  return (
    <PhaseScreen
      key={stage}
      direction={isForward ? 'forward' : 'backward'}
      statement={statements[index]}
      stepIndex={index}
      stepCount={statements.length}
      globalNumber={globalNumber}
      total={total}
      onNext={next}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Setup / topic selection
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  onSelect,
}: {
  activeClassName: string | null;
  onSelect: (key: TopicKey) => void;
}) {
  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          🚶‍♀️🚶‍♂️
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          צעד צעד: מרוץ המודעות
        </Typography>
        {activeClassName ? (
          <Chip
            icon={<EmojiPeopleRoundedIcon />}
            label={`משחקים עם כיתה: ${activeClassName}`}
            color="secondary"
            sx={{ fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
        ) : (
          <Typography variant="body1" color="text.secondary">
            שלום מורה! 👋 בואו ניישר קו, נזוז יחד במרחב ונגלה שלכל אחד יש קו זינוק וחוזקות משלו.
          </Typography>
        )}
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
          בחרו נושא לשיחה. כל הילדים מתחילים על אותו קו — ובכל היגד זזים צעד קדימה או אחורה.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {(Object.keys(TOPICS) as TopicKey[]).map((key) => {
          const t = TOPICS[key];
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
              <CardActionArea
                onClick={() => onSelect(t.key)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ fontSize: 52, lineHeight: 1, mb: 1 }}>{t.emoji}</Typography>
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
// Screens 2 & 3 — Movement phases (shared; differs by direction/color)
// ---------------------------------------------------------------------------

function PhaseScreen({
  direction,
  statement,
  stepIndex,
  stepCount,
  globalNumber,
  total,
  onNext,
}: {
  direction: 'forward' | 'backward';
  statement: string;
  stepIndex: number;
  stepCount: number;
  globalNumber: number;
  total: number;
  onNext: () => void;
}) {
  const isForward = direction === 'forward';
  const accent = isForward ? EMERALD : AMBER;
  const phaseLabel = isForward ? 'שלב החוזקות' : 'שלב האתגרים';
  const cue = isForward
    ? 'מי שההיגד נכון לגביו - קחו צעד אחד קדימה!'
    : 'מי שחווה את זה השבוע - קחו צעד אחד אחורה!';
  const Arrow = isForward ? ArrowUpwardIcon : ArrowDownwardIcon;
  const isLast = stepIndex === stepCount - 1 && !isForward; // last backward → debrief

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          borderRadius: 4,
          p: { xs: 2, sm: 3 },
          background: isForward
            ? 'linear-gradient(160deg, #ffffff 0%, #e6f7f0 100%)'
            : 'linear-gradient(160deg, #ffffff 0%, #fff3e0 100%)',
        }}
      >
        {/* Progress */}
        <Stack spacing={1.5} sx={{ mb: 3, alignItems: 'center' }}>
          <Chip
            label={`היגד ${globalNumber} מתוך ${total} — ${phaseLabel}`}
            sx={{ bgcolor: accent, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
          <Stepper activeStep={stepIndex} alternativeLabel sx={{ width: '100%', maxWidth: 420 }}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <Step key={i}>
                <StepLabel
                  sx={{
                    '& .MuiStepIcon-root.Mui-active': { color: accent },
                    '& .MuiStepIcon-root.Mui-completed': { color: accent },
                  }}
                >
                  {''}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Stack>

        {/* The statement */}
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
            borderTop: `6px solid ${accent}`,
          }}
        >
          <Typography sx={{ fontSize: { xs: 28, sm: 40 }, fontWeight: 800, lineHeight: 1.45 }}>
            {statement}
          </Typography>
        </Card>

        {/* Movement cue */}
        <Stack spacing={1} sx={{ mb: 3, alignItems: 'center' }}>
          <Arrow
            sx={{
              fontSize: { xs: 64, sm: 88 },
              color: accent,
              animation: 'reflectionPulse 1.6s ease-in-out infinite',
              '@keyframes reflectionPulse': {
                '0%, 100%': {
                  transform: `translateY(0) scale(1)`,
                  opacity: 0.85,
                },
                '50%': {
                  transform: `translateY(${isForward ? '-10px' : '10px'}) scale(1.12)`,
                  opacity: 1,
                },
              },
            }}
          />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: accent, textAlign: 'center', px: 2 }}
          >
            {cue}
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={onNext}
            sx={{
              px: 5,
              py: 1.5,
              fontSize: 20,
              fontWeight: 700,
              bgcolor: accent,
              '&:hover': { bgcolor: accent, filter: 'brightness(0.93)' },
            }}
          >
            {isLast ? 'עוצרים ומדברים 🤍' : 'להיגד הבא'}
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
}

// ---------------------------------------------------------------------------
// Screen 4 — Debrief & reflection (calm; deliberately no confetti)
// ---------------------------------------------------------------------------

function DebriefScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <Fade in timeout={700}>
      <Box>
        <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 52, lineHeight: 1 }}>
            🤍
          </Typography>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            עוצרים ומדברים
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
            כולם קופאים במקום שבו הם נמצאים, מסתכלים סביב בשקט — ואז מתיישבים יחד למעגל שיחה.
          </Typography>
        </Stack>

        <Stack spacing={2.5} sx={{ mb: 4 }}>
          {DEBRIEF_QUESTIONS.map((q) => (
            <Paper
              key={q.title}
              elevation={2}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderInlineStart: '6px solid',
                borderColor: 'secondary.main',
                background: 'linear-gradient(160deg, #ffffff 0%, #f3f6fb 100%)',
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 36, lineHeight: 1 }}>{q.emoji}</Typography>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                    {q.title}
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: 18, lineHeight: 1.6 }}>
                    {q.body}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onFinish}
            sx={{ px: 5, py: 1.5, fontSize: 20, fontWeight: 700 }}
          >
            סיום פעילות
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
}
