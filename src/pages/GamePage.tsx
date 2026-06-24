import type { ComponentType } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Container, Typography, Button, Stack } from '@mui/material';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import type { EducationalGame } from '../types/game.types';
import registry from '../data/games-registry.json';
import GameWrapper from '../components/layout/GameWrapper';
import ComplimentGamePack from '../games/ComplimentGamePack';
import MathCodebreaker from '../games/MathCodebreaker';
import SocialDilemmas from '../games/SocialDilemmas';
import FocusDetectivesGame from '../games/FocusDetectivesGame';
import SpotTheGlitch from '../games/SpotTheGlitch';
import WordPop from '../games/WordPop';
import ComplimentTimeBomb from '../games/ComplimentTimeBomb';
import SilentNinja from '../games/SilentNinja';
import WouldYouRather from '../games/WouldYouRather';
import TwoTruthsLie from '../games/TwoTruthsLie';
import MindReaders from '../games/MindReaders';
import EmotionGenerator from '../games/EmotionGenerator';
import SilentSyncTower from '../games/SilentSyncTower';
import DigitalPassParcel from '../games/DigitalPassParcel';
import HungryWordMonster from '../games/HungryWordMonster';
import SentenceDetectives from '../games/SentenceDetectives';
import LetterBridge from '../games/LetterBridge';
import PunctuationOrchestra from '../games/PunctuationOrchestra';
import RhymeExpress from '../games/RhymeExpress';

const games = registry as EducationalGame[];

/**
 * Registry Map: connects a game's `componentName` to its React component.
 * Every new game in `/src/games` must be registered here.
 */
const REGISTRY_MAP: Record<string, ComponentType<{ gameId?: string }>> = {
  ComplimentGamePack: ComplimentGamePack,
  MathCodebreaker: MathCodebreaker,
  SocialDilemmas: SocialDilemmas,
  FocusDetectivesGame: FocusDetectivesGame,
  SpotTheGlitch: SpotTheGlitch,
  WordPop: WordPop,
  ComplimentTimeBomb: ComplimentTimeBomb,
  SilentNinja: SilentNinja,
  WouldYouRather: WouldYouRather,
  TwoTruthsLie: TwoTruthsLie,
  MindReaders: MindReaders,
  EmotionGenerator: EmotionGenerator,
  SilentSyncTower: SilentSyncTower,
  DigitalPassParcel: DigitalPassParcel,
  HungryWordMonster: HungryWordMonster,
  SentenceDetectives: SentenceDetectives,
  LetterBridge: LetterBridge,
  PunctuationOrchestra: PunctuationOrchestra,
  RhymeExpress: RhymeExpress,
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

  const GameComponent = REGISTRY_MAP[game.componentName];
  if (!GameComponent) {
    return <NotFound message="המשחק קיים בקטלוג אך עדיין לא חובר. נתראה בקרוב!" />;
  }

  return (
    <GameWrapper game={game}>
      <GameComponent gameId={game.id} />
    </GameWrapper>
  );
}
