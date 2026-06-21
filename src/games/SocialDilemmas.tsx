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
} from '@mui/material';
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';

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
  icon: typeof ParkRoundedIcon;
  color: string;
  dilemmas: Dilemma[];
}

// ---------------------------------------------------------------------------
// Content (Hebrew, grades ה׳–ו׳)
// ---------------------------------------------------------------------------

const TOPICS: Topic[] = [
  {
    key: 'school_yard',
    label: 'חצר בית הספר',
    icon: ParkRoundedIcon,
    color: '#3f51b5',
    dilemmas: [
      {
        headline: 'לבד בהפסקה',
        scenario:
          'ילד חדש עומד לבד בפינת החצר ולא משחק עם אף אחד. החברים שלכם קוראים לכם בדיוק עכשיו לשחק כדורגל.',
        choices: [
          {
            label: 'ניגשים ומזמינים אותו לשחק איתנו',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'הוא מחייך בהקלה ומצטרף בשמחה למשחק.',
            longTerm: 'נוצרת חברות חדשה, והכיתה כולה מרגישה פתוחה ומגבשת יותר.',
            questions: [
              'איך מרגיש מישהו שנשאר לבד בהפסקה?',
              'מהו הצעד הקטן שכל אחד מאיתנו יכול לעשות כדי שאף ילד לא יישאר לבד?',
            ],
          },
          {
            label: 'ממשיכים לשחק ומתעלמים ממנו',
            color: 'warning',
            empathyDelta: -5,
            shortTerm: 'הוא נשאר לבד עד שההפסקה נגמרת.',
            longTerm: 'בהדרגה הוא מרגיש שלא רוצים אותו, ומפסיק לנסות להתקרב.',
            questions: [
              'מה ההבדל בין "לא להזיק" לבין "לעזור"?',
              'האם פעם הרגשתם בלתי-נראים? מה הייתם רוצים שמישהו יעשה בשבילכם?',
            ],
          },
          {
            label: 'צוחקים עליו יחד עם החברים',
            color: 'error',
            empathyDelta: -15,
            shortTerm: 'הוא מסמיק ועוזב את החצר במהירות.',
            longTerm: 'נפגעת תחושת הביטחון שלו, והאקלים בכיתה נעשה פוגעני יותר.',
            questions: [
              'מה גורם לנו לפעמים לצחוק על אחרים כדי "להשתלב"?',
              'כיצד מילה אחת יכולה לשנות את כל היום של מישהו — לטוב או לרע?',
            ],
          },
        ],
      },
      {
        headline: 'המגדל שנפל',
        scenario:
          'בטעות בעטתם בכדור והפלתם מגדל קוביות שקבוצה אחרת בנתה בעמל רב. הם לא ראו שזה הייתם אתם.',
        choices: [
          {
            label: 'ניגשים, מתנצלים ומציעים לעזור לבנות מחדש',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'הם מופתעים לטובה, וביחד המגדל קם שוב — אפילו גבוה יותר.',
            longTerm: 'אתם נתפסים כחברים שאפשר לסמוך עליהם, גם כשטועים.',
            questions: [
              'למה לפעמים קשה כל כך להודות בטעות?',
              'מה מרגישים כשמישהו לוקח אחריות על משהו שעשה?',
            ],
          },
          {
            label: 'שותקים וממשיכים כאילו כלום',
            color: 'warning',
            empathyDelta: -5,
            shortTerm: 'אף אחד לא יודע, אבל אתם מרגישים לא נעים בבטן.',
            longTerm: 'הקבוצה מאוכזבת שאיש לא התנצל, והאמון נסדק.',
            questions: [
              'מה ההבדל בין להיתפס לבין לעשות את הדבר הנכון?',
              'איך מרגישה "בטן לא נעימה", ומה היא מנסה לומר לנו?',
            ],
          },
          {
            label: 'מאשימים ילד אחר שעמד בקרבת מקום',
            color: 'error',
            empathyDelta: -15,
            shortTerm: 'הילד נענש על משהו שלא עשה ונפגע מאוד.',
            longTerm: 'כשהאמת מתגלה, קשה לכולם להאמין לכם שוב.',
            questions: [
              'מה קורה לאמון בינינו כשמאשימים מישהו על לא עוול בכפו?',
              'מדוע לפעמים קל יותר להאשים מאשר להתנצל?',
            ],
          },
        ],
      },
      {
        headline: 'התור בנדנדה',
        scenario:
          'חיכיתם זמן רב לתור בנדנדה. כשסוף סוף הגיע תורכם, ילד קטן מכיתה א׳ מבקש בעיניים נוצצות לעלות.',
        choices: [
          {
            label: 'נותנים לו תור ומלמדים אותו להתנדנד',
            color: 'success',
            empathyDelta: 10,
            shortTerm: 'הוא צוחק מאושר, ואתם מרגישים גדולים ואחראים.',
            longTerm: 'הקטנים לומדים מכם נדיבות, ואתם הופכים למודל לחיקוי.',
            questions: [
              'מה מרוויחים כשאנחנו מוותרים מתוך בחירה?',
              'איך אנחנו רוצים שהילדים הקטנים יזכרו את התלמידים הגדולים?',
            ],
          },
          {
            label: 'מבקשים ממנו בנימוס לחכות לתור הבא',
            color: 'primary',
            empathyDelta: 5,
            shortTerm: 'הוא ממתין, ואתם נהנים מהתור שהגיע לכם בצדק.',
            longTerm: 'הוא לומד שגם להמתין בתור זה בסדר — וגם זה ערך.',
            questions: [
              'האם תמיד "להיות נחמד" פירושו לוותר על מה שמגיע לנו?',
              'איך אפשר לסרב למישהו בלי לפגוע בו?',
            ],
          },
          {
            label: 'מתעלמים ועולים מהר לפני שהוא יספיק',
            color: 'warning',
            empathyDelta: -5,
            shortTerm: 'הוא נשאר עומד בצד, מאוכזב.',
            longTerm: 'הקטנים לומדים שהגדולים דוחקים אותם, ונרתעים.',
            questions: [
              'מה ההבדל בין מה שמותר לי לבין מה שנכון לעשות?',
              'איך הייתם מרגישים אם תלמיד גדול היה נוהג בכם כך?',
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'digital_world',
    label: 'העולם הדיגיטלי והרשת',
    icon: SmartphoneRoundedIcon,
    color: '#5c6bc0',
    dilemmas: [
      {
        headline: 'ההודעה בקבוצה',
        scenario:
          'בקבוצת הוואטסאפ הכיתתית מישהו כתב הודעה מעליבה על אחד הילדים, וכולם מתחילים להגיב באימוג׳י צוחק.',
        choices: [
          {
            label: 'כותבים שזה לא בסדר ומבקשים להפסיק',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'אחרים מצטרפים אליכם, וההצקה נעצרת.',
            longTerm: 'הקבוצה לומדת שיש מי שעומד על המשמר — וזה משנה את כל האווירה.',
            questions: [
              'מדוע קשה לפעמים להיות הראשון שאומר "תפסיקו"?',
              'מה כוחו של "עד פעיל" שמגיב, לעומת "עד שותק" שרק צופה?',
            ],
          },
          {
            label: 'יוצאים מהשיחה בשקט בלי להגיב',
            color: 'warning',
            empathyDelta: 0,
            shortTerm: 'אתם לא משתתפים בפגיעה, אבל היא נמשכת בלעדיכם.',
            longTerm: 'הנפגע עדיין לבד מול הקבוצה, ולא ידע שמישהו בצד שלו.',
            questions: [
              'האם מספיק "לא להשתתף" בפגיעה?',
              'מה היה עוזר לנפגע לדעת ברגע הזה?',
            ],
          },
          {
            label: 'מצטרפים לצחוק כדי לא להיות "מרובעים"',
            color: 'error',
            empathyDelta: -15,
            shortTerm: 'ההודעות הפוגעות מתרבות, והנפגע קורא הכול.',
            longTerm: 'חרם ברשת משאיר חותם עמוק — לפעמים לאורך שנים.',
            questions: [
              'במה פגיעה ברשת שונה מפגיעה פנים אל פנים?',
              'מה המחיר של "להשתלב" על חשבון מישהו אחר?',
            ],
          },
        ],
      },
      {
        headline: 'התמונה המביכה',
        scenario:
          'קיבלתם תמונה מצחיקה ומביכה של חבר מהכיתה. בלחיצת כפתור אחת תוכלו לשתף אותה עם כל הקבוצה.',
        choices: [
          {
            label: 'מוחקים, לא משתפים, ומספרים לחבר',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'החבר אסיר תודה שעצרתם את זה בזמן.',
            longTerm: 'נשמרת פרטיותו, והוא יודע שיש לו עליכם על מי לסמוך.',
            questions: [
              'למי שייכת תמונה — למי שצילם או למי שמופיע בה?',
              'מה הכלל שהייתם רוצים שכולם ינהגו לפיו לגבי תמונות שלכם?',
            ],
          },
          {
            label: 'שומרים לעצמכם ולא עושים כלום',
            color: 'primary',
            empathyDelta: 5,
            shortTerm: 'התמונה לא מופצת על ידיכם.',
            longTerm: 'אבל מישהו אחר עלול לשתף — והחבר לא יודע שהוא בסיכון.',
            questions: [
              'האם "לא להפיץ" זה אותו דבר כמו "להגן"?',
              'מתי כדאי לערב מבוגר במשהו שקורה ברשת?',
            ],
          },
          {
            label: 'משתפים — "זה רק צחוק"',
            color: 'error',
            empathyDelta: -15,
            shortTerm: 'התמונה מתפשטת לכל הקבוצות תוך דקות.',
            longTerm: 'ברשת קשה מאוד למחוק — והבושה נשארת עם החבר זמן רב.',
            questions: [
              'האם "רק צחוק" נשאר צחוק גם כשהשני נפגע?',
              'מה ההבדל בין לצחוק *עם* מישהו לבין לצחוק *על* מישהו?',
            ],
          },
        ],
      },
      {
        headline: 'בקשת הסיסמה',
        scenario:
          'חבר טוב מבקש את הסיסמה שלכם למשחק כדי "רק לשחק קצת". הוא מבטיח שלא יספר לאף אחד.',
        choices: [
          {
            label: 'מסבירים בנחמדות שסיסמה היא דבר אישי',
            color: 'success',
            empathyDelta: 10,
            shortTerm: 'הוא קצת מאוכזב, אבל מבין שזה הגיוני.',
            longTerm: 'אתם שומרים על עצמכם ומלמדים גם אותו על גבולות בריאים.',
            questions: [
              'מדוע סיסמה היא דבר שלא משתפים — אפילו עם חברים?',
              'איך אפשר לשמור על גבול בלי לפגוע בחברות?',
            ],
          },
          {
            label: 'מציעים לשחק יחד אצלכם במקום',
            color: 'primary',
            empathyDelta: 5,
            shortTerm: 'אתם נהנים לשחק ביחד, והסיסמה נשארת שלכם.',
            longTerm: 'מתחזקת החברות — בלי לוותר על ביטחון אישי.',
            questions: [
              'איך מוצאים פתרון שטוב לשני הצדדים?',
              'מה אפשר לחלוק עם חברים, ומה עדיף לשמור לעצמנו?',
            ],
          },
          {
            label: 'נותנים לו את הסיסמה — הוא הרי חבר',
            color: 'warning',
            empathyDelta: -10,
            shortTerm: 'הוא משחק, אבל עכשיו הסיסמה שלכם בידיים של מישהו אחר.',
            longTerm: 'גם חברים טובים יכולים לטעות — ופרטים אישיים עלולים לדלוף.',
            questions: [
              'למה אמון אינו סיבה מספקת לשתף פרטים אישיים?',
              'מה הייתם עושים אם החבר היה משתף את הסיסמה בטעות עם עוד מישהו?',
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'integrity',
    label: 'חברות ויושרה',
    icon: HandshakeRoundedIcon,
    color: '#26a69a',
    dilemmas: [
      {
        headline: 'הארנק שנמצא',
        scenario:
          'מצאתם ארנק עם כסף במסדרון בית הספר. סביבכם אין אף אחד, ואף אחד לא ראה שמצאתם אותו.',
        choices: [
          {
            label: 'מוסרים אותו מיד למזכירות',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'הבעלים מקבל את הארנק בחזרה ומודה לכם מכל הלב.',
            longTerm: 'אתם יודעים שעשיתם את הדבר הנכון — גם כשאף אחד לא הסתכל.',
            questions: [
              'מהי יושרה — ומה היא דורשת מאיתנו דווקא כשאיש אינו רואה?',
              'איך הייתם מרגישים אילו אתם הייתם מאבדים את הארנק?',
            ],
          },
          {
            label: 'משאירים אותו במקום ולא מתערבים',
            color: 'primary',
            empathyDelta: 0,
            shortTerm: 'לא לקחתם כלום, אבל הארנק נשאר אבוד.',
            longTerm: 'מישהו אחר עלול לקחת אותו — והבעלים יישאר בלי.',
            questions: [
              'האם "לא לקחת" מספיק, או שאפשר גם לעזור?',
              'מתי בחירה לא לעשות כלום היא בעצם בחירה?',
            ],
          },
          {
            label: 'לוקחים את הכסף לעצמכם',
            color: 'error',
            empathyDelta: -15,
            shortTerm: 'יש לכם כסף, אבל גם תחושה לא נעימה שמלווה אתכם.',
            longTerm: 'אם זה יתגלה, האמון בכם ייפגע — וגם האמון שלכם בעצמכם.',
            questions: [
              'מה שווה יותר — כסף שמצאנו או השם הטוב שלנו?',
              'איך נראה העולם אם כל אחד היה לוקח מה שהוא מוצא?',
            ],
          },
        ],
      },
      {
        headline: 'המבחן של החבר',
        scenario:
          'חבר טוב לא הספיק ללמוד למבחן, ומבקש להעתיק מכם בזמן הבחינה. הוא מתחנן בלחישה.',
        choices: [
          {
            label: 'מסרבים בעדינות ומציעים ללמוד יחד אחרי',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'הוא מאוכזב לרגע, אבל אחר כך מודה לכם על העזרה האמיתית.',
            longTerm: 'הוא לומד באמת, והחברות נבנית על כנות ולא על קיצורי דרך.',
            questions: [
              'האם עזרה אמיתית פירושה תמיד לתת לחבר מה שהוא מבקש?',
              'במה "ללמד לדוג" שונה מ"לתת דג"?',
            ],
          },
          {
            label: 'נותנים לו להעתיק — רק הפעם',
            color: 'warning',
            empathyDelta: -10,
            shortTerm: 'הוא מקבל ציון, אבל לא באמת יודע את החומר.',
            longTerm: 'הוא לא לומד להתמודד לבד, ושניכם מסתכנים יחד.',
            questions: [
              'את מי באמת עוזרים כשנותנים להעתיק?',
              'מה ההבדל בין נאמנות לחבר לבין נאמנות לאמת?',
            ],
          },
          {
            label: 'עושים את עצמכם שלא שמתם לב',
            color: 'primary',
            empathyDelta: -5,
            shortTerm: 'נמנעתם מהעימות, אבל החבר נשאר לבד עם הבעיה.',
            longTerm: 'הזדמנות לעזור עזרה אמיתית פשוט חלפה.',
            questions: [
              'מה אומרת עלינו בחירה "לא להחליט"?',
              'איך אפשר להיות חבר טוב גם כשאומרים "לא"?',
            ],
          },
        ],
      },
      {
        headline: 'הסוד המסוכן',
        scenario:
          'הבטחתם לחבר לשמור סוד. עכשיו התברר שהסוד הוא שהוא מתכנן לעשות משהו שעלול לסכן אותו.',
        choices: [
          {
            label: 'מספרים למבוגר אחראי כי שלומו חשוב מכול',
            color: 'success',
            empathyDelta: 15,
            shortTerm: 'הוא כועס לרגע, אבל מקבל את העזרה שהוא צריך.',
            longTerm: 'אתם מבינים שיש סודות ששמירתם מסוכנת — ושאכפתיות גוברת על הבטחה.',
            questions: [
              'מתי מותר — ואפילו חובה — לשבור הבטחה?',
              'מה ההבדל בין "להלשין" לבין "לדאוג למישהו"?',
            ],
          },
          {
            label: 'שומרים את הסוד כי הבטחתם',
            color: 'error',
            empathyDelta: -10,
            shortTerm: 'שמרתם על ההבטחה, אבל הסכנה נשארת.',
            longTerm: 'אם משהו ישתבש, תרגישו שיכולתם לעזור ולא עזרתם.',
            questions: [
              'האם הבטחה חשובה יותר מהביטחון של חבר?',
              'מה הייתם רוצים שחבר יעשה אילו אתם הייתם בסכנה?',
            ],
          },
          {
            label: 'מנסים לשכנע אותו לבד לוותר על התוכנית',
            color: 'primary',
            empathyDelta: 5,
            shortTerm: 'אולי תצליחו — אך ייתכן שזה גדול מכם לבד.',
            longTerm: 'יוזמה יפה, אבל לפעמים צריך לערב מבוגר שיודע לעזור.',
            questions: [
              'מתי אנחנו יכולים להתמודד לבד, ומתי נכון לבקש עזרה?',
              'מי הם המבוגרים שאנחנו סומכים עליהם ברגעים קשים?',
            ],
          },
        ],
      },
    ],
  },
];

type Stage = 'topic' | 'scenario' | 'consequence' | 'summary';

// ---------------------------------------------------------------------------
// Root state machine: Topic → Scenario → Consequence → (loop) → Summary
// ---------------------------------------------------------------------------

export default function SocialDilemmas({ gameId }: { gameId?: string }) {
  const [stage, setStage] = useState<Stage>('topic');
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
    return <TopicScreen onSelect={selectTopic} />;
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

function TopicScreen({ onSelect }: { onSelect: (t: Topic) => void }) {
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
