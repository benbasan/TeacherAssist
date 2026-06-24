import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClassrooms } from '../context/ClassroomContext';
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
  Alert,
  AlertTitle,
  Fade,
  Badge,
  CircularProgress,
} from '@mui/material';
import EmojiPeopleRoundedIcon from '@mui/icons-material/EmojiPeopleRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INDIGO = '#3f51b5';
const TEAL = '#26a69a';
const EMERALD = '#10b981';
const AMBER = '#ffb300';
const LAVENDER_BG = 'linear-gradient(160deg, #ede7f6 0%, #e8eaf6 100%)';

function celebrate(): void {
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 50,
    origin: { y: 0.7 },
    colors: [INDIGO, TEAL, EMERALD, AMBER, '#ab47bc'],
  });
}

/** Pick a random element (used to select the secret rule when a game starts). */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Content model
// ---------------------------------------------------------------------------

type PackKey = 'funny_behavior' | 'logical_codes';

interface SecretRule {
  text: string;
  /** 3 concrete examples of how the class should answer under this rule. */
  examples: string[];
}

interface RulePack {
  key: PackKey;
  label: string;
  blurb: string;
  emoji: string;
  color: string;
  rules: SecretRule[];
}

const PACKS: Record<PackKey, RulePack> = {
  funny_behavior: {
    key: 'funny_behavior',
    label: 'חוקי התנהגות ומחוות מצחיקות',
    blurb: 'מתאים ליסודי — מחוות גוף וטונים מצחיקים שקל לבצע ולזהות.',
    emoji: '🤪',
    color: '#3f51b5',
    rules: [
      {
        text: "לגרד בראש או בברך בכל פעם שאומרים את המילים 'כן' או 'לא' בתשובה.",
        examples: [
          "בלש: 'אהבתם את ההפסקה?' — תלמיד מגרד בראש ועונה: 'כן, מאוד!'",
          "בלש: 'שיחקתם בכדורגל?' — תלמיד מגרד בברך ועונה: 'לא היום.'",
          "בלש: 'היה כיף?' — תלמידה מגרדת בראש: 'כן, ממש כיף.'",
        ],
      },
      {
        text: 'לענות על כל שאלה בטון דיבור של קריין חדשות דרמטי בטלוויזיה.',
        examples: [
          "בלש: 'מה אכלתם?' — '*בקול עמוק ודרמטי* הבוקר, ארוחה היסטורית של חביתה הוגשה!'",
          "בלש: 'מה שלומכם?' — 'מבזק חדשות: שלומנו מצוין, נתראה אחרי ההפסקה!'",
          "בלש: 'איזה יום היום?' — 'דיווח מיוחד מהכיתה: היום הוא יום שלישי!'",
        ],
      },
      {
        text: "להוסיף את המילה 'כאילו' אחרי כל מילה שנייה במשפט שמדברים.",
        examples: [
          "בלש: 'מה עשיתם בהפסקה?' — 'שיחקנו כאילו בחצר כאילו עם הכדור.'",
          "בלש: 'אהבתם את השיעור?' — 'מאוד כאילו אהבנו כאילו את זה.'",
          "בלש: 'מה תעשו אחר כך?' — 'נלך כאילו הביתה כאילו לנוח.'",
        ],
      },
      {
        text: "לפתוח כל תשובה לבלש במשפט המקדים: 'סבתא שלי תמיד אומרת ש...'",
        examples: [
          "בלש: 'מה השעה?' — 'סבתא שלי תמיד אומרת ש... עכשיו בערך עשר.'",
          "בלש: 'אהבתם את הסרט?' — 'סבתא שלי תמיד אומרת ש... סרטים זה כיף.'",
          "בלש: 'מי ניצח?' — 'סבתא שלי תמיד אומרת ש... העיקר ההשתתפות.'",
        ],
      },
      {
        text: 'למחוא כף פעם אחת בדיוק לפני שמוציאים את המילה הראשונה מהפה.',
        examples: [
          "בלש: 'מה שמך האהוב?' — *מחיאת כף* 'אני אוהב את השם דניאל.'",
          "בלש: 'מה אכלתם?' — *מחיאת כף* 'אכלנו פיצה טעימה.'",
          "בלש: 'איך היה היום?' — *מחיאת כף* 'היה ממש מוצלח.'",
        ],
      },
      {
        text: 'להסתכל ישירות אל התקרה למשך שתי שניות מיד כשמסיימים לדבר.',
        examples: [
          "בלש: 'מה למדתם?' — 'למדנו חשבון.' *ואז מבט לתקרה לשתי שניות*",
          "בלש: 'נהניתם?' — 'מאוד נהנינו.' *ומיד מסתכלים למעלה*",
          "בלש: 'מי המורה?' — 'המורה רותם.' *ומבט ארוך לתקרה*",
        ],
      },
      {
        text: 'לדבר רק בלחישה דרמטית וסודית, כאילו מגלים לבלש סוד מדינה כמוס.',
        examples: [
          "בלש: 'מה קרה בהפסקה?' — *בלחישה* 'אל תספר לאף אחד... שיחקנו תופסת.'",
          "בלש: 'מה אכלתם?' — *בלחישה דרמטית* 'סודי ביותר: אכלנו כריך.'",
          "בלש: 'מה השעה?' — *לוחשים* 'רק לך אני מגלה... כמעט עשר.'",
        ],
      },
    ],
  },
  logical_codes: {
    key: 'logical_codes',
    label: 'קודים לוגיים ושפת גוף',
    blurb: 'מתאים לחטיבה ותיכון — חוקים מורכבים שדורשים חשיבה לוגית לפענוח.',
    emoji: '🧩',
    color: '#5c6bc0',
    rules: [
      {
        text: "רק תלמידים שנועלים נעליים עם שרוכים רשאים לענות על שאלות הבלש. כל השאר שותקים או עונים 'אין תגובה'.",
        examples: [
          "בלש שואל את דנה (נעלי ספורט בלי שרוכים): 'מה שלומך?' — דנה: 'אין תגובה.'",
          "בלש שואל את יואב (נעליים עם שרוכים): 'מה אכלת?' — יואב עונה בחופשיות: 'אכלתי פסטה.'",
          "בלש: 'מי אוהב מתמטיקה?' — רק התלמידים עם השרוכים מרימים יד ועונים.",
        ],
      },
      {
        text: 'התשובה שלכם חייבת להתחיל באות הראשונה של השם של הבלש (למשל אם קוראים לו דני, כל משפט מתחיל בד\').',
        examples: [
          "הבלש דני שואל: 'מה עשיתם?' — 'דיברנו, דווקא נהנינו מאוד.'",
          "הבלש דני שואל: 'אהבתם?' — 'דעתנו? היה פשוט מצוין.'",
          "הבלשית מאיה שואלת: 'מה השעה?' — 'מאוחר קצת, כבר אחרי עשר.'",
        ],
      },
      {
        text: 'התשובה שלכם חייבת להיות שקר מוחלט ומצחיק (למשל: השמים סגולים, והמורה היא בכלל חתול).',
        examples: [
          "בלש: 'מה אכלתם?' — 'אכלנו ענן עם רוטב כוכבים, כרגיל.'",
          "בלש: 'איזה יום היום?' — 'היום יום שבת-וחצי, אחרי יום סגול.'",
          "בלש: 'מי המורה שלכם?' — 'המורה שלנו היא ג'ירפה שיודעת לטוס.'",
        ],
      },
      {
        text: 'אתם לא עונים על עצמכם! אתם עונים לפי הנתונים והאופי של התלמיד שיושב מימינכם.',
        examples: [
          "בלש שואל את רון: 'מה אתה אוהב?' — רון עונה על שכנו מימין: 'אני אוהב לצייר' (כי זה מה שאוהב מי שיושב מימינו).",
          "בלש: 'מה החיה האהובה עליך?' — כל אחד עונה את החיה של השכן מימינו.",
          "בלש: 'בן כמה אתה?' — כל תלמיד נותן את הגיל של מי שיושב לימינו.",
        ],
      },
      {
        text: "אם הבלש שואל שאלה שמכילה מספר או זמן (כמו 'מתי' או 'כמה'), כולם חייבים לשלב ידיים בזמן התשובה.",
        examples: [
          "בלש: 'מתי קמתם הבוקר?' — כולם משלבים ידיים: 'קמנו בשבע.'",
          "בלש: 'כמה אחים יש לכם?' — *משלבים ידיים* 'שניים.'",
          "בלש: 'מה הצבע האהוב?' (אין מספר) — עונים רגיל, בלי לשלב ידיים.",
        ],
      },
      {
        text: 'המילה הראשונה של התשובה שלכם חייבת להתחיל באות האחרונה של המילה האחרונה שהבלש הרגע אמר.',
        examples: [
          "בלש: '...מה עשיתם בהפסקה?' (המילה האחרונה 'בהפסקה' → ה) — 'הלכנו לחצר ושיחקנו.'",
          "בלש: '...איזה אוכל אהבתם?' (המילה 'אהבתם' → ם) — 'מאוד נהנינו מהפיצה.'",
          "בלש: '...מי המורה הכי כיף?' (המילה 'כיף' → ף) — 'פשוט כולם אהובים עלינו.'",
        ],
      },
      {
        text: 'קוד שפת גוף חשאי: אם אתם אומרים אמת - שלבו ידיים. אם אתם משקרים - השאירו ידיים פתוחות על השולחן.',
        examples: [
          "בלש: 'אכלתם ארוחת בוקר?' — תלמיד עם ידיים משולבות: 'כן' (וזו אמת).",
          "בלש: 'אתם בני 100?' — תלמיד עם ידיים פתוחות: 'בטח!' (וזה שקר).",
          "בלש: 'אתם אוהבים את בית הספר?' — חצי משלבים ידיים (אמת) וחצי פותחים (שקר), והבלש מנסה להבין מה הקוד.",
        ],
      },
    ],
  },
};

const DETECTIVE_QUESTIONS = [
  'מה עשיתם אתמול אחר הצהריים?',
  'איזה צבע אתם הכי אוהבים?',
  'מה אכלתם הבוקר לפני בית הספר?',
  'מה התוכניות שלכם לחופש הגדול?',
];

const REFLECTION_CARDS = [
  {
    audience: 'לבלש',
    emoji: '🕵️',
    color: INDIGO,
    body: 'איך זה הרגיש לעמוד מול כולם כשכולם יודעים משהו סודי שאתה לא שותף לו? האם זה היה מתסכל?',
  },
  {
    audience: 'לכיתה',
    emoji: '👥',
    color: TEAL,
    body: 'איך זה הרגיש להחזיק בכוח הקבוצתי ולדעת שחבר שלכם מרגיש מבולבל או מודר בגללכם?',
  },
  {
    audience: 'מוסר השכל כיתתי',
    emoji: '💜',
    color: '#7e57c2',
    body: 'בחיים האמיתיים, חרם או הדרה חברתית קורים לפעמים בדיוק ככה – קבוצה שלמה מחליטה על חוקים בלתי כתובים ומשאירה מישהו בחוץ. מה אנחנו יכולים לעשות בכיתה שלנו כדי שאף אחד לעולם לא ירגיש "אחד בחוץ"?',
  },
];

const ROUND_SECONDS = 120;
const START_ATTEMPTS = 3;

type Stage = 'setup' | 'reveal' | 'interrogation' | 'reflection';
type Outcome = 'cracked' | 'unsolved' | null;

// ---------------------------------------------------------------------------
// Root state machine: Setup → Reveal → Interrogation → Reflection
// ---------------------------------------------------------------------------

export default function OddOneOut({ gameId }: { gameId?: string }) {
  const { activeClassroom, activeClassroomId, markGameAsPlayedInClass } = useClassrooms();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('setup');
  const [pack, setPack] = useState<RulePack | null>(null);
  const [rule, setRule] = useState<SecretRule | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [attemptsLeft, setAttemptsLeft] = useState(START_ATTEMPTS);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const startGame = (chosen: RulePack) => {
    setPack(chosen);
    setRule(pickRandom(chosen.rules));
    setOutcome(null);
    setStage('reveal');
  };

  const beginInterrogation = () => {
    setSecondsLeft(ROUND_SECONDS);
    setAttemptsLeft(START_ATTEMPTS);
    setStage('interrogation');
  };

  const onCracked = () => {
    setOutcome('cracked');
    celebrate();
    setStage('reflection');
  };

  const onWrongGuess = () => {
    setAttemptsLeft((a) => {
      const next = a - 1;
      if (next <= 0) {
        setOutcome('unsolved');
        setStage('reflection');
      }
      return Math.max(0, next);
    });
  };

  const finish = () => {
    if (activeClassroomId && gameId) {
      void markGameAsPlayedInClass(activeClassroomId, gameId);
    }
    navigate('/');
  };

  // Pacing countdown for the interrogation; freezes at 0 (teacher stays in control).
  useEffect(() => {
    if (stage !== 'interrogation') return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  if (stage === 'setup' || !pack) {
    return <SetupScreen activeClassName={activeClassroom?.name ?? null} onStart={startGame} />;
  }

  if (stage === 'reveal' && rule) {
    return <RevealScreen pack={pack} rule={rule} onBegin={beginInterrogation} />;
  }

  if (stage === 'reflection') {
    return <ReflectionScreen rule={rule} outcome={outcome} onFinish={finish} />;
  }

  return (
    <InterrogationScreen
      secondsLeft={secondsLeft}
      attemptsLeft={attemptsLeft}
      onCracked={onCracked}
      onWrongGuess={onWrongGuess}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — Setup & preparation
// ---------------------------------------------------------------------------

function SetupScreen({
  activeClassName,
  onStart,
}: {
  activeClassName: string | null;
  onStart: (pack: RulePack) => void;
}) {
  const [selected, setSelected] = useState<PackKey | null>(null);

  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 56, lineHeight: 1 }}>
          🕵️‍♂️🔍
        </Typography>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          אחד בחוץ: מפענחים את החוקיות
        </Typography>
        {activeClassName ? (
          <Chip
            icon={<EmojiPeopleRoundedIcon />}
            label={`משחקים עם כיתה: ${activeClassName}`}
            sx={{ bgcolor: EMERALD, color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
        ) : (
          <Typography variant="body1" color="text.secondary">
            שלום מורה! 👋 בחרו חבילת חוקים סודית — ובואו נצא לחקירה כיתתית מסקרנת.
          </Typography>
        )}
      </Stack>

      <Alert
        icon={<GavelRoundedIcon fontSize="inherit" />}
        severity="warning"
        sx={{ mb: 4, borderRadius: 4, fontSize: 17 }}
      >
        <AlertTitle sx={{ fontWeight: 800 }}>איך מתכוננים?</AlertTitle>
        בחרו תלמיד אחד שיצא לרגע אל מחוץ לכיתה (או שיעצום עיניים ויאטום אוזניים). הוא יהיה הבלש שיצטרך
        לגלות את החוקיות הסודית שלכם.
      </Alert>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        בחרו חבילת חוקים:
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          mb: 4,
        }}
      >
        {(Object.keys(PACKS) as PackKey[]).map((key) => {
          const p = PACKS[key];
          const isSel = selected === key;
          return (
            <Card
              key={p.key}
              elevation={isSel ? 8 : 3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${p.color}`,
                outline: isSel ? `3px solid ${p.color}` : 'none',
              }}
            >
              <CardActionArea
                onClick={() => setSelected(key)}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3.5 }}>
                  <Typography sx={{ fontSize: 52, lineHeight: 1, mb: 1 }}>{p.emoji}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {p.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.blurb}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          disabled={!selected}
          onClick={() => selected && onStart(PACKS[selected])}
          sx={{ px: 5, py: 1.75, fontSize: 20, fontWeight: 800 }}
        >
          התחל משחק וחשוף חוקיות לכיתה
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — Secret rule reveal
// ---------------------------------------------------------------------------

function RevealScreen({
  pack,
  rule,
  onBegin,
}: {
  pack: RulePack;
  rule: SecretRule;
  onBegin: () => void;
}) {
  return (
    <Box>
      <Alert
        icon={<VisibilityOffRoundedIcon fontSize="inherit" />}
        severity="error"
        sx={{ mb: 3, borderRadius: 4, fontSize: 18, fontWeight: 700, alignItems: 'center' }}
      >
        ודאו שהבלש בחוץ ולא רואה את המסך!
      </Alert>

      <Stack spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Chip label={pack.label} sx={{ bgcolor: pack.color, color: '#fff', fontWeight: 700 }} />
        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 700 }}>
          החוקיות הסודית שלכם:
        </Typography>
      </Stack>

      <Card
        elevation={4}
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 3,
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderTop: `8px solid ${AMBER}`,
          background: 'linear-gradient(160deg, #fffdf5 0%, #fff6da 100%)',
        }}
      >
        <Typography sx={{ fontSize: { xs: 26, sm: 38 }, fontWeight: 900, lineHeight: 1.4, color: '#b8860b' }}>
          {rule.text}
        </Typography>
      </Card>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        3 דוגמאות איך לענות:
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 4 }}>
        {rule.examples.map((ex, i) => (
          <Paper
            key={i}
            elevation={1}
            sx={{
              p: 2,
              borderInlineStart: `5px solid ${AMBER}`,
              background: 'linear-gradient(160deg, #ffffff 0%, #fffaf0 100%)',
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Chip
                label={i + 1}
                size="small"
                sx={{ bgcolor: AMBER, color: '#fff', fontWeight: 800 }}
              />
              <Typography variant="body1" sx={{ fontSize: 17, fontWeight: 500, lineHeight: 1.5 }}>
                {ex}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={onBegin}
          sx={{ px: 5, py: 1.75, fontSize: 20, fontWeight: 800, bgcolor: INDIGO }}
        >
          הבלש חזר לכיתה! התחל טיימר וחקירה 🕵️‍♂️
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — Interrogation floor
// ---------------------------------------------------------------------------

function InterrogationScreen({
  secondsLeft,
  attemptsLeft,
  onCracked,
  onWrongGuess,
}: {
  secondsLeft: number;
  attemptsLeft: number;
  onCracked: () => void;
  onWrongGuess: () => void;
}) {
  const progress = (secondsLeft / ROUND_SECONDS) * 100;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Box>
      {/* Top bar: timer + remaining guesses */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap' }}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={progress}
            size={120}
            thickness={5}
            sx={{ color: INDIGO }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.dark' }}>
              {`${mm}:${ss}`}
            </Typography>
          </Box>
        </Box>

        <Badge
          badgeContent={attemptsLeft}
          color="error"
          sx={{ '& .MuiBadge-badge': { fontSize: 18, height: 28, minWidth: 28, borderRadius: '14px' } }}
        >
          <Chip
            icon={<GavelRoundedIcon />}
            label="ניסיונות ניחוש שנשארו"
            sx={{ bgcolor: 'secondary.main', color: '#fff', fontWeight: 700, fontSize: 16, py: 2.5, px: 1 }}
          />
        </Badge>
      </Stack>

      <Alert severity="info" icon={<QuestionAnswerRoundedIcon />} sx={{ mb: 2, borderRadius: 4 }}>
        הכיתה עונה על <strong>כל</strong> שאלה שהבלש שואל — אבל תמיד לפי החוקיות הסודית! הנה כמה שאלות
        שיעזרו לבלש להתחיל לחקור:
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          mb: 4,
        }}
      >
        {DETECTIVE_QUESTIONS.map((q, i) => (
          <Card
            key={i}
            elevation={2}
            sx={{ borderTop: `5px solid ${INDIGO}`, height: '100%' }}
          >
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 28 }}>💬</Typography>
                <Typography variant="body1" sx={{ fontSize: 19, fontWeight: 600, lineHeight: 1.4 }}>
                  {q}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Action bar */}
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
          onClick={onCracked}
          sx={{ py: 2.5, fontSize: 20, fontWeight: 800, bgcolor: EMERALD, '&:hover': { bgcolor: '#0e9f6e' } }}
        >
          🛑 הבלש פיצח את החוקיות!
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={onWrongGuess}
          disabled={attemptsLeft <= 0}
          sx={{ py: 2.5, fontSize: 20, fontWeight: 800, bgcolor: '#f43f5e', '&:hover': { bgcolor: '#e11d48' } }}
        >
          ❌ ניחוש שגוי
        </Button>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Screen 4 — Deep pedagogical reflection (calm; no confetti)
// ---------------------------------------------------------------------------

function ReflectionScreen({
  rule,
  outcome,
  onFinish,
}: {
  rule: SecretRule | null;
  outcome: Outcome;
  onFinish: () => void;
}) {
  return (
    <Fade in timeout={700}>
      <Box sx={{ borderRadius: 4, p: { xs: 2, sm: 3 }, background: LAVENDER_BG }}>
        <Stack spacing={1.5} sx={{ mb: 3, textAlign: 'center', alignItems: 'center' }}>
          <FavoriteRoundedIcon sx={{ fontSize: 52, color: '#7e57c2' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#4527a0' }}>
            איך זה מרגיש להיות "אחד בחוץ"?
          </Typography>
          {outcome && (
            <Chip
              label={outcome === 'cracked' ? 'הבלש פיצח את החוקיות! 👏' : 'החוקיות לא פוענחה הפעם'}
              sx={{
                bgcolor: outcome === 'cracked' ? EMERALD : '#9575cd',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                py: 2,
                px: 1,
              }}
            />
          )}
          {rule && (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
              <strong>החוקיות הייתה:</strong> {rule.text}
            </Typography>
          )}
        </Stack>

        <Stack spacing={2.5} sx={{ mb: 4 }}>
          {REFLECTION_CARDS.map((c) => (
            <Paper
              key={c.audience}
              elevation={2}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderInlineStart: `6px solid ${c.color}`,
                background: 'rgba(255,255,255,0.85)',
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 34, lineHeight: 1 }}>{c.emoji}</Typography>
                <Box>
                  <Chip
                    label={c.audience}
                    size="small"
                    sx={{ bgcolor: c.color, color: '#fff', fontWeight: 700, mb: 1 }}
                  />
                  <Typography variant="body1" sx={{ fontSize: 18, lineHeight: 1.6, fontWeight: 500 }}>
                    {c.body}
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
            startIcon={<LockRoundedIcon />}
            onClick={onFinish}
            sx={{ px: 5, py: 1.5, fontSize: 20, fontWeight: 700, bgcolor: '#5e35b1', '&:hover': { bgcolor: '#4527a0' } }}
          >
            סיום פעילות ונעילה
          </Button>
        </Stack>
      </Box>
    </Fade>
  );
}
