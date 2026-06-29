import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography, Button } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Link as RouterLink } from 'react-router-dom';
import type { ClassroomTool } from '../types/tool.types';
import { toolIcon } from './iconMap';

interface ToolWrapperProps {
  tool: ClassroomTool;
  children: ReactNode;
}

/**
 * Lightweight frame around every Classroom Utility — the tools analogue of
 * `GameWrapper`, but with NO subject/time chips and NO play recording. Renders
 * the title + description and a back link to the tools catalog (`/tools`).
 * See ARCHITECTURE.md §9.
 */
export default function ToolWrapper({ tool, children }: ToolWrapperProps) {
  const Icon = toolIcon(tool.icon);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            color="primary.dark"
            sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Icon sx={{ fontSize: 36, color: 'secondary.main' }} />
            {tool.title}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/classroom"
          variant="outlined"
          color="primary"
          startIcon={<ArrowForwardRoundedIcon />}
        >
          חזרה לקטלוג
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {tool.description}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          border: '2px dashed',
          borderColor: 'secondary.light',
        }}
      >
        {children}
      </Paper>
    </Container>
  );
}
