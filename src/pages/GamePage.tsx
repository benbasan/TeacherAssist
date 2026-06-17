import type { ComponentType } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Container, Typography, Button, Stack } from '@mui/material';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import type { EducationalGame } from '../types/game.types';
import registry from '../data/games-registry.json';
import GameWrapper from '../components/layout/GameWrapper';
import DemoComplimentGame from '../games/DemoComplimentGame';

const games = registry as EducationalGame[];

/**
 * Registry Map: connects a game's `componentKey` to its React component.
 * Every new game in `/src/games` must be registered here.
 */
const REGISTRY_MAP: Record<string, ComponentType> = {
  DemoComplimentGame: DemoComplimentGame,
};

function NotFound({ message }: { message: string }) {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <SentimentDissatisfiedRoundedIcon sx={{ fontSize: 72, color: 'primary.light' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {message}
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          חזרה לקטלוג
        </Button>
      </Stack>
    </Container>
  );
}

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = games.find((g) => g.id === gameId);

  if (!game) {
    return <NotFound message="אופס! לא מצאנו את המשחק הזה." />;
  }

  const GameComponent = REGISTRY_MAP[game.componentKey];
  if (!GameComponent) {
    return <NotFound message="המשחק קיים בקטלוג אך עדיין לא חובר. נתראה בקרוב!" />;
  }

  return (
    <GameWrapper game={game}>
      <GameComponent />
    </GameWrapper>
  );
}
