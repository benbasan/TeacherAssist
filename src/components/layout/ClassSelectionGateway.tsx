import {
  Box,
  Container,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Button,
  Chip,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useClassrooms } from '../../context/ClassroomContext';

/**
 * Entry gatekeeper: a signed-in teacher must pick the class they're teaching
 * before the catalog unlocks. Rendered by `RequireActiveClass` when signed in
 * with no active class selected.
 */
export default function ClassSelectionGateway() {
  const { classrooms, setActiveClassroom } = useClassrooms();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 5, sm: 8 } }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', mb: 5 }}>
        <Typography sx={{ fontSize: 64, lineHeight: 1 }}>🎒</Typography>
        <Typography variant="h3" color="primary.dark" sx={{ fontWeight: 800 }}>
          ברוכים הבאים! עם איזה כיתה משחקים היום?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          בחרו את הכיתה כדי להתחיל — תוכלו להחליף כיתה בכל רגע מהסרגל העליון.
        </Typography>
      </Stack>

      {classrooms.length === 0 ? (
        <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            עדיין אין לכם כיתות שמורות. בואו ניצור את הראשונה!
          </Typography>
          <Button
            component={RouterLink}
            to="/dashboard"
            variant="contained"
            size="large"
            startIcon={<AddCircleRoundedIcon />}
          >
            צרו את הכיתה הראשונה שלכם
          </Button>
        </Stack>
      ) : (
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
          {classrooms.map((c) => (
            <Card
              key={c.id}
              elevation={4}
              sx={{
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
                background: 'linear-gradient(160deg, #ffffff 0%, #f1f0ff 100%)',
              }}
            >
              <CardActionArea
                onClick={() => setActiveClassroom(c.id)}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <GroupsRoundedIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5 }}>
                    {c.name}
                  </Typography>
                  <Chip
                    label={`${c.students.length} תלמידים`}
                    color="secondary"
                    size="small"
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
