import {
  Drawer,
  Box,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemText,
  Switch,
  Divider,
  Stack,
} from '@mui/material';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import { useClassrooms } from '../../context/ClassroomContext';

const DRAWER_WIDTH = 300;

/**
 * Collapsible attendance sidebar, anchored to the right (RTL-natural). Shown
 * only when a class is active; lists the roster with a present/absent `Switch`
 * per student. Toggling off adds the name to the session `absentStudents`.
 */
export default function AttendanceDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeClassroom, absentStudents, toggleStudentAttendance } = useClassrooms();

  if (!activeClassroom) return null;

  const students = activeClassroom.students;
  const presentCount = students.filter((n) => !absentStudents.includes(n)).length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
      }}
    >
      {/* Spacer so content clears the sticky AppBar. */}
      <Toolbar />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
          <HowToRegRoundedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            נוכחות: {activeClassroom.name}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          סמנו מי נוכח היום. תלמידים נעדרים לא ישתתפו במשחקים.
        </Typography>
      </Box>
      <Divider />

      {students.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          אין תלמידים בכיתה זו.
        </Typography>
      ) : (
        <List dense>
          {students.map((name) => {
            const present = !absentStudents.includes(name);
            return (
              <ListItem
                key={name}
                secondaryAction={
                  <Switch
                    edge="end"
                    checked={present}
                    onChange={() => toggleStudentAttendance(name)}
                    slotProps={{ input: { 'aria-label': `נוכחות של ${name}` } }}
                  />
                }
              >
                <ListItemText
                  primary={name}
                  sx={{
                    '& .MuiListItemText-primary': {
                      textDecoration: present ? 'none' : 'line-through',
                      color: present ? 'text.primary' : 'text.disabled',
                    },
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      )}

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          נוכחים: {presentCount} מתוך {students.length}
        </Typography>
      </Box>
    </Drawer>
  );
}
