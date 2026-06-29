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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import contentData from '../data/content/social-dilemmas-content.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: ['#3f51b5', '#26a69a', '#ffca28', '#ef5350', '#ab47bc'],
  });
}

const START_EMPATHY = 50;

type ChoiceColor = 'success' | 'warning' | 'error' | 'primary' | 'secondary';

interface Choice {
  label: string;
  color: ChoiceColor;
  empathyDelta: number;
  shortTerm: string;
  longTerm: string;
  questions: [string, string];
}

interface Dilemma {
  headline: string;
  scenario: string;
  choices: Choice[];
}

interface Topic {
  key: string;
  label: string;
  icon: string; // icon-name string resolved via ICON_MAP
  color: string;
  dilemmas: Dilemma[];
}

/** Maps a topic's icon-name string (from JSON) to its MUI icon component. */
const ICON_MAP: Record<string, SvgIconComponent> = {
  park: ParkRoundedIcon,
  smartphone: SmartphoneRoundedIcon,
  handshake: HandshakeRoundedIcon,
  favorite: FavoriteRoundedIcon,
};

// ---------------------------------------------------------------------------
// Content — topic/dilemma pools live in external JSON (see CLAUDE.md → Game
// Content & Architecture Rules), keyed by age cohort.
// ---------------------------------------------------------------------------

type AgeGroupKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

interface CohortTopics {
  label: string;
  topics: Topic[];
}

const CONTENT = contentData as unknown as Record<AgeGroupKey, CohortTopics>;

const AGE_GROUPS: { key: AgeGroupKey; label: string }[] = [
  { key: 'lower_elementary', label: CONTENT.lower_elementary.label },
  { key: 'upper_elementary', label: CONTENT.upper_elementary.label },
  { key: 'junior_high_high', label: CONTENT.junior_high_high.label },
];

type Stage = 'topic' | 'scenario' | 'consequence' | 'summary';

// ---------------------------------------------------------------------------
// Root state machine: Topic → Scenario → Consequence → (loop) → Summary
// ---------------------------------------------------------------------------

export default function SocialDilemmas({ gameId }: { gameId?: string }) {
  const [stage, setStage] = useState<Stage>('topic');
  const [ageGroup, setAgeGroup] = useState<AgeGroupKey>('upper_elementary');
  const [topic, setTopic] = useState<Topic | null>(null);
  useMarkGamePlayed(gameId, stage === 'summary');
  const [index, setIndex] = useState(0);
  const [empathy, setEmpathy] = useState(START_EMPATHY);
  const [choice, setChoice] = useState<Choice | null>(null);

  const selectTopic = (t: Topic) => {
    setTopic(t);
    setIndex(0);
    setEmpathy(START_EMPATHY);
    setChoice(null);
    setStage('scenario');
  };

  const makeChoice = (c: Choice) => {
    setChoice(c);
    setStage('consequence');
  };

  // Called from the consequence screen with the committed (post-animation) value.
  const nextDilemma = (committedEmpathy: number) => {
    setEmpathy(committedEmpathy);
    if (topic && index < topic.dilemmas.length - 1) {
      setIndex((i) => i + 1);
      setChoice(null);
      setStage('scenario');
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
    return (
      <TopicScreen
        topics={CONTENT[ageGroup].topics}
        ageGroup={ageGroup}
        onAgeGroupChange={setAgeGroup}
        onSelect={selectTopic}
      />
    );
  }

  if (stage === 'summary') {
    return <SummaryScreen topic={topic} empathy={empathy} onRestart={restart} />;
  }

  const dilemma = topic.dilemmas[index];

  if (stage === 'consequence' && choice) {
    return (
      <ConsequenceScreen
        topicColor={topic.color}
        empathyBefore={empathy}
        choice={choice}
        isLast={index === topic.dilemmas.length - 1}
        onNext={nextDilemma}
      />
    );
  }

  return (
    <ScenarioScreen
      topic={topic}
      dilemma={dilemma}
      index={index}
      empathy={empathy}
      onChoose={makeChoice}
      onRestart={restart}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared empathy meter
// ---------------------------------------------------------------------------

function EmpathyMeter({ value }: { value: number }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mb: 0.5 }}>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <FavoriteRoundedIcon fontSize="small" color="secondary" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            מדד האמפתיה הכיתתי
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {Math.round(value)}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={value}
        color="secondary"
        sx={{ height: 14, borderRadius: 16 }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Topic selection
// ---------------------------------------------------------------------------

function TopicScreen({
  topics,
  ageGroup,
  onAgeGroupChange,
  onSelect,
}: {
  topics: Topic[];
  ageGroup: AgeGroupKey;
  onAgeGroupChange: (g: AgeGroupKey) => void;
  onSelect: (t: Topic) => void;
}) {
  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          🤔
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          מה הייתם עושים? מרוץ הדילמות
        </Typography>
        <Typography variant="body1" color="text.secondary">
          בחרו נושא לשיחה — וצאו יחד למסע של דילמות, החלטות ואמפתיה.
        </Typography>
      </Stack>

      <Stack spacing={1.25} sx={{ alignItems: 'center', mb: 3 }}>
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

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}
      >
        {topics.map((t) => {
          const Icon = ICON_MAP[t.icon] ?? ParkRoundedIcon;
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
                onClick={() => onSelect(t)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 5 }}>
                  <Icon sx={{ fontSize: 56, color: t.color, mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t.label}
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
// Screen 2 — Scenario + choices
// ---------------------------------------------------------------------------

function ScenarioScreen({
  topic,
  dilemma,
  index,
  empathy,
  onChoose,
  onRestart,
}: {
  topic: Topic;
  dilemma: Dilemma;
  index: number;
  empathy: number;
  onChoose: (c: Choice) => void;
  onRestart: () => void;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Chip label={`${topic.label} · דילמה ${index + 1}/${topic.dilemmas.length}`} color="primary" />
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={onRestart}
        >
          החלפת נושא
        </Button>
      </Stack>

      <EmpathyMeter value={empathy} />

      <Card elevation={4} sx={{ p: { xs: 3, sm: 4 }, mb: 3, borderTop: `6px solid ${topic.color}` }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
          {dilemma.headline}
        </Typography>
        <Typography variant="body1" sx={{ fontSize: 18, lineHeight: 1.7 }}>
          {dilemma.scenario}
        </Typography>
      </Card>

      <Stack spacing={2}>
        {dilemma.choices.map((c) => (
          <Button
            key={c.label}
            variant="contained"
            color={c.color}
            size="large"
            onClick={() => onChoose(c)}
            sx={{ py: 1.8, fontSize: 17, justifyContent: 'flex-start', textAlign: 'start' }}
          >
            {c.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Consequence + discussion
// ---------------------------------------------------------------------------

function ConsequenceScreen({
  topicColor,
  empathyBefore,
  choice,
  isLast,
  onNext,
}: {
  topicColor: string;
  empathyBefore: number;
  choice: Choice;
  isLast: boolean;
  onNext: (committed: number) => void;
}) {
  const after = clamp(empathyBefore + choice.empathyDelta);
  // Start the meter at the previous value, then glide to the new one.
  const [meter, setMeter] = useState(empathyBefore);

  useEffect(() => {
    const t = setTimeout(() => setMeter(after), 150);
    return () => clearTimeout(t);
  }, [after]);

  const positive = choice.empathyDelta > 0;
  const neutral = choice.empathyDelta === 0;

  return (
    <Box>
      <EmpathyMeter value={meter} />

      <Card elevation={4} sx={{ p: { xs: 3, sm: 4 }, mb: 3, borderTop: `6px solid ${topicColor}` }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            מה קרה בעקבות הבחירה?
          </Typography>
          <Chip
            label={
              neutral
                ? 'אמפתיה ללא שינוי'
                : `${positive ? '+' : ''}${choice.empathyDelta} לאמפתיה הכיתתית`
            }
            color={positive ? 'secondary' : neutral ? 'default' : 'warning'}
            size="small"
          />
        </Stack>

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              מיד
            </Typography>
            <Typography variant="body1" sx={{ fontSize: 17 }}>
              {choice.shortTerm}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              בהמשך
            </Typography>
            <Typography variant="body1" sx={{ fontSize: 17 }}>
              {choice.longTerm}
            </Typography>
          </Box>
        </Stack>
      </Card>

      <Alert severity="info" icon={false} sx={{ mb: 3, borderRadius: 4 }}>
        <AlertTitle sx={{ fontWeight: 800 }}>נקודות למחשבה ושיח בכיתה</AlertTitle>
        <Stack component="ul" spacing={1} sx={{ pr: 3, my: 0 }}>
          {choice.questions.map((q) => (
            <Typography key={q} component="li" variant="body1" sx={{ fontSize: 17 }}>
              {q}
            </Typography>
          ))}
        </Stack>
      </Alert>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button variant="contained" size="large" onClick={() => onNext(after)}>
          {isLast ? 'לסיכום המסע 🎉' : 'לדילמה הבאה'}
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
  empathy,
  onRestart,
}: {
  topic: Topic;
  empathy: number;
  onRestart: () => void;
}) {
  const tier =
    empathy >= 75
      ? {
          title: 'כיתה אלופה באמפתיה! 🏆',
          message:
            'הכיתה הראתה אכפתיות, אומץ ויושרה. אתם יודעים לעמוד לצד מי שזקוק לכם — וזו גבורה אמיתית.',
        }
      : empathy >= 50
        ? {
            title: 'כיתה במסע יפה של צמיחה! 🌱',
            message:
              'עשיתם בחירות טובות רבות, ויש עוד לאן לגדול יחד. כל דילמה היא הזדמנות להיות חברים טובים יותר.',
          }
        : {
            title: 'התחלה של שיחה חשובה 💬',
            message:
              'חלק מהבחירות לא היו קלות, ויש לנו על מה לדבר. החלק הכי חשוב הוא שאנחנו לומדים ומדברים על זה יחד.',
          };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 640,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          background: 'linear-gradient(160deg, #ffffff 0%, #e0f2f1 100%)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h2" sx={{ fontSize: 64, lineHeight: 1 }}>
            💛
          </Typography>
          <Typography variant="h4" color="secondary.dark" sx={{ fontWeight: 800 }}>
            {tier.title}
          </Typography>

          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <EmpathyMeter value={empathy} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
            {tier.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`סיימתם את כל הדילמות בנושא: ${topic.label}`}
          </Typography>

          <Button variant="contained" size="large" startIcon={<ReplayRoundedIcon />} onClick={onRestart}>
            לנושא חדש
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
