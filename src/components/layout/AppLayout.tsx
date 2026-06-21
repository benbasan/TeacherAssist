import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AttendanceDrawer from './AttendanceDrawer';

/**
 * Application shell: sticky Navbar + collapsible attendance Drawer framing the
 * routed content (`<Outlet />`). Owns the drawer open/close state and passes a
 * toggle down to the Navbar.
 */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <Navbar onToggleAttendance={() => setDrawerOpen((o) => !o)} />
      <AttendanceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Outlet />
    </>
  );
}
