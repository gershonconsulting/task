// The LinkedIn callback redirects here. We just bounce through the smart router
// at / which already handles team vs client vs guest.
// Keeping this file (rather than removing it) avoids needing to also edit the
// auth callback route, which lives elsewhere.

import { redirect } from 'next/navigation';

export const runtime = 'edge';

export default function DashboardLanding(): never {
  redirect('/');
}
