import { Box, Container, Card, CardActionArea, CardContent, Typography, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { ClassroomTool } from '../types/tool.types';
import { toolIcon } from '../tools/iconMap';
import toolsRegistry from '../data/tools-registry.json';

const tools = toolsRegistry as ClassroomTool[];

const ACCENT = '#26a69a'; // teal — distinguishes utilities from the games catalog

/**
 * Catalog of Classroom Utilities (כלים לניהול כיתה) — a separate category from
 * the games catalog. Renders purely from `tools-registry.json`. See §9.
 */
export default function ToolsCatalogPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={1} sx={{ mb: 4, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h3" color="primary.dark" sx={{ fontWeight: 800 }}>
          כלים לניהול כיתה 🧰
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
          כלים מהירים לניהול הכיתה — לבחור נציג, לחלק לקבוצות ועוד. נטענים מהכיתה הפעילה
          (לפי הנוכחות) או עובדים גם בלי כיתה שמורה.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {tools.map((tool) => {
          const Icon = toolIcon(tool.icon);
          return (
            <Card
              key={tool.id}
              elevation={3}
              sx={{
                height: '100%',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                borderTop: `6px solid ${ACCENT}`,
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={`/tools/${tool.id}`}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent>
                  <Icon sx={{ fontSize: 48, color: ACCENT, mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {tool.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Container>
  );
}
