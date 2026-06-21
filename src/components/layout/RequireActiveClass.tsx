import type { ReactNode } from 'react';
import { useClassrooms } from '../../context/ClassroomContext';
import ClassSelectionGateway from './ClassSelectionGateway';

/**
 * Session gate for roster-aware routes (catalog + game pages).
 *
 * A signed-in teacher must pick an active class first → the gateway is shown
 * until one is selected. Anonymous (signed-out) visitors are unaffected: the
 * catalog stays open to them exactly as before.
 */
export default function RequireActiveClass({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, activeClassroomId } = useClassrooms();

  if (isLoaded && isSignedIn && !activeClassroomId) {
    return <ClassSelectionGateway />;
  }

  return <>{children}</>;
}
