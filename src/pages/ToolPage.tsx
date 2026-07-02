import type { ComponentType } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Container, Typography, Button, Stack } from '@mui/material';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import type { ClassroomTool } from '../types/tool.types';
import toolsRegistry from '../data/tools-registry.json';
import ToolWrapper from '../tools/ToolWrapper';
import NameWheel from '../tools/NameWheel';
import TeamMaker from '../tools/TeamMaker';
import MarbleJar from '../tools/MarbleJar';
import ChoreBoard from '../tools/ChoreBoard';

const tools = toolsRegistry as ClassroomTool[];

/**
 * Tools Map: connects a tool's `id` to its React component (tools have no
 * `componentName` — the id doubles as the key). Register every new utility here.
 * See ARCHITECTURE.md §9.
 */
export const TOOLS_MAP: Record<string, ComponentType<{ toolId?: string }>> = {
  'tool-name-wheel': NameWheel,
  'tool-team-maker': TeamMaker,
  'tool-marble-jar': MarbleJar,
  'tool-chore-board': ChoreBoard,
};

function NotFound({ message }: { message: string }) {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <Stack spacing={3} sx={{ alignItems: 'center' }}>
        <SentimentDissatisfiedRoundedIcon sx={{ fontSize: 72, color: 'primary.light' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {message}
        </Typography>
        <Button component={RouterLink} to="/classroom" variant="contained">
          חזרה לקטלוג
        </Button>
      </Stack>
    </Container>
  );
}

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = tools.find((t) => t.id === toolId);

  if (!tool) {
    return <NotFound message="אופס! לא מצאנו את הכלי הזה." />;
  }

  const ToolComponent = TOOLS_MAP[tool.id];
  if (!ToolComponent) {
    return <NotFound message="הכלי קיים בקטלוג אך עדיין לא חובר. נתראה בקרוב!" />;
  }

  return (
    <ToolWrapper tool={tool}>
      <ToolComponent toolId={tool.id} />
    </ToolWrapper>
  );
}
