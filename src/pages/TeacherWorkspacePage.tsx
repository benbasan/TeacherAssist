import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

const INDIGO = '#3f51b5';
const TEAL = '#26a69a';

interface OfficeTool {
  title: string;
  description: string;
  icon: SvgIconComponent;
  to?: string;
  accent: string;
}

const TOOLS: OfficeTool[] = [
  {
    title: 'תיק תלמיד: יומן תובנות פדגוגיות',
    description:
      'תיעוד פרטי של תובנות התנהגותיות ולימודיות לכל תלמיד — חיזוקים, נקודות לשיפור והערות, על ציר זמן מסודר.',
    icon: FolderSharedRoundedIcon,
    to: '/teacher-workspace/student-insights',
    accent: INDIGO,
  },
  {
    title: 'מחולל סיכומי וואטסאפ',
    description: 'הפקת סיכום שבועי מנוסח להורים — נטען אוטומטית מתובנות התלמידים, נערך, נשלח ונשמר בארכיון.',
    icon: ChatRoundedIcon,
    to: '/teacher-workspace/whatsapp-generator',
    accent: TEAL,
  },
  {
    title: 'אדריכל השיעור',
    description: 'תכנון מהלך שיעור מובנה עם פתיחה, גוף וסיכום מותאמים לכיתה. בקרוב.',
    icon: ArchitectureRoundedIcon,
    accent: '#7e57c2',
  },
];

/** Dashboard of the teacher's private back-office tools (מרחב המורה). See §10. */
export default function TeacherWorkspacePage() {
  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
          💼 מרחב המורה
        </Typography>
        <Typography variant="body1" color="text.secondary">
          שולחן העבודה הפרטי שלכם — כלים ניהוליים ופדגוגיים, הרחק מעיני הכיתה.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const enabled = Boolean(tool.to);
          const card = (
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
              >
                <Icon sx={{ fontSize: 40, color: tool.accent }} />
                {!enabled && <Chip label="בקרוב" size="small" color="default" />}
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {tool.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tool.description}
              </Typography>
            </CardContent>
          );

          return (
            <Card
              key={tool.title}
              elevation={enabled ? 3 : 0}
              variant={enabled ? 'elevation' : 'outlined'}
              sx={{
                height: '100%',
                borderTop: `5px solid ${tool.accent}`,
                opacity: enabled ? 1 : 0.6,
                ...(enabled && {
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                }),
              }}
            >
              {enabled && tool.to ? (
                <CardActionArea
                  component={RouterLink}
                  to={tool.to}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  {card}
                </CardActionArea>
              ) : (
                card
              )}
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
