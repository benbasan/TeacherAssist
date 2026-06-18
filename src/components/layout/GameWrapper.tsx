import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography, Button, Chip, Stack } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Link as RouterLink } from 'react-router-dom';
import type { EducationalGame } from '../../types/game.types';
import { subjectMeta } from '../../data/taxonomy';

interface GameWrapperProps {
  game: EducationalGame;
  children: ReactNode;
}

/** Shared frame around every game: title, metadata, back button, padded surface. */
export default function GameWrapper({ game, children }: GameWrapperProps) {
  const subject = subjectMeta(game.subject);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Box>
          <Typography variant="h4" color="primary.dark" sx={{ fontWeight: 800 }}>
            <span style={{ marginInlineEnd: 8 }}>{subject.icon}</span>
            {game.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label={subject.label} color="secondary" size="small" />
            <Chip label={`כ-${game.estimatedTimeMinutes} דק׳`} variant="outlined" size="small" />
          </Stack>
        </Box>
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          color="primary"
          startIcon={<ArrowForwardRoundedIcon />}
        >
          חזרה לקטלוג
        </Button>
      </Stack>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {game.description}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          border: '2px dashed',
          borderColor: 'primary.light',
        }}
      >
        {children}
      </Paper>
    </Container>
  );
}
