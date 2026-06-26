import type { SvgIconComponent } from '@mui/icons-material';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HourglassFullRoundedIcon from '@mui/icons-material/HourglassFullRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';

/**
 * Resolves a tool registry's MUI icon-**name** string to its icon component.
 * The tools analogue of the games' emoji `taxonomy` (ARCHITECTURE.md §9).
 */
const TOOL_ICONS: Record<string, SvgIconComponent> = {
  auto_stories: AutoStoriesRoundedIcon,
  groups: GroupsRoundedIcon,
  hourglass_full: HourglassFullRoundedIcon,
  assignment_ind: AssignmentIndRoundedIcon,
};

/** Look up an icon component by registry name, falling back to a generic build icon. */
export function toolIcon(name: string): SvgIconComponent {
  return TOOL_ICONS[name] ?? BuildRoundedIcon;
}
