import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

// Accents tuned to read on the dark corporate surface.
const INDIGO = '#7986cb';
const TEAL = '#4db6ac';
const VIOLET = '#9575cd';

interface OfficeTool {
  title: string;
  description: string;
  icon: SvgIconComponent;
  to?: string;
  accent: string;
}

const TOOLS: OfficeTool[] = [
  {
    title: 'תיק תלמיד ויומן תובנות',
    description:
      'תיעוד פרטי של תובנות התנהגותיות ולימודיות לכל תלמיד — חיזוקים, נקודות לשיפור והערות, על ציר זמן מסודר.',
    icon: FolderSharedRoundedIcon,
    to: '/teacher-workspace/student-insights',
    accent: INDIGO,
  },
  {
    title: 'מחולל תקשורת וארכיון הודעות',
    description: 'הפקת סיכום שבועי מנוסח להורים — נטען אוטומטית מתובנות התלמידים, נערך, נשלח ונשמר בארכיון.',
    icon: ChatRoundedIcon,
    to: '/teacher-workspace/whatsapp-generator',
    accent: TEAL,
  },
  {
    title: 'אדריכל השיעור',
    description:
      'בנו מבעוד מועד רצף של משחקים וכלים למערך שיעור שלם — ונגנו אותו בכיתה במעבר בלחיצה אחת בין פעילות לפעילות.',
    icon: ArchitectureRoundedIcon,
    to: '/teacher-workspace/lesson-builder',
    accent: VIOLET,
  },
];

/**
 * Dashboard of the teacher's private back-office tools (מרחב המורה). Rendered
 * inside the dark `corporateTheme` (see TeacherWorkspaceLayout): high data
 * density, thin crisp borders, no playful hover animations. See §10.
 */
export default function TeacherWorkspacePage() {
  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
          💼 מרחב המורה
        </Typography>
        <Typography variant="body1" color="text.secondary">
          שולחן העבודה הפרטי שלכם — כלים ניהוליים ופדגוגיים, הרחק מעיני הכיתה.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
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
                <Icon sx={{ fontSize: 36, color: tool.accent }} />
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
              elevation={0}
              sx={{
                height: '100%',
                borderTop: `3px solid ${tool.accent}`,
                opacity: enabled ? 1 : 0.55,
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
