import { redirect } from 'next/navigation'
export const runtime = 'edge'
// Signed-in people land on their dashboard; the middleware sends everyone else to /login.
export default function RootPage() { redirect('/dashboard') }
