import { redirect } from 'next/navigation'
export const runtime = 'edge'
// Root page: redirect to login — user selects their identity there
export default function RootPage() { redirect('/login') }
